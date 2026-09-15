import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { OrderStatus } from "@ikaystores/shared";
import type { AdminOrderDto } from "@ikaystores/shared";
import { AdminOrdersApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

const MAX_CONTENT_WIDTH = 900;

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: "Pending",
  [OrderStatus.PAID]: "Paid",
  [OrderStatus.FAILED]: "Failed",
  [OrderStatus.FULFILLING]: "Fulfilling",
  [OrderStatus.COMPLETED]: "Completed",
  [OrderStatus.CANCELLED]: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: "#D97706",
  [OrderStatus.PAID]: "#059669",
  [OrderStatus.FAILED]: "#DC2626",
  [OrderStatus.FULFILLING]: "#2563EB",
  [OrderStatus.COMPLETED]: "#15803D",
  [OrderStatus.CANCELLED]: "#6B7280",
};

const STATUS_FILTERS: (OrderStatus | "ALL")[] = [
  "ALL",
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.FULFILLING,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.FAILED,
];

const MIME_TYPES: Record<"xlsx" | "pdf", string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};
// Apple's Uniform Type Identifier — expo-sharing needs this on iOS in
// addition to (Android's) mimeType to offer the right share-sheet targets.
const IOS_UTIS: Record<"xlsx" | "pdf", string> = {
  xlsx: "org.openxmlformats.spreadsheetml.sheet",
  pdf: "com.adobe.pdf",
};

// Web: real browser download (arraybuffer -> Blob -> object URL -> a hidden
// <a download> click) — accessed via globalThis rather than importing DOM
// lib types, since this project's tsconfig targets React Native, not the
// browser.
// Native: written to the app's cache directory via expo-file-system's
// modern File API (accepts a Uint8Array directly, no base64 round-trip
// needed), then handed to expo-sharing's share sheet so the admin picks
// where it actually goes (Files, email, WhatsApp, etc.) — there's no such
// thing as a browser "Downloads folder" on a native app.
async function saveExport(data: ArrayBuffer, filename: string, format: "xlsx" | "pdf") {
  if (Platform.OS === "web") {
    const blob = new Blob([data], { type: MIME_TYPES[format] });
    const g = globalThis as unknown as {
      document: {
        createElement: (tag: string) => HTMLAnchorElement;
        body: { appendChild: (n: unknown) => void; removeChild: (n: unknown) => void };
      };
      URL: { createObjectURL: (b: Blob) => string; revokeObjectURL: (u: string) => void };
    };
    const url = g.URL.createObjectURL(blob);
    const link = g.document.createElement("a");
    link.href = url;
    link.download = filename;
    g.document.body.appendChild(link);
    link.click();
    g.document.body.removeChild(link);
    g.URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, filename);
  file.write(new Uint8Array(data));

  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("Saved", `${filename} was saved, but sharing isn't available on this device.`);
    return;
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: MIME_TYPES[format],
    UTI: IOS_UTIS[format],
    dialogTitle: filename,
  });
}

