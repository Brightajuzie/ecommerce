import { useState } from "react";
import {
  FlatList,
  Image,
  type LayoutChangeEvent,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { SlideDto } from "@ikaystores/shared";
import { SlidesApi } from "../api/endpoints";

export function SlideCarousel() {
  const slidesQuery = useQuery({ queryKey: ["slides"], queryFn: SlidesApi.listActive });
  const slides = slidesQuery.data ?? [];
  const [slideWidth, setSlideWidth] = useState(0);

  if (slides.length === 0) {
    return null;
  }

  const openSlideLink = (linkUrl: string | null) => {
    if (linkUrl) {
      Linking.openURL(linkUrl).catch(() => {});
    }
  };

  const onWrapperLayout = (event: LayoutChangeEvent) => {
    setSlideWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.wrapper} onLayout={onWrapperLayout}>
      {slideWidth > 0 && (
        <FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={slides}
          keyExtractor={(item: SlideDto) => item.id}
          snapToInterval={slideWidth}
          decelerationRate="fast"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.slide, { width: slideWidth }]}
              onPress={() => openSlideLink(item.linkUrl)}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
              {item.title ? (
                <View style={styles.captionOverlay}>
                  <Text style={styles.captionText} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  slide: { height: 140, borderRadius: 12, overflow: "hidden" },
  image: { width: "100%", height: "100%", backgroundColor: "#E5E7EB" },
  captionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  captionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
