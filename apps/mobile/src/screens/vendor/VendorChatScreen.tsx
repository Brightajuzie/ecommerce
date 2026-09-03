import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { VendorsApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { ChatThread } from "../../components/ChatThread";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { VendorStackParamList } from "../../navigation/types";

// Vendor's side of their one shared thread with the admin team — replies
// here, announcements sent via BroadcastMessageScreen, and
// VendorComplianceService's automated warnings all land in the same place.
// See AdminVendorChatScreen for the admin's view of the same conversation.
export function VendorChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendorStackParamList>>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id) ?? "";
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingTop: 60,
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    title: { fontSize: 17, fontWeight: "800" as const, color: colors.text },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
  }));

  const messagesQuery = useQuery({
    queryKey: ["myVendorMessages"],
    queryFn: () => VendorsApi.getMyMessages(),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => VendorsApi.sendMyMessage({ body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVendorMessages"] });
      // The dashboard's unread badge comes from vendors/me — a reply here
      // doesn't change the vendor's own unread count, but keeps it in sync
      // in case the badge is stale from an earlier admin message.
      queryClient.invalidateQueries({ queryKey: ["vendorMe"] });
    },
    onError: (error) =>
      Alert.alert("Could not send message", getErrorMessage(error, "Please try again.")),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Chat with admin</Text>
      </View>

      {messagesQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primaryColor} />
        </View>
      ) : (
        <ChatThread
          messages={messagesQuery.data ?? []}
          currentUserId={currentUserId}
          onSend={(body) => sendMutation.mutate(body)}
          sending={sendMutation.isPending}
          emptyText="No messages yet — reach out if you have a question."
        />
      )}
    </View>
  );
}
