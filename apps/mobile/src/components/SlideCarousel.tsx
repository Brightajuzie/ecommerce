import { useState } from "react";
import { FlatList, Image, type LayoutChangeEvent, Linking, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { SlideDto } from "@ikaystores/shared";
import { SlidesApi } from "../api/endpoints";
import { optimizedImageUrl } from "../utils/image";
import { useThemedStyles } from "../theme/useThemedStyles";

export function SlideCarousel() {
  const slidesQuery = useQuery({ queryKey: ["slides"], queryFn: SlidesApi.listActive });
  const slides = slidesQuery.data ?? [];
  const [slideWidth, setSlideWidth] = useState(0);
  const styles = useThemedStyles((colors) => ({
    wrapper: { marginBottom: 16 },
    slide: { height: 140, borderRadius: 12, overflow: "hidden" as const },
    image: { width: "100%" as const, height: "100%" as const, backgroundColor: colors.border },
    captionOverlay: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    captionText: { color: "#fff", fontWeight: "700" as const, fontSize: 14 },
  }));

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
              <Image source={{ uri: optimizedImageUrl(item.imageUrl, slideWidth * 2) }} style={styles.image} />
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
