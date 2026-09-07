import { memo, useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View, Text, TextInput, TouchableOpacity,
    useWindowDimensions,
    ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import RangeSliderLib from "react-native-fast-range-slider";
import {
    closeFilter, setAddress, removeTag,
    togglePropertyType, toggleSubType, clearSubTypes,
    setBudgetRange, setAreaRange,
    togglePossession, clearFilters, setFilterLocation,
} from "../store/slices/filterSlice";
import { GeocodingService } from "../services/geocoding";

const GOOGLE_MAPS_API_KEY =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env?.GOOGLE_MAPS_API_KEY ||
    "";

let geocodingServiceInstance = null;
function getGeocodingService() {
    if (!GOOGLE_MAPS_API_KEY) return null;
    if (!geocodingServiceInstance) {
        geocodingServiceInstance = new GeocodingService({
            apiKey: GOOGLE_MAPS_API_KEY,
            maxCacheSize: 200,
            cacheTTL: 7 * 24 * 60 * 60 * 1000,
        });
    }
    return geocodingServiceInstance;
}

const PROPERTY_TYPES = [
    { label: 'Plot', type: 'Plot' },
    { label: 'Villa', type: 'Villa' },
    { label: 'Apartment', type: 'Apartment' },
    { label: 'RowHouse', type: 'Rowhouse' },
    { label: 'Shop', type: 'Shop' },
    { label: 'Showroom', type: 'Showroom' },
    { label: 'Office', type: 'Office' },
];
const SUB_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];
const SUB_TYPE_ELIGIBLE_PROPERTY_TYPES = ['Apartment', 'Rowhouse', 'Villa'];
const POSSESSION = ['Ready to Move', 'Under Construction'];

const BUDGET_MIN = 2000000;
const BUDGET_MAX = 50000000;
const AREA_MIN = 0;
const AREA_MAX = 5000;

function formatBudget(val) {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(0)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
    return `₹${val}`;
}

function RangeSlider({ min, max, values, onChange, onLiveChange, onDragStart, onDragEnd }) {
    const { width } = useWindowDimensions();
    return (
        <RangeSliderLib
            key={`${values[0]}-${values[1]}`}
            min={min}
            max={max}
            initialMinValue={values[0]}
            initialMaxValue={values[1]}
            width={width - 64}
            trackHeight={4}
            thumbSize={24}
            showThumbLines={false}
            selectedTrackColor="#4A43EC"
            unselectedTrackStyle={{ backgroundColor: '#E5E7EB' }}
            thumbStyle={{
                backgroundColor: '#4A43EC',
                borderWidth: 3,
                borderColor: '#fff',
                shadowColor: '#4A43EC',
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 4,
            }}
            pressedThumbStyle={{
                transform: [{ scale: 1.15 }],
            }}
            onValuesChangeStart={() => onDragStart?.()}
            onValuesChange={(vals) => onLiveChange?.([vals[0], vals[1]])}
            onValuesChangeFinish={(vals) => {
                onChange([vals[0], vals[1]]);
                onDragEnd?.();
            }}
        />
    );
}

const BudgetRangeSection = memo(function BudgetRangeSection({ budgetRange, onChange, onDragStart, onDragEnd }) {
    const [liveBudget, setLiveBudget] = useState(budgetRange);

    useEffect(() => {
        setLiveBudget(budgetRange);
    }, [budgetRange]);

    const budgetLabel = `${formatBudget(liveBudget[0])} - ${formatBudget(liveBudget[1])}${liveBudget[1] >= BUDGET_MAX ? '+' : ''}`;

    return (
        <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>Budget Range</Text>
                <Text style={{ fontSize: 13, color: '#4A43EC', fontWeight: '500' }}>{budgetLabel}</Text>
            </View>
            <RangeSlider
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                values={budgetRange}
                onChange={onChange}
                onLiveChange={setLiveBudget}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 16 }}>
                {['20L', '1Cr', '2Cr', '3Cr', '5Cr+'].map((l) => <Text key={l} style={{ fontSize: 11, color: '#9CA3AF' }}>{l}</Text>)}
            </View>
        </>
    );
});

