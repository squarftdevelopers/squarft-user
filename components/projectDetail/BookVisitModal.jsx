import { useState } from "react";
import { ScrollView, StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import { SettledBackdrop, SettledModal } from "../SettledModal";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { addSiteVisit } from "../../store/slices/propertiesSlice";
import { useRouter } from "expo-router";
import { getProjectPropertyCardConfig } from "../../services/propertyConfiguration";

function formatCompactPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    if (amount >= 10000000) {
        const crores = amount / 10000000;
        return `\u20B9${Number.isInteger(crores) ? crores.toFixed(0) : crores.toFixed(1)} Cr`;
    }

    if (amount >= 100000) {
        const lakhs = amount / 100000;
        return `\u20B9${Number.isInteger(lakhs) ? lakhs.toFixed(0) : lakhs.toFixed(1)} L`;
    }

    return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function getImageSource(image, fallback) {
    if (typeof image === 'string' && image) return { uri: image };
    return image || fallback;
}

function buildVisitOptions(project) {
    const rawOptions = project?.floorPlans?.length ? project.floorPlans : (project?.variants || []);
    // A project-panel project has one inventory row per physical unit. Show
    // each configuration once, rather than exposing every duplicate unit.
    const configuredOptions = rawOptions.filter((option) => String(option?.configuration || '').trim());
    const options = configuredOptions.length > 0 ? configuredOptions : rawOptions;
    const grouped = new Map();

    options.forEach((option) => {
        const label = getProjectPropertyCardConfig(option) || option.title || option.type || "Property";
        const key = label.trim().toLowerCase();
        const existing = grouped.get(key);
        const linkedPropertyId = option.property_id || option.source_property_id || (!option.configuration ? option.id : null);

        if (!existing) {
            grouped.set(key, {
                ...option,
                title: label,
                property_id: linkedPropertyId,
                unitCount: 1,
            });
            return;
        }

        existing.unitCount += 1;
        // Prefer a representative that is linked to a bookable property.
        if (!existing.property_id && linkedPropertyId) {
            existing.property_id = linkedPropertyId;
        }
    });

    return [...grouped.values()];
}

export default function BookVisitModal({ visible, onClose, project }) {
    const insets = useSafeAreaInsets();
    const [selected, setSelected] = useState([]);
    const dispatch = useDispatch();
    const router = useRouter();
    const visitOptions = buildVisitOptions(project);

    const toggle = (index) => {
        setSelected((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
    };

    const handleContinue = () => {
        if (selected.length === 0) return;

        const selectedOptions = selected.map((index) => visitOptions[index]).filter(Boolean);
        const timestamp = Date.now();

        selectedOptions.forEach((option, index) => {
            const variantType = option.type || option.title;
            const propertyId = option.property_id || option.source_property_id || option.id;

            dispatch(addSiteVisit({
                id: propertyId || `${project.id}_${timestamp}_${index}`,
                projectId: project.id,
                property_id: propertyId,
                propertyIds: propertyId ? [propertyId] : [],
                name: project.name,
                title: project.title || project.name,
                city: project.city,
                area: project.area,
                location: project.location,
                image: getImageSource(option.image, project.imageMain),
                imageMain: getImageSource(option.image, project.imageMain),
                imageThumb: project.imageThumb,
                variant: variantType,
                selectedUnits: [variantType],
                variantDetails: option,
                variants: [option],
                floorPlans: [option],
                price: option.priceRange || option.price || option.base_price || option.price_from,
                possessionStatus: project.possessionStatus || project.possession,
                possession: project.possession,
                tower_no: project.tower_no,
                inventory: project.inventory,
                amenities: project.amenities || option.amenities || [],
                units: project.units,
            }));
        });

        onClose();
        router.push({ pathname: "/visit", params: { tab: "Book visit" } });
    };

    return (
        <SettledModal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end">
                <SettledBackdrop style={styles.backdrop} onPress={onClose} />
                <View className="bg-white rounded-t-[24px] overflow-hidden" style={{ maxHeight: "75%" }}>
                    <View className="items-center pt-3 pb-1">
                        <View className="w-10 h-1 rounded-full bg-gray-300" />
                    </View>
            {/* Header */}
            <View className="flex-row items-start justify-between px-5 mb-2 mt-1">
                <View className="flex-1 pr-4">
                    <Text className="text-[20px] font-bold text-gray-900">What are you looking for?</Text>
                    <Text className="text-[13px] text-gray-400 mt-0.5">Select property types for your site visit</Text>
                </View>
                <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                    <Ionicons name="close" size={18} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* Scrollable variants */}
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                {visitOptions.map((v, i) => {
                    const isSelected = selected.includes(i);
                    const priceText = v.priceRange || formatCompactPrice(v.price ?? v.base_price ?? v.price_from);
                    const areaText = v.area || (v.area_sqft ? `${v.area_sqft} SQ.FT.` : (project.areaSqft ? `${project.areaSqft} SQ.FT.` : '\u2014'));
                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => toggle(i)}
                            className="flex-row items-center bg-white border border-gray-100 rounded-2xl p-3 mb-3"
                        >
                            <View className="w-24 h-24 rounded-xl bg-gray-100 mr-3 overflow-hidden">
                                <Image source={getImageSource(v.image, project.imageMain)} className="w-full h-full" resizeMode="cover" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[14px] font-manrope-bold text-gray-900 mb-0.5">{getProjectPropertyCardConfig(v) || v.title || v.type || "Property"}</Text>
                                {priceText ? (
                                    <Text className="text-[13px] font-inter-bold text-indigo-600 mb-0.5">
                                        {priceText}
                                    </Text>
                                ) : null}
                                <View className="flex-row items-center gap-1">
                                    <MaterialCommunityIcons name="floor-plan" size={11} color="#9CA3AF" />
                                    <Text className="text-[11px] text-gray-400">{areaText}</Text>
                                </View>
                            </View>
                            <View className={`w-6 h-6 rounded-md border-2 items-center justify-center ml-2 ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
                                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Fixed footer */}
            <View className="px-5 pt-3 border-t border-gray-100" style={{ paddingBottom: insets.bottom + 12 }}>
                <View className="flex-row items-center justify-between mb-4 mx-2">
                    <View className="flex-row items-center gap-2">
                        <View className="w-2 h-2 rounded-full bg-green-500" />
                        <Text className="text-[13px] text-gray-700 font-semibold">
                            {selected.length} type{selected.length !== 1 ? "s" : ""} selected
                        </Text>
                    </View>
                    {selected.length > 0 && (
                        <TouchableOpacity onPress={() => setSelected([])}>
                            <Text className="text-[13px] font-semibold text-indigo-600">Clear Selection</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={selected.length === 0}
                    className={`rounded-2xl py-4 items-center ${selected.length > 0 ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    style={selected.length > 0 ? { shadowColor: "#6C3BFF", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 8 } : {}}
                >
                    <Text className="text-white text-[16px] font-bold">Continue</Text>
                </TouchableOpacity>
            </View>
                </View>
            </View>
        </SettledModal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
});
