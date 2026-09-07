import { useRef, useState, useEffect, useCallback } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image, Keyboard, Linking,
} from "react-native";
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, Easing, FadeIn, Layout,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons, FontAwesome, AntDesign } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { openFilter, setSearchQuery } from "../store/slices/filterSlice";
import { getTrendingSearchesThunk, getTrendingLocationsThunk, getSearchHistoryThunk, saveSearchHistoryThunk, deleteSearchHistoryThunk, clearAllSearchHistoryThunk, searchPropertiesAndProjectsThunk } from "../store/slices/searchSlice";
import { fetchNearbyProjectsThunk, fetchProjectListThunk } from "../store/slices/projectSlice";
import { applyProjectFilters } from "../services/projectFilters";



const SEARCH_HISTORY = [
    { id: '1', icon: 'history', title: 'Serenity Reserve', subtitle: '2 hours ago • Scheme No 140' },
    { id: '2', icon: 'location-on', title: 'Vijay Nagar', subtitle: 'Yesterday • Nipania, Indore' },
    { id: '3', icon: 'domain', title: 'Luxury Villa in Indore', subtitle: '3 days ago • Scheme No. 136' },
    { id: '4', icon: 'domain', title: 'Bangalore Tech Park 3BHK', subtitle: '1 week ago • Whitefield' },
];

const TRENDING_SEARCHES = [
    '3 BHK in Indore',
    'Penthouse with Sea View',
    'Villas in Goa',
    'Studio Apartments',
];

const ALL_SUGGESTIONS = [
    '2 BHK in Indore', '3 BHK in Indore', 'Flat in Vijay Nagar',
    'Villa in Mumbai', 'Sea View Apartment', 'Penthouse Mumbai',
    'Luxury Villa Pune', 'Office Space Pune', 'Plot in Baner',
    'Tech Park Office Bangalore', '3BHK Whitefield', 'Studio Apartment Bangalore',
    '1 BHK South Delhi', 'Independent House Delhi', 'Builder Floor Delhi',
    'Villas in Goa', 'Beach House Goa', 'Studio Goa',
    'Dubai Marina Apartment', 'London Zone 1 Flat', 'Singapore Condo',
    'Serenity Reserve', 'Sumeru Sky Heights', 'The Grand Towers',
    'Green Valley Residency', 'Nipania Crown', 'Palasia Pinnacle',
    'Corridor Luxe', 'VN Comfort Homes', 'Casa Verde Villas', 'Rajwada Green Plots',
    'Scheme No 140 Indore', 'Bypass Road Indore', 'AB Road Indore',
    'Nipania Indore', 'Super Corridor Indore', 'Vijay Nagar Indore',
];

const iconMap = {
    history: 'history',
    'location-on': 'map-marker-outline',
    domain: 'office-building-outline',
};

const TIMING = { duration: 250, easing: Easing.out(Easing.ease) };
const LOCATION_TIMEOUT_MS = 12000;

const withTimeout = (promise, timeoutMessage) =>
    Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(timeoutMessage)), LOCATION_TIMEOUT_MS);
        }),
    ]);

const loadExpoLocation = () => {
    try {
        return { module: require('expo-location'), error: null };
    } catch (error) {
        return { module: null, error };
    }
};

const promptToEnableLocationServices = async (Location) => {
    if (Platform.OS === 'android' && typeof Location.enableNetworkProviderAsync === 'function') {
        try {
            await Location.enableNetworkProviderAsync();
            return Location.hasServicesEnabledAsync();
        } catch (error) {
            console.log('Location services prompt dismissed:', error.message);
            return false;
        }
    }

    await new Promise((resolve) => {
        Alert.alert(
            'Turn on location services',
            'Location services are turned off. Open settings, turn on location, then return to SquarFT.',
            [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                {
                    text: 'Open settings',
                    onPress: async () => {
                        try {
                            await Linking.openSettings();
                        } finally {
                            resolve(false);
                        }
                    },
                },
            ],
        );
    });

    return false;
};

