import { View, Text, ScrollView, Pressable, StyleSheet, Animated, RefreshControl } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { fetchDealById, clearCurrentDeal } from "../../../store/slices/dealsSlice";

import TabTimeline from "../../../components/myDeals/TabTimeline";
import TabPayments from "../../../components/myDeals/TabPayments";
import TabDocuments from "../../../components/myDeals/TabDocuments";
import TabOverview from "../../../components/myDeals/TabOverview";

const TABS = ["Deal Created", "Meetings & Notes", "Token", "Payment Schedule", "Payment History", "Documents", "Timeline"];

const formatValue = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return "₹0";
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(0)} L`;
    return `₹${num.toLocaleString("en-IN")}`;
};

const Shimmer = ({ style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
    return <Animated.View style={[{ backgroundColor: '#E5E7EB', borderRadius: 6, opacity }, style]} />;
};

const DetailSkeleton = () => (
    <View className="flex-1 bg-white">
        {/* Header skeleton */}
        <View className="pt-[50px] pb-4 px-5" style={{ backgroundColor: '#C4C0FF' }}>
            <View className="flex-row items-center mb-4">
                <Shimmer style={{ width: 36, height: 36, borderRadius: 10, marginRight: 12 }} />
                <Shimmer style={{ width: 100, height: 13 }} />
            </View>
            <Shimmer style={{ width: '70%', height: 22, marginBottom: 8 }} />
            <Shimmer style={{ width: '45%', height: 13, marginBottom: 20 }} />
            <View className="flex-row gap-2">
                {[1, 2, 3].map(i => <Shimmer key={i} style={{ flex: 1, height: 40, borderRadius: 10 }} />)}
            </View>
        </View>
        {/* Tabs skeleton */}
        <View className="flex-row px-5 pt-4 pb-3 border-b border-[#F3F4F6] gap-6">
            {[1, 2, 3, 4].map(i => <Shimmer key={i} style={{ width: 60, height: 13 }} />)}
        </View>
        {/* Content skeleton */}
        <View className="px-5 pt-6 gap-3">
            {[1, 2, 3, 4].map(i => (
                <View key={i} className="flex-row items-center p-3 bg-white rounded-[12px] border border-[#F3F4F6]">
                    <Shimmer style={{ width: 36, height: 36, borderRadius: 8, marginRight: 12 }} />
                    <View className="flex-1 gap-2">
                        <Shimmer style={{ width: '55%', height: 13 }} />
                        <Shimmer style={{ width: '35%', height: 10 }} />
                    </View>
                    <Shimmer style={{ width: 50, height: 18, borderRadius: 6 }} />
                </View>
            ))}
        </View>
    </View>
);

export default function DealDetails() {
    const { id } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState("Deal Created");
    const [refreshing, setRefreshing] = useState(false);
    const dispatch = useDispatch();
    const { currentDeal: deal, currentDealLoading: loading, currentDealError: error } = useSelector((s) => s.deals);

    useEffect(() => {
        dispatch(fetchDealById(id));
        return () => dispatch(clearCurrentDeal());
    }, [dispatch, id]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchDealById(id));
        } finally {
            setRefreshing(false);
        }
    };

    if (loading || !deal) {
        return error
            ? (
                <View className="flex-1 justify-center items-center bg-[#FAFAFA]">
                    <Text className="text-[16px] font-manrope-medium text-[#6B7280]">{error}</Text>
                </View>
            )
            : <DetailSkeleton />;
    }

    const totalStages = deal.deal_stages?.length || 7;
    const paidPct = deal.status === 'closed' ? 100 : Math.min(99, Math.round(((deal.current_stage_index ?? 0) / totalStages) * 100));
    const uploadDealId = deal.apiDealId || deal.deal_id || deal.dealId || deal.id || id;

    const activeTabContent = (() => {
        switch (activeTab) {
            case "Deal Created": return <TabOverview deal={deal} />;
            case "Meetings & Notes": return <TabTimeline timeline={(deal.timeline ?? []).filter((item) => /meeting|note/i.test(`${item.title || ''} ${item.details || ''}`))} currentStageIndex={0} />;
            case "Token": return <TabPayments payments={(deal.payments ?? []).filter((payment) => payment.is_token || /token/i.test(payment.title || payment.milestone || ''))} />;
            case "Payment Schedule": return <TabPayments payments={deal.payments ?? []} />;
            case "Payment History": return <TabPayments payments={(deal.payments ?? []).filter((payment) => ['paid', 'completed', 'partial'].includes(String(payment.status).toLowerCase()))} />;
            case "Documents": return <TabDocuments documents={deal.documents ?? []} dealId={uploadDealId} />;
            default: return <TabTimeline timeline={deal.timeline ?? []} currentStageIndex={deal.current_stage_index ?? 0} />;
        }
    })();

    return (
        <View className="flex-1 bg-white">
            <ScrollView
                showsVerticalScrollIndicator={false}
                alwaysBounceVertical={true}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#4A43EC"]}
                        tintColor="#4A43EC"
                    />
                }
            >
                {!!deal.selling_broker_id && <View style={{paddingHorizontal:20,paddingBottom:12}}><Text style={{fontWeight:'700'}}>Broker-assisted purchase</Text><Text>{['Deal in process','Documentation','Payment schedule','Completion requested'][deal.current_stage_index ?? 0]} · {deal.status === 'closed' ? 'Completed' : 'Updates and payments are reviewed by admin'}</Text></View>}
                {/* Header */}
                <View className="pt-[50px] pb-4 px-5 relative">
                    <LinearGradient
                        colors={["#948FFF", "#4F48ED"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View className="flex-row items-center mb-4 relative z-10">
                        <Pressable
                            onPress={() => router.back()}
                            className="w-[36px] h-[36px] bg-[rgba(255,255,255,0.15)] rounded-[10px] items-center justify-center mr-3"
                        >
                            <Ionicons name="arrow-back" size={20} color="white" />
                        </Pressable>
                        <Text className="text-[14px] font-manrope-medium text-white/90">
                            Deal #{deal.id}
                        </Text>
                    </View>

                    <View className="mb-4 relative z-10">
                        <Text className="text-[20px] font-manrope-bold text-white mb-1 leading-[30px]">
                            {deal.property_title}
                        </Text>
                        <Text className="text-[12px] font-manrope-medium text-white/80">
                            📍 {deal.city}{deal.area ? `, ${deal.area}` : ""}
                        </Text>
                    </View>

                    <View className="flex-row justify-between gap-[8px] relative z-10">
                        <View className="flex-1 justify-center items-center h-[40px] bg-[rgba(255,255,255,0.15)] rounded-[10px]">
                            <Text className="text-[13px] font-manrope-bold text-white mb-0.5" numberOfLines={1}>
                                {formatValue(deal.total_value)}
                            </Text>
                            <Text className="text-[9px] font-manrope-medium text-white/80">Total Value</Text>
                        </View>
                        <View className="flex-1 h-[40px] bg-[rgba(255,255,255,0.15)] rounded-[10px] justify-center px-3">
                            <Text className="text-[13px] font-manrope-bold text-white mb-0.5">{paidPct}%</Text>
                            <Text className="text-[9px] font-manrope-medium text-white/80">Paid</Text>
                        </View>
                        <View className="flex-1 h-[40px] bg-[rgba(255,255,255,0.15)] rounded-[10px] justify-center px-3">
                            <Text className="text-[13px] font-manrope-bold text-white mb-0.5">
                                Stage {deal.current_stage_index}/{totalStages}
                            </Text>
                            <Text className="text-[9px] font-manrope-medium text-white/80">Timeline</Text>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View className="bg-white">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
                        className="border-b border-[#F3F4F6]"
                    >
                        {TABS.map((tab) => {
                            const isActive = tab === activeTab;
                            return (
                                <Pressable
                                    key={`main-tab-${tab}`}
                                    onPress={() => setActiveTab(tab)}
                                    className={`mr-6 shrink-0 pb-3 ${isActive ? "border-b-[3px] border-[#4F48ED]" : "border-b-[3px] border-transparent"}`}
                                >
                                    <Text className={`text-[13px] ${isActive ? "font-manrope-bold text-[#4F48ED]" : "font-manrope-medium text-[#9CA3AF]"}`}>
                                        {tab}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <View className="px-5 pt-6 pb-[140px]">
                        {activeTabContent}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
