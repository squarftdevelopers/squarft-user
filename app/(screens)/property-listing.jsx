import { View, Text, TextInput, TouchableOpacity, FlatList, Image, Modal, Pressable, ScrollView, RefreshControl } from "react-native";
import { useState, useEffect } from "react"; 
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, FontAwesome, AntDesign } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import BudgetFilterModal from "../../components/BudgetFilterModal";
import BHKFilterModal from "../../components/BHKFilterModal";
import PossessionFilterModal from "../../components/PossessionFilterModal";
import { openBudgetFilter, setSearchQuery, clearNonTypeFilters, clearPropertyTypes, openFilter, clearFilters } from "../../store/slices/filterSlice";
import { fetchFeaturedProjectsThunk, fetchNearbyProjectsThunk, fetchProjectListThunk, setMapProjects } from "../../store/slices/projectSlice";
import EmptyPropertySection from "../../components/EmptyPropertySection";
import { fetchHighGrowthProjectsThunk } from "../../store/slices/propertiesSlice";
import { buildProjectAddress, buildProjectPrice, parseProjectPriceAmount, formatProjectPriceAmount } from "../../services/projectDisplay";
import ReraStatusBadge, { isReraApproved } from "../../components/ReraStatusBadge";
import { applyProjectFilters } from "../../services/projectFilters";

// Filter constants
const BUDGET_MIN = 2000000;
const BUDGET_MAX = 50000000;
const AREA_MIN = 0;
const AREA_MAX = 5000;
const normalizeText = (value) => String(value ?? '').toLowerCase().trim();
const cleanDisplayText = (value) => {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!text || ['none', 'null', 'undefined'].includes(text.toLowerCase())) return '';
    return text;
};

const getNumber = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const number = Number(String(value).replace(/[^0-9.]/g, ''));
        if (Number.isFinite(number) && number > 0) return number;
    }
    return null;
};

const getProjectPriceRange = (project) => {
    const variantPrices = collectVariantPrices(project);
    const min = firstProjectPrice(
        project.price_from,
        project.min_price,
        project.budgetMin,
        project.priceMin,
        project.base_price,
        project.property_min_price,
        project.inventory_min_price,
        project.display_price,
        project.priceRange,
        project.price_range,
        project.priceINR,
        project.price,
    ) ?? (variantPrices.length ? Math.min(...variantPrices) : null);
    const max = firstProjectPrice(
        project.price_to,
        project.max_price,
        project.budgetMax,
        project.priceMax,
        project.property_max_price,
        project.inventory_max_price,
        project.display_price,
        project.priceRange,
        project.price_range,
        project.priceINR,
        project.price,
    ) ?? (variantPrices.length ? Math.max(...variantPrices) : min);
    return { min, max };
};

const firstProjectPrice = (...values) => {
    for (const value of values) {
        const amount = parseProjectPriceAmount(value);
        if (amount) return amount;
    }
    return null;
};

const getSortPrice = (project) => {
    const priceRange = getProjectPriceRange(project);
    return priceRange.min || priceRange.max || null;
};

const getCreatedTime = (project) => {
    const value = project.created_at || project.createdAt || project.updated_at || project.updatedAt;
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
};

const getNestedUnits = (project) => [
    ...(Array.isArray(project.variants) ? project.variants : []),
    ...(Array.isArray(project.floorPlans) ? project.floorPlans : []),
    ...(Array.isArray(project.floor_plans) ? project.floor_plans : []),
    ...(Array.isArray(project.properties) ? project.properties : []),
    ...(Array.isArray(project.units) ? project.units : []),
    ...(Array.isArray(project.inventory_units) ? project.inventory_units : []),
    ...(Array.isArray(project.inventory_configurations) ? project.inventory_configurations : []),
];

const collectVariantPrices = (project) =>
    getNestedUnits(project)
        .flatMap((unit) => [
            unit?.price,
            unit?.base_price,
            unit?.price_from,
            unit?.min_price,
            unit?.price_to,
            unit?.max_price,
            unit?.priceRange,
            unit?.price_range,
        ])
        .map(parseProjectPriceAmount)
        .filter(Boolean);

