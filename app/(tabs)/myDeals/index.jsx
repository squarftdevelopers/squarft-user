import { View, Text, ScrollView, Pressable, StyleSheet, Animated, RefreshControl, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyDeals } from "../../../store/slices/dealsSlice";

const Shimmer = ({ style, className }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, [anim]);
    const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
    return <Animated.View style={[{ backgroundColor: '#E5E7EB', borderRadius: 6, opacity }, style]} className={className} />;
};

const DealCardSkeleton = () => (
    <View className="bg-white rounded-[12px] p-3 mb-3" style={{ borderWidth: 1, borderColor: '#e4e5e8' }}>
        <View className="flex-row items-center mb-2.5">
            <View className="flex-1">
                <Shimmer style={{ height: 14, width: '60%', marginBottom: 6 }} />
                <Shimmer style={{ height: 11, width: '40%' }} />
            </View>
            <Shimmer style={{ height: 18, width: 50, borderRadius: 20 }} />
        </View>
        <View className="h-[1px] bg-[#F3F4F6] mb-2.5" />
        <View className="flex-row justify-between mb-3">
            {[1, 2, 3].map(i => (
                <View key={i} className="flex-1">
                    <Shimmer style={{ height: 10, width: '50%', marginBottom: 5 }} />
                    <Shimmer style={{ height: 13, width: '70%' }} />
                </View>
            ))}
        </View>
        <Shimmer style={{ height: 3, width: '100%', borderRadius: 9999, marginBottom: 8 }} />
        <View className="flex-row justify-between">
            <Shimmer style={{ height: 11, width: 60 }} />
            <Shimmer style={{ height: 11, width: 80 }} />
        </View>
    </View>
);


const FILTERS = ["All Deals", "Active", "Pending"];
const getDealRouteId = (deal) => deal.apiDealId || deal.deal_id || deal.dealId || deal.id;

const ProgressBar = memo(function ProgressBar({ percentage, animKey }) {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        animatedValue.setValue(0);
        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [animatedValue, percentage, animKey]);

    const width = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <View className="w-full h-[3px] bg-[#F3F4F6] rounded-full mb-2 overflow-hidden">
            <Animated.View style={{ width, height: '100%', borderRadius: 9999 }}>
                <LinearGradient
                    colors={['#434EEC', '#434EEC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, borderRadius: 9999 }}
                />
            </Animated.View>
        </View>
    );
});

