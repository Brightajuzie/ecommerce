import { Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { BuyerStackParamList, BuyerTabParamList } from "../navigation/types";

const MAX_CONTENT_WIDTH = 1200;

type FooterNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList>,
  NativeStackNavigationProp<BuyerStackParamList>
>;

const LINKS: { label: string; to: keyof BuyerTabParamList }[] = [
  { label: "Home", to: "Home" },
  { label: "Cart", to: "Cart" },
  { label: "My Orders", to: "Orders" },
  { label: "Profile", to: "Profile" },
];

/**
 * Simple site footer for the buyer storefront — only links to screens that
 * actually exist in the app (no About/Contact/Terms pages yet, so those
 * aren't invented here). Shown at the bottom of Home's scrollable content.
 */
export function Footer() {
  const navigation = useNavigation<FooterNavigationProp>();
  const theme = useTheme();
  const styles = useThemedStyles((colors) => ({
    container: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingTop: 28,
      paddingBottom: 28,
      paddingHorizontal: 16,
      marginTop: 8,
    },
    inner: {
      width: "100%" as const,
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center" as const,
      alignItems: "center" as const,
    },
    logo: { height: 34, width: 90, marginBottom: 10 },
    tagline: { fontSize: 13, color: colors.textMuted, marginBottom: 18, textAlign: "center" as const },
    linksRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "center" as const,
      gap: 20,
      marginBottom: 18,
    },
    link: { fontSize: 13, fontWeight: "600" as const, color: colors.textSecondary },
    divider: { height: 1, width: "100%" as const, backgroundColor: colors.border, marginBottom: 14 },
    copyright: { fontSize: 11, color: colors.textFaint, textAlign: "center" as const },
  }));

  const year = new Date().getFullYear();

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Image
          source={theme.logoUrl ? { uri: theme.logoUrl } : require("../../assets/logo-green.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Fresh finds, everyday prices — delivered to your door.</Text>

        <View style={styles.linksRow}>
          {LINKS.map((link) => (
            <Pressable key={link.to} onPress={() => navigation.navigate(link.to)} hitSlop={8}>
              <Text style={styles.link}>{link.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.divider} />
        <Text style={styles.copyright}>© {year} Ikaystores. All rights reserved.</Text>
      </View>
    </View>
  );
}
