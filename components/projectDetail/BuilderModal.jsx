import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { fetchBuilderDetailsThunk, clearBuilder } from "../../store/slices/builderSlice";
import { fetchProjectListThunk } from "../../store/slices/projectSlice";
import { allProjects } from "../../data/projects";
import DetailFooter from "./DetailFooter";
import ReraStatusBadge, { isReraApproved } from "../ReraStatusBadge";
import SimpleBottomSheet from "../SimpleBottomSheet";
import EmptyPropertySection from "../EmptyPropertySection";

const POSSESSION_FILTERS = ["All", "In 3 yrs", "Ready To Move", "Under Construction"];

const getPossessionKey = (value) => {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    if (normalized.includes("ready")) return "ready_to_move";
    if (normalized.includes("in_3") || normalized.includes("3_year")) return "in_3_years";
    if (normalized.includes("under") || normalized.includes("construction") || normalized.includes("upcoming")) {
        return "under_construction";
    }

    return normalized;
};

const formatPossessionLabel = (value) => {
    const key = getPossessionKey(value);
    if (key === "ready_to_move") return "Ready to Move";
    if (key === "in_3_years") return "In 3 yrs";
    if (key === "under_construction") return "Under Construction";
    return value || "Project";
};

const FILTER_MAP = {
    "All": () => true,
    "In 3 yrs": (p) => getPossessionKey(p.possessionStatus) === "in_3_years",
    "Ready To Move": (p) => getPossessionKey(p.possessionStatus) === "ready_to_move",
    "Under Construction": (p) => getPossessionKey(p.possessionStatus) === "under_construction",
};

const formatCompactPrice = (value) => {
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
    return `\u20B9${amount.toLocaleString("en-IN")}`;
};

const getPriceText = (project) => {
    if (project.priceDisplay) return project.priceDisplay;
    if (project.price?.display) return project.price.display;
    if (project.isPriceOnRequest) return "Price on request";
    if (project.variants?.[0]?.priceRange) return project.variants[0].priceRange;
    if (project.avgPricePerSqft) return project.avgPricePerSqft;

    const from = formatCompactPrice(project.price_from ?? project.min_price ?? project.base_price);
    const to = formatCompactPrice(project.price_to ?? project.max_price);
    if (from && to && String(project.price_from) !== String(project.price_to)) return `${from} - ${to}`;
    return from || to || "Price on request";
};

const toTitleCase = (value) =>
    String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const getPropertyTypeText = (project) => {
    const rawType = project.propertyType
        || project.property_type
        || project.type
        || [project.property_subtype, project.configs]
            .flat()
            .find((value) => /(apartment|flat|plot|villa|house)/i.test(String(value || "")));

    if (!rawType) return "";

    const normalized = String(rawType).trim();
    const compact = normalized.toLowerCase();
    if (compact.includes("apartment") || compact.includes("flat")) return "Apartment";
    if (compact.includes("plot")) return "Plot";
    if (compact.includes("villa")) return "Villa";
    if (compact.includes("house")) return "House";

    const lastPart = normalized.split("/").filter(Boolean).pop();
    return toTitleCase(lastPart || normalized);
};

const extractBhkValues = (...values) => {
    const matches = [];

    values.flat().filter(Boolean).forEach((value) => {
        const text = String(value);
        const valueMatches = text.match(/\d+\+?(?=\s*BHK\b)|\d+\+?/gi) || [];
        valueMatches.forEach((match) => {
            const cleaned = match.trim();
            if (cleaned && !matches.includes(cleaned)) matches.push(cleaned);
        });
    });

    return matches;
};

const getBhkText = (project) => {
    const propertyTypeText = getPropertyTypeText(project);
    const bhkValues = extractBhkValues(project.configs, project.bhk, project.bedrooms, project.subTypes, project.property_subtype);

    if (bhkValues.length) {
        return `${bhkValues.join(", ")} BHK${propertyTypeText ? ` ${propertyTypeText}` : ""}`;
    }

    if (project.property_subtype) return project.property_subtype;
    if (propertyTypeText) return propertyTypeText;
    return formatPossessionLabel(project.possessionStatus);
};

const cleanAddressPart = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return "";

    const text = String(value).replace(/\s+/g, " ").trim();
    return text && !["null", "undefined", "none"].includes(text.toLowerCase()) ? text : "";
};

const getAddressText = (project = {}) => {
    const location = project.location;

    if (typeof location === "string") {
        const text = cleanAddressPart(location);
        if (text) return text;
    }

    if (location && typeof location === "object") {
        const locationText = [
            location.area,
            location.city,
            location.pincode,
        ].map(cleanAddressPart).filter(Boolean).join(", ");

        if (locationText) return locationText;
    }

    const addressText = [
        project.area,
        project.city,
        project.pincode,
    ].map(cleanAddressPart).filter(Boolean).join(", ");

    return addressText || "Address on request";
};

