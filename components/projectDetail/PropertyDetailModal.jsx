import { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import SimpleBottomSheet from "../SimpleBottomSheet";
import { useDispatch, useSelector } from "react-redux";
import {
    addSiteVisit,
    toggleFavourite,
    savePropertyThunk,
    unsavePropertyThunk,
    fetchSavedPropertiesThunk,
} from "../../store/slices/propertiesSlice";
import ZoomableImage from "./ZoomableImage";
import ImageLightbox from "../ImageLightbox";
import { getProjectPropertyCardConfig } from "../../services/propertyConfiguration";

const { width } = Dimensions.get("window");

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

function getDynamicImageUrl(image) {
    if (typeof image === 'string') return image.trim();
    if (!image || typeof image !== 'object') return '';
    return String(
        image.uri || image.url || image.file_url || image.image_url ||
        image.media_url || image.thumbnail_url || ''
    ).trim();
}

function collectDynamicImages(source) {
    if (!source) return [];
    const collections = [source.images, source.media, source.property_media, source.gallery, source.photos];
    const directImages = [source.cover_image, source.cover_image_url, source.image_url, source.image, source.imageMain, source.imageThumb];

    return [...collections.flatMap((items) => Array.isArray(items) ? items : []), ...directImages]
        .filter((item) => !item?.media_type || item.media_type === 'image')
        .map(getDynamicImageUrl)
        .filter(Boolean);
}

const AMENITY_ICONS = {
    Gymnasium: { icon: "dumbbell", color: "#4A43EC" },
    "Swimming Pool": { icon: "pool", color: "#4A43EC" },
    "24/7 Security": { icon: "shield-check-outline", color: "#4A43EC" },
    "Power Backup": { icon: "lightning-bolt", color: "#4A43EC" },
    Landscaping: { icon: "tree-outline", color: "#4A43EC" },
    "Car Parking": { icon: "car-outline", color: "#4A43EC" },
    "Sports Court": { icon: "tennis", color: "#4A43EC" },
    "Wi-Fi Zone": { icon: "wifi", color: "#4A43EC" },
    Clubhouse: { icon: "home-group", color: "#4A43EC" },
    Garden: { icon: "flower-outline", color: "#4A43EC" },
};

function AmenityItem({ label }) {
    const config = AMENITY_ICONS[label] ?? {
        icon: "star-outline",
        color: "#003D9B",
    };
    return (
        <View className="flex-row items-center gap-3 w-[50%] mb-4">
            <View className="w-10 h-10 rounded-[14px] bg-[#F1F3FF] items-center justify-center">
                <MaterialCommunityIcons
                    name={config.icon}
                    size={18}
                    color={config.color}
                />
            </View>
            <Text className="text-[13px] font-manrope-medium text-[#101010] flex-1">
                {label}
            </Text>
        </View>
    );
}

export default function PropertyDetailModal({
    visible,
    onClose,
    project,
    variant,
    readOnly = false,
}) {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const bookedVisits = useSelector((s) => s.properties.bookedSiteVisits);
    const savedProjects = useSelector((s) => s.properties.favouriteProjects);
    const { isLoggedIn, token } = useSelector((s) => s.auth);
    
    const [floorPlanVisible, setFloorPlanVisible] = useState(false);
    const [zoomVisible, setZoomVisible] = useState(false);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [sheetSuspended, setSheetSuspended] = useState(false);
    const viewerTimerRef = useRef(null);

    useEffect(() => {
        if (!visible) {
            setImageViewerVisible(false);
            setSheetSuspended(false);
        }
        return () => {
            if (viewerTimerRef.current) clearTimeout(viewerTimerRef.current);
        };
    }, [visible]);

    const handleClose = () => {
        onClose?.();
    };

    const openImageViewer = () => {
        if (galleryImages.length === 0) return;
        setSheetSuspended(true);
        viewerTimerRef.current = setTimeout(() => {
            setImageViewerVisible(true);
            viewerTimerRef.current = null;
        }, 100);
    };

    const closeImageViewer = () => {
        setImageViewerVisible(false);
        viewerTimerRef.current = setTimeout(() => {
            setSheetSuspended(false);
            viewerTimerRef.current = null;
        }, 100);
    };

    if (!project || !variant) return null;

    const isSaved = savedProjects.includes(project.id);
    const variantType = getProjectPropertyCardConfig(variant) || variant.title || variant.type || "Property";
    const variantId = `${project.id}_${variantType.replace(/\s+/g, "_")}`;
    const isAdded = bookedVisits.some((v) => v.id === variantId);

    const areaValue = variant.area_sqft ?? variant.total_area_sqft ?? project.areaSqft ?? project.area_sqft ?? null;
    const possessionValue = variant.possession_status || variant.possession || project.possessionStatus || project.possession || "\u2014";
    const towerValue = variant.tower_no || variant.tower || project.tower_no || project.towers || "\u2014";
    const basePriceValue = variant.base_price ?? variant.price ?? variant.priceRange ?? variant.price_from ?? null;
    const priceText = basePriceValue !== null && basePriceValue !== undefined && basePriceValue !== ""
        ? (typeof basePriceValue === 'number'
            ? formatCompactPrice(basePriceValue)
            : basePriceValue)
        : "Contact for price";
    const areaText = variant.area || (areaValue ? `${areaValue} sq.ft.` : "\u2014");
    const floorPlanSource = getImageSource(variant.floor_plan_url || variant.floor_plan_image, null);
    const propertyImages = [...new Set(collectDynamicImages(variant))];
    const projectImages = [...new Set(collectDynamicImages({
        images: project.projectImages || project.images,
        media: project.media,
        imageMain: project.imageMain,
        imageThumb: project.imageThumb,
    }))];
    const galleryImages = propertyImages.length > 0 ? propertyImages : projectImages;
    const heroImage = galleryImages[0] ? { uri: galleryImages[0] } : null;
    const inventoryValue = variant.inventory ?? project.inventory ?? `${project.units ?? "—"}`;
    const amenitiesList = (variant.amenities?.length ? variant.amenities : (project.amenities || []))
        .map((a) => (typeof a === 'string' ? a : a?.name))
        .filter(Boolean);

    const handleToggleSave = async () => {
        if (!project.id) return;

        if (!isLoggedIn || !token) {
            dispatch(toggleFavourite(project.id));
            return;
        }

        const itemData = {
            id: project.id,
            name: project.name,
            title: project.name,
            slug: project.slug,
            area: project.area,
            city: project.city,
            location: project.location,
            cover_image_url: typeof project.imageMain === 'string' ? project.imageMain : project.imageMain?.uri,
            image: typeof project.imageMain === 'string' ? project.imageMain : project.imageMain?.uri,
            price_from: project.price_from ?? variant.price ?? variant.base_price,
            min_price: project.price_from ?? variant.price ?? variant.base_price,
            rera_id: project.reraId || project.rera_id,
        };

        try {
            if (isSaved) {
                await dispatch(unsavePropertyThunk({ itemType: 'project', itemId: project.id })).unwrap();
            } else {
                await dispatch(savePropertyThunk({ itemType: 'project', itemId: project.id, itemData })).unwrap();
            }
            dispatch(fetchSavedPropertiesThunk());
        } catch (error) {
            console.log('Property detail save failed:', error);
        }
    };

    return (
        <>
            <SimpleBottomSheet visible={visible && !sheetSuspended} onClose={handleClose} maxHeightPercent="88%">
                {/* Header Section mimicking original layout handle style */}
                <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
                    <TouchableOpacity onPress={handleClose}>
                        <Ionicons name="close" size={22} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-[17px] font-manrope-bold text-[#111827]">Property Details</Text>
                    <View style={{ width: 22 }} />
                </View>

    
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="mx-5 rounded-2xl mb-4 border border-gray-300"
                    contentContainerStyle={{ paddingBottom: 16 }}
                >
                    {/* Dynamic property gallery */}
                    <TouchableOpacity
                        activeOpacity={heroImage ? 0.9 : 1}
                        disabled={!heroImage}
                        onPress={openImageViewer}
                        style={{ height: 145, overflow: "hidden", backgroundColor: "#F4F7FF" }}
                    >
                        {heroImage ? (
                            <Image
                                source={heroImage}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="flex-1 items-center justify-center px-4">
                                <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                                <Text className="mt-2 text-center text-[11px] font-manrope-bold text-gray-400">No property images available</Text>
                            </View>
                        )}

                        {galleryImages.length > 0 && (
                            <View className="absolute bottom-2 right-2 flex-row items-center rounded-lg bg-black/60 px-2 py-1">
                                <Ionicons name="images-outline" size={12} color="#fff" />
                                <Text className="ml-1 text-[10px] font-manrope-bold text-white">
                                    View {galleryImages.length} {galleryImages.length === 1 ? "Photo" : "Photos"}
                                </Text>
                            </View>
                        )}

                        {/* Squarft Verified Badge */}
                        <View
                            style={{
                                position: "absolute",
                                top: 12,
                                left: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#fff",
                                borderRadius: 30,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                gap: 3,
                                shadowColor: "#000",
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            <MaterialCommunityIcons name="check-decagram" size={16} color="#0052CC" />
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#0052CC", letterSpacing: 0.2 }}>
                                SQUARFT VERIFIED
                            </Text>
                        </View>

                        {!readOnly && (
                            <TouchableOpacity
                                onPress={handleToggleSave}
                                style={{
                                    position: "absolute",
                                    top: 10,
                                    right: 10,
                                    backgroundColor: "rgba(0,0,0,0.6)",
                                    borderRadius: 20,
                                    padding: 6,
                                }}
                            >
                                <Ionicons
                                    name={isSaved ? "heart" : "heart-outline"}
                                    size={24}
                                    color={isSaved ? "#EF4444" : "#fff"}
                                />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>

                    {/* Possession Info Row */}
                    <View className="flex-row items-center gap-5 mx-5 mt-3 mb-3.5">
                        <Text className="text-[12px] font-manrope-regular text-gray-500">
                            Possession: {possessionValue}
                        </Text>
                        <Text className="text-[12px] font-manrope-regular text-gray-500">
                            • Base Price: {priceText}
                        </Text>
                    </View>

                    <View
                        style={{
                            marginHorizontal: 20,
                            marginBottom: 9,
                            borderBottomWidth: 1,
                            borderBottomColor: "#D1D5DB",
                            borderStyle: "dashed",
                        }}
                    />

                    {/* Pricing & Floor Plan Grid */}
                    <View className="mx-5 mb-2">
                        <View className="flex-row items-center justify-between mb-2">
                            <View>
                                <Text className="text-[12px] font-manrope-bold text-gray-500">{variantType}</Text>
                                <Text className="text-[16px] font-manrope-extrabold text-[#0F172A]">
                                    {priceText}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => floorPlanSource && setFloorPlanVisible((v) => !v)}
                                disabled={!floorPlanSource}
                                className="flex-row items-center gap-1.5 rounded-xl px-3 py-3"
                                style={{ backgroundColor: floorPlanSource ? (floorPlanVisible ? "#4A43EC" : "#DAE2FF") : "#F3F4F6" }}
                            >
                                <MaterialCommunityIcons
                                    name="floor-plan"
                                    size={14}
                                    color={!floorPlanSource ? "#9CA3AF" : floorPlanVisible ? "#fff" : "#4A43EC"}
                                />
                                <Text
                                    className="text-[12px] font-manrope-bold"
                                    style={{ color: !floorPlanSource ? "#9CA3AF" : floorPlanVisible ? "#fff" : "#4A43EC" }}
                                >
                                    {!floorPlanSource ? "Floor Plan Unavailable" : floorPlanVisible ? "Hide Floor Plan" : "See Floor Plan"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Inline Floor Plan Reveal */}
                        {floorPlanVisible && (
                            <View
                                className="mt-2 rounded-2xl overflow-hidden bg-[#F8FAFC] items-center py-5"
                                style={{ borderWidth: 1, borderColor: "#E0E8FF" }}
                            >
                                <TouchableOpacity onPress={() => setZoomVisible(true)} activeOpacity={0.85}>
                                    <Image
                                        source={floorPlanSource}
                                        style={{ width: width * 0.75, height: 200 }}
                                        resizeMode="contain"
                                    />
                                    <View
                                        style={{
                                            position: "absolute",
                                            bottom: 6,
                                            right: 6,
                                            backgroundColor: "rgba(0,0,0,0.45)",
                                            borderRadius: 12,
                                            padding: 5,
                                        }}
                                    >
                                        <MaterialCommunityIcons name="magnify-plus-outline" size={16} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                                <Text className="text-[11px] font-manrope-regular text-gray-400 mt-2">
                                    {variantType} · {areaText}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Stats Metrics Matrix */}
                    <View className="flex-row flex-wrap mx-4 justify-between mb-3 mt-4">
                        {[
                            { label: "AREA", value: areaText },
                            { label: "POSSESSION", value: possessionValue },
                            { label: "TOWER", value: towerValue },
                            { label: "INVENTORY", value: inventoryValue },
                        ].map((item) => (
                            <View
                                key={item.label}
                                className="bg-[#F1F3FF] border border-[#E0E8FF] rounded-2xl p-4 py-4 mb-4"
                                style={{ width: (width - 68) / 2 - 6 }}
                            >
                                <Text className="text-[10px] font-manrope-bold text-gray-400 tracking-widest">{item.label}</Text>
                                <Text className="text-[16px] font-manrope-bold text-[#041B3C]">{item.value}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Amenities Collection */}
                    <View className="mx-4 bg-white border border-gray-100 rounded-2xl p-4 px-5 mb-2">
                        <Text className="text-[15px] font-manrope-regular text-[#1A1A1A] mb-4">World-Class Amenities</Text>
                        {amenitiesList.length > 0 ? (
                            <View className="flex-row flex-wrap">
                                {amenitiesList.map((a, i) => <AmenityItem key={i} label={a} />)}
                            </View>
                        ) : (
                            <Text className="text-[13px] font-manrope-regular text-gray-500">No amenities listed for this unit yet.</Text>
                        )}
                    </View>
                </ScrollView>

                {!readOnly && (
                <View className="px-5 pt-3 border-t border-gray-100" style={{ paddingBottom: insets.bottom || 2, backgroundColor: '#fff' }}>
                    <TouchableOpacity
                        onPress={() => {
                            if (!isAdded) {
                                dispatch(
                                    addSiteVisit({
                                        id: variantId,
                                        projectId: project.id,
                                        property_id: variant.id,
                                        propertyIds: variant.id ? [variant.id] : [],
                                        name: project.name,
                                        title: project.title || project.name,
                                        city: project.city,
                                        area: project.area,
                                        location: project.location,
                                        image: project.imageMain,
                                        imageMain: project.imageMain,
                                        imageThumb: project.imageThumb,
                                        variant: variantType,
                                        variantDetails: variant,
                                        variants: [variant],
                                        floorPlans: [variant],
                                        price: variant.priceRange || variant.price,
                                        possessionStatus: project.possessionStatus || project.possession,
                                        possession: project.possession,
                                        tower_no: project.tower_no,
                                        inventory: project.inventory,
                                        amenities: project.amenities || variant.amenities || [],
                                        units: project.units,
                                    }),
                                );
                            }
                            handleClose();
                        }}
                        className="rounded-2xl py-4 items-center flex-row justify-center gap-2"
                        style={{ backgroundColor: isAdded ? "#22C55E" : "#4A43EC" }}
                    >
                        <MaterialCommunityIcons
                            name={isAdded ? "check-circle-outline" : "calendar-plus"}
                            size={18}
                            color="#fff"
                        />
                        <Text className="text-white text-[15px] font-manrope-bold">
                            {isAdded ? "Added to Site Visit" : "Add To Site Visit"}
                        </Text>
                    </TouchableOpacity>
                </View>
                )}
            </SimpleBottomSheet>

            <ImageLightbox
                visible={imageViewerVisible}
                images={galleryImages}
                onClose={closeImageViewer}
            />

            {/* Maintained Portal Modal for full-resolution architectural maps */}
            <ZoomableImage
                visible={zoomVisible}
                onClose={() => setZoomVisible(false)}
                source={floorPlanSource}
            />
        </>
    );
}
