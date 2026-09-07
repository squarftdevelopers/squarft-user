import { useEffect, useRef, useState } from "react";
import { Dimensions, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ImageLightbox({ visible, images = [], startIndex = 0, onClose }) {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (!visible) return;
    setIndex(startIndex);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: startIndex * SCREEN_WIDTH, animated: false }));
  }, [visible, startIndex]);

  const goTo = (nextIndex) => {
    const clamped = Math.max(0, Math.min(images.length - 1, nextIndex));
    setIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * SCREEN_WIDTH, animated: true });
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 pt-2">
            <View className="bg-white/10 rounded-full px-3 py-1.5">
              <Text className="text-white text-xs font-manrope-bold">{index + 1} / {images.length}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
              <Ionicons name="close" size={22} color="white" />
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
            className="flex-1"
          >
            {images.map((uri, imageIndex) => (
              <View key={`${uri}-${imageIndex}`} style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center">
                <Image source={{ uri }} style={{ width: SCREEN_WIDTH, height: "100%" }} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View className="flex-row items-center justify-between px-4 pb-3">
              <TouchableOpacity onPress={() => goTo(index - 1)} disabled={index === 0} className="w-11 h-11 rounded-full bg-white/10 items-center justify-center" style={{ opacity: index === 0 ? 0.3 : 1 }}>
                <Ionicons name="chevron-back" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => goTo(index + 1)} disabled={index === images.length - 1} className="w-11 h-11 rounded-full bg-white/10 items-center justify-center" style={{ opacity: index === images.length - 1 ? 0.3 : 1 }}>
                <Ionicons name="chevron-forward" size={22} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