const mapBuilderProject = (projectData = {}, fallbackImage = null) => {
    const nestedLocation = projectData.location && typeof projectData.location === "object"
        ? projectData.location
        : null;
    const imageUrl = projectData.thumbnail_url
        || projectData.cover_image_url
        || projectData.image_url
        || projectData.cover_image
        || projectData.image;

    return {
        id: projectData.id,
        name: projectData.name,
        slug: projectData.slug,
        location: nestedLocation ? getAddressText(nestedLocation) : getAddressText(projectData),
        area: nestedLocation?.area || projectData.area,
        city: nestedLocation?.city || projectData.city,
        pincode: nestedLocation?.pincode || projectData.pincode,
        imageMain: imageUrl ? { uri: imageUrl } : fallbackImage,
        possessionStatus: projectData.possession_status || projectData.possessionStatus || projectData.possession,
        price_from: projectData.price?.min_amount ?? projectData.price_from ?? projectData.property_min_price ?? projectData.min_price,
        price_to: projectData.price?.max_amount ?? projectData.price_to ?? projectData.property_max_price ?? projectData.max_price,
        priceDisplay: projectData.price?.display || projectData.priceDisplay || projectData.display_price || projectData.priceRange || projectData.priceINR,
        isPriceOnRequest: projectData.price?.is_price_on_request ?? projectData.isPriceOnRequest ?? projectData.is_price_on_request ?? false,
        configs: projectData.configs || [],
        property_type: projectData.property_type || projectData.propertyType,
        property_subtype: projectData.property_subtype || projectData.propertySubtype,
        rera: isReraApproved(projectData),
        reraNumber: projectData.rera?.number || projectData.rera_number || projectData.reraNumber,
    };
};

