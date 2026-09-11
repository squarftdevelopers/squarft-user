import { visitDisplayStatus, isVisitInHistory } from "../../services/visitStatus";
import { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator, StyleSheet, Alert, Linking, Platform, RefreshControl } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import RescheduleBottomSheet from "../../components/visit/RescheduleBottomSheet";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { addSiteVisit, removeSiteVisit } from "../../store/slices/propertiesSlice";
import { fetchVisitListThunk } from "../../store/slices/visitSlice";
import { propertyApi } from "../../services/propertyApi";
import PropertyDetailModal from "../../components/projectDetail/PropertyDetailModal";
import { getProjectPropertyCardConfig } from "../../services/propertyConfiguration";
import { formatProjectPriceAmount } from "../../services/projectDisplay";
import { useRefetchOnForeground } from "../../hooks/useRefetchOnForeground";

const siteVisitBanner = require("../../assets/images/sitevisit_banner.png");
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 82;
const ACTION_BAR_TAB_MARGIN = 60;

function VisitThumbnail({ source, className }) {
  if (!source) return <View className={`${className} bg-gray-100`} />;
  return <Image source={typeof source === 'string' ? { uri: source } : source} className={className} resizeMode="cover" />;
}

const formatVisitPrice = (visit = {}) => {
  const rawPrice = visit.price ?? visit.priceINR ?? visit.variants?.[0]?.priceRange;
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') return '';
  // Preserve a server-provided range; a single numeric rupee value is
  // displayed in the same lakh/crore format as project cards.
  if (typeof rawPrice === 'string' && /[–-]/.test(rawPrice)) return rawPrice;
  return formatProjectPriceAmount(rawPrice) || String(rawPrice);
};

const styles = StyleSheet.create({
  tabsOuter: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabButtonActive: {
    backgroundColor: "#4A43EC",
    borderColor: "#4A43EC",
  },
  tabButtonInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  tabText: {
    fontSize: 12,
    fontFamily: "manrope-bold",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabTextInactive: {
    color: "#7C8597",
  },
});

const getVisitTimestamp = (visit) => {
  const value = visit.slot_start || visit.isoDate;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getVisitTimeLabel = (visit) => {
  const timestamp = getVisitTimestamp(visit);
  if (timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (visit.dateFull?.includes('·')) return visit.dateFull.split('·')[1].trim();
  if (visit.dateFull?.includes('|')) return visit.dateFull.split('|')[1].trim();
  return "10:00 AM";
};

const getVisitTypeLabel = (visit) => {
  if (visit?.variant) return visit.variant;
  if (Array.isArray(visit?.selectedUnits) && visit.selectedUnits[0]) return visit.selectedUnits[0];
  if (visit?.propertyType && visit?.bedrooms) return `${visit.bedrooms} BHK ${visit.propertyType}`;
  if (visit?.bedrooms) return `${visit.bedrooms} BHK`;
  return visit?.propertyType || visit?.unitType || visit?.type || '';
};

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));

const getVisitPropertyId = (visit) => {
  const candidates = [
    visit?.propertyIds?.[0],
    visit?.property_id,
    visit?.propertyId,
  ];
  return candidates.find(isUuid);
};

const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/";
const LOCATION_TIMEOUT_MS = 12000;

const withTimeout = (promise, timeoutMessage) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), LOCATION_TIMEOUT_MS);
    }),
  ]);

const getApiList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const parseCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const getCoordinates = (item) => {
  const latitude = parseCoordinate(item?.latitude ?? item?.lat ?? item?.property_latitude ?? item?.propertyLatitude);
  const longitude = parseCoordinate(item?.longitude ?? item?.lng ?? item?.property_longitude ?? item?.propertyLongitude);

  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
};