const formatLocationName = (place) => {
    if (!place) return '';

    const parts = [
        place.name,
        place.district,
        place.subregion,
        place.city,
        place.region,
    ]
        .map((part) => String(part || '').trim())
        .filter(Boolean);

    return [...new Set(parts)].slice(0, 3).join(', ');
};

const getSearchHistoryId = (item) => item?.id || item?.search_id || item?.history_id || null;


function HistoryIcon({ type }) {
    return (
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <MaterialCommunityIcons name={iconMap[type] || 'office-building-outline'} size={18} color="#4A43EC" />
        </View>
    );
}

function SectionLabel({ text, action, onActionPress }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 }}>
                {text}
            </Text>
            {action && (
                <TouchableOpacity onPress={onActionPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#4A43EC', letterSpacing: 0.5 }}>
                        {action}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function Divider({ left = 20 }) {
    return <View style={{ height: 0.5, backgroundColor: '#F3F4F6', marginLeft: left }} />;
}

function SearchHistoryItem({ item, index, total, onSelect, onDelete }) {
    return (
        <Animated.View entering={FadeIn.delay(index * 40).duration(200)} layout={Layout.springify()}>
            <TouchableOpacity onPress={() => onSelect(item.title)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
                <HistoryIcon type={item.icon} />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{item.subtitle}</Text>
                </View>
                {item.id ? (
                    <TouchableOpacity onPress={() => onDelete(item.source || item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                ) : null}
            </TouchableOpacity>
            {index < total - 1 && <Divider left={70} />}
        </Animated.View>
    );
}

function TrendingItem({ item, index, total, onSelect }) {
    return (
        <Animated.View entering={FadeIn.delay(index * 40).duration(200)} layout={Layout.springify()}>
            <TouchableOpacity onPress={() => onSelect(item)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 }}>
                <MaterialCommunityIcons name="trending-up" size={18} color="#4A43EC" />
                <Text style={{ fontSize: 14, color: '#374151' }}>{item}</Text>
            </TouchableOpacity>
            {index < total - 1 && <Divider left={50} />}
        </Animated.View>
    );
}

function SuggestionItem({ item, index, onPress }) {
    const location = [item.area, item.city].filter(Boolean).join(', ');
    return (
        <Animated.View entering={FadeIn.delay(index * 30).duration(180)} layout={Layout.springify()}>
            <TouchableOpacity onPress={() => onPress(item)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, gap: 12, backgroundColor: '#fff' }}>
                <FontAwesome name="search" size={14} color="#9CA3AF" />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: '#111827' }}>{item.title || 'Untitled listing'}</Text>
                    {location ? <Text style={{ marginTop: 2, fontSize: 12, color: '#9CA3AF' }}>{location}</Text> : null}
                </View>
                <MaterialCommunityIcons name="arrow-top-left" size={16} color="#9CA3AF" />
            </TouchableOpacity>
            <Divider left={50} />
        </Animated.View>
    );
}


function HistoryPanel({ onSelect, searchHistory, trendingSearches, trendingLocations, trendingLocationsLoading, onDeleteHistory, onClearAll }) {
    const opacity = useSharedValue(1);
    const translateY = useSharedValue(10);

    useEffect(() => {
        translateY.value = withTiming(0, TIMING);
        
    }, [searchHistory, trendingSearches]);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    // Format search history for display
    const formattedHistory = searchHistory.map((item, index) => ({
        id: getSearchHistoryId(item),
        key: getSearchHistoryId(item) || `${item.query_text || 'history'}-${item.searched_at || index}`,
        source: item,
        icon: 'history',
        title: item.query_text || 'Unknown search',
        subtitle: `${new Date(item.searched_at).toLocaleDateString()} • ${item.result_count || 0} results`,
    }));

    // Format trending searches
    const formattedTrending = trendingSearches.map(item => item.text);

    return (
        <Animated.View style={style}>
            {formattedHistory.length > 0 && (
                <>
                    <SectionLabel text="SEARCH HISTORY" action="Clear All" onActionPress={onClearAll} />
                    <View style={{ backgroundColor: '#fff' }}>
                        {formattedHistory.map((item, i) => (
                            <SearchHistoryItem key={item.key} item={item} index={i} total={formattedHistory.length} onSelect={onSelect} onDelete={onDeleteHistory} />
                        ))}
                    </View>
                </>
            )}

            {formattedTrending.length > 0 && (
                <>
                    <SectionLabel text="TRENDING SEARCHES" />
                    <View style={{ backgroundColor: '#fff' }}>
                        {formattedTrending.map((item, i) => (
                            <TrendingItem key={`trending-${i}`} item={item} index={i} total={formattedTrending.length} onSelect={onSelect} />
                        ))}
                    </View>
                </>
            )}

            {(trendingLocationsLoading || trendingLocations.length > 0) && (
                <>
                    <SectionLabel text="TRENDING LOCATIONS" />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 }}>
                        {trendingLocationsLoading ? (
                            <ActivityIndicator size="small" color="#4A43EC" />
                        ) : trendingLocations.map((location) => {
                            const label = location.text || [location.area, location.city].filter(Boolean).join(', ');
                            return (
                                <TouchableOpacity key={location.id || label} onPress={() => onSelect(location.area || location.city || label)} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' }}>
                                    <Text style={{ fontSize: 13, color: '#374151' }}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </>
            )}

            <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 20, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Image
        source={require('../assets/icons/app-icon.png')}
        style={{ width: 56, height: 56, borderRadius: 12 }}
        resizeMode="contain"
      />
                </View>
                <Text style={{ fontSize: 10, color: '#9CA3AF', letterSpacing: 2 }}>PREMIUM REAL ESTATE ENGINE</Text>
            </View>
        </Animated.View>
    );
}

function SuggestionsPanel({ suggestions, loading, onSelect }) {
    const opacity = useSharedValue(1);
    const translateY = useSharedValue(10);

    useEffect(() => {
        translateY.value = withTiming(0, TIMING);
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View style={style}>
            <SectionLabel text="SUGGESTIONS" />
            <View style={{ backgroundColor: '#fff' }}>
                {suggestions.map((item, i) => (
                    <SuggestionItem key={`${item.type || 'result'}-${item.id || i}`} item={item} index={i} onPress={onSelect} />
                ))}
                {loading && <ActivityIndicator style={{ paddingVertical: 24 }} size="small" color="#4A43EC" />}
                {!loading && suggestions.length === 0 && (
                    <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' }}>
                        <MaterialCommunityIcons name="magnify-close" size={32} color="#D1D5DB" />
                        <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8 }}>No results found</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}


export default function SearchOverlay({ value, onChangeText, onClose, insets }) {
    const dispatch = useDispatch();
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationStatus, setLocationStatus] = useState('');
    
    // Get data from Redux
    const { trendingSearches, trendingLocations, trendingLocationsLoading, searchHistory, suggestions, suggestionResultCount, suggestionsLoading } = useSelector(state => state.search);
    const { isLoggedIn, token } = useSelector(state => state.auth);
    const { list: projectList } = useSelector(state => state.project);
    const coordinates = useSelector(state => state.location.coordinates);

    const headerOpacity = useSharedValue(1);
    const headerY = useSharedValue(-8);

    // Fetch trending searches, history and project list on mount
    useEffect(() => {
        dispatch(getTrendingSearchesThunk());
        dispatch(getTrendingLocationsThunk());
        dispatch(fetchProjectListThunk());
        if (isLoggedIn && token) {
            
            dispatch(getSearchHistoryThunk());
        } else {
            
        }
    }, [isLoggedIn, token, dispatch]);

    useEffect(() => {
        headerY.value = withTiming(0, { duration: 200 });
    }, []);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
        transform: [{ translateY: headerY.value }],
    }));

    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (value.trim() === '') {
            setShowSuggestions(false);
            setDebouncedQuery('');
            return;
        }
        debounceRef.current = setTimeout(() => {
            setDebouncedQuery(value.trim());
            setShowSuggestions(true);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [value]);

    useEffect(() => {
        if (!debouncedQuery) return;
        dispatch(searchPropertiesAndProjectsThunk({ query: debouncedQuery, limit: 20, ...coordinates }));
    }, [coordinates, debouncedQuery, dispatch]);

    const localSuggestions = debouncedQuery
        ? applyProjectFilters(projectList, {
            searchQuery: debouncedQuery,
            address: '', locationCoordinates: null, propertyTypes: [], propertySubTypes: [],
            budgetRange: [2000000, 50000000], areaRange: [0, 5000], possessionStatus: [], reraOnly: false,
        }).slice(0, 20).map((project) => ({
            ...project,
            type: 'project',
            title: project.title || project.name,
        }))
        : [];
    const displayedSuggestions = localSuggestions.length > 0 ? localSuggestions : suggestions;

    const handleSubmitSearch = useCallback(() => {
        const searchTerm = value.trim();
        if (!searchTerm) return;
        dispatch(setSearchQuery(searchTerm));
        router.push('/(screens)/property-listing');
    }, [dispatch, value]);

    const handleSelect = useCallback((selection) => {
        const isResult = typeof selection === 'object' && selection !== null;
        const searchTerm = (value || (typeof selection === 'string' ? selection : selection?.title) || '').trim();
        if (!searchTerm) return;
        dispatch(setSearchQuery(searchTerm));
        onChangeText(searchTerm);
        
        const savedResultCount = Number(selection?.source?.result_count);
        const resultCount = Number.isFinite(savedResultCount) && savedResultCount > 0
            ? savedResultCount
            : Math.max(suggestionResultCount || 0, displayedSuggestions.length);
        
        // Save search to history if user is logged in
        if (isLoggedIn && token) {
            dispatch(saveSearchHistoryThunk({ 
                query_text: searchTerm, 
                filters: null, 
                result_count: resultCount 
            }));
        }
        
        if (isResult && selection.type === 'project' && selection.id) {
            router.push({
                pathname: '/(screens)/project-detail',
                params: { id: selection.id, slug: selection.slug || 'none' },
            });
            return;
        }

        if (isResult && selection.type === 'property' && selection.project_id) {
            router.push({
                pathname: '/(screens)/project-detail',
                params: { id: selection.project_id, slug: selection.project_slug || 'none' },
            });
            return;
        }

        router.push('/(screens)/property-listing');
    }, [isLoggedIn, token, dispatch, displayedSuggestions.length, onChangeText, suggestionResultCount, value]);

    const handleDeleteHistory = useCallback((itemOrId) => {
        const id = typeof itemOrId === 'string' ? itemOrId : getSearchHistoryId(itemOrId);
        if (!id) return;
        dispatch(deleteSearchHistoryThunk(itemOrId));
    }, [dispatch]);

    const handleClearAll = useCallback(() => {
        
        dispatch(clearAllSearchHistoryThunk());
    }, [dispatch]);

    const handleUseCurrentLocation = useCallback(async () => {
        if (locationLoading) return;

        try {
            Keyboard.dismiss();
            setLocationLoading(true);
            setLocationStatus('Requesting location permission...');
            const { module: Location, error: locationLoadError } = loadExpoLocation();

            if (!Location) {
                setLocationStatus('');
                Alert.alert(
                    'Location module not available',
                    locationLoadError?.message || 'Please rebuild and reinstall the app after installing expo-location, then try again.'
                );
                return;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setLocationStatus('');
                Alert.alert('Location permission needed', 'Please allow location access to find nearby projects.');
                return;
            }

            setLocationStatus('Finding your location...');
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setLocationStatus('Turning on location services...');
                const servicesEnabledAfterPrompt = await promptToEnableLocationServices(Location);
                if (!servicesEnabledAfterPrompt) {
                    setLocationStatus('');
                    return;
                }
            }

            let position = await Location.getLastKnownPositionAsync({
                maxAge: 60000,
                requiredAccuracy: 5000,
            });

            if (!position) {
                position = await withTimeout(
                    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                    'Location request timed out. Please try again from an open area or check GPS settings.'
                );
            }

            const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };
            dispatch(getTrendingSearchesThunk(coords));

            setLocationStatus('Detecting area...');
            let locationName = 'Current location';
            try {
                const places = await withTimeout(
                    Location.reverseGeocodeAsync(coords),
                    'Location name lookup timed out.'
                );
                locationName = formatLocationName(places?.[0]) || locationName;
            } catch (error) {
                console.log('Reverse geocode failed:', error.message);
            }

            setLocationStatus('Loading nearby projects...');
            const nearbyResponse = await dispatch(fetchNearbyProjectsThunk(coords)).unwrap();
            const resultCount = nearbyResponse?.data?.count ?? 0;
            dispatch(setSearchQuery(locationName));
            onChangeText(locationName);

            if (isLoggedIn && token) {
                dispatch(saveSearchHistoryThunk({
                    query_text: locationName,
                    filters: { latitude: coords.latitude, longitude: coords.longitude },
                    result_count: resultCount,
                }));
            }

            router.push({
                pathname: '/(screens)/property-listing',
                params: {
                    nearby: '1',
                    latitude: String(coords.latitude),
                    longitude: String(coords.longitude),
                    locationName,
                },
            });
        } catch (error) {
            setLocationStatus('');
            Alert.alert('Could not use current location', error.message || 'Please try again.');
        } finally {
            setLocationLoading(false);
        }
    }, [dispatch, isLoggedIn, locationLoading, onChangeText, token]);

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F9FAFB' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

            <Animated.View style={[headerStyle, { paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#F9FAFB' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',   borderWidth: 1,  borderColor: '#a3a0a0ff', }}>
                        <Ionicons name="chevron-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Search Property</Text>
                </View>

                <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 46, gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
                        <FontAwesome name="search" size={18} color="#4A43EC" />
                        <TextInput
                            ref={inputRef}
                            value={value}
                            onChangeText={onChangeText}
                            onSubmitEditing={handleSubmitSearch}
                            placeholder="Search..."
                            placeholderTextColor="#9CA3AF"
                            autoFocus
                            returnKeyType="search"
                            style={{ flex: 1, fontSize: 15, color: '#111827' }}
                        />
                        {value.length > 0 && (
                            <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => dispatch(openFilter())} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A43EC', borderRadius: 14, paddingHorizontal: 16, height: 46, gap: 6 }}>
                        <AntDesign name="spotify" size={18} color="#7F88E5" />
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Filters</Text>
                    </TouchableOpacity>
                </View>

                {/* Location options */}
                <View style={{ marginTop: 14, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth:1, borderColor: '#dfdcdfff' }}>
                    <TouchableOpacity
                        onPress={handleUseCurrentLocation}
                        disabled={locationLoading}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 }}
                    >
                        {locationLoading ? (
                            <ActivityIndicator size="small" color="#E8336D" />
                        ) : (
                            <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#E8336D" />
                        )}
                        <Text style={{ fontSize: 15, fontWeight: '500', color: '#E8336D' }}>
                            {locationLoading ? 'Finding nearby projects...' : 'Use my Current Location'}
                        </Text>
                    </TouchableOpacity>
                    {locationStatus ? (
                        <Text style={{ paddingHorizontal: 18, paddingBottom: 12, marginTop: -4, fontSize: 12, color: '#9CA3AF' }}>
                            {locationStatus}
                        </Text>
                    ) : null}
                    <View style={{    height: 1 ,marginHorizontal: 18, borderWidth:0.5, borderColor: '#ebe6ebff' }} />
                    <TouchableOpacity
                        onPress={() => router.push('/(screens)/location-picker')}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 }}
                    >
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={22} color="#E8336D" />
                        <Text style={{ fontSize: 15, fontWeight: '500', color: '#E8336D', flex: 1 }}>Choose location on map</Text>
                        <Ionicons name="chevron-forward" size={18} color="#E8336D" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <FlatList
                data={[]}
                keyExtractor={() => 'dummy'}
                renderItem={null}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    showSuggestions
                        ? <SuggestionsPanel key="suggestions" suggestions={displayedSuggestions} loading={suggestionsLoading && displayedSuggestions.length === 0} onSelect={handleSelect} />
                        : <HistoryPanel key="history" onSelect={handleSelect} searchHistory={searchHistory} trendingSearches={trendingSearches} trendingLocations={trendingLocations} trendingLocationsLoading={trendingLocationsLoading} onDeleteHistory={handleDeleteHistory} onClearAll={handleClearAll} />
                }
            />

        </KeyboardAvoidingView>
    );
}