export default function BuilderModal({ visible, onClose, project }) {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const [activeFilter, setActiveFilter] = useState("All");

    const { currentBuilder, builderProjects: apiProjects, totalProjects, loading, error } = useSelector((state) => state.builder);
    const { list: projectList } = useSelector((state) => state.project);
    
    // Track if we've attempted to fetch from API
    const [apiAttempted, setApiAttempted] = useState(false);

    // Fetch builder details when modal opens or filter changes
    useEffect(() => {
        if (visible && project?.developerId) {
            console.log('🏗️ Fetching builder details for ID:', project.developerId, 'with filter:', activeFilter);
            setApiAttempted(true);
            dispatch(fetchBuilderDetailsThunk({ 
                builderId: project.developerId,
                possession: activeFilter 
            }));
            if (!projectList?.length) {
                dispatch(fetchProjectListThunk());
            }
        } else if (visible && !project?.developerId) {
            console.log('⚠️ No developerId available for project:', project?.name);
            console.log('⚠️ Project data:', { 
                id: project?.id, 
                builder: project?.builder,
                developerId: project?.developerId 
            });
            setApiAttempted(false);
        }
    }, [visible, project?.developerId, project?.id, project?.builder, project?.name, activeFilter, projectList?.length, dispatch]);

    // Clear builder data when modal closes
    useEffect(() => {
        if (!visible) {
            dispatch(clearBuilder());
            setApiAttempted(false);
        }
    }, [visible, dispatch]);

    const builderName = currentBuilder?.name || project?.builder || "";
    const organizationProjects = (projectList || []).filter((p) => {
        const organizationId = p.organisation_id || p.organization_id || p.organisationId || p.organizationId;
        return organizationId && project?.developerId && String(organizationId) === String(project.developerId);
    });
    
    // Determine if we should use API data or fallback to local data
    // Use API data if: we attempted API fetch AND (currentBuilder exists OR apiProjects exist)
    // This ensures we use API results even when apiProjects is empty array (valid API response)
    const useApiData = apiAttempted && !error && (currentBuilder || (apiProjects !== null && apiProjects !== undefined));
    
    const apiBuilderProjects = Array.isArray(apiProjects)
        ? apiProjects.map((p) => mapBuilderProject(p, project?.imageMain))
        : [];
    const organizationBuilderProjects = organizationProjects.map((p) => mapBuilderProject(p, project?.imageMain));
    const useOrganizationProjects = organizationBuilderProjects.length > 0
        && (!useApiData || organizationBuilderProjects.length > apiBuilderProjects.length);

    // Use API projects if available, otherwise fallback to project-list/local data
    let builderProjects = [];
    if (useOrganizationProjects) {
        builderProjects = organizationBuilderProjects;
    } else if (useApiData) {
        builderProjects = apiBuilderProjects;
    } else {
        // Fallback to local data
        const normalizeBuilder = (name) => name?.toLowerCase().trim() || "";
        builderProjects = allProjects.filter((p) => {
            const projectBuilder = normalizeBuilder(p.builder);
            const currentBuilderName = normalizeBuilder(builderName);
            return projectBuilder.includes(currentBuilderName) || currentBuilderName.includes(projectBuilder);
        });
    }
    
    // When using API data, filtering is done on backend; otherwise use frontend filtering
    const filteredProjects = useApiData && !useOrganizationProjects
        ? builderProjects // Backend already filtered - trust the API response even if empty
        : builderProjects.filter(FILTER_MAP[activeFilter] ?? (() => true)); // Frontend fallback filtering

    // Use totalProjects from API if available, otherwise count from builderProjects
    const displayTotalCount = useApiData && !useOrganizationProjects && totalProjects !== undefined
        ? totalProjects
        : filteredProjects.length;

    if (!project) return null;

    return (
        <SimpleBottomSheet visible={visible} onClose={onClose} maxHeightPercent="92%">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-start justify-between px-5 mb-3">
                    <View className="flex-1 pr-4 ">
                        <Text className="text-[17px] mb-2 pr-6 font-manrope-semibold text-gray-900 leading-7">{builderName}</Text>
                        <View className="flex-row items-center gap-3 mt-2">
                            <View className="bg-gray-100 px-3 py-1 rounded-lg">
                                <Text className="text-[12px] font-manrope-regular text-gray-500">{project?.builderCity}</Text>
                            </View>
                            <Text className="text-[12px] font-manrope-regular text-gray-400">
                                {loading ? '...' : `${displayTotalCount} Total Projects`}
                            </Text>
                        </View>
                    </View>
                    <View className="w-16 h-16 rounded-xl overflow-hidden bg-gray-900">
                        <Image source={project?.builderLogo} className="w-full h-full" resizeMode="cover" />
                    </View>
                </View>
                
                {/* Possession filter */}
                <Text className="text-[15px] mt-1 font-manrope-semibold text-gray-900 px-5 mb-4">Possession</Text>
                
                {/* Embedded inner horizontal listings are safely retained inside the parent wrapper container */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 6 }}>
                    {POSSESSION_FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setActiveFilter(f)}
                            className={`px-4 py-2.5 rounded-xl border items-center ${activeFilter === f ? "bg-[#F8F5FF] border-[#DCD0FF]" : "bg-white border-gray-200"}`}
                        >
                            <Text className={`text-[13px] font-manrope-semibold ${activeFilter === f ? "text-[#4A43EC]" : "text-gray-500"}`}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Projects list */}
                <View className="px-5 mt-4 mb-4">
                    {loading ? (
                        <View className="items-center py-10">
                            <ActivityIndicator size="large" color="#4A43EC" />
                            <Text className="text-[14px] font-manrope-semibold text-gray-400 mt-3">Loading projects...</Text>
                        </View>
                    ) : filteredProjects.length === 0 ? (
                        <EmptyPropertySection
                            variant="compact"
                            icon="office-building-outline"
                            title="No Projects Found"
                            description={`No ${activeFilter !== "All" ? activeFilter.toLowerCase() + " " : ""}projects found for this developer.`}
                            style={{ marginVertical: 12 }}
                        />
                    ) : (
                        filteredProjects.map((p) => {
                            const priceText = getPriceText(p);
                            const bhkText = getBhkText(p);
                            const addressText = getAddressText(p);
                            return (
                            <View
                                key={p.id}
                                className="flex-row items-start bg-white border border-gray-100 rounded-2xl p-3 mb-3"
                                style={{ shadowColor: "#6B7280", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                            >
                                <View className="w-[108px] h-[118px] rounded-xl bg-gray-100 mr-4 overflow-hidden">
                                    {p.imageMain ? (
                                        <Image source={p.imageMain} className="w-full h-full" resizeMode="cover" />
                                    ) : (
                                        <View className="w-full h-full bg-gray-100" />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[16px] font-manrope-extrabold text-[#111827] mb-1" numberOfLines={1}>
                                        {priceText}
                                    </Text>
                                    <Text className="text-[14px] font-manrope-bold text-gray-800 mb-1" numberOfLines={1}>{p.name}</Text>
                                    <Text className="text-[12px] font-manrope-semibold text-gray-500 mb-1" numberOfLines={1}>{bhkText}</Text>
                                    <Text className="text-[11px] text-gray-400 mb-3 leading-4" numberOfLines={2}>{addressText}</Text>
                                    <ReraStatusBadge
                                        approved={p.rera}
                                        approvedLabel="RERA Verified"
                                        className="self-start rounded-md px-2 py-1"
                                        textClassName="text-[10px]"
                                    />
                                </View>
                            </View>
                        );})
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            <View className="px-5 pt-3 border-t border-gray-100" style={{ paddingBottom: insets.bottom || 14, backgroundColor: '#fff' }}>
                <DetailFooter />
            </View>
        </SimpleBottomSheet>
    );
}
