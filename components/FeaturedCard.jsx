import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { buildProjectAddress, buildProjectPrice } from "../services/projectDisplay";
import ProgressiveImage from './ProgressiveImage';

const luxuryApartments = require("../assets/images/Luxury Apartments.png");

const cardShadow = {
    shadowColor: "#d2abc0ff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
};

export default function FeaturedCard({ item, onToggleFav, showBookVisit = false }) {
    const isRemote = typeof item.image_url === 'string' || typeof item.image === 'string';
    const remoteUri = item.image_url || item.image;
    const imageSource = isRemote && remoteUri
        ? { uri: remoteUri }
        : (item.image ?? item.imageMain ?? luxuryApartments);
    const title = item.title ?? item.name;
    const location = item.display_location || buildProjectAddress(item) || item.location || [item.area, item.city].filter(Boolean).join(', ');

    // Format raw number to Indian readable format
    const fmt = (n) => {
        const num = Number(n);
        if (!num || isNaN(num)) return null;
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(0)} L`;
        return `₹${num.toLocaleString('en-IN')}`;
    };

    // Build price display: API fields are price_from / price_to
    let price;
    const from = fmt(item.price_from);
    const to = fmt(item.price_to);
    if (from && to && item.price_from !== item.price_to) {
        price = `${from} – ${to}`;
    } else if (from) {
        price = from;
    } else {
        price = item.priceINR ?? item.variants?.[0]?.priceRange ?? item.avgPricePerSqft;
    }

    price = item.display_price || buildProjectPrice(item) || price || "Price on request";

    return (
        <TouchableOpacity
            onPress={() => router.push({ pathname: "/(screens)/project-detail", params: { id: item.id, slug: item.slug || 'none' } })}
            activeOpacity={0.85}
            className="w-[278px] bg-white rounded-2xl overflow-hidden mr-3.5"
            style={cardShadow}
        >
            <View className="relative">
                <ProgressiveImage source={imageSource} style={{ width: 278, height: 150 }} resizeMode="cover" />
                <View className="absolute top-4 left-4 bg-[#6C3BFF] px-3 py-1.5 rounded-full">
                    <Text className="text-white font-inter-bold text-[10px]">FEATURED</Text>
                </View>
                {onToggleFav && (
                    <TouchableOpacity
                        onPress={(event) => {
                            event.stopPropagation?.();
                            onToggleFav(item.id);
                        }}
                        style={{ position: "absolute", top: 10, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" }}
                    >
                        <Ionicons
                            name={item.isFavourite ? "heart" : "heart-outline"}
                            size={20}
                            color={item.isFavourite ? "#EF4444" : "#9CA3AF"}
                        />
                    </TouchableOpacity>
                )}
            </View>
            <View className="px-4 py-4">
                <Text className="text-[15px] font-inter-bold text-[#1F2937] mb-0.5">{title}</Text>
                <Text className="text-[12px] font-inter-regular text-[#6B7280] mb-2" numberOfLines={1}>{location}</Text>
                <View className="flex-row items-center justify-between">
                    <View>
                        
                        <Text className="text-[14px] font-inter-bold text-[#111827]">{price}</Text>
                    </View>
                    {showBookVisit && (
                        <TouchableOpacity className="bg-[#6C3BFF]/10 px-3 py-2.5 rounded-lg">
                            <Text className="text-[11px] font-semibold text-[#6C3BFF]">Book Site visit</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