const getBhkValues = (project) => {
    const values = new Set();
    const fields = [
        project.bedrooms,
        project.bhk,
        project.bhk_config,
        project.configuration,
        project.configurations,
        project.configs,
        ...(Array.isArray(project.available_configurations) ? project.available_configurations : []),
        project.property_subtype,
        project.propertySubtype,
        project.sub_type,
        ...(Array.isArray(project.subTypes) ? project.subTypes : []),
        ...getNestedUnits(project).flatMap((unit) => [
            unit?.bedrooms,
            unit?.bhk,
            unit?.configuration,
            unit?.property_subtype,
            unit?.sub_type,
            unit?.type,
            unit?.title,
        ]),
    ];

    fields.forEach((field) => {
        const text = normalizeText(field);
        if (!text) return;

        const matches = text.match(/\d+\+?(?=\s*(?:bhk|bed|bedroom)\b)/g) || [];
        matches.forEach((match) => values.add(match.trim()));

        if (text.includes('bhk')) {
            const looseMatches = text.match(/\d+\+?/g) || [];
            looseMatches.forEach((match) => values.add(match.trim()));
        }

        const plainNumber = Number(text);
        if (Number.isFinite(plainNumber) && plainNumber > 0) values.add(String(plainNumber));
    });

    return values;
};

const getPossessionStatuses = (project) => {
    const values = [
        project.possessionStatus,
        project.possession_status,
        project.possession,
        project.possession_date,
        ...getNestedUnits(project).flatMap((unit) => [
            unit?.possessionStatus,
            unit?.possession_status,
            unit?.possession,
            unit?.possession_date,
        ]),
    ];

    const statuses = new Set();

    values.forEach((value) => {
        const text = normalizeText(value);
        if (!text) return;

        if (text.includes('ready') || text.includes('immediate')) {
            statuses.add('Ready to Move');
            return;
        }

        if (text.includes('under') || text.includes('construction') || text.includes('upcoming')) {
            statuses.add('Under Construction');
            return;
        }

        const parsedDate = new Date(value);
        if (!Number.isNaN(parsedDate.getTime())) {
            statuses.add(parsedDate.getTime() <= Date.now() ? 'Ready to Move' : 'Under Construction');
        }
    });

    return statuses;
};

const getPossessionStatus = (project) => {
    const statuses = getPossessionStatuses(project);
    if (statuses.size > 0) return [...statuses][0];

    const text = normalizeText(project.possessionStatus || project.possession_status || project.possession || project.possession_date);
    if (!text) return '';
    if (text.includes('ready') || text.includes('immediate')) return 'Ready to Move';
    if (text.includes('under') || text.includes('construction')) return 'Under Construction';
    return project.possessionStatus || project.possession_status || project.possession || project.possession_date;
};

const hasRera = (project) => isReraApproved(project);

const getDeveloperName = (project) =>
    cleanDisplayText(
        project.organisation_name
        || project.org_name
        || project.developer_name
        || project.builder_name
        || project.developer
        || project.builder
        || (typeof project.organisation === 'object' ? project.organisation?.name : project.organisation)
    );

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getPossessionLabel = (project) => {
    const raw = project.possession_date || project.possessionDate;
    if (raw) {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
            return `Possession: ${MONTH_LABELS[parsed.getMonth()]}, ${parsed.getFullYear()}`;
        }
    }

    const status = getPossessionStatus(project);
    return cleanDisplayText(status);
};

const getAvgPricePerSqft = (project) => {
    const amount = getNumber(project.avg_price_per_sqft, project.avgPricePerSqft);
    if (!amount) return '';
    return `Avg Price per sq ft: ${formatProjectPriceAmount(amount)}`;
};

const CONFIG_PROPERTY_TYPES = new Set(['apartment', 'flat', 'rowhouse', 'villa']);

const getPropertyTypeLabel = (rawType) => {
    const text = normalizeText(rawType);
    if (!text) return '';
    if (text.includes('apartment') || text.includes('flat')) return 'Apartment';
    if (text.includes('rowhouse') || text.includes('row house')) return 'Rowhouse';
    if (text.includes('villa')) return 'Villa';
    if (text.includes('plot') || text.includes('land')) return 'Plot';
    if (text.includes('shop')) return 'Shop';
    if (text.includes('office')) return 'Office';
    if (text.includes('showroom')) return 'Showroom';
    return cleanDisplayText(rawType).replace(/\b\w/g, (char) => char.toUpperCase());
};