const AreaRangeSection = memo(function AreaRangeSection({ areaRange, onChange, onDragStart, onDragEnd }) {
    const [liveArea, setLiveArea] = useState(areaRange);

    useEffect(() => {
        setLiveArea(areaRange);
    }, [areaRange]);

    const areaLabel = `${liveArea[0]} - ${liveArea[1]}${liveArea[1] >= AREA_MAX ? '+' : ''}`;

    return (
        <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>Build-up Area in sq.ft.</Text>
                <Text style={{ fontSize: 13, color: '#4A43EC', fontWeight: '500' }}>{areaLabel}</Text>
            </View>
            <RangeSlider
                min={AREA_MIN}
                max={AREA_MAX}
                values={areaRange}
                onChange={onChange}
                onLiveChange={setLiveArea}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 16 }}>
                {['0', '1667', '3333', '5000+'].map((l) => <Text key={l} style={{ fontSize: 11, color: '#9CA3AF' }}>{l}</Text>)}
            </View>
        </>
    );
});

function ChipButton({ label, selected, onPress, disabled }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={{
                borderWidth: 1,
                borderColor: selected ? '#4A43EC' : '#E5E7EB',
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginRight: 8,
                marginBottom: 8,
                backgroundColor: '#fff',
                opacity: disabled ? 0.4 : 1,
            }}
        >
            <Text style={{ color: selected ? '#4A43EC' : '#374151', fontSize: 13, fontWeight: selected ? '600' : '400' }}>{label}</Text>
        </TouchableOpacity>
    );
}

function CheckBox({ label, checked, onPress }) {
    return (
        <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginRight: 10, marginBottom: 8, width: 140 }}>
            <View style={{ width: 18, height: 18, borderRadius: 3, borderWidth: 1.5, borderColor: checked ? '#4A43EC' : '#9CA3AF', backgroundColor: checked ? '#4A43EC' : '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={{ fontSize: 13, color: '#374151', flexShrink: 1 }}>{label}</Text>
        </TouchableOpacity>
    );
}

