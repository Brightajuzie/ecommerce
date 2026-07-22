import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SlideDto } from "@ikaystores/shared";
import { SlidesApi } from "../../api/endpoints";
import { PrimaryButton } from "../../components/PrimaryButton";
import type { AdminStackParamList } from "../../navigation/types";

export function SlidesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const queryClient = useQueryClient();
  const slidesQuery = useQuery({ queryKey: ["adminSlides"], queryFn: SlidesApi.listAll });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => SlidesApi.reorder({ orderedIds }),
    onSuccess: (data) => queryClient.setQueryData(["adminSlides"], data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => SlidesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminSlides"] }),
  });

  const move = (slides: SlideDto[], index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    reorderMutation.mutate(reordered.map((s) => s.id));
  };

  if (slidesQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const slides = slidesQuery.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home slides</Text>
        <PrimaryButton title="+ New" onPress={() => navigation.navigate("SlideForm", undefined)} />
      </View>

      <FlatList
        data={slides}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No slides yet.</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
            <View style={styles.cardBody}>
              <Text style={styles.slideTitle} numberOfLines={1}>
                {item.title || "(untitled)"}
              </Text>
              <Text style={styles.slideMeta}>{item.isActive ? "Active" : "Hidden"}</Text>
              <View style={styles.actionsRow}>
                <Text style={styles.actionText} onPress={() => move(slides, index, -1)}>
                  ↑
                </Text>
                <Text style={styles.actionText} onPress={() => move(slides, index, 1)}>
                  ↓
                </Text>
                <Text
                  style={styles.actionText}
                  onPress={() => navigation.navigate("SlideForm", { slideId: item.id })}
                >
                  Edit
                </Text>
                <Text
                  style={styles.deleteText}
                  onPress={() =>
                    Alert.alert("Delete slide", "This cannot be undone.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                    ])
                  }
                >
                  Delete
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  empty: { textAlign: "center", marginTop: 40, color: "#6B7280" },
  card: { flexDirection: "row", marginBottom: 14, gap: 12 },
  thumbnail: { width: 90, height: 60, borderRadius: 8, backgroundColor: "#E5E7EB" },
  cardBody: { flex: 1, justifyContent: "center" },
  slideTitle: { fontWeight: "700", color: "#111827" },
  slideMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  actionText: { color: "#111827", fontWeight: "600" },
  deleteText: { color: "#DC2626", fontWeight: "600" },
});
