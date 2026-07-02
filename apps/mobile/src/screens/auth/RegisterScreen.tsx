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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { UserRole } from "@ikstore/shared";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AuthApi } from "../../api/endpoints";
import { useAuthStore } from "../../store/authStore";
import type { AuthStackParamList } from "../../navigation/types";

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
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
      await setSession(result.accessToken, result.refreshToken, result.user);
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

        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Already have an account? Log in
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, backgroundColor: "#fff", flexGrow: 1, justifyContent: "center" },
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