export default function FilterModal() {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { isOpen, address, locationCoordinates, tags, propertyTypes, propertySubTypes, budgetRange, areaRange, possessionStatus } = useSelector((state) => state.filter);
    const [localAddress, setLocalAddress] = useState(address);
    const [geocoding, setGeocoding] = useState(false);
    const subTypeEnabled = propertyTypes.some((t) => SUB_TYPE_ELIGIBLE_PROPERTY_TYPES.includes(t));
    const [sliderDragging, setSliderDragging] = useState(false);
    const handleSliderDragStart = () => setSliderDragging(true);
    const handleSliderDragEnd = () => setSliderDragging(false);

    useEffect(() => {
        if (!subTypeEnabled && propertySubTypes.length > 0) {
            dispatch(clearSubTypes());
        }
    }, [dispatch, propertySubTypes.length, subTypeEnabled]);
    const sheetProgress = useRef(new Animated.Value(1)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const animateOpen = () => {
        Animated.sequence([
            Animated.timing(sheetProgress, {
                toValue: 0,
                duration: 460,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 160,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    };

    useEffect(() => {
        if (!isOpen) {
            sheetProgress.stopAnimation();
            backdropOpacity.stopAnimation();
            sheetProgress.setValue(1);
            backdropOpacity.setValue(0);
            return;
        }
        setLocalAddress(address);
    }, [address, backdropOpacity, isOpen, sheetProgress]);

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="none"
            statusBarTranslucent
            onShow={animateOpen}
            onRequestClose={() => dispatch(closeFilter())}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1, justifyContent: "flex-end" }}
            >
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity, backgroundColor: "rgba(0,0,0,0.35)" }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => dispatch(closeFilter())} />
                </Animated.View>
                <Animated.View style={{ maxHeight: "92%", backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 700] }) }] }}>
                    <View style={{ alignItems: "center", paddingTop: 8 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: "#D1D5DB" }} />
                    </View>

                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
                        <TouchableOpacity onPress={() => dispatch(closeFilter())}>
                            <Ionicons name="close" size={22} color="#374151" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827' }}>Filters</Text>
                        <View style={{ width: 22 }} />
                    </View>

                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={!sliderDragging}
                    >

                        {/* Address */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 }}>
                            <TextInput value={localAddress} onChangeText={setLocalAddress} placeholder="Address & Landmark" placeholderTextColor="#9CA3AF" style={{ flex: 1, fontSize: 14, color: '#111827' }} />
                            <TouchableOpacity
                                onPress={() => {
                                    dispatch(setAddress(localAddress));
                                    dispatch(closeFilter());
                                    router.push('/(screens)/location-picker');
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Choose location on map"
                                hitSlop={10}
                                style={{ padding: 6 }}
                            >
                                <MaterialCommunityIcons name="map-marker-radius-outline" size={22} color="#4A43EC" />
                            </TouchableOpacity>
                        </View>

                        {tags.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                                {tags.map((tag) => (
                                    <View key={tag} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 }}>
                                        <Text style={{ fontSize: 13, color: '#4A43EC', marginRight: 6 }}>{tag}</Text>
                                        <TouchableOpacity onPress={() => dispatch(removeTag(tag))}>
                                            <Ionicons name="close" size={14} color="#4A43EC" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Property Type */}
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 }}>Property Type</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                            {PROPERTY_TYPES.map((t) => <ChipButton key={t.type} label={t.label} selected={propertyTypes.includes(t.type)} onPress={() => dispatch(togglePropertyType(t.type))} />)}
                        </View>

                        {/* Sub Type */}
                        <Text style={{ fontSize: 15, fontWeight: '600', color: subTypeEnabled ? '#111827' : '#9CA3AF', marginTop: 8, marginBottom: 10 }}>Property Sub Type</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, opacity: subTypeEnabled ? 1 : 0.4 }}>
                            {SUB_TYPES.map((t) => (
                                <ChipButton
                                    key={t}
                                    label={t}
                                    selected={propertySubTypes.includes(t)}
                                    disabled={!subTypeEnabled}
                                    onPress={() => dispatch(toggleSubType(t))}
                                />
                            ))}
                        </View>

                        {/* Budget Range */}
                        <BudgetRangeSection
                            budgetRange={budgetRange}
                            onChange={(v) => dispatch(setBudgetRange(v))}
                            onDragStart={handleSliderDragStart}
                            onDragEnd={handleSliderDragEnd}
                        />

                        {/* Area Range */}
                        <AreaRangeSection
                            areaRange={areaRange}
                            onChange={(v) => dispatch(setAreaRange(v))}
                            onDragStart={handleSliderDragStart}
                            onDragEnd={handleSliderDragEnd}
                        />

                        {/* Possession Status */}
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 }}>Possession Status</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {POSSESSION.map((p) => <CheckBox key={p} label={p} checked={possessionStatus.includes(p)} onPress={() => dispatch(togglePossession(p))} />)}
                        </View>

                    </ScrollView>

                    {/* bottom area */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        paddingTop: 14,
                        paddingBottom: insets.bottom + 14,
                        borderTopWidth: 1,
                        borderTopColor: '#F3F4F6',
                        backgroundColor: '#fff',
                    }}>
                        <TouchableOpacity onPress={() => { dispatch(clearFilters()); setLocalAddress(''); }}>
                            <Text style={{ fontSize: 15, color: '#374151', textDecorationLine: 'underline' }}>Clear All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={geocoding}
                            onPress={async () => {
                                let selectedCoordinates = locationCoordinates;
                                const addressChanged = localAddress !== address;
                                
                                // If address is entered but no coordinates, try to geocode.
                                // If the text changed after choosing from the map, geocode the new text
                                // instead of keeping stale map coordinates.
                                if (localAddress && (!selectedCoordinates || addressChanged)) {
                                    setGeocoding(true);
                                    try {
                                        const geocodingService = getGeocodingService();
                                        if (geocodingService) {
                                            const coordinates = await geocodingService.geocodeAddress(localAddress);
                                            if (coordinates) {
                                                selectedCoordinates = coordinates;
                                            }
                                        }
                                    } catch (error) {
                                        console.log('Geocoding failed:', error);
                                        // Continue with text-based filtering if geocoding fails
                                    } finally {
                                        setGeocoding(false);
                                    }
                                }

                                if (selectedCoordinates && localAddress) {
                                    dispatch(setFilterLocation({
                                        address: localAddress,
                                        coordinates: selectedCoordinates,
                                    }));
                                } else {
                                    dispatch(setAddress(localAddress));
                                }
                                
                                dispatch(closeFilter());
                                router.push('/(screens)/property-listing');
                            }}
                            style={{ 
                                backgroundColor: geocoding ? '#9CA3AF' : '#4A43EC', 
                                borderRadius: 12, 
                                paddingHorizontal: 28, 
                                paddingVertical: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                            {geocoding && <ActivityIndicator size="small" color="#fff" />}
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                                {geocoding ? 'Locating...' : 'Apply Filters'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
