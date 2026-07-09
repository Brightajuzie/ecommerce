import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../theme/ThemeContext";

const WEB_NAV_BREAKPOINT = 768;
const BAR_HEIGHT = 60;

export function ResponsiveTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const isWide = width >= WEB_NAV_BREAKPOINT;

  const goTo = (routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({ type: "tabPress", target: routeKey, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
    setMenuOpen(false);
  };

  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const label = typeof options.title === "string" ? options.title : route.name;
    const isFocused = state.index === index;
    const color = isFocused ? theme.primaryColor : "#6B7280";
    const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 18 });
    return { route, index, label, isFocused, color, icon };
  });

  const renderItem = (
    item: (typeof items)[number],
    layout: "row" | "stack" | "block",
  ) => (
    <Pressable
      key={item.route.key}
      onPress={() => goTo(item.route.name, item.route.key, item.isFocused)}
      style={[
        layout === "row" && styles.navItemRow,
        layout === "stack" && styles.navItemStack,
        layout === "block" && styles.navItemBlock,
        item.isFocused && layout === "row" && { borderBottomColor: theme.primaryColor },
        item.isFocused && layout === "block" && { backgroundColor: theme.accentColor ?? "#F0FDF4" },
      ]}
    >
      {item.icon}
      <Text style={[styles.navItemText, { color: item.color }, item.isFocused && styles.navItemTextActive]}>
        {item.label}
      </Text>
    </Pressable>
  );

  const Brand = (
    <View style={styles.brandRow}>
      {theme.logoUrl ? null : <Ionicons name="leaf" size={20} color={theme.primaryColor} />}
      <Text style={[styles.brandText, { color: theme.primaryColor }]}>IkStore</Text>
    </View>
  );

  if (isWide) {
    return (
      <View style={styles.barWide}>
        {Brand}
        <View style={styles.navItemsRow}>{items.map((item) => renderItem(item, "row"))}</View>
      </View>
    );
  }

  return (
    <View style={styles.wrapperNarrow}>
      <View style={styles.barNarrow}>
        {Brand}
        <Pressable onPress={() => setMenuOpen((open) => !open)} hitSlop={10} style={styles.hamburgerButton}>
          <Ionicons name={menuOpen ? "close" : "menu"} size={26} color={theme.primaryColor} />
        </Pressable>
      </View>
      {menuOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.dropdown}>{items.map((item) => renderItem(item, "block"))}</View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barWide: {
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  wrapperNarrow: {
    ...(Platform.OS === "web" ? ({ position: "relative" } as const) : null),
    zIndex: 30,
  },
  barNarrow: {
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  hamburgerButton: { padding: 4 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandText: { fontSize: 18, fontWeight: "800" },
  navItemsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  navItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: BAR_HEIGHT,
    paddingHorizontal: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  navItemStack: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10 },
  navItemBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  navItemText: { fontSize: 14, fontWeight: "600" },
  navItemTextActive: { fontWeight: "800" },
  backdrop: {
    position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute",
    top: BAR_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  dropdown: {
    position: "absolute",
    top: BAR_HEIGHT,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 8,
    zIndex: 30,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
