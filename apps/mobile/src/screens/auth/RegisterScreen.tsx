import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { UserRole } from "@ikaystores/shared";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AuthApi, CartApi } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import { syncGuestCartToServer } from "../../store/guestCartStore";
import type { BuyerStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 440;

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BuyerStackParamList>>();
  const route = useRoute<RouteProp<BuyerStackParamList, "Register">>();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asVendor, setAsVendor] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Missing details", "Please fill in all required fields.");
      return;
    }
    if (asVendor && !businessName) {
      Alert.alert("Missing details", "Enter your business name to register as a vendor.");
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
      });
      // Setting a VENDOR session flips RootNavigator to VendorNavigator on the next
      // render (unmounting this screen), which is what carries a new vendor straight
      // into VendorPendingScreen's identity-verification step — see that screen for
      // the "live check" continuation of registration.
      await setSession(result.accessToken, result.refreshToken, result.user);
      await syncGuestCartToServer();
      if (route.params?.pendingCartItem) {
        // Best-effort: the item they tried to add before being sent here to
        // register. Don't block a successful signup over it (e.g. stock ran
        // out in the meantime) — they can always re-add it from the product page.
        await CartApi.addItem(route.params.pendingCartItem).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      if (route.params?.redirectTo === "Checkout") {
        navigation.replace("Checkout");
      } else {
        navigation.replace("BuyerTabs");
      }
    } catch (error: any) {
      Alert.alert(
        "Registration failed",
        error?.response?.data?.message ?? "Something went wrong. Please try again.",
      );
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
          <Text style={styles.title}>Create account</Text>

          <FormInput label="First name" value={firstName} onChangeText={setFirstName} />
          <FormInput label="Last name" value={lastName} onChangeText={setLastName} />
          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <FormInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Register as a vendor</Text>
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

          <PrimaryButton title="Sign up" onPress={handleRegister} loading={loading} />

          <Text style={styles.link} onPress={() => navigation.navigate("Login", route.params)}>
            Already have an account? Log in
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, backgroundColor: "#fff", flexGrow: 1, justifyContent: "center" },
  centeredColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 24 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  toggleLabel: { fontSize: 16, color: "#111827", fontWeight: "600" },
  link: { marginTop: 20, textAlign: "center", color: "#111827", fontWeight: "600" },
});
