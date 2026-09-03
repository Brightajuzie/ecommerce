import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { VendorsApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { AdminStackParamList } from "../../navigation/types";

const MAX_CONTENT_WIDTH = 600;

// Fans one message out to every vendor's thread at once (VendorsApi.broadcast)
// — each vendor sees it flagged as an announcement in their own chat with
// the admin team (see ChatThread), not as a message from any one admin.
export function BroadcastMessageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const theme = useTheme();
  const [body, setBody] = useState("");
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 60 },
    centeredColumn: { width: "100%" as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" as const },
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
    hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 20 },
    input: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
      minHeight: 140,
      textAlignVertical: "top" as const,
      marginBottom: 16,
    },
  }));

  const broadcastMutation = useMutation({
    mutationFn: () => VendorsApi.broadcast({ body: body.trim() }),
    onSuccess: (result) => {
      Alert.alert("Sent", `Delivered to ${result.count} vendor${result.count === 1 ? "" : "s"}.`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) =>
      Alert.alert("Could not send announcement", getErrorMessage(error, "Please try again.")),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.centeredColumn}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.title}>Message all vendors</Text>
        </View>
        <Text style={styles.hint}>
          Sends one announcement to every vendor's chat with the admin team — they'll see it
          highlighted, and a notification on their dashboard.
        </Text>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="e.g. Scheduled maintenance this weekend, payouts may be delayed a day."
          placeholderTextColor={theme.colors.textFaint}
          multiline
        />
        <PrimaryButton
          title="Send to all vendors"
          onPress={() => broadcastMutation.mutate()}
          loading={broadcastMutation.isPending}
          disabled={!body.trim()}
        />
      </View>
    </ScrollView>
  );
}
