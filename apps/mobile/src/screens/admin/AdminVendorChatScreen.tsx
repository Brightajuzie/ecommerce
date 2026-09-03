import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { VendorsApi } from "../../api/endpoints";
import { getErrorMessage } from "../../api/errorMessage";
import { ChatThread } from "../../components/ChatThread";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import type { AdminStackParamList } from "../../navigation/types";

// Admin's side of one vendor's thread — see VendorChatScreen for the
// vendor's own view of the same conversation.
export function AdminVendorChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const route = useRoute<RouteProp<AdminStackParamList, "VendorChat">>();
  const { vendorId, businessName } = route.params;
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
    title: { fontSize: 17, fontWeight: "800" as const, color: colors.text, flex: 1 },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
  }));

  // Polling rather than a websocket — see ChatThread's own comment for why
  // that's the right tradeoff here; 5s keeps a reply feeling responsive
  // without adding realtime infra this app doesn't otherwise have.
  const messagesQuery = useQuery({
    queryKey: ["vendorMessages", vendorId],
    queryFn: () => VendorsApi.getMessages(vendorId),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => VendorsApi.sendMessage(vendorId, { body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorMessages", vendorId] }),
    onError: (error) =>
      Alert.alert("Could not send message", getErrorMessage(error, "Please try again.")),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {businessName}
        </Text>
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
          emptyText="No messages with this vendor yet."
        />
      )}
    </View>
  );
}
