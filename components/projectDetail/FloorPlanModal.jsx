import { useEffect, useRef, useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import ProgressiveImage from "../ProgressiveImage";

const cardShadow = {
    shadowColor: "#2c2b2bff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.21,
    shadowRadius: 8,
    elevation: 1,
};

export default function FloorPlanModal({ visible, onClose, project }) {
    const sheetRef = useRef(null);
    const [activeFilter, setActiveFilter] = useState(0);
    const navigatingRef = useRef(false);

    // Build filter tabs from variants
    const allVariants = project?.variants ?? [];
    const filters = [
        { label: `All (${allVariants.length} Sizes)`, variants: allVariants },
        ...allVariants.map((v) => ({
            label: `${v.type.split(" ")[0]} ${v.type.split(" ")[1]} (1 Size)`,
            variants: [v],
        })),
    ];

    useEffect(() => {
        const sheet = sheetRef.current;
        if (visible) sheetRef.current?.present();
        else sheetRef.current?.dismiss();

        return () => {
            sheet?.dismiss();
        };
    }, [visible]);

    const handleClose = useCallback(() => {
        sheetRef.current?.dismiss();
        onClose?.();
    }, [onClose]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                style={[props.style, { backgroundColor: "#fff" }]}
                opacity={2.92}
                pressBehavior="close"
                onPress={handleClose}
            />
        ),
        [handleClose]
    );

    const activeVariants = filters[activeFilter]?.variants ?? allVariants;

    return (
        <BottomSheetModal
            ref={sheetRef}
            index={1}
            snapPoints={["58%"]}
            enablePanDownToClose
            onDismiss={() => { if (!navigatingRef.current) onClose(); navigatingRef.current = false; }}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: "#D1D5DB", width: 40 }}
            backgroundStyle={{
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                backgroundColor: "#fff",
                ...cardShadow,
            }}
        >
            {/* Header */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingTop: 4,
                    paddingBottom: 14,
                }}
            >
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
                    Floor Plan
                </Text>
                <TouchableOpacity
                    onPress={handleClose}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                    }}
                >
                    <Feather name="share-2" size={14} color="#374151" />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
                        Share
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Filter tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 14 }}
            >
                {filters.map((f, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => setActiveFilter(i)}
                        style={{
                            borderWidth: 1.2,
                            borderColor: activeFilter === i ? "#6C3BFF" : "#E5E7EB",
                            borderRadius: 10,
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            height: 38,
                            backgroundColor: activeFilter === i ? "#e2dcf7ff" : "#fff",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: activeFilter === i ? "700" : "400",
                                color: activeFilter === i ? "#4A43EC" : "#374151",
                            }}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Cards */}
            <BottomSheetScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 24 }}
            >
                {activeVariants.map((v, i) => (
                    <View
                        key={i}
                        style={{
                            width: 260,
                            backgroundColor: "#fff",
                            borderRadius: 20,
                            overflow: "hidden",
                            borderWidth: 1,
                            borderColor: "#F1F5F9",
                            ...cardShadow,
                        }}
                    >
                        {/* Image area */}
                        <View
                            style={{
                                backgroundColor: "#F8FAFC",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingVertical: 24,
                                position: "relative",
                            }}
                        >
                            {/* Red dot */}
                            <View
                                style={{
                                    position: "absolute",
                                    top: 12,
                                    right: 12,
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    backgroundColor: "#EF4444",
                                    borderWidth: 2.5,
                                    borderColor: "#fff",
                                }}
                            />
                            <ProgressiveImage
                                source={v.floor_plan_url || v.floorPlanUrl || v.image || null}
                                style={{ width: 280, height: 140 }}
                                resizeMode="contain"
                            />
                            {/* VIEW NAKSHA pill */}
                            <TouchableOpacity
                                onPress={() => {
                                    navigatingRef.current = true;
                                    sheetRef.current?.dismiss();
                                    router.push({
                                        pathname: "/(screens)/naksha",
                                        params: {
                                            variantType: v.type,
                                            image: v.floor_plan_url || v.floorPlanUrl || v.image || "",
                                            areaSqft: project?.areaSqft,
                                        },
                                    });
                                }}
                                style={{
                                    position: "absolute",
                                    bottom: 16,
                                    backgroundColor: "#1A1A1A",
                                    borderRadius: 30,
                                    paddingHorizontal: 18,
                                    paddingVertical: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#fff",
                                        fontSize: 11,
                                        fontWeight: "700",
                                        letterSpacing: 1.2,
                                    }}
                                >
                                    VIEW NAKSHA
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Info */}
                        <View style={{ padding: 14 }}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: "600", color: "#717171" }}>
                                    {v.priceRange.split("–")[0].trim()}
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
                                    {v.type.split(" ").slice(0, 2).join(" ")}
                                </Text>
                            </View>

                            {/* Status */}
                            <View
                                style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}
                            >
                                <View
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: "#22C55E",
                                    }}
                                />
                                <Text style={{ fontSize: 12, color: "#22C55E", fontWeight: "400" }}>
                                    {project?.possessionStatus ?? "Under Construction"}
                                </Text>
                            </View>

                            {/* Area */}
                            <View
                                style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18, marginTop: 4 }}
                            >
                                <MaterialCommunityIcons name="arrow-expand" size={14} color="#9CA3AF" />
                                <Text style={{ fontSize: 12, color: "#6B7280" }}>
                                    Super Builtup Area:{" "}
                                    <Text style={{ fontWeight: "700", color: "#1A1A1A" }}>
                                        {project?.areaSqft ?? "—"}.0 sq.ft.
                                    </Text>
                                </Text>
                            </View>

                            {/* Contact button */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: "#4A43EC",
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    alignItems: "center",
                                    width: 140
                                }}
                            >
                                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                                    Contact
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
}