export function AdminTransactionsScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    centeredColumn: {
      width: "100%" as const,
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center" as const,
      paddingHorizontal: 16,
    },
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 16,
      gap: 12,
      flexWrap: "wrap" as const,
    },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text },
    exportRow: { flexDirection: "row" as const, gap: 8 },
    exportButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: colors.surfaceAlt,
    },
    exportButtonText: { color: colors.text, fontWeight: "700" as const, fontSize: 13 },
    searchWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    search: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
    statusRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 8 },
    statusChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.surfaceAlt },
    statusChipText: { fontSize: 12, fontWeight: "700" as const, color: colors.textSecondary },
    statusChipTextActive: { color: "#fff" },
    dateRow: { flexDirection: "row" as const, gap: 8, marginBottom: 16 },
    dateInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 9,
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    loading: { marginTop: 40 },
    list: { paddingBottom: 24 },
    empty: { alignItems: "center" as const, marginTop: 40, gap: 8 },
    emptyText: { color: colors.textMuted },
    row: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    summaryRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.text },
    rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    rowAmount: { fontSize: 14, fontWeight: "800" as const, color: colors.text },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4, alignSelf: "flex-start" as const },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" as const },
    detail: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10, gap: 6 },
    detailLabel: { fontSize: 11, fontWeight: "700" as const, color: colors.textFaint, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    detailText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    vendorBlock: { marginTop: 4 },
    vendorTitle: { fontSize: 13, fontWeight: "700" as const, color: colors.text },
    itemText: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  }));

  const query = useQuery({
    queryKey: ["adminTransactions", search, status, from, to],
    queryFn: () =>
      AdminOrdersApi.list({
        search: search || undefined,
        status: status === "ALL" ? undefined : status,
        from: from || undefined,
        to: to || undefined,
        pageSize: 50,
      }),
  });

  const handleExport = async (format: "xlsx" | "pdf") => {
    setExporting(format);
    try {
      const data = await AdminOrdersApi.export({
        search: search || undefined,
        status: status === "ALL" ? undefined : status,
        from: from || undefined,
        to: to || undefined,
        format,
      });
      await saveExport(data, `ikaystores-orders.${format}`, format);
    } catch (error) {
      Alert.alert("Could not export", getErrorMessage(error, "Please try again."));
    } finally {
      setExporting(null);
    }
  };

  const orders = query.data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.centeredColumn}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Transactions</Text>
          <View style={styles.exportRow}>
            <Pressable
              style={[styles.exportButton, exporting === "xlsx" && { opacity: 0.6 }]}
              onPress={() => handleExport("xlsx")}
              disabled={exporting !== null}
            >
              <Ionicons name="grid-outline" size={14} color={theme.colors.text} />
              <Text style={styles.exportButtonText}>{exporting === "xlsx" ? "Exporting…" : "Excel"}</Text>
            </Pressable>
            <Pressable
              style={[styles.exportButton, exporting === "pdf" && { opacity: 0.6 }]}
              onPress={() => handleExport("pdf")}
              disabled={exporting !== null}
            >
              <Ionicons name="document-text-outline" size={14} color={theme.colors.text} />
              <Text style={styles.exportButtonText}>{exporting === "pdf" ? "Exporting…" : "PDF"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={theme.colors.textFaint} />
          <TextInput
            style={styles.search}
            placeholder="Search by buyer name or email..."
            placeholderTextColor={theme.colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.statusRow}>
          {STATUS_FILTERS.map((option) => (
            <Pressable
              key={option}
              style={[
                styles.statusChip,
                status === option && { backgroundColor: theme.primaryColor },
              ]}
              onPress={() => setStatus(option)}
            >
              <Text style={[styles.statusChipText, status === option && styles.statusChipTextActive]}>
                {option === "ALL" ? "All" : STATUS_LABELS[option]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.dateRow}>
          <TextInput
            style={styles.dateInput}
            placeholder="From (YYYY-MM-DD)"
            placeholderTextColor={theme.colors.textFaint}
            value={from}
            onChangeText={setFrom}
          />
          <TextInput
            style={styles.dateInput}
            placeholder="To (YYYY-MM-DD)"
            placeholderTextColor={theme.colors.textFaint}
            value={to}
            onChangeText={setTo}
          />
        </View>
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.primaryColor} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item: AdminOrderDto) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centeredColumn}>
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={32} color={theme.colors.textFaint} />
                <Text style={styles.emptyText}>No transactions found.</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            const orderNumber = item.id.slice(0, 8).toUpperCase();
            return (
              <View style={styles.centeredColumn}>
                <Pressable
                  style={styles.row}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <View style={styles.summaryRow}>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>
                        #{orderNumber} — {item.buyer.firstName} {item.buyer.lastName}
                      </Text>
                      <Text style={styles.rowSub}>
                        {item.buyer.email} · {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                        <Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
                      </View>
                    </View>
                    <Text style={styles.rowAmount}>
                      {item.currency} {item.totalAmount.toLocaleString()}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.colors.textFaint}
                    />
                  </View>

                  {isExpanded && (
                    <View style={styles.detail}>
                      <Text style={styles.detailLabel}>Delivery address</Text>
                      <Text style={styles.detailText}>
                        {item.address.label} — {item.address.line1}, {item.address.city}, {item.address.state}
                      </Text>

                      <Text style={styles.detailLabel}>Payment</Text>
                      <Text style={styles.detailText}>
                        {item.paymentProvider ?? "N/A"}
                        {item.payments[0] ? ` · ${item.payments[0].status}` : ""} · Delivery fee{" "}
                        {item.currency} {item.deliveryFee.toLocaleString()}
                      </Text>

                      <Text style={styles.detailLabel}>Vendors</Text>
                      {item.vendorOrders.map((vo) => (
                        <View key={vo.id} style={styles.vendorBlock}>
                          <Text style={styles.vendorTitle}>
                            {vo.vendor.businessName} — {vo.status}
                          </Text>
                          {vo.items.map((product) => (
                            <Text key={product.id} style={styles.itemText}>
                              {product.quantity} x {product.title}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