const formatValue = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return "₹0";
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(0)} L`;
    return `₹${num.toLocaleString('en-IN')}`;
};

const DealCard = memo(function DealCard({ deal, animKey, onPress }) {
    const isActive = deal.status === 'active';
    const totalStages = 8;
    const paidPct = Math.min(100, Math.max(0, Math.round(((deal.current_stage_index || 0) / totalStages) * 100)));
    const statusLabel = deal.status ? deal.status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Pending';
    return (
        <Pressable
            onPress={onPress}
            activeOpacity={0.85}
            className="bg-white rounded-[12px] p-3 mb-3"
            style={{ borderWidth: 1, borderColor: '#e4e5e8ff' }}
        >
            <View className="flex-row items-center mb-2.5">
                <View className="flex-1">
                    <Text className="text-[14px] font-manrope-bold text-[#111827] mb-0.5">{deal.property_title}</Text>
                    <Text className="text-[11px] font-manrope-medium text-[#6B7280]">{deal.city}{deal.area ? `, ${deal.area}` : ''}</Text>
                </View>
                <View className={`px-2 py-[2px] rounded-full ${isActive ? 'bg-[#EAF8EE]' : 'bg-[#FFF8E6]'}`}>
                    <Text className={`text-[10px] font-manrope-bold ${isActive ? 'text-[#22A559]' : 'text-[#F59E0B]'}`}>
                        {statusLabel}
                    </Text>
                </View>
            </View>
            <View className="h-[1px] bg-[#F3F4F6] mb-2.5" />
            <View className="flex-row justify-between mb-3">
                <View className="flex-1">
                    <Text className="text-[10px] font-manrope-medium text-[#9CA3AF] mb-0.5">Total Value</Text>
                    <Text className="text-[13px] font-manrope-bold text-[#111827]">{formatValue(deal.total_value)}</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-[10px] font-manrope-medium text-[#9CA3AF] mb-0.5">Paid So Far</Text>
                    <Text className="text-[13px] font-manrope-bold text-[#111827]">{formatValue(deal.paid_so_far)}</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-[10px] font-manrope-medium text-[#9CA3AF] mb-0.5">Stage</Text>
                    <Text className="text-[13px] font-manrope-bold text-[#4F48ED]">{deal.current_stage_index}/{totalStages}</Text>
                </View>
            </View>
            <ProgressBar percentage={paidPct} animKey={animKey} />
            <View className="flex-row justify-between items-center">
                <Text className="text-[11px] font-manrope-medium text-[#9CA3AF]">{paidPct}% paid</Text>
                <Text className="text-[12px] font-manrope-bold text-[#4F48ED]">View Details →</Text>
            </View>
        </Pressable>
    );
});

export default function MyDeals() {
    const [activeFilter, setActiveFilter] = useState("All Deals");
    const [animKey, setAnimKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const dispatch = useDispatch();
    const { deals, stats, loading, error } = useSelector((state) => state.deals);

    const refreshDeals = useCallback(() => {
        setAnimKey((k) => k + 1);
        return dispatch(fetchMyDeals());
    }, [dispatch]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshDeals();
        } finally {
            setRefreshing(false);
        }
    }, [refreshDeals]);

    useFocusEffect(useCallback(() => {
        refreshDeals();
    }, [refreshDeals]));

    const filteredDeals = useMemo(() => deals.filter(deal => {
        if (activeFilter === "Active") return deal.status === 'active';
        if (activeFilter === "Pending") return deal.status === 'pending';
        return true;
    }), [deals, activeFilter]);

    const totalValueFormatted = useMemo(() => {
        const num = Number(stats.totalValue);
        if (!Number.isFinite(num)) return "₹0";
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(0)} L`;
        return `₹${num.toLocaleString('en-IN')}`;
    }, [stats.totalValue]);

    const nextPayment = useMemo(() => {
        const candidates = deals
            .map((deal) => ({
                amount: deal.next_payment_amount ?? deal.next_due_amount,
                date: deal.next_payment_due_date ?? deal.next_due_date,
            }))
            .filter((item) => item.amount && item.date)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (!candidates.length) return null;

        const dueDate = new Date(candidates[0].date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        return {
            amount: formatValue(candidates[0].amount),
            date: dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            daysRemaining: Math.ceil((dueDate - today) / 86400000),
        };
    }, [deals]);

    return (
        <View className="flex-1 bg-[#FAFAFA]">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 150 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A43EC"]} tintColor="#4A43EC" />}
            >
                {/* Header Section */}
                <View className="pt-[60px] pb-6 px-5 overflow-hidden relative">
                    <LinearGradient
                        colors={['#948FFF', '#4F48ED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <Text className="text-[20px] font-manrope-bold text-white mb-1 relative z-10">My Deals</Text>
                    <Text className="text-[12px] font-manrope-medium text-white/80 mb-6 relative z-10">{stats.active} Active · {stats.pending} Pending</Text>

                    <View className="flex-row justify-between gap-[8px] mt-6 relative z-10">
                        <View className="flex-1 w-[114px] h-[51px] bg-[rgba(255,255,255,0.15)] rounded-[10px] items-center justify-center">
                            <Text className="text-[16px] font-manrope-bold text-white mb-0.5">{stats.active}</Text>
                            <Text className="text-[13px] font-manrope-medium text-white/90">Active</Text>
                        </View>
                        <View className="flex-1 w-[114px] h-[51px] bg-[rgba(255,255,255,0.15)] rounded-[10px] items-center justify-center">
                            <Text className="text-[16px] font-manrope-bold text-white mb-0.5">{stats.pending}</Text>
                            <Text className="text-[13px] font-manrope-medium text-white/90">Pending</Text>
                        </View>
                        <View className="flex-1 w-[114px] h-[51px] bg-[rgba(255,255,255,0.15)] rounded-[10px] items-center justify-center">
                            <Text className="text-[16px] font-manrope-bold text-white mb-0.5">{totalValueFormatted}</Text>
                            <Text className="text-[13px] font-manrope-medium text-white/90">Total Value</Text>
                        </View>
                    </View>
                </View>

                {/* Content Container */}
                <View className="pt-5 flex-1">
                    {/* Next Payment Banner */}
                    {nextPayment ? <View className="px-5 mb-4">
                        <View className="rounded-[16px]" style={{ elevation: 4, shadowColor: '#5B50F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 }}>
                            <View className="rounded-[16px] overflow-hidden relative">
                                <LinearGradient
                                    colors={['#5B50F6', '#5B50F6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View className="px-[16px] py-[12px] flex-row justify-between items-center relative z-10">
                                    <View className="justify-center">
                                        <Text className="text-[12px] font-manrope-medium text-white/80 leading-[16px]">Next Payment Due</Text>
                                        <Text className="text-[23px] font-manrope-bold text-white tracking-tight leading-[32px] mt-0.5 mb-1">{nextPayment.amount}</Text>
                                        <Text className="text-[12px] font-manrope-medium text-white/80 leading-[16px]">
                                            Due in {nextPayment.daysRemaining} days · {nextPayment.date}
                                        </Text>
                                    </View>
                                    <Pressable className="bg-white/20 px-[16px] py-[10px] rounded-[10px]" activeOpacity={0.8}>
                                        <Text className="text-[13px] font-manrope-bold text-white">Pay Now</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View> : null}

                    {/* Filters */}
                    <View className="flex-row px-5 mb-4 gap-3">
                        {FILTERS.map((f) => (
                            <Pressable
                                key={f}
                                onPress={() => setActiveFilter(f)}
                                activeOpacity={0.8}
                                className={`flex-1 rounded-[10px] items-center justify-center border overflow-hidden ${activeFilter === f
                                    ? 'border-transparent'
                                    : 'bg-white border-[#E5E7EB]'
                                    }`}
                            >
                                {activeFilter === f ? (
                                    <View className="w-full py-[10px] items-center justify-center bg-[#434EEC]">
                                        <Text className="text-[12px] font-manrope-semibold text-white">
                                            {f}
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="w-full py-[10px] items-center justify-center">
                                        <Text className="text-[12px] font-manrope-semibold text-[#6B7280]">
                                            {f}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        ))}
                    </View>
                    {/* Deals List */}
                    <View className="px-5">
                        {loading ? (
                            [1, 2, 3].map(i => <DealCardSkeleton key={i} />)
                        ) : error ? (
                            <View className="flex-1 justify-center items-center py-20">
                                <Text className="text-red-400 font-manrope-medium text-center">{error}</Text>
                            </View>
                        ) : filteredDeals.length > 0 ? (
                            filteredDeals.map((deal) => (
                                <DealCard
                                    key={deal.id}
                                    deal={deal}
                                    animKey={animKey}
                                    onPress={() => router.push(`/myDeals/${getDealRouteId(deal)}`)}
                                />
                            ))
                        ) : (
                            <View className="flex-1 justify-center items-center py-20">
                                <Text className="text-gray-400 font-manrope-medium">No deals for {activeFilter}</Text>
                            </View>
                        )}
                        <View className="h-4" />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
