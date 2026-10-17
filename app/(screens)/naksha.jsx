import { useState } from "react";
import {
    View, Text, TouchableOpacity,
    ScrollView, SafeAreaView, useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import ProgressiveImage from "../../components/ProgressiveImage";

const FLOORS = [
    { label: "Floor 12", sub: "Selected" },
    { label: "Floor 14", sub: "Available" },
    { label: "Floor 15", sub: "Available" },
    { label: "Penthouse", sub: "Sold Out" },
    { label: "Floor 18", sub: "Available" },
    { label: "Floor 20", sub: "Available" },
];

export default function NakshaScreen() {
    const { variantType, areaSqft, image } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState("2D");
    const [activeFloor, setActiveFloor] = useState(0);
    const { width } = useWindowDimensions();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
            {/* Top bar */}
            <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 44,
                paddingBottom: 12,
                backgroundColor: "#F8F9FB",
            }}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
                </TouchableOpacity>

                
                <View style={{ flexDirection: "row", backgroundColor: "#E8E8EE", borderRadius: 16, padding: 4 }}>
                    {["2D Plan", "3D Model"].map((tab) => {
                        const key = tab === "2D Plan" ? "2D" : "3D";
                        const isActive = activeTab === key;
                        return (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => setActiveTab(key)}
                                style={{
                                    paddingHorizontal: 22,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                    backgroundColor: isActive ? "#fff" : "transparent",
                                    shadowColor: isActive ? "#000" : "transparent",
                                    shadowOpacity: isActive ? 0.08 : 0,
                                    shadowRadius: 4,
                                    elevation: isActive ? 2 : 0,
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: isActive ? "600" : "400", color: isActive ? "#1A1A1A" : "#6B7280" }}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={{ width: 26 }} />
            </View>

            {/* Naksha image area */}
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
                <View style={{
                    width: "100%",
                    borderRadius: 16,
                    overflow: "hidden",
                    backgroundColor: "#ECEEF2",
                    height: 320,
                }}>
                    <ScrollView
                        maximumZoomScale={4}
                        minimumZoomScale={1}
                        centerContent
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ alignItems: "center", justifyContent: "center", flex: 1 }}
                    >
                        <ProgressiveImage source={image || null} style={{ width: width - 40, height: 300, shadowColor: "#302c2cff",
                                    shadowOpacity:12,
                                    shadowRadius:10,
                                    elevation: 2}} resizeMode="contain" />
                    </ScrollView>

                    {/* +/−/↺ controls */}
                    <View style={{ position: "absolute", right: 12, top: "28%", gap: 4 }}>
                        {["+", "−", "↺"].map((icon, i) => (
                            <View key={i} style={{
                                width: 36, height: 36, borderRadius: 8,
                                backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
                                marginBottom: 4,
                                shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
                            }}>
                                <Text style={{ fontSize: 18, color: "#1A1A1A" }}>{icon}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "#E5E7EB", marginTop: 24 }} />

            {/* Unit Details — no card, plain bg */}
            <View style={{ backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
               
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", letterSpacing: 1 }}>UNIT DETAILS</Text>
                    <View style={{ flexDirection: "row", gap: 24 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8", textAlign: "right", lineHeight: 16 }}>
                            {"SUPER BUILT-\nUP"}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#6C3BFF", textAlign: "center", lineHeight: 16, }}>
                            {"CARPET\nAREA"}
                        </Text>
                    </View>
                </View>


                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <Text style={{ fontSize: 22, fontWeight: "700", color: "#0F172A", lineHeight: 30 }}>
                        {variantType
                            ? `Premium ${variantType.split(" ").slice(0, 2).join("")} -\nType A`
                            : "Premium 3BHK -\nType A"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 24, paddingTop: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#1A1A1A", textAlign: "center", lineHeight: 22 }}>
                            {areaSqft ?? "1,450"}{"\n"}
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#1A1A1A" }}>sq.ft</Text>
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#6C3BFF", textAlign: "center", lineHeight: 22, textDecorationLine: "underline" }}>
                            {"1,120"}{"\n"}
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C3BFF", textDecorationLine: "underline" }}>sq.ft</Text>
                        </Text>
                    </View>
                </View>

                {/* Floor selector — horizontally scrollable */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {FLOORS.map((f, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => setActiveFloor(i)}
                            style={{
                                width: 90,
                                paddingVertical: 10,
                                paddingHorizontal: 10,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: activeFloor === i ? "#6C3BFF" : "#E5E7EB",
                                backgroundColor: activeFloor === i ? "#F0EEFF" : "#fff",
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: "700", color: activeFloor === i ? "#4A43EC" : "#374151", marginBottom: 2 }}>
                                {f.label}
                            </Text>
                            <Text style={{ fontSize: 11, color: activeFloor === i ? "#6C3BFF" : "#9CA3AF" }}>
                                {activeFloor === i ? "Selected" : f.sub}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