const getDestinationLabel = (visit, property) => {
  const parts = [
    property?.title || visit?.title,
    property?.address || property?.property_address || visit?.property_address,
    property?.area || visit?.area || visit?.location,
    property?.city || visit?.city,
    property?.pincode || visit?.pincode,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return [...new Set(parts)].join(", ");
};

const buildGoogleMapsDirectionsUrl = ({ origin, destination }) => {
  const destinationValue = destination.coordinates
    ? `${destination.coordinates.latitude},${destination.coordinates.longitude}`
    : destination.label;

  const params = {
    api: "1",
    origin: `${origin.latitude},${origin.longitude}`,
    destination: destinationValue,
    travelmode: "driving",
    dir_action: "navigate",
  };

  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return `${GOOGLE_MAPS_DIRECTIONS_URL}?${query}`;
};

const UPCOMING_VISIT_STATUSES = ["pending", "pending_confirmation", "confirmed"];
const ALL_VISIT_STATUSES = ["pending", "pending_confirmation", "confirmed", "completed", "cancelled", "rescheduled"];

export default function Visit() {
  const router = useRouter();
  const [detailVisit, setDetailVisit] = useState(null);
  const { tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("Book visit");
  const bookedSiteVisits = useSelector((state) => state.properties.bookedSiteVisits);
  const reduxUpcomingVisits = useSelector((state) => state.properties.upcomingSiteVisits || []);
  const { visits: apiVisits, loading: visitsLoading } = useSelector((state) => state.visit);
  const { isLoggedIn, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [directionsVisitId, setDirectionsVisitId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (tab === "Book visit") {
      setActiveTab("Book visit");
    } else {
      setActiveTab("Upcoming");
    }
  }, [tab]);

  // Fetch visits from API when user is logged in and on Upcoming/Past tabs
  const refreshVisits = useCallback(() => {
    if (isLoggedIn && token && (activeTab === "Upcoming" || activeTab === "Past")) {
      const status = activeTab === "Upcoming"
        ? UPCOMING_VISIT_STATUSES
        : ALL_VISIT_STATUSES;
      return dispatch(fetchVisitListThunk(status));
    }
    return Promise.resolve();
  }, [activeTab, dispatch, isLoggedIn, token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshVisits();
    } finally {
      setRefreshing(false);
    }
  }, [refreshVisits]);

  useFocusEffect(useCallback(() => {
    refreshVisits();
    const timer = setInterval(refreshVisits, 15000);
    return () => clearInterval(timer);
  }, [refreshVisits]));

  useRefetchOnForeground(refreshVisits);

  const currentVisitTime = Date.now();

  // Merge API visits with locally-booked (not-yet-synced) visits
  const apiVisitsFormatted = apiVisits.map(v => {
    const inventory = v.project_inventory || {};
    const possession = v.project_possession_status || v.project_possession_date || v.project_possession || 'TBD';
    const tower = v.property_tower_no || v.project_tower_number || '—';
    
    return {
      id: v.id,
      propertyIds: v.property_id ? [v.property_id] : [],
      isApiVisit: true,
      title: v.property_description || v.property_title || 'Property',
      propertyTitle: v.property_title || '',
      propertyDescription: v.property_description || '',
      projectId: v.project_id,
      projectSlug: v.project_slug,
      projectName: v.project_name || '',
      propertyType: v.property_type,
      areaSqft: v.property_area_sqft,
      bedrooms: v.property_bedrooms,
      bathrooms: v.property_bathrooms,
      basePrice: v.property_base_price,
      minPrice: v.property_min_price,
      maxPrice: v.property_max_price,
      possession,
      tower_no: tower,
      inventory: inventory.total || '—',
      projectInventory: inventory,
      developerName: v.developer_name,
      amenities: Array.isArray(v.property_amenities) ? v.property_amenities : [],
      location: v.property_address || '',
      latitude: v.property_latitude ?? v.latitude,
      longitude: v.property_longitude ?? v.longitude,
      city: v.property_city ?? v.city,
      pincode: v.property_pincode ?? v.pincode,
      // The backend returns a signed URL for this scheduled property's media.
      // Do not substitute an unrelated stock/fallback illustration.
      image: v.property_image || v.project_cover_image_url || null,
      imageMain: v.property_image || v.project_cover_image_url || null,
      status: visitDisplayStatus(v),
      cancellationReason: v.cancellation_reason || '',
      dateFull: new Date(v.slot_start).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      }),
      isoDate: v.slot_start,
      visitors: 1,
      notes: v.user_note || '',
      bookingId: v.id,
      propertyId: v.property_id,
      visitorName: v.user_first_name ? `${v.user_first_name} ${v.user_last_name}` : 'User',
      duration: v.slot_start && v.slot_end
        ? `${Math.max(1, Math.round((new Date(v.slot_end) - new Date(v.slot_start)) / 60000))} Minutes`
        : "1.5 Hours",
    };
  });

  const allCombinedVisits = uniqueById([
    ...apiVisitsFormatted,
    ...(isLoggedIn ? [] : reduxUpcomingVisits),
  ]);

  // Filter and sort for upcoming
  const upcomingVisits = allCombinedVisits
    .filter((v) => !isVisitInHistory(v.status, getVisitTimestamp(v), currentVisitTime))
    .sort((a, b) => getVisitTimestamp(a) - getVisitTimestamp(b));

  // Filter and sort for past
  const pastVisits = allCombinedVisits
    .filter((v) => isVisitInHistory(v.status, getVisitTimestamp(v), currentVisitTime))
    .sort((a, b) => getVisitTimestamp(b) - getVisitTimestamp(a));

  const bottomSheetModalRef = useRef(null);

  const openModal = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleRescheduleVisit = useCallback((params) => {
    router.push({
      pathname: "/(screens)/book-site-visit",
      params,
    });
  }, [router]);

  const [selectedVisit, setSelectedVisit] = useState(null);

  const [selectedForBooking, setSelectedForBooking] = useState([]);

  const resolveVisitDestination = useCallback(async (visit) => {
    const propertyId = getVisitPropertyId(visit);
    let property = null;

    if (propertyId) {
      try {
        const response = await propertyApi.getPropertyList(token, { limit: 500 });
        property = getApiList(response).find((item) => String(item?.id) === String(propertyId)) || null;
      } catch (error) {
        console.log("Directions property lookup failed:", error?.message || error);
      }
    }

    const coordinates = getCoordinates(property) || getCoordinates(visit);
    const label = getDestinationLabel(visit, property);

    if (!coordinates && !label) {
      throw new Error("This property does not have a destination location.");
    }

    return { coordinates, label };
  }, [token]);

  const handleOpenDirections = useCallback(async (visit) => {
    if (directionsVisitId) return;

    setDirectionsVisitId(visit.id);
    try {
      const destination = await resolveVisitDestination(visit);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location Permission Needed",
          "Please allow location access so Google Maps can show directions from your live location."
        );
        return;
      }

      const currentPosition = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        }),
        "We could not detect your current location. Please try again."
      );

      const origin = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      };
      const mapsUrl = buildGoogleMapsDirectionsUrl({ origin, destination });

      await Linking.openURL(mapsUrl);
    } catch (error) {
      Alert.alert(
        "Directions Unavailable",
        error?.message || "Unable to open Google Maps directions for this visit."
      );
    } finally {
      setDirectionsVisitId(null);
    }
  }, [directionsVisitId, resolveVisitDestination]);

  useEffect(() => {
    // Keep selectedForBooking in sync if properties are removed
    setSelectedForBooking(prev => prev.filter(id => bookedSiteVisits.some(v => v.id === id)));
  }, [bookedSiteVisits]);

  const handleRebookVisit = useCallback((visit) => {
    const propertyId = getVisitPropertyId(visit);

    if (!propertyId) {
      Alert.alert(
        "Property Not Available",
        "This visit can't be re-booked because the property unit ID is missing. Please reopen the property details and add a unit to your site visit."
      );
      return;
    }

    const bookingItemId = propertyId;
    dispatch(addSiteVisit({
      id: bookingItemId,
      projectId: bookingItemId,
      property_id: propertyId,
      propertyIds: [propertyId],
      title: visit.title,
      name: visit.title,
      location: visit.location,
      image: visit.image,
      imageMain: visit.image,
      price: visit.price || visit.priceINR,
      visitors: visit.visitors || 1,
      notes: visit.notes || "",
    }));

    router.push({
      pathname: "/(screens)/book-site-visit",
      params: { selectedIds: bookingItemId },
    });
  }, [dispatch, router]);

  const tabs = ["Book visit", "Upcoming", "Past"];

  return (
    <View className="flex-1 bg-[#ffffff]">
      <StatusBar style="dark" />

      <View className="bg-white pb-3">
        <Image
          source={siteVisitBanner}
          className="w-full h-[150px]"
          resizeMode="cover"
        />

        {/* Header Tabs */}
        <View style={styles.tabsOuter}>
          <View style={styles.tabsRow}>
            {tabs.map((tabItem) => {
              const isActive = activeTab === tabItem;
              return (
                <Pressable
                  key={tabItem}
                  style={[
                    styles.tabButton,
                    isActive ? styles.tabButtonActive : styles.tabButtonInactive,
                  ]}
                  onPress={() => setActiveTab(tabItem)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isActive ? styles.tabTextActive : styles.tabTextInactive,
                    ]}
                  >
                    {tabItem}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: activeTab === "Book visit" && bookedSiteVisits.length > 0 ? 222 : 144 }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A43EC"]} tintColor="#4A43EC" />}
      >

        {/* Book visit Tab */}
        {activeTab === "Book visit" && (
          <View className="flex-1 mt-1">
            {bookedSiteVisits.length > 0 ? (
              <>
                <View className="flex-1 pb-6">
                  {bookedSiteVisits.map((visit) => {
                    const fallbackId = visit.id.replace(/\d{13}$/, "");
                    const isSelected = selectedForBooking.includes(visit.id);
                    const typeLabel = getVisitTypeLabel(visit);
                    return (
                      <View key={visit.id} className={`mx-3 mt-2.5 bg-white rounded-xl border relative overflow-hidden ${isSelected ? 'border-[#4A43EC] bg-[#F8F7FF]' : 'border-gray-200'}`}>
                        <View className="flex-row p-2.5 pl-3">
                          <Pressable
                            className="flex-1 flex-row"
                            onPress={() => {
                              setSelectedForBooking((prev) =>
                                isSelected ? prev.filter((id) => id !== visit.id) : [...prev, visit.id]
                              );
                            }}
                          >
                            <View className={`w-[20px] h-[20px] rounded-full border items-center justify-center self-center mr-2.5 ${isSelected ? 'bg-[#4A43EC] border-[#4A43EC]' : 'border-gray-300'}`}>
                              {isSelected && <Feather name="check" size={12} color="white" />}
                            </View>
                            <VisitThumbnail source={visit.image || visit.imageMain} className="w-[58px] rounded-lg mr-2.5" />
                            <View className="flex-1 pr-2">
                              <Text className="text-[13px] font-manrope-bold text-gray-900 mb-0.5" numberOfLines={1}>
                                {getProjectPropertyCardConfig(visit.variantDetails || visit) || visit.variantDetails?.title || visit.variant || typeLabel || visit.title || visit.name || "Property"}
                              </Text>
                              <Text className="text-[10.5px] font-manrope text-gray-500" numberOfLines={1}>
                                {visit.projectName || visit.title || visit.name}
                              </Text>
                              {visit.location ? (
                                <Text className="text-[#9CA3AF] text-[9.5px] font-manrope" numberOfLines={1}>
                                  {visit.location}
                                </Text>
                              ) : null}
                              <Text className="text-[11px] font-manrope-bold text-[#4A43EC] mt-1" numberOfLines={1}>
                                {formatVisitPrice(visit)}
                              </Text>
                            </View>
                          </Pressable>

                          <Pressable
                            className="items-center justify-center self-center pl-1 pr-0.5 z-20"
                            onPress={() => router.push({
                              pathname: "/(screens)/project-detail",
                              params: { id: visit.projectId || fallbackId, from: "visit" },
                            })}
                          >
                            <Feather name="chevron-right" size={20} color="#9CA3AF" />
                            <Text className="text-[9px] font-manrope-bold text-[#9CA3AF] uppercase mt-0.5">VIEW</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}

                  <Pressable
                    className="mx-3 mt-4 border border-dashed border-[#CBD5E1] rounded-xl py-3 flex-row justify-center items-center bg-slate-50/50"
                    onPress={() => router.push("/(tabs)/myActivity")}
                  >
                    <Feather name="plus-circle" size={18} color="#94A3B8" />
                    <Text className="text-[#64748B] font-manrope-bold text-[13px] ml-2">
                      Add more properties to visit
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <EmptyState 
                icon="map-pin" 
                title="No Properties Added" 
                message="You haven't added any properties to visit yet. Explore our listings and add some to your itinerary."
              >
                <Pressable
                  className="w-full border border-dashed border-[#CBD5E1] rounded-xl py-4 flex-row justify-center items-center bg-slate-50/50 mt-2"
                  onPress={() => router.push("/(tabs)/myActivity")}
                >
                  <Feather name="plus-circle" size={18} color="#94A3B8" />
                  <Text className="text-[#64748B] font-manrope-bold text-[14px] ml-2">
                    Add properties to visit
                  </Text>
                </Pressable>
              </EmptyState>
            )}
          </View>
        )}

        {/* Upcoming VISITS */}
        {activeTab === "Upcoming" && (
          <View className="mt-1">
            {visitsLoading ? (
              <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#4A43EC" />
                <Text className="text-gray-500 font-manrope mt-4">Loading visits...</Text>
              </View>
            ) : upcomingVisits.length > 0 ? (
              upcomingVisits.map((visit) => (
                <View key={visit.id} className="mx-3 mt-2.5 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <View className="p-3">
                    <View className="flex-row mb-2.5">
                      <VisitThumbnail source={visit.image || visit.imageMain} className="w-14 h-14 rounded-lg mr-2.5" />
                      <View className="flex-1 justify-center">
                        <View className={`${visit.status === "CANCELLED" ? "bg-[#FEE2E2]" : "bg-[#EEECFF]"} self-start px-2 py-0.5 rounded-md mb-1.5`}>
                          <Text className={`${visit.status === "CANCELLED" ? "text-[#DC2626]" : "text-[#4A43EC]"} text-[8px] font-manrope-bold tracking-wider uppercase`}>
                            {visit.status}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1.5 mb-0.5">
                          <Text className="text-[13px] font-manrope-bold text-gray-900" numberOfLines={1}>
                            {visit.title}
                          </Text>
                          {visit.projectName && (
                            <>
                              <View className="w-[1px] h-3 bg-gray-300" />
                              <Text className="text-[11px] font-manrope text-gray-600 flex-shrink" numberOfLines={1}>
                                {visit.projectName}
                              </Text>
                            </>
                          )}
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                          <Text className="text-[#6B7280] text-[10px] font-manrope ml-1" numberOfLines={1}>
                            {visit.location}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="h-[1px] bg-gray-50 mb-2.5" />

                    <View className="flex-row justify-between items-center mb-2.5 bg-gray-50 p-2 rounded-lg">
                      <View>
                        <Text className="text-[9px] text-[#9CA3AF] font-manrope-bold tracking-wider uppercase mb-1">
                          DATE & TIME
                        </Text>
                        <Text className="text-[11px] font-manrope-bold text-gray-700">
                          {new Date(visit.isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {getVisitTimeLabel(visit)}
                        </Text>
                      </View>
                      <View className="w-7 h-7 rounded-full bg-white items-center justify-center border border-gray-100">
                        <Feather name="calendar" size={13} color="#4A43EC" />
                      </View>
                    </View>

                    <View className="flex-row gap-2">
                      <Pressable
                        className={`flex-1 bg-[#4A43EC] rounded-lg py-2 flex-row items-center justify-center shadow-md shadow-indigo-200 ${directionsVisitId === visit.id ? "opacity-80" : ""}`}
                        disabled={directionsVisitId === visit.id}
                        onPress={() => handleOpenDirections(visit)}
                      >
                        {directionsVisitId === visit.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Feather name="map" size={13} color="white" />
                        )}
                        <Text className="text-white font-manrope-bold text-[12px] ml-2">
                          {directionsVisitId === visit.id ? "Opening..." : "Directions"}
                        </Text>
                      </Pressable>
                      <Pressable
                        className="flex-1 bg-[#4A43EC1A] rounded-lg py-2 flex-row items-center justify-center"
                        onPress={() => {
                          setSelectedVisit(visit);
                          openModal();
                        }}
                      >
                        <Feather name="edit-3" size={13} color="#4A43EC" />
                        <Text className="text-[#4A43EC] font-manrope-bold text-[12px] ml-2">
                          Reschedule
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState 
                icon="calendar" 
                title="No Upcoming Visits" 
                message="You don't have any site visits scheduled right now. Book a visit to see your favorite properties in person."
              />
            )}
          </View>
        )}

        {/* Past VISITS */}
        {activeTab === "Past" && (
          <View className="mt-1">
            {visitsLoading ? (
              <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#4A43EC" />
                <Text className="text-gray-500 font-manrope mt-4">Loading visits...</Text>
              </View>
            ) : pastVisits.length > 0 ? (
              pastVisits.map((visit) => {
                const isCompleted = visit.status === "COMPLETED";
                const isConfirmed = visit.status === "CONFIRMED";
                const statusBadgeClass = isConfirmed
                  ? "bg-[#73cbae]"
                  : isCompleted
                    ? "bg-[#E5F7F1]"
                    : "bg-[#FEE2E2]";
                const statusTextClass = isConfirmed
                  ? "text-white"
                  : isCompleted
                    ? "text-[#00B67A]"
                    : "text-[#EF4444]";
                return (
                  <View key={visit.id} className="mx-3 mt-2.5 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <View className="p-3">
                      <View className="flex-row mb-2.5">
                        <VisitThumbnail source={visit.image || visit.imageMain} className="w-14 h-14 rounded-lg mr-2.5" />
                        <View className="flex-1 justify-center">
                          <View className={`self-start px-2 py-0.5 rounded-md mb-1.5 ${statusBadgeClass}`}>
                            <Text className={`text-[8px] font-manrope-bold tracking-wider uppercase ${statusTextClass}`}>
                              {visit.status}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1.5 mb-0.5">
                            <Text className="text-[13px] font-manrope-bold text-gray-900" numberOfLines={1}>
                              {visit.title}
                            </Text>
                            {visit.projectName && (
                              <>
                                <View className="w-[1px] h-3 bg-gray-300" />
                                <Text className="text-[11px] font-manrope text-gray-600 flex-shrink" numberOfLines={1}>
                                  {visit.projectName}
                                </Text>
                              </>
                            )}
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                            <Text className="text-[#6B7280] text-[10px] font-manrope ml-1" numberOfLines={1}>
                              {visit.location}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="h-[1px] bg-gray-50 mb-2.5" />

                      <View className="mb-2.5 bg-gray-50 p-2 rounded-lg">
                        <Text className="text-[9px] text-[#9CA3AF] font-manrope-bold tracking-wider uppercase mb-1">
                          {isCompleted ? "VISITED ON" : "SCHEDULED FOR"}
                        </Text>
                        <Text className="text-[11px] font-manrope-bold text-gray-700">
                          {new Date(visit.isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {getVisitTimeLabel(visit)}
                        </Text>
                      </View>

                      {visit.cancellationReason ? (
                        <Text className="text-[11px] text-gray-600 mb-2.5">Reason: {visit.cancellationReason}</Text>
                      ) : null}
                      {isCompleted ? (
                        <View className="flex-col gap-2">
                          <Pressable
                            className="w-full bg-[#4A43EC] rounded-lg py-2.5 flex-row items-center justify-center"
                            onPress={() => {
                              if (!visit.isApiVisit) {
                                Alert.alert(
                                  "Review Not Available",
                                  "Please sign in to submit reviews for your completed visits."
                                );
                                return;
                              }
                              router.push({
                                pathname: "/(screens)/review",
                                params: {
                                  title: visit.title,
                                  image: visit.image,
                                  location: visit.location,
                                  dateFull: visit.dateFull,
                                  visitId: visit.bookingId || visit.id,
                                  propertyId: visit.propertyId || '',
                                },
                              });
                            }}
                          >
                            <Feather name="edit-3" size={14} color="white" />
                            <Text className="text-white font-manrope-bold text-[13px] ml-2">
                              Write Review
                            </Text>
                          </Pressable>

                          <Pressable
                            className="w-full border border-gray-200 rounded-lg py-2.5 flex-row items-center justify-center bg-white"
                            onPress={() => setDetailVisit(visit)}
                          >
                            <Feather name="eye" size={14} color="#6B7280" />
                            <Text className="text-[#111827] font-manrope-bold text-[13px] ml-2">
                              View Property Details
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleRebookVisit(visit)}
                          className="w-full bg-[#F4F2FF] rounded-lg py-2 flex-row items-center justify-center"
                        >
                          <Feather name="refresh-cw" size={13} color="#4A43EC" />
                          <Text className="text-[#4A43EC] font-manrope-bold text-[12px] ml-2">
                            Re-book Site Visit
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <EmptyState 
                icon="clock" 
                title="No Past Visits" 
                message="Your site visit history will appear here once you've completed a visit to a property."
              />
            )}
          </View>
        )}
      </ScrollView>

      <PropertyDetailModal
        visible={Boolean(detailVisit)}
        onClose={() => setDetailVisit(null)}
        readOnly
        project={detailVisit ? {
          id: detailVisit.projectId || detailVisit.propertyId,
          slug: detailVisit.projectSlug,
          name: detailVisit.projectName || detailVisit.propertyTitle || detailVisit.title,
          title: detailVisit.projectName || detailVisit.propertyTitle || detailVisit.title,
          location: detailVisit.location,
          area: detailVisit.area,
          city: detailVisit.city,
          imageMain: typeof detailVisit.image === 'string' ? { uri: detailVisit.image } : detailVisit.image,
          imageThumb: typeof detailVisit.image === 'string' ? { uri: detailVisit.image } : detailVisit.image,
          builder: detailVisit.developerName || 'Developer details unavailable',
          possession: detailVisit.possession,
          possessionStatus: detailVisit.possession,
          tower_no: detailVisit.tower_no,
          inventory: detailVisit.inventory,
          amenities: detailVisit.amenities,
        } : null}
        variant={detailVisit ? {
          id: detailVisit.propertyId,
          title: detailVisit.title,
          type: detailVisit.propertyType || detailVisit.title,
          bedrooms: detailVisit.bedrooms,
          bathrooms: detailVisit.bathrooms,
          area_sqft: detailVisit.areaSqft,
          total_area_sqft: detailVisit.areaSqft,
          base_price: detailVisit.basePrice || detailVisit.minPrice,
          price: detailVisit.basePrice || detailVisit.minPrice,
          possession_status: detailVisit.possession,
          possession: detailVisit.possession,
          tower_no: detailVisit.tower_no,
          amenities: detailVisit.amenities,
          image: typeof detailVisit.image === 'string' ? { uri: detailVisit.image } : detailVisit.image,
        } : null}
      />

      {activeTab === "Book visit" && bookedSiteVisits.length > 0 && (
        <View
          className="absolute left-0 right-0 bg-white px-3 py-3 border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
          style={{ bottom: TAB_BAR_HEIGHT + ACTION_BAR_TAB_MARGIN }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[9px] font-manrope-bold text-[#94A3B8] tracking-wider uppercase mb-0.5">
                SELECTED PROPERTY
              </Text>
              <View className="flex-row items-center">
                <Text className="text-[14px] font-manrope-bold text-gray-900" numberOfLines={1}>
                  {selectedForBooking.length > 0
                    ? `${selectedForBooking.length} ${selectedForBooking.length === 1 ? 'property' : 'properties'} • ${(selectedForBooking.length * 1.5).toFixed(1).replace(/\.0$/, '')} hrs`
                    : 'None selected'}
                </Text>
                {selectedForBooking.length > 0 && (
                  <Pressable
                    onPress={() => {
                      selectedForBooking.forEach(id => dispatch(removeSiteVisit(id)));
                      setSelectedForBooking([]);
                    }}
                    className="ml-2 w-7 h-7 rounded-full bg-[#FEE2E2] items-center justify-center border border-[#FECACA]"
                  >
                    <Feather name="trash-2" size={13} color="#EF4444" />
                  </Pressable>
                )}
              </View>
            </View>
            <Pressable
              className={`rounded-xl py-3 px-4 flex-row items-center justify-center ${selectedForBooking.length > 0 ? 'bg-[#6C3BFF]' : 'bg-gray-300'}`}
              disabled={selectedForBooking.length === 0}
              onPress={() => {
                if (selectedForBooking.length === 0) return;
                router.push({
                  pathname: "/(screens)/book-site-visit",
                  params: { selectedIds: selectedForBooking.join(",") },
                });
              }}
            >
              <Text className="text-white font-manrope-bold text-[13px] mr-2">
                Book Site Visit
              </Text>
              <Feather name="calendar" size={16} color="white" />
            </Pressable>
          </View>
        </View>
      )}

      <RescheduleBottomSheet
        ref={bottomSheetModalRef}
        visitData={selectedVisit}
        onReschedule={handleRescheduleVisit}
        onViewMap={handleOpenDirections}
        isOpeningMap={Boolean(selectedVisit && directionsVisitId === selectedVisit.id)}
      />
    </View>
  );
}

function EmptyState({ icon, title, message, children }) {
  return (
    <View className="flex-1 items-center justify-center pt-14 px-8">
      <View className="w-20 h-20 bg-[#F8F7FF] rounded-full items-center justify-center mb-4 border-[6px] border-white shadow-sm">
        <View className="w-[52px] h-[52px] bg-[#EEECFF] rounded-full items-center justify-center">
          <Feather name={icon} size={24} color="#4A43EC" />
        </View>
      </View>
      <Text className="text-[18px] font-manrope-extrabold text-gray-900 text-center mb-1.5">
        {title}
      </Text>
      <Text className="text-[13px] font-manrope text-gray-500 text-center mb-6 leading-relaxed">
        {message}
      </Text>
      {children}
    </View>
  );
}