const getProjectConfigLabel = (project) => {
    const rawType = project.property_type
        || project.property_subtype
        || project.sub_type
        || project.type
        || (Array.isArray(project.available_subtypes) ? project.available_subtypes[0] : project.available_subtypes);
    const typeLabel = getPropertyTypeLabel(rawType);
    if (!typeLabel) return '';

    const normalizedRaw = normalizeText(rawType);
    const shouldCombineWithBhk = [...CONFIG_PROPERTY_TYPES].some((type) => normalizedRaw.includes(type));
    if (!shouldCombineWithBhk) return typeLabel;

    const bhkValues = [...getBhkValues(project)]
        .filter((value) => Number.isFinite(parseFloat(value)))
        .sort((a, b) => parseFloat(a) - parseFloat(b));

    if (!bhkValues.length) return typeLabel;
    return `${bhkValues.join(', ')} BHK ${typeLabel}`;
};

const getUnitConfigRows = (project) => {
    const rows = new Map();

    const addRow = (label, priceValue) => {
        const cleanLabel = cleanDisplayText(label);
        if (!cleanLabel) return;
        const amount = parseProjectPriceAmount(priceValue);
        const key = cleanLabel.toLowerCase();
        const existing = rows.get(key) || { label: cleanLabel, min: null, max: null };
        if (amount) {
            existing.min = existing.min === null ? amount : Math.min(existing.min, amount);
            existing.max = existing.max === null ? amount : Math.max(existing.max, amount);
        }
        rows.set(key, existing);
    };

    getNestedUnits(project).forEach((unit) => {
        const rawLabel = unit?.configuration || unit?.bhk || unit?.title || unit?.property_subtype || unit?.type;
        const rawType = unit?.inventory_type || unit?.property_type || project.property_type || project.type || project.available_subtypes?.[0];
        const typeLabel = getPropertyTypeLabel(rawType);
        const label = rawLabel && typeLabel && !normalizeText(rawLabel).includes(normalizeText(typeLabel))
            ? `${rawLabel} ${typeLabel}`
            : rawLabel;
        const minPrice = unit?.price_from ?? unit?.min_price ?? unit?.base_price ?? unit?.price;
        const maxPrice = unit?.price_to ?? unit?.max_price ?? unit?.price;
        addRow(label, minPrice);
        addRow(label, maxPrice);
    });

    const nestedRows = [...rows.values()].filter((row) => row.min || row.max);
    if (nestedRows.length > 0) return nestedRows;

    const configLabel = getProjectConfigLabel(project);
    if (configLabel) {
        const priceRange = getProjectPriceRange(project);
        addRow(configLabel, priceRange.min);
        addRow(configLabel, priceRange.max);
    }

    return [...rows.values()].filter((row) => row.min || row.max);
};

const formatConfigPrice = (row) => {
    if (row.min && row.max && row.min !== row.max) {
        return `${formatProjectPriceAmount(row.min)} - ${formatProjectPriceAmount(row.max)}`;
    }
    return formatProjectPriceAmount(row.min || row.max);
};

function applyFilters(projects, filter) {
    return applyProjectFilters(projects, filter);
}

