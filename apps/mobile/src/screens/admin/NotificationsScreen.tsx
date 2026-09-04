import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationDto } from "@ikaystores/shared";
import { NotificationsApi } from "../../api/endpoints";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { AdminStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 700;

// Admin's own broadcast feed — NEW_ORDER (see PaymentsService) today, but
// any future NotificationType with userId: null lands here too, same as
// the buyer's NotificationsScreen shows their own userId-scoped rows.
export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 24 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    headerRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 16 },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    title: { fontSize: 22, fontWeight: "800" as const, color: colors.text },
    empty: { color: colors.textMuted, textAlign: "center" as const, marginTop: 60 },
    card: {
      flexDirection: "row" as const,
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unreadCard: { borderColor: theme.primaryColor },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.text },
    cardBodyText: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
    cardTime: { fontSize: 11, color: colors.textFaint, marginTop: 6 },
  }));

  const notificationsQuery = useQuery({
    queryKey: ["adminNotifications"],
    queryFn: NotificationsApi.listForAdmin,
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => NotificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["adminNotificationsUnreadCount"] });
    },
  });

  const handlePress = (notification: NotificationDto) => {
    if (!notification.readAt) {
      markRead.mutate(notification.id);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, styles.centeredColumn]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
        </View>

        {notificationsQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primaryColor} />
          </View>
        ) : (
          <FlatList
            data={notificationsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.card, !item.readAt && styles.unreadCard]}
                onPress={() => handlePress(item)}
              >
                {!item.readAt && <View style={[styles.dot, { backgroundColor: theme.primaryColor }]} />}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBodyText}>{item.body}</Text>
                  <Text style={styles.cardTime}>
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}
