import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UserRole, type VendorMessageDto } from "@ikaystores/shared";
import { useTheme } from "../theme/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

interface ChatThreadProps {
  messages: VendorMessageDto[];
  /** Bubbles align right for this viewer's own messages, left otherwise. */
  currentUserId: string;
  onSend: (body: string) => void;
  sending: boolean;
  emptyText?: string;
}

/**
 * Shared by AdminVendorChatScreen and VendorChatScreen — same one thread,
 * viewed from either side (see VendorMessage in schema.prisma). System
 * warnings and broadcasts render as centered pills rather than a bubble on
 * either side, since they're not part of the back-and-forth conversation.
 */
export function ChatThread({ messages, currentUserId, onSend, sending, emptyText }: ChatThreadProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const styles = useThemedStyles((colors) => ({
    flex: { flex: 1 },
    list: { padding: 16, gap: 10, flexGrow: 1 },
    empty: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    emptyText: { color: colors.textFaint },
    row: { flexDirection: "row" as const },
    rowOwn: { justifyContent: "flex-end" as const },
    rowOther: { justifyContent: "flex-start" as const },
    bubble: { maxWidth: "78%" as const, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleOwn: { backgroundColor: theme.primaryColor, borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4 },
    senderLabel: { fontSize: 11, fontWeight: "700" as const, marginBottom: 2 },
    bubbleTextOwn: { color: "#fff", fontSize: 15, lineHeight: 20 },
    bubbleTextOther: { color: colors.text, fontSize: 15, lineHeight: 20 },
    timeOwn: { color: "rgba(255,255,255,0.75)", fontSize: 10, marginTop: 4, textAlign: "right" as const },
    timeOther: { color: colors.textFaint, fontSize: 10, marginTop: 4 },
    systemPill: {
      alignSelf: "center" as const,
      maxWidth: "90%" as const,
      backgroundColor: theme.accentColor ?? colors.placeholderBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    systemLabel: {
      fontSize: 11,
      fontWeight: "800" as const,
      color: theme.primaryColor,
      marginBottom: 3,
      textAlign: "center" as const,
    },
    systemText: { color: colors.text, fontSize: 13, lineHeight: 18, textAlign: "center" as const },
    composerRow: {
      flexDirection: "row" as const,
      alignItems: "flex-end" as const,
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    composerInput: {
      flex: 1,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: theme.primaryColor,
    },
    sendButtonDisabled: { opacity: 0.5 },
  }));

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sending) return;
    onSend(body);
    setDraft("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={messages.length === 0 ? [styles.list, styles.empty] : styles.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <Text style={styles.emptyText}>{emptyText ?? "No messages yet — say hello."}</Text>
        ) : (
          messages.map((message) => {
            if (message.isSystemMessage || message.isBroadcast) {
              return (
                <View key={message.id} style={styles.systemPill}>
                  <Text style={styles.systemLabel}>
                    {message.isSystemMessage ? "Automated notice" : "Announcement"}
                  </Text>
                  <Text style={styles.systemText}>{message.body}</Text>
                </View>
              );
            }

            const isOwn = message.senderId === currentUserId;
            const senderLabel = message.sender
              ? message.sender.role === UserRole.VENDOR
                ? "You"
                : `${message.sender.firstName} (Admin)`
              : "System";

            return (
              <View key={message.id} style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
                <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  {!isOwn && (
                    <Text style={[styles.senderLabel, { color: theme.primaryColor }]}>{senderLabel}</Text>
                  )}
                  <Text style={isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther}>{message.body}</Text>
                  <Text style={isOwn ? styles.timeOwn : styles.timeOther}>
                    {new Date(message.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.composerRow}>
        <TextInput
          style={styles.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          placeholderTextColor={theme.colors.textFaint}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
        >
          <Ionicons name="send" size={17} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