function ProjectCard({ item }) {
    const title = item.name || item.title || item.project_name || 'Project';
    const location = item.display_location || buildProjectAddress(item) || cleanDisplayText(item.location || item.address);
    const price = item.display_price || buildProjectPrice(item);
    const image = item.cover_image_url || item.cover_image || item.image_url || item.image;
    const developerName = getDeveloperName(item);
    const possessionLabel = getPossessionLabel(item);
    const avgPriceLabel = getAvgPricePerSqft(item);
    const rera = hasRera(item);
    const configRows = getUnitConfigRows(item);
    const goToDetail = () => router.push({ pathname: '/(screens)/project-detail', params: { id: item.id, slug: item.slug } });

    return (
        <View
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6 mx-4"
        >
            <TouchableOpacity activeOpacity={0.97} onPress={goToDetail}>
                <View className="h-40 w-full relative bg-gray-200">
                    {image
                        ? <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" />
                        : <View className="w-full h-full bg-gray-200 items-center justify-center">
                            <MaterialCommunityIcons name="office-building-outline" size={32} color="#9CA3AF" />
                          </View>
                    }
                    {developerName ? (
                        <View className="absolute top-0 left-0 right-0 px-3 py-2 bg-black/45">
                            <Text className="text-white text-[11px] font-manrope-extrabold" numberOfLines={1}>{developerName}</Text>
                        </View>
                    ) : null}
                </View>

                <View className="px-3 pt-3 pb-2">
                    <View className="flex-row items-center mb-1">
                        {possessionLabel ? (
                            <Text className="text-[11px] text-[#6B7280] font-manrope flex-1" numberOfLines={1}>
                                Possession: {possessionLabel}
                            </Text>
                        ) : <View className="flex-1" />}
                        {avgPriceLabel ? (
                            <Text className="text-[11px] text-[#6B7280] font-manrope" numberOfLines={1}>
                                {avgPriceLabel}
                            </Text>
                        ) : null}
                    </View>

                    <View className="flex-row items-center mb-1 gap-2">
                        <Text className="text-[15px] font-manrope-extrabold text-[#111827] flex-1" numberOfLines={1}>{title}</Text>
                        {rera ? <ReraStatusBadge approved /> : null}
                    </View>

                    <Text className="text-[10px] text-[#6B7280] font-manrope mb-2" numberOfLines={1}>
                        {location || item.pincode}
                    </Text>

                    <View style={{ borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#E5E7EB' }} className="mb-2" />

                    {configRows.length > 0 ? (
                        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 }}>
                            <View style={{ flex: 1, paddingRight: 12 }}>
                                {configRows.filter((_, index) => index % 2 === 0).map((row, index) => (
                                    <View key={row.label} style={{ marginTop: index > 0 ? 12 : 0 }}>
                                        <Text className="text-[13px] text-[#374151] font-manrope-extrabold uppercase" numberOfLines={1}>
                                            {row.label}
                                        </Text>
                                        <Text className="text-[14px] text-[#111827] font-manrope-extrabold mt-1" numberOfLines={1}>
                                            {formatConfigPrice(row)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            <View style={{ width: 1, backgroundColor: '#E5E7EB', alignSelf: 'stretch' }} />
                            <View style={{ flex: 1, paddingLeft: 12 }}>
                                {configRows.filter((_, index) => index % 2 === 1).map((row, index) => (
                                    <View key={row.label} style={{ marginTop: index > 0 ? 12 : 0 }}>
                                        <Text className="text-[13px] text-[#374151] font-manrope-extrabold uppercase" numberOfLines={1}>
                                            {row.label}
                                        </Text>
                                        <Text className="text-[14px] text-[#111827] font-manrope-extrabold mt-1" numberOfLines={1}>
                                            {formatConfigPrice(row)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <Text className="text-[13px] text-[#4A43EC] font-manrope-extrabold mb-1" numberOfLines={1}>
                            {price || 'Price on request'}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>

            <View className="px-3 pb-3">
                <TouchableOpacity
                    onPress={goToDetail}
                    className="w-full border border-[#4A43EC] rounded-xl py-2 items-center justify-center"
                >
                    <Text className="text-[#4A43EC] font-manrope-extrabold text-[13px]">View details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function PropertyListing() {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const filter = useSelector((state) => state.filter);
    const { list: apiProjects, featured, nearby, loading: projectsLoading, featuredLoading, nearbyLoading } = useSelector((state) => state.project);
    const { highGrowthProjects, highGrowthLocalities, highGrowthLoading, highGrowthCity } = useSelector((state) => state.properties);
    const unreadNotifications = useSelector((s) => s.notifications?.list?.filter((item) => !item.watched).length ?? 0);
    const { category, focus, featured: featuredParam, recommended, highGrowth, nearby: nearbyParam, latitude, longitude, locationName, branchId, branchName, locationFilter } = useLocalSearchParams();
    const selectedBranchId = Array.isArray(branchId) ? branchId[0] : branchId;
    const selectedBranchName = (Array.isArray(branchName) ? branchName[0] : branchName) || 'Branch projects';
    const isFocusMode = focus === '1';
    const isFeaturedMode = featuredParam === '1';
    const isRecommendedMode = recommended === '1';
    const isHighGrowthMode = highGrowth === '1';
    const isNearbyMode = nearbyParam === '1';
    const isLocationFilterMode = locationFilter === '1';
    const nearbyLocationName = Array.isArray(locationName) ? locationName[0] : locationName;
    const [localQuery, setLocalQuery] = useState(isNearbyMode ? (nearbyLocationName || filter.searchQuery || '') : (filter.searchQuery || ''));
    const [sortKey, setSortKey] = useState('relevance');
    const [sortOpen, setSortOpen] = useState(false);
    const [bhkOpen, setBhkOpen] = useState(false);
    const [possessionOpen, setPossessionOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            const promises = [dispatch(fetchProjectListThunk())];
            if (isFocusMode || isFeaturedMode) {
                promises.push(dispatch(fetchFeaturedProjectsThunk()));
            }
            if (isHighGrowthMode) {
                promises.push(dispatch(fetchHighGrowthProjectsThunk()));
            }
            if (isNearbyMode && latitude && longitude) {
                promises.push(dispatch(fetchNearbyProjectsThunk({
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                })));
            }
            await Promise.allSettled(promises);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', () => {
            dispatch(clearFilters());
        });
        return unsubscribe;
    }, [dispatch, navigation]);

    // Fetch project list on mount if not already loaded
    useEffect(() => {
        dispatch(fetchProjectListThunk());
    }, [dispatch]);

    useEffect(() => {
        if (isFocusMode || isFeaturedMode) {
            dispatch(fetchFeaturedProjectsThunk());
        }
    }, [dispatch, isFocusMode, isFeaturedMode]);

    useEffect(() => {
        if (isHighGrowthMode) {
            dispatch(fetchHighGrowthProjectsThunk());
        }
    }, [dispatch, isHighGrowthMode]);

    useEffect(() => {
        if (!isNearbyMode || !latitude || !longitude) return;

        dispatch(fetchNearbyProjectsThunk({
            latitude: Number(latitude),
            longitude: Number(longitude),
        }));
    }, [dispatch, isNearbyMode, latitude, longitude]);

    // Sync search input with Redux searchQuery when navigated from SearchOverlay
    useEffect(() => {
        setLocalQuery(isNearbyMode ? (nearbyLocationName || filter.searchQuery || '') : (filter.searchQuery || ''));
    }, [filter.searchQuery, isNearbyMode, nearbyLocationName]);

    const SORT_OPTIONS = [
        { key: 'relevance', label: 'Relevance' },
        { key: 'newest', label: 'Newest First' },
        { key: 'price_asc', label: 'Price - Low to High' },
        { key: 'price_desc', label: 'Price - High to Low' },
    ];

    const handleSearch = (text) => {
        setLocalQuery(text);
        dispatch(setSearchQuery(text));
    };

    const highGrowthSource = highGrowthProjects?.length > 0 ? highGrowthProjects : highGrowthLocalities;
    const highGrowthList = (highGrowthSource || []).map((project) => ({
        ...project,
        title: project.name || project.title || 'Project',
        location: project.location || buildProjectAddress(project),
        display_price: project.price_range || project.display_price || buildProjectPrice(project),
        priceRange: project.price_range || project.priceRange,
        priceINR: project.price_range || project.priceINR,
        image: project.cover_image || project.cover_image_url || project.image,
        cover_image_url: project.cover_image || project.cover_image_url || project.image,
        bhk: project.bhk_config || project.bhk,
        possessionStatus: project.possession || project.possessionStatus,
    }));

    const projects = (isFocusMode || isFeaturedMode)
        ? featured
        : (isHighGrowthMode ? highGrowthList : (isNearbyMode ? nearby : apiProjects));
    const effectiveFilter = (isFocusMode || isFeaturedMode || isRecommendedMode || isHighGrowthMode)
        ? {
            ...filter,
            propertyTypes: [],
            propertySubTypes: [],
            budgetRange: [BUDGET_MIN, BUDGET_MAX],
            areaRange: [AREA_MIN, AREA_MAX],
            possessionStatus: [],
            reraOnly: false,
        }
        : (isNearbyMode ? { ...filter, searchQuery: '' } : filter);
    const filtered = applyFilters(projects, {
        ...effectiveFilter,
        branchId: selectedBranchId,
        ...(isLocationFilterMode ? { locationCoordinates: { latitude: Number(latitude), longitude: Number(longitude) } } : {}),
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sortKey === 'newest') return getCreatedTime(b) - getCreatedTime(a);

        if (sortKey === 'price_asc' || sortKey === 'price_desc') {
            const priceA = getSortPrice(a);
            const priceB = getSortPrice(b);
            if (priceA === null && priceB === null) return 0;
            if (priceA === null) return 1;
            if (priceB === null) return -1;
            return sortKey === 'price_asc' ? priceA - priceB : priceB - priceA;
        }

        return 0;
    });

    const activeSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? 'Relevance';
    const handleOpenMap = () => {
        dispatch(setMapProjects(sorted));
        const title = selectedBranchId ? selectedBranchName : isLocationFilterMode ? 'Nearby Projects' : isFeaturedMode
            ? 'Featured Projects'
            : (isRecommendedMode
                ? 'Recommended Projects'
                : (isHighGrowthMode
                    ? `High Growth Projects${highGrowthCity ? ` in ${highGrowthCity}` : ''}`
                    : (isFocusMode ? 'Project in Focus' : (isNearbyMode ? 'Nearby Projects' : 'Project Page'))));
        router.push({
            pathname: "/(screens)/map-view",
            params: {
                title,
            },
        });
    };

    const pageTitle = selectedBranchId ? selectedBranchName : isLocationFilterMode ? 'Nearby Projects' : isFeaturedMode
        ? 'Featured Projects'
        : (isRecommendedMode
            ? 'Recommended Projects'
            : (isHighGrowthMode
                ? `High Growth Projects${highGrowthCity ? ` in ${highGrowthCity}` : ''}`
                : (isFocusMode ? 'Project in Focus' : (isNearbyMode ? 'Nearby Projects' : 'Project Page'))));

    const listLoading = isHighGrowthMode
        ? highGrowthLoading
        : ((isFocusMode || isFeaturedMode) ? featuredLoading : (isNearbyMode ? nearbyLoading : projectsLoading));

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <BudgetFilterModal />
            <BHKFilterModal visible={bhkOpen} onClose={() => setBhkOpen(false)} />
            <PossessionFilterModal visible={possessionOpen} onClose={() => setPossessionOpen(false)} />

            <Image
                source={require('../../assets/images/blur (3).png')}
                pointerEvents="none"
                style={{ position: 'absolute', left: -40, top: -30, width: 570, height: 360, opacity: 0.6, zIndex: -1 }}
            />
            <Image
                source={require('../../assets/images/blur (5).png')}
                pointerEvents="none"
                style={{ position: 'absolute', left: 216, top: 23, width: 241, height: 241, borderRadius: 1000, opacity: 1, zIndex: -1 }}
            />

            <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'transparent', zIndex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
                        <Ionicons name="chevron-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 }}>
                        {pageTitle}
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/(screens)/notifications")}
                        accessibilityRole="button"
                        accessibilityLabel="Open notifications"
                        style={{ position: 'relative' }}
                    >
                        <Ionicons name="notifications-outline" size={22} color="#374151" />
                        {unreadNotifications > 0 && (
                            <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: '#FF3B30', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>
                                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 44, gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
                        <FontAwesome name="search" size={16} color="#4A43EC" />
                        <TextInput
                            value={localQuery}
                            onChangeText={handleSearch}
                            placeholder="Search..."
                            placeholderTextColor="#9CA3AF"
                            style={{ flex: 1, fontSize: 14, color: '#111827' }}
                        />
                    </View>
                      <TouchableOpacity onPress={() => dispatch(openFilter())} className="flex-row items-center bg-[#4A43EC] rounded-xl px-5 h-[44px] w-[53px] gap-2">
                                  <AntDesign name="spotify" size={18} color="#7F88E5" />
                                </TouchableOpacity>
                    <TouchableOpacity onPress={handleOpenMap} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#4A43EC', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="map-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ flexDirection: 'row', gap: 8 }}
                >
                    <TouchableOpacity
                        onPress={() => { dispatch(clearNonTypeFilters()); dispatch(clearPropertyTypes()); }}
                        style={{ backgroundColor: '#4A43EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 }}
                    >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>View All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => dispatch(openBudgetFilter())}
                        style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff', gap: 4 }}
                    >
                        <Text style={{ fontSize: 12, color: '#374151' }}>Budget</Text>
                        <Ionicons name="chevron-down" size={12} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setBhkOpen(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: filter.propertySubTypes.length > 0 ? '#4A43EC' : '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: filter.propertySubTypes.length > 0 ? '#F5F3FF' : '#fff', gap: 4 }}
                    >
                        <Text style={{ fontSize: 12, color: filter.propertySubTypes.length > 0 ? '#4A43EC' : '#374151' }}>
                            {filter.propertySubTypes.length > 0 ? filter.propertySubTypes.join(', ') : 'BHK'}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={filter.propertySubTypes.length > 0 ? '#4A43EC' : '#6B7280'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setPossessionOpen(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: (filter.possessionStatus.length > 0 || filter.reraOnly) ? '#4A43EC' : '#E5E7EB',
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            backgroundColor: (filter.possessionStatus.length > 0 || filter.reraOnly) ? '#F5F3FF' : '#fff',
                            gap: 4,
                        }}
                    >
                        <Text style={{ fontSize: 12, color: (filter.possessionStatus.length > 0 || filter.reraOnly) ? '#4A43EC' : '#374151' }}>
                            {filter.possessionStatus.length > 0 ? filter.possessionStatus.join(', ') : 'Possession'}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={(filter.possessionStatus.length > 0 || filter.reraOnly) ? '#4A43EC' : '#6B7280'} />
                    </TouchableOpacity>
                </ScrollView>

            </View>
            <View style={{ height: 1, backgroundColor: '#E5E7EB', width: '85%', alignSelf: 'center', marginVertical: 4, marginBottom: 8, marginTop: 4, }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>
                    <Text style={{ fontWeight: '700', color: '#111827' }}>{sorted.length}</Text>{isFeaturedMode ? ' Featured Projects' : (isRecommendedMode ? ' Recommended Projects' : (isHighGrowthMode ? ' High Growth Projects' : (isFocusMode ? ' Projects in Focus' : (category ? ` ${category}s` : ' Premium Projects'))))}
                </Text>
                <TouchableOpacity onPress={() => setSortOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12, color: '#4A43EC', fontWeight: '600' }}>SORT BY: {activeSortLabel.toUpperCase()}</Text>
                    <MaterialCommunityIcons name="sort" size={14} color="#4A43EC" />
                </TouchableOpacity>
            </View>

            {/* Sort dropdown modal */}
            <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setSortOpen(false)}>
                    <View style={{
                        position: 'absolute', right: 16, top: 180,
                        backgroundColor: '#fff', borderRadius: 14,
                        overflow: 'hidden', minWidth: 210,
                        shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
                    }}>
                        {SORT_OPTIONS.map((opt, i) => (
                            <TouchableOpacity
                                key={opt.key}
                                onPress={() => { setSortKey(opt.key); setSortOpen(false); }}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                    paddingHorizontal: 16, paddingVertical: 14,
                                    borderBottomWidth: i < SORT_OPTIONS.length - 1 ? 1 : 0,
                                    borderBottomColor: '#F3F4F6',
                                    backgroundColor: sortKey === opt.key ? '#F5F3FF' : '#fff',
                                }}
                            >
                                <Text style={{ fontSize: 14, color: sortKey === opt.key ? '#4A43EC' : '#374151', fontWeight: sortKey === opt.key ? '600' : '400' }}>
                                    {opt.label}
                                </Text>
                                {sortKey === opt.key && <Ionicons name="checkmark" size={16} color="#4A43EC" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            <FlatList
                data={sorted}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ProjectCard item={item} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#4A43EC"]}
                        tintColor="#4A43EC"
                    />
                }
                ListEmptyComponent={
                    listLoading ? (
                        <View style={{ alignItems: 'center', marginTop: 60 }}>
                            <Text style={{ fontSize: 15, color: '#9CA3AF' }}>
                                {isFeaturedMode ? 'Loading featured projects...' : (isHighGrowthMode ? 'Loading high growth projects...' : (isFocusMode ? 'Loading projects in focus...' : (isNearbyMode ? 'Finding nearby projects...' : 'Loading projects...')))}
                            </Text>
                        </View>
                    ) : (
                        <EmptyPropertySection
                            variant="list"
                            icon="home-search-outline"
                            title={selectedBranchId ? "No Projects Match in This Branch" : "No Properties Match"}
                            description={selectedBranchId ? "Try another branch or adjust your search and filters." : "We couldn't find any properties matching your current filters. Try resetting filters to explore all available projects."}
                            actionText={selectedBranchId || isLocationFilterMode ? "Choose another location" : "Reset All Filters"}
                            onAction={() => {
                                if (selectedBranchId || isLocationFilterMode) {
                                    router.back();
                                    return;
                                }
                                dispatch(clearFilters());
                                setLocalQuery('');
                            }}
                        />
                    )
                }
            />
        </View>
    );
}
