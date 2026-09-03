import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { AuthApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import { syncGuestCartToServer } from "../../store/guestCartStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 440;

/**
 * Default path from a guest's cart — pay first, register later. Collects
 * just enough to place the order (contact + delivery address), creates a
 * real account behind the scenes with no password set yet
 * (AuthService.guestCheckout), and signs them straight into it. They're
 * prompted to set a password afterward, once payment succeeds (see
 * OrderDetailScreen) — not before, since that would be exactly the
 * friction this screen exists to remove.
 */
export function GuestCheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const route = useRoute<RouteProp<BuyerStackParamList, "GuestCheckout">>();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const styles = useThemedStyles((colors, t) => ({
    flex: { flex: 1 },
    container: { padding: 24, backgroundColor: colors.background, flexGrow: 1, justifyContent: "center" as const },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    logo: { height: 48, width: 110, marginBottom: 8, alignSelf: "flex-start" as const },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
    errorBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: t.scheme === "dark" ? "#3A1518" : "#FEF2F2",
      borderWidth: 1,
      borderColor: t.scheme === "dark" ? "#5B2226" : "#FECACA",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: { flex: 1, color: t.scheme === "dark" ? "#FCA5A5" : "#B91C1C", fontSize: 13, fontWeight: "600" as const },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    sectionLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.text, marginBottom: 10 },
    link: { marginTop: 20, textAlign: "center" as const, color: colors.text, fontWeight: "600" as const },
  }));

  const handleContinue = async () => {
    setErrorMessage(null);
    if (!email || !firstName || !lastName || !line1 || !city || !state || !phone) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const result = await AuthApi.guestCheckout({
        email: email.trim(),
        firstName,
        lastName,
        phone: phone.trim() || undefined,
        address: { line1, city, state, phone: phone.trim() },
      });
      await setSession(result.accessToken, result.refreshToken, result.user);
      await syncGuestCartToServer();
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      if (route.params?.redirectTo === "Checkout") {
        navigation.replace("Checkout");
      } else {
        navigation.replace("BuyerTabs");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.centeredColumn}>
          <Pressable onPress={() => navigation.navigate("BuyerTabs")} hitSlop={8}>
            <Image
              source={require("../../../assets/logo-green.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.title}>Checkout as guest</Text>
          <Text style={styles.subtitle}>
            No account needed to buy — you can save your details afterward if you'd like.
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Contact</Text>
            <FormInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <FormInput label="First name" value={firstName} onChangeText={setFirstName} />
            <FormInput label="Last name" value={lastName} onChangeText={setLastName} />
            <FormInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Delivery address</Text>
            <FormInput label="Address line" value={line1} onChangeText={setLine1} />
            <FormInput label="City" value={city} onChangeText={setCity} />
            <FormInput label="State" value={state} onChangeText={setState} />
          </View>

          <PrimaryButton title="Continue to payment" onPress={handleContinue} loading={loading} />

          <Text style={styles.link} onPress={() => navigation.navigate("Login", route.params)}>
            Already have an account? Sign in
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
