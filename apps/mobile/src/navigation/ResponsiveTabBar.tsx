import { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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

  // The bar itself is now solid brand-green (see styles.barWide/barNarrow),
  // so items need light-on-dark colors here; the dropdown panel below stays
  // white/dark-text since it floats over page content, not the green bar.
  const INACTIVE_ON_BRAND = "rgba(255,255,255,0.75)";

  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const label = typeof options.title === "string" ? options.title : route.name;
    const isFocused = state.index === index;
    const color = isFocused ? "#fff" : INACTIVE_ON_BRAND;
    const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 18 });
    const badge = options.tabBarBadge;
    return { route, index, label, isFocused, color, icon, badge };
  });

  const dropdownItems = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const label = typeof options.title === "string" ? options.title : route.name;
    const isFocused = state.index === index;
    const color = isFocused ? theme.primaryColor : "#6B7280";
    const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 18 });
    const badge = options.tabBarBadge;
    return { route, index, label, isFocused, color, icon, badge };
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
        item.isFocused && layout === "row" && styles.navItemRowActive,
        item.isFocused && layout === "block" && { backgroundColor: theme.accentColor ?? "#F0FDF4" },
      ]}
    >
      <View style={styles.iconWrap}>
        {item.icon}
        {item.badge !== undefined && (
          <View style={[styles.badge, { backgroundColor: "#fff" }]}>
            <Text style={[styles.badgeText, { color: theme.primaryColor }]}>{item.badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.navItemText, { color: item.color }, item.isFocused && styles.navItemTextActive]}>
        {item.label}
      </Text>
    </Pressable>
  );

  const Brand = (
    <Pressable
      style={styles.brandRow}
      onPress={() => goTo(state.routes[0].name, state.routes[0].key, state.index === 0)}
      hitSlop={8}
    >
      {theme.logoUrl ? (
        <Image source={{ uri: theme.logoUrl }} style={styles.brandLogo} resizeMode="contain" />
      ) : (
        <Image
          source={require("../../assets/logo-white.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      )}
    </Pressable>
  );

  if (isWide) {
    return (
      <View style={[styles.barWide, { backgroundColor: theme.primaryColor }]}>
        {Brand}
        <View style={styles.navItemsRow}>{items.map((item) => renderItem(item, "row"))}</View>
      </View>
    );
  }

  return (
    <View style={styles.wrapperNarrow}>
      <View style={[styles.barNarrow, { backgroundColor: theme.primaryColor }]}>
        {Brand}
        <Pressable onPress={() => setMenuOpen((open) => !open)} hitSlop={10} style={styles.hamburgerButton}>
          <Ionicons name={menuOpen ? "close" : "menu"} size={26} color="#fff" />
        </Pressable>
      </View>
      {menuOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.dropdown}>{dropdownItems.map((item) => renderItem(item, "block"))}</View>
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
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  hamburgerButton: { padding: 4 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandLogo: { height: 36, width: 82 },
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
  navItemRowActive: { borderBottomColor: "#fff" },
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
  iconWrap: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
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
