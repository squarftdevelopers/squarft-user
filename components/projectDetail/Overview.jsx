import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions, ImageBackground, Linking } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import BuilderModal from "./BuilderModal";

import PropertyDetailModal from "./PropertyDetailModal";
import { getProjectPropertyCardConfig } from "../../services/propertyConfiguration";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.55;
const rectangle = require("../../assets/images/Rectangle 5183.png");

function formatCompactPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    if (amount >= 10000000) {
        const crores = amount / 10000000;
        return `\u20B9${Number.isInteger(crores) ? crores.toFixed(0) : crores.toFixed(1)}Cr`;
    }

    if (amount >= 100000) {
        const lakhs = amount / 100000;
        return `\u20B9${Number.isInteger(lakhs) ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
    }

    return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function getImageSource(image, fallback) {
    if (typeof image === 'string' && image) return { uri: image };
    return image || fallback;
}

function getVariantPrice(variant) {
    if (variant.priceRange) return variant.priceRange.split(/\u2013|â€“|-/)[0].trim();
    return formatCompactPrice(variant.price ?? variant.base_price ?? variant.price_from) || "\u2014";
}

function getVariantArea(variant, project) {
    return variant.area || (variant.area_sqft ? `${variant.area_sqft} sqft` : null) || (project.areaSqft ? `${project.areaSqft} sqft` : "\u2014");
}

function getPropertyTitle(item) {
    const configuration = getProjectPropertyCardConfig(item);
    if (configuration) return configuration;
    return item.title || item.name || item.property_name || item.project_name || "Property";
}

function getPropertyLocation(item) {
    if (typeof item.location === "string" && item.location.trim()) return item.location;
    if (item.location && typeof item.location === "object") {
        return [item.location.area, item.location.city, item.location.pincode].filter(Boolean).join(", ") || "Address on request";
    }
    return [item.area, item.city, item.pincode].filter(Boolean).join(", ") || "Address on request";
}

function getPropertyPriceText(item) {
    if (item.price) return item.price;
    if (item.priceRange) return item.priceRange;
    if (item.variants?.[0]?.priceRange) return item.variants[0].priceRange;
    if (item.avgPricePerSqft) return item.avgPricePerSqft;

    const min = item.price_from ?? item.min_price ?? item.base_price;
    const max = item.price_to ?? item.max_price;
    const from = formatCompactPrice(min);
    const to = formatCompactPrice(max);

    if (from && to && String(min) !== String(max)) return `${from} \u2013 ${to}`;
    return from || to || "Price on request";
}

function getPropertyImage(item, fallback) {
    return getImageSource(item.cover_image || item.cover_image_url || item.image || item.image_url || item.imageMain, fallback);
}

function buildPropertyVariant(item) {
    const propertyTitle = getPropertyTitle(item);
    return {
        ...item,
        title: propertyTitle,
        type: propertyTitle,
        price: item.price ?? item.priceRange ?? item.variants?.[0]?.priceRange ?? item.base_price ?? item.price_from ?? item.min_price,
        base_price: item.base_price ?? item.price_from ?? item.min_price,
        area: item.area_sqft ? `${item.area_sqft} sqft` : item.area,
        image: item.cover_image || item.cover_image_url || item.image || item.image_url,
    };
}

function getBrochureUrl(brochure) {
    if (!brochure) return "";
    if (typeof brochure === "string") return brochure;
    return brochure.url || brochure.file_url || brochure.download_url || "";
}

function getBrochureLabel(brochure) {
    if (!brochure || typeof brochure === "string") return "Project Brochure";
    return brochure.label || brochure.name || "Project Brochure";
}



const cardShadow = {
    shadowColor: "#6B7280",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
};

function EmptySection({ label, width: emptyWidth = 260 }) {
    return (
        <View
            className="bg-white rounded-2xl px-4 py-5 border border-gray-100"
            style={{ width: emptyWidth, ...cardShadow }}
        >
            <Text className="text-[13px] font-manrope-semibold text-gray-500">{label}</Text>
        </View>
    );
}

export default function Overview({ project }) {
    const [builderModalVisible, setBuilderModalVisible] = useState(false);
    const [propertyDetailVisible, setPropertyDetailVisible] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (project?.reraId) {
            await Clipboard.setStringAsync(project.reraId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openProperty = (item) => {
        setSelectedVariant(buildPropertyVariant(item));
        setPropertyDetailVisible(true);
    };

    const renderPropertyCard = (item, options = {}) => (
        <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => openProperty(item)}
            className="bg-white rounded-2xl overflow-hidden mb-2"
            style={{ width: options.width || 190, ...cardShadow }}
        >
            <Image source={getPropertyImage(item, project.imageMain)} style={{ width: "100%", height: options.imageHeight || 120 }} resizeMode="cover" />
            <View className="p-3">
                <Text className="text-[13px] font-inter-bold text-[#4A43EC] mb-1" numberOfLines={1}>{getPropertyPriceText(item)}</Text>
                <Text className="text-[14px] font-inter-bold text-gray-900 mb-0.5" numberOfLines={1}>{getPropertyTitle(item)}</Text>
                <Text className="text-[10px] font-inter-regular text-gray-400 mb-0.5" numberOfLines={1}>{getPropertyLocation(item)}</Text>
            </View>
        </TouchableOpacity>
    );

    const resaleItems = project.resaleProperties?.length > 0 ? project.resaleProperties : [];
    const recommendedItems = project.recommendedProperties?.length > 0
        ? project.recommendedProperties.filter((item) => item.id !== project.id)
        : [];
    const similarApiItems = project.similarProperties?.length > 0 ? project.similarProperties : [];
    const brochureUrl = getBrochureUrl(project.brochure);
    const brochureLabel = getBrochureLabel(project.brochure);

    const handleOpenBrochure = async () => {
        if (!brochureUrl) return;
        const supported = await Linking.canOpenURL(brochureUrl);
        if (supported) {
            await Linking.openURL(brochureUrl);
        }
    };

    return (
        <View>

            {/* Variants horizontal scroll */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}
                className="mb-4 mt-4"
            >
                {(project.variants || project.floorPlans || []).map((v, i) => (
                    <View
                        key={i}
                        style={{ width: CARD_WIDTH, ...cardShadow }}
                        className="bg-white rounded-3xl overflow-hidden border border-gray-100"
                    >
                        <Image
                            source={getImageSource(v.image, project.imageMain)}
                            style={{ width: "100%", height: 140 }}
                            resizeMode="cover"
                        />
                        <View className="p-3">
                            <View className="flex-row items-center justify-between mb-1">
                                <Text className="text-[13px] font-manrope-bold text-[#0F172A]">{getPropertyTitle(v)}</Text>
                                <Text className="text-[16px] font-manrope-bold text-[#4A43EC]">
                                    {getVariantPrice(v)}
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-2 mb-5 px-0">
                                <MaterialCommunityIcons name="floor-plan" size={13} color="#9CA3AF" />
                                <Text className="text-[12px] font-public-regular text-[#64748B]">{getVariantArea(v, project)} </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedVariant(buildPropertyVariant(v));
                                    setPropertyDetailVisible(true);
                                }}
                                className="bg-[#6C3BFF]/5 border border-[#dacff9] rounded-2xl mx-2 py-3 mb-1 items-center"
                            >
                                <Text className="text-[12px] font-public-bold text-[#4A43EC] tracking-widest">VIEW DETAIL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
                {(project.variants || project.floorPlans || []).length === 0 && (
                    <EmptySection label="Unit configurations are not available for this project yet." width={280} />
                )}
            </ScrollView>

            {/* Posted by */}
            {project.builder && project.developerId ? <View className="mx-6 mb-7 bg-white mt-5 rounded-2xl p-4 flex-row items-center justify-between" style={cardShadow}>
                <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                        <Image source={project.builderLogo || project.imageMain} className="w-full h-full" resizeMode="cover" />
                    </View>
                    <View className="flex-1 pr-2">
                        <Text className="text-[11px] text-gray-400 ">Posted by</Text>
                        <Text className="text-[14px] font-manrope-extrabold text-gray-900" numberOfLines={1}>{project.builder}</Text>
                        <Text className="text-[11px] font-semibold text-indigo-600 mt-0.5">Developer details</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setBuilderModalVisible(true)} className="border border-indigo-500 rounded-xl px-4 py-2.5 ml-3">
                    <Text className="text-[12px] font-manrope-bold text-indigo-600">View Details</Text>
                </TouchableOpacity>
            </View> : null}

            <BuilderModal
                visible={builderModalVisible}
                onClose={() => setBuilderModalVisible(false)}
                project={project}
            />


            <PropertyDetailModal
                visible={propertyDetailVisible}
                onClose={() => setPropertyDetailVisible(false)}
                project={project}
                variant={selectedVariant}
            />

            {/* Other details */}
            <Text className="text-[15px] font-manrope-bold text-gray-900 mx-5 mb-6">Other details</Text>
            <View className="mx-6 mb-5 bg-white rounded-2xl p-4" style={cardShadow}>
                <View className="flex-row mb-8">
                    <View className="flex-1">
                        <Text className="text-[12px] font-manrope-regular text-[#6B7280] mb-1">Launched in</Text>
                        <Text className="text-[14px] font-bold text-gray-900">{project.launchedIn ?? "—"}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-[12px] font-manrope-regular text-[#6B7280] mb-1">Units</Text>
                        <Text className="text-[14px] font-manrope-medium pl-1 text-[#1A1A1A]">{project.units ?? "—"}</Text>
                    </View>
                </View>
                {project.reraId && (
                    <View>

                        <Text className="text-[12px] font-manrope-regular text-[#6B7280] mb-1">RERA ID</Text>
                       <View className="flex-row items-center gap-3">
    <Text className="text-[14px] font-manrope-medium text-[#1A1A1A]">
        {project?.reraId || "N/A"}
    </Text>
    <TouchableOpacity onPress={handleCopy} activeOpacity={0.7}>
        <MaterialCommunityIcons 
            name={copied ? "check" : "content-copy"}
            size={18} 
            color={copied ? "#22C55E" : "#9CA3AF"} // Turns green when successfully copied
        />
    </TouchableOpacity>
</View>
                    </View>
                )}
            </View>
            {/* About card */}
            {project.description ? <View className="mx-6 mb-3 mt-4 bg-white rounded-2xl p-4" style={cardShadow}>
                <Text className="text-[15px] font-manrope-bold text-[#1A1A1A] mt-1 mb-3">About {project.name}</Text>
                {[project.description].map((point, i) => (
                    <View key={i} className="flex-row gap-2 mb-2">
                        <Text className="text-[#5E23DC] text-[18px] -top-[1px]">•</Text>
                        <Text className="text-[12px] font-manrope-regular text-[#4B5563] flex-1 leading-6 mb-1">{point}</Text>
                    </View>
                ))}
            </View> : null}

            {/* Brochure download */}

            {brochureUrl ? <TouchableOpacity
                onPress={handleOpenBrochure}
                style={{ backgroundColor: "#6C3BFF2A", borderColor: "#6C3BFF1A" }}
                className=" mx-6 mb-6 mt-5 border rounded-2xl p-4 flex-row items-center gap-3"
            >
                <View className="w-16 h-16 bg-indigo-600 rounded-2xl items-center justify-center">
                    <MaterialIcons name="picture-as-pdf" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                    <Text className="text-[15px] font-public-bold text-gray-900">{brochureLabel}</Text>
                    <Text className="text-[11px] font-public-regular text-[#64748B] mt-0.5">
                        PDF document
                    </Text>
                </View>
                <Text className="text-[12px] font-public-bold text-[#4A43EC] tracking-wide">DOWNLOAD</Text>
            </TouchableOpacity> : null}

            {/* Resale properties */}
            <ImageBackground
                source={rectangle}
                className="mt-6 mb-12 w-[430px] h-[380px]"
                resizeMode="stretch"
            >
                <Text className="text-[12px] font-bold text-gray-900 pt-2 pl-16 mb-6 pb-1">Resale properties in same project</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, gap: 14, paddingTop: 44, paddingBottom: 15, marginBottom: 12 }}
                >
                    {resaleItems.length > 0
                        ? resaleItems.map((item) => renderPropertyCard(item, { width: 220, imageHeight: 138 }))
                        : <EmptySection label="No resale properties listed for this project yet." width={260} />}
                </ScrollView>
            </ImageBackground>

            {/* Recommended Property */}
            <View className="mb-10">
                <View className="flex-row items-center justify-between mx-4 mb-7">
                    <Text className="text-[15px] font-manrope-bold text-gray-900">Recommended Property</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 15 }}>
                    {recommendedItems.length > 0
                        ? recommendedItems.map((item) => renderPropertyCard(item, { width: 200 }))
                        : <EmptySection label="No recommended properties available yet." width={260} />}
                </ScrollView>
            </View>

            {/* Similar Property */}
            <View className="mb-20">
                <View className="flex-row items-center justify-between mx-4 mb-8">
                    <Text className="text-[15px] font-manrope-bold text-gray-900">Similar Property</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 15 }}>
                    {similarApiItems.length > 0
                        ? similarApiItems.map((item) => renderPropertyCard(item, { width: 180 }))
                        : <EmptySection label="No similar properties available yet." width={240} />}
                </ScrollView>
            </View>
        </View>
    );
}
