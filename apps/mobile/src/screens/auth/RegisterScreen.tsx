import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { UserRole } from "@ikaystores/shared";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AuthApi, CartApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { useAuthStore } from "../../store/authStore";
import { syncGuestCartToServer } from "../../store/guestCartStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 440;

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const route = useRoute<RouteProp<BuyerStackParamList, "Register">>();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const theme = useTheme();
  const styles = useThemedStyles((colors, t) => ({
    flex: { flex: 1 },
    container: { padding: 24, backgroundColor: colors.background, flexGrow: 1, justifyContent: "center" as const },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
    logo: { height: 48, width: 110, marginBottom: 8, alignSelf: "flex-start" as const },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.text, marginBottom: 20 },
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
    toggleRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 16,
    },
    toggleTextWrap: { flex: 1, marginRight: 12 },
    toggleLabel: { fontSize: 15, color: colors.text, fontWeight: "700" as const },
    toggleHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    link: { marginTop: 20, textAlign: "center" as const, color: colors.text, fontWeight: "600" as const },
  }));

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asVendor, setAsVendor] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  // Rendered inline rather than via Alert.alert: on web, Alert.alert is a
  // browser-native dialog that some mobile browsers silently suppress when
  // triggered after an awaited call, which left failed registrations
  // looking like nothing happened at all (see the navigation fix above for
  // the same root cause on the success path).
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!firstName || !lastName || !email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }
    if (asVendor && !businessName) {
      setErrorMessage("Enter your business name to register as a vendor.");
      return;
    }

    setLoading(true);
    try {
      const result = await AuthApi.register({
        firstName,
        lastName,
        email: email.trim(),
        password,
        role: asVendor ? UserRole.VENDOR : UserRole.BUYER,
        businessName: asVendor ? businessName : undefined,
        referralCode: referralCode.trim() || undefined,
      });
      // Setting a VENDOR session flips RootNavigator to VendorNavigator on the next
      // render (unmounting this screen) — vendors are auto-approved on signup (see
      // AuthService.register), so this carries a new vendor straight into
      // VendorTabs, not a pending-review screen.
      await setSession(result.accessToken, result.refreshToken, result.user);
      await syncGuestCartToServer();
      if (route.params?.pendingCartItem) {
        // Best-effort: the item they tried to add before being sent here to
        // register. Don't block a successful signup over it (e.g. stock ran
        // out in the meantime) — they can always re-add it from the product page.
        await CartApi.addItem(route.params.pendingCartItem).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      // Navigate first, independent of the confirmation alert below: on web,
      // Alert.alert renders as a browser-native dialog that some mobile
      // browsers silently suppress when triggered after an awaited call
      // (outside the direct click-gesture stack) — gating navigation behind
      // its "Continue" button meant a suppressed alert left the user stuck
      // on the register screen with no visible error, even though the
      // account was created successfully.
      if (route.params?.redirectTo === "Checkout") {
        navigation.replace("Checkout");
      } else {
        navigation.replace("BuyerTabs");
      }
      Alert.alert(
        "Account created",
        asVendor
          ? "Welcome to Ikaystores! You can start listing products right away — verifying your identity is optional and just helps build buyer trust."
          : "Welcome to Ikaystores!",
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.centeredColumn}>
          <Pressable onPress={() => navigation.navigate("BuyerTabs")} hitSlop={8}>
            <Image
              source={require("../../../assets/logo-green.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.title}>Create account</Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.card}>
            <FormInput label="First name" value={firstName} onChangeText={setFirstName} />
            <FormInput label="Last name" value={lastName} onChangeText={setLastName} />
            <FormInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <FormInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleLabel}>Register as a vendor</Text>
                <Text style={styles.toggleHint}>Sell your own products on Ikaystores</Text>
              </View>
              <Switch value={asVendor} onValueChange={setAsVendor} />
            </View>

            {asVendor && (
              <FormInput
                label="Business name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Ada's Fashion House"
              />
            )}

            <FormInput
              label="Referral code (optional)"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              placeholder="Got a code from a friend?"
            />
          </View>

          <PrimaryButton title="Sign up" onPress={handleRegister} loading={loading} />

          <Text style={styles.link} onPress={() => navigation.navigate("Login", route.params)}>
            Already have an account? Log in
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
