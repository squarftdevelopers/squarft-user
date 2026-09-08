import { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Image, TextInput, Platform, KeyboardAvoidingView, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSelector, useDispatch } from "react-redux";
import { confirmVisits } from "../../store/slices/propertiesSlice";
import { createSiteVisitThunk, updateSiteVisitThunk } from "../../store/slices/visitSlice";
import { visitApi } from "../../services/visitApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { useLocalSearchParams, useRouter } from "expo-router";
import { currentUser } from "../../data/user";
import PropertyDetailModal from "../../components/projectDetail/PropertyDetailModal";
import { propertyApi } from "../../services/propertyApi";
import { projectApi } from "../../services/projectApi";
import { getProjectPropertyCardConfig } from "../../services/propertyConfiguration";

const FALLBACK_PROPERTY_IMAGE = { uri: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" };
const VISIT_DURATION_MINUTES = 90;

const formatSlotTime = (value) =>
  new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(/^0/, '');

const getSlotHour = (slot) => new Date(slot.slot_start).getHours();

const toLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const normalizeFutureDateKey = (dateKey, todayKey) =>
  dateKey && String(dateKey) >= todayKey ? String(dateKey) : todayKey;

const getMonthKey = (dateKey) => String(dateKey || '').slice(0, 7);

const isFutureSlot = (slot, now) => {
  const slotTime = new Date(slot.slot_start);
  return !Number.isNaN(slotTime.getTime()) && slotTime > now;
};

const getSlotEnd = (slot) => {
  if (!slot) return null;
  if (slot.slot_end) return new Date(slot.slot_end);
  const start = new Date(slot.slot_start);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + VISIT_DURATION_MINUTES * 60000);
};

const groupAvailableSlots = (slots) => {
  const groups = { morning: [], afternoon: [], evening: [] };
  slots.forEach((slot) => {
    const hour = getSlotHour(slot);
    if (hour < 12) groups.morning.push(slot);
    else if (hour < 17) groups.afternoon.push(slot);
    else groups.evening.push(slot);
  });
  return groups;
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

const getPropertyIdForVisit = (item) => {
  const candidates = [
    item?.propertyIds?.[0],
    item?.property_id,
    item?.propertyId,
    item?.id,
  ];
  return candidates.find(isUuid);
};

const getImageSource = (image) => {
  if (typeof image === "string" && image) return { uri: image };
  return image || FALLBACK_PROPERTY_IMAGE;
};

const getVisitVariantLabel = (visit) => {
  if (visit?.variant) return visit.variant;
  if (Array.isArray(visit?.selectedUnits) && visit.selectedUnits[0]) return visit.selectedUnits[0];
  return visit?.unitType || visit?.type || visit?.title || visit?.name || "Selected Unit";
};

const getVisitTitleLabel = (visit) =>
  getProjectPropertyCardConfig(visit?.variantDetails || visit) ||
  visit?.variantDetails?.title ||
  visit?.variant ||
  getVisitVariantLabel(visit);

const getSelectedVisitVariant = (visit) => {
  if (visit?.variantDetails) return visit.variantDetails;

  const propertyId = getPropertyIdForVisit(visit);
  const selectedLabel = getVisitVariantLabel(visit);
  const options = [
    ...(Array.isArray(visit?.floorPlans) ? visit.floorPlans : []),
    ...(Array.isArray(visit?.variants) ? visit.variants : []),
  ];

  return options.find((option) => {
    const optionLabel = option?.type || option?.title;
    return (propertyId && option?.id === propertyId) || (selectedLabel && optionLabel === selectedLabel);
  });
};

const getApiList = (response, key) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (key && Array.isArray(response?.data?.[key])) return response.data[key];
  if (key && Array.isArray(response?.[key])) return response[key];
  return [];
};

const getApiData = (response) => response?.data || response || null;

const normalizeApiFloorPlan = (plan = {}) => {
  const title = plan.title || (plan.bedrooms ? `${plan.bedrooms} BHK` : "Selected Unit");
  const areaSqft = plan.area_sqft ?? plan.total_area_sqft ?? plan.areaSqft ?? null;

  return {
    ...plan,
    title,
    type: plan.type || title,
    area_sqft: areaSqft,
    total_area_sqft: plan.total_area_sqft ?? areaSqft,
    area: plan.area || (areaSqft ? `${areaSqft} sqft` : null),
    price: plan.price ?? plan.base_price ?? plan.price_from ?? null,
    image: plan.image || plan.floor_plan_url || plan.cover_image || null,
    amenities: Array.isArray(plan.amenities) ? plan.amenities : [],
  };
};

const normalizeApiAmenities = (amenities = []) =>
  amenities
    .map((amenity) => (typeof amenity === "string" ? amenity : amenity?.name))
    .filter(Boolean);

const findById = (items, id) =>
  items.find((item) => id && String(item?.id) === String(id));

const normalizeOfficer = (officer = {}) => {
  const name = officer.full_name || [officer.first_name, officer.last_name].filter(Boolean).join(" ") || officer.name || "Sales Officer";
  return {
    ...officer,
    id: officer.officer_id || officer.id,
    officer_id: officer.officer_id || officer.id,
    name,
    role: officer.role || "Sales Officer",
    isPrevious: Boolean(officer.isPrevious),
  };
};

const resolveProjectSlug = (visit, property, projects) => {
  const directSlug = visit?.slug || visit?.projectSlug || visit?.project?.slug;
  if (directSlug && directSlug !== "none") return directSlug;

  const projectId = property?.project_id || visit?.project_id || visit?.projectId;
  const matchedProject = projects.find((project) =>
    (projectId && String(project?.id) === String(projectId)) ||
    (projectId && String(project?.project_id) === String(projectId)) ||
    (visit?.title && project?.name && String(project.name).toLowerCase() === String(visit.title).toLowerCase())
  );

  return matchedProject?.slug || null;
};

const buildPropertyDetailPayload = (visit) => {
  const propertyId = getPropertyIdForVisit(visit);
  const selectedVariant = getSelectedVisitVariant(visit);
  const imageSource = getImageSource(visit?.image || visit?.imageMain);
  const title = visit?.title || visit?.name || "Property";
  const variantLabel = selectedVariant?.type || selectedVariant?.title || getVisitVariantLabel(visit);
  const priceValue = selectedVariant?.priceRange || selectedVariant?.price || selectedVariant?.base_price || selectedVariant?.price_from || visit?.price || visit?.priceINR || visit?.priceRange || visit?.avgPricePerSqft;
  const areaValue = selectedVariant?.area || selectedVariant?.area_sqft || selectedVariant?.total_area_sqft || visit?.area || visit?.areaSqft || visit?.area_sqft;

  const variant = {
    ...selectedVariant,
    id: propertyId || visit?.property_id || visit?.id,
    title: variantLabel,
    type: variantLabel,
    price: selectedVariant?.price ?? selectedVariant?.base_price ?? selectedVariant?.price_from ?? priceValue,
    priceRange: selectedVariant?.priceRange || (typeof priceValue === "string" ? priceValue : undefined),
    area: selectedVariant?.area || (areaValue ? String(areaValue) : undefined),
    area_sqft: selectedVariant?.area_sqft ?? selectedVariant?.total_area_sqft ?? visit?.area_sqft,
    total_area_sqft: selectedVariant?.total_area_sqft,
    possession_status: selectedVariant?.possession_status || visit?.possessionStatus || visit?.possession,
    possession: selectedVariant?.possession || visit?.possession,
    tower_no: selectedVariant?.tower_no || selectedVariant?.tower || visit?.tower_no || visit?.tower,
    inventory: selectedVariant?.inventory ?? visit?.inventory,
    amenities: selectedVariant?.amenities || visit?.amenities,
    image: getImageSource(selectedVariant?.image || selectedVariant?.floor_plan_url || visit?.image || visit?.imageMain),
  };

  return {
    project: {
      ...visit,
      id: visit?.projectId || visit?.project_id || propertyId || visit?.id,
      name: title,
      title,
      location: visit?.location || "",
      imageMain: imageSource,
      imageThumb: getImageSource(visit?.imageThumb || visit?.image || visit?.imageMain),
      builder: visit?.builder || visit?.developer_name || "SquarFt",
      totalImages: visit?.totalImages || 1,
      possessionStatus: visit?.possessionStatus || visit?.possession_status || visit?.possession,
      possession: visit?.possession,
      tower_no: visit?.tower_no || visit?.tower,
      inventory: visit?.inventory,
      units: visit?.units,
      amenities: visit?.amenities || [],
      variants: [variant],
      floorPlans: [variant],
    },
    variant,
  };
};

export default function BookSiteVisit() {
  const router = useRouter();
  const dispatch = useDispatch();
  const rawBookedSiteVisits = useSelector((state) => state.properties.bookedSiteVisits);
  const { isLoggedIn, token } = useSelector((state) => state.auth);

  // Deduplicate securely to prevent persisted duplicates lingering from old bug.
  // Key by the item's own id (unique per property/variant) so multiple properties
  // from the same project are kept, not collapsed into one.
  const bookedSiteVisits = Array.from(new Map(rawBookedSiteVisits.map(item => [item.id.toString().replace(/_reschedule_.*/, ""), item])).values());

  const { selectedIds, initialDate, initialVisitors, initialNotes, rescheduleVisitId } = useLocalSearchParams();

  const todayKey = toLocalDateKey();
  const initialSelectedDate = normalizeFutureDateKey(initialDate, todayKey);
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [calendarMonth, setCalendarMonth] = useState(initialSelectedDate);
  const scrollViewRef = useRef(null);
  const [visitors, setVisitors] = useState(initialVisitors ? parseInt(initialVisitors, 10) : 1);
  const [notes, setNotes] = useState(initialNotes || "");
  const [detailModalData, setDetailModalData] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedPropertyIds = selectedIds ? selectedIds.split(",") : bookedSiteVisits.map(v => String(v.id));
  const selectedPropertyIdsKey = selectedPropertyIds.join(",");

  const selectedVisits = useMemo(
    () => bookedSiteVisits.filter(v => selectedPropertyIds.includes(String(v.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookedSiteVisits.map(v => v.id).join(","), selectedPropertyIdsKey]
  );

  // One booking slot per selected property: date is shared, but each property
  // gets its own time slot + sales officer, locked in sequence.
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    setBookings(selectedVisits.map((visit) => ({
      visitId: visit.id,
      visit,
      propertyId: getPropertyIdForVisit(visit),
      slots: [],
      slotsLoading: false,
      slotError: null,
      slotMeta: null,
      slot: null,
      officers: [],
      officersLoading: false,
      officerError: null,
      officerMeta: null,
      officerDropdownOpen: false,
      officerId: null,
      locked: false,
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVisits.map(v => v.id).join(","), selectedDate]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentTodayKey = toLocalDateKey(now);
    if (selectedDate < currentTodayKey) {
      setSelectedDate(currentTodayKey);
      setCalendarMonth(currentTodayKey);
    }
  }, [now, selectedDate]);

  const activeIndex = bookings.findIndex((b) => !b.locked);
  const activeBooking = activeIndex >= 0 ? bookings[activeIndex] : null;
  const previousBooking = activeIndex > 0 ? bookings[activeIndex - 1] : null;
  const minStartAfter = previousBooking ? getSlotEnd(previousBooking.slot) : null;
  const allLocked = bookings.length > 0 && bookings.every((b) => b.locked);

  const updateBookingAt = (index, patch) => {
    setBookings((prev) => prev.map((b, i) => (i === index ? { ...b, ...(typeof patch === 'function' ? patch(b) : patch) } : b)));
  };

  // Fetch slots for whichever property is currently active
  useEffect(() => {
    if (!activeBooking || !isLoggedIn || !token || !activeBooking.propertyId) return;
    let cancelled = false;
    const index = activeIndex;

    updateBookingAt(index, { slotsLoading: true, slotError: null });
    visitApi.getAvailableSlots(token, activeBooking.propertyId, selectedDate)
      .then((res) => {
        if (cancelled) return;
        updateBookingAt(index, {
          slots: res?.data || [],
          slotMeta: res?.meta || null,
          slotsLoading: false,
          slotError: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        updateBookingAt(index, {
          slots: [],
          slotMeta: null,
          slotsLoading: false,
          slotError: error?.message || 'Unable to load time slots.',
        });
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, activeIndex, activeBooking?.propertyId, isLoggedIn, token]);

  const activeFutureSlots = useMemo(() => {
    if (!activeBooking) return [];
    return activeBooking.slots.filter((slot) =>
      isFutureSlot(slot, now) && (!minStartAfter || new Date(slot.slot_start) >= minStartAfter)
    );
  }, [activeBooking, now, minStartAfter]);

  const slotGroups = activeFutureSlots.length > 0
    ? groupAvailableSlots(activeFutureSlots)
    : { morning: [], afternoon: [], evening: [] };

  // Fetch sales officers once a slot is picked for the active property
  useEffect(() => {
    if (!activeBooking?.slot?.slot_start || !activeBooking?.propertyId) return;
    let cancelled = false;
    const index = activeIndex;

    updateBookingAt(index, { officersLoading: true, officers: [], officerId: null, officerError: null });
    visitApi.getAvailableOfficers(token, activeBooking.propertyId, activeBooking.slot.slot_start, activeBooking.slotMeta?.branch_id)
      .then((res) => {
        if (cancelled) return;
        updateBookingAt(index, {
          officers: res?.data || [],
          officerMeta: res?.meta || null,
          officersLoading: false,
          officerError: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        updateBookingAt(index, {
          officers: [],
          officerMeta: null,
          officersLoading: false,
          officerError: error?.message || 'Unable to load sales officers.',
        });
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeBooking?.slot?.slot_start, activeBooking?.propertyId]);

  const isPreviousMonthDisabled = getMonthKey(calendarMonth) <= getMonthKey(toLocalDateKey(now));

  const handleSlotPress = (index, slot) => {
    updateBookingAt(index, { slot, officerId: null, officers: [], officerMeta: null, officerDropdownOpen: false });
  };

  const handleLockBooking = (index) => {
    const booking = bookings[index];
    if (!booking?.slot) {
      Alert.alert('Select Time', 'Please select a time slot for this property');
      return;
    }
    const requiresOfficer = Boolean(booking.officerMeta?.show_officer_dropdown);
    if (requiresOfficer && !booking.officerId) {
      Alert.alert('Select Sales Officer', 'Please select a sales officer for this property');
      return;
    }
    updateBookingAt(index, { locked: true, officerDropdownOpen: false });
  };

  const handleUnlockBooking = (index) => {
    // Unlocking a property invalidates the sequential slots of everything after it
    setBookings((prev) => prev.map((b, i) => (
      i === index
        ? { ...b, locked: false }
        : i > index
          ? { ...b, locked: false, slot: null, officerId: null, officers: [], officerMeta: null, slots: [] }
          : b
    )));
  };

  const hydratePropertyDetailPayload = async (visit) => {
    const fallbackPayload = buildPropertyDetailPayload(visit);
    const propertyId = getPropertyIdForVisit(visit);
    if (!propertyId) return fallbackPayload;

    try {
      const [propertyResponse, projectListResponse] = await Promise.all([
        propertyApi.getPropertyList(token, { limit: 500 }),
        projectApi.listProjects(token),
      ]);

      const properties = getApiList(propertyResponse);
      const projects = getApiList(projectListResponse);
      const property = findById(properties, propertyId);
      const projectId = property?.project_id || visit?.project_id || visit?.projectId;
      const projectListItem = projects.find((project) =>
        (projectId && String(project?.id) === String(projectId)) ||
        (visit?.slug && project?.slug === visit.slug)
      );
      const slug = resolveProjectSlug(visit, property, projects);

      let projectDetails = null;
      let floorPlans = [];
      let projectAmenities = [];

      if (slug) {
        const [detailsResponse, floorPlansResponse, amenitiesResponse] = await Promise.all([
          projectApi.getProjectDetails(slug, token),
          projectApi.getProjectFloorPlans(slug, token),
          projectApi.getProjectAmenities(slug, token),
        ]);

        projectDetails = getApiData(detailsResponse);
        floorPlans = getApiList(floorPlansResponse, "floor_plans");
        projectAmenities = normalizeApiAmenities(getApiList(amenitiesResponse));
      }

      const matchedPlan = findById(floorPlans, propertyId);
      const normalizedPlan = matchedPlan ? normalizeApiFloorPlan(matchedPlan) : null;
      const propertyImage = property?.cover_image || property?.cover_image_url || property?.image;
      const selectedVariant = {
        ...fallbackPayload.variant,
        ...normalizeApiFloorPlan({
          id: propertyId,
          title: property?.title || fallbackPayload.variant.title,
          bedrooms: property?.bedrooms,
          total_area_sqft: property?.total_area_sqft,
          area_sqft: property?.total_area_sqft,
          price: property?.base_price ?? property?.min_price ?? property?.max_price,
          base_price: property?.base_price,
          tower_no: property?.tower_no,
          image: propertyImage,
        }),
        ...(normalizedPlan || {}),
      };

      const variantAmenities = normalizeApiAmenities(selectedVariant.amenities || []);
      selectedVariant.amenities = variantAmenities.length > 0 ? variantAmenities : projectAmenities;
      selectedVariant.possession_status =
        selectedVariant.possession_status ||
        selectedVariant.possession ||
        property?.possession_status ||
        projectDetails?.possession ||
        projectDetails?.possession_status ||
        fallbackPayload.variant.possession_status;
      selectedVariant.inventory =
        selectedVariant.inventory ??
        property?.inventory ??
        projectDetails?.stats?.units ??
        fallbackPayload.variant.inventory;

      const projectImage = projectDetails?.cover_image || projectListItem?.cover_image_url || propertyImage;
      const projectArea = projectDetails?.area || property?.area || visit?.area || fallbackPayload.project.area;
      const projectCity = projectDetails?.city || property?.city || visit?.city || fallbackPayload.project.city;

      return {
        project: {
          ...fallbackPayload.project,
          ...projectListItem,
          id: projectDetails?.id || projectListItem?.id || projectId || fallbackPayload.project.id,
          slug: slug || fallbackPayload.project.slug,
          name: projectDetails?.name || projectListItem?.name || fallbackPayload.project.name,
          title: projectDetails?.name || projectListItem?.name || fallbackPayload.project.title,
          city: projectCity,
          area: projectArea,
          location: projectDetails?.location || fallbackPayload.project.location || [projectArea, projectCity].filter(Boolean).join(", "),
          imageMain: getImageSource(projectImage || fallbackPayload.project.imageMain),
          imageThumb: getImageSource(propertyImage || projectImage || fallbackPayload.project.imageThumb),
          builder: projectDetails?.developer?.name || fallbackPayload.project.builder,
          totalImages: fallbackPayload.project.totalImages || 1,
          possessionStatus: projectDetails?.possession || property?.possession_status || fallbackPayload.project.possessionStatus,
          possession: projectDetails?.possession || property?.possession_status || fallbackPayload.project.possession,
          tower_no: selectedVariant.tower_no || fallbackPayload.project.tower_no,
          inventory: selectedVariant.inventory ?? fallbackPayload.project.inventory,
          units: projectDetails?.stats?.units ?? fallbackPayload.project.units,
          price_from: projectDetails?.price_from ?? projectDetails?.starting_from ?? property?.min_price ?? selectedVariant.price,
          price_to: projectDetails?.price_to ?? property?.max_price,
          amenities: selectedVariant.amenities,
          variants: [selectedVariant],
          floorPlans: [selectedVariant],
        },
        variant: selectedVariant,
      };
    } catch (error) {
      console.log("Property detail hydration failed:", error?.message || error);
      return fallbackPayload;
    }
  };

  const handleViewDetails = async (visit) => {
    const fallbackPayload = buildPropertyDetailPayload(visit);
    setDetailModalData(fallbackPayload);
    setIsDetailModalVisible(true);

    const enrichedPayload = await hydratePropertyDetailPayload(visit);
    setDetailModalData(enrichedPayload);
  };

  const renderSlotSection = (index, label, icon, slots) => (
    <View key={label}>
      <View className="flex-row items-center mb-3.5">
        <Feather name={icon} size={12} color="#9CA3AF" />
        <Text className="text-[10px] font-manrope-extrabold text-[#6B7280] ml-2 uppercase tracking-[1px]">{label}</Text>
      </View>
      <View className="flex-row flex-wrap gap-3 mb-5">
        {slots.map(slot => {
          const labelText = formatSlotTime(slot.slot_start);
          const isSelected = bookings[index]?.slot?.slot_start === slot.slot_start;
          return (
            <Pressable
              key={slot.slot_start}
              onPress={() => handleSlotPress(index, slot)}
              className={`items-center justify-center rounded-xl border ${isSelected ? 'bg-[#F2EFFF] border-[#B2A7FF]' : 'bg-white border-gray-200'}`}
              style={{ width: '30.5%', height: 44 }}
            >
              <Text
                numberOfLines={1}
                className={`text-[11.5px] font-manrope-bold tracking-wide ${isSelected ? 'text-[#4A43EC]' : 'text-[#111827]'}`}
              >
                {labelText}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const handleConfirmVisit = async () => {
    if (!isLoggedIn || !token) {
      Alert.alert('Login Required', 'Please login to book a site visit');
      return;
    }

    if (bookings.length === 0) return;

    const missingProperty = bookings.find((b) => !b.propertyId);
    if (missingProperty) {
      Alert.alert(
        'Property Not Available',
        `${missingProperty.visit.title || missingProperty.visit.name || 'This property'} cannot be booked because its unit ID is missing. Please reopen the project and add a specific unit to your site visit.`
      );
      return;
    }

    if (!allLocked) {
      Alert.alert('Finish Booking Setup', 'Please select and lock a time slot for every property before confirming.');
      return;
    }

    setCreating(true);
    try {
      console.log('📤 Creating site visits concurrently:', bookings.map(b => ({
        property_id: b.propertyId,
        slot_start: b.slot.slot_start,
        officer_id: b.officerId,
      })));

      const createdVisits = await Promise.all(bookings.map(async (booking) => {
        const propertyName = booking.visit.title || booking.visit.name || 'the property';
        const result = await dispatch(createSiteVisitThunk({
          property_id: booking.propertyId,
          slot_start: booking.slot.slot_start,
          user_note: notes || null,
          branch_id: booking.slotMeta?.branch_id,
          officer_id: booking.officerId,
          visitors_count: visitors,
          property_name: propertyName,
        })).unwrap();

        return { booking, result };
      }));

      console.log('✅ Site visits created:', createdVisits.length);

      if (rescheduleVisitId) {
        try {
          await dispatch(updateSiteVisitThunk({
            visitId: rescheduleVisitId,
            updateData: { status: 'rescheduled' },
          })).unwrap();
        } catch (updateError) {
          console.log('Failed to mark previous visit as rescheduled:', updateError);
        }
      }

      const dateObj = new Date(selectedDate);
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const newUpcoming = createdVisits.map(({ booking, result }, index) => {
        const officer = booking.officers.find((o) => normalizeOfficer(o).id === booking.officerId);
        const normalizedOfficer = officer ? normalizeOfficer(officer) : null;
        return {
          id: result.data?.id || `${booking.propertyId}_${Date.now()}_${index}`,
          projectId: booking.visit.projectId || booking.visit.id.replace(/\d{13}$/, ""),
          propertyIds: booking.visit.propertyIds?.length ? booking.visit.propertyIds : [booking.propertyId],
          title: booking.visit.title || booking.visit.name,
          location: booking.visit.location,
          image: booking.visit.image || booking.visit.imageMain || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
          status: "UPCOMING",
          dateFull: `${formattedDate} · ${formatSlotTime(booking.slot.slot_start)}`,
          slot_start: result.data?.slot_start || booking.slot.slot_start,
          slot_end: result.data?.slot_end,
          isoDate: result.data?.slot_start || booking.slot.slot_start,
          visitors: visitors,
          notes: notes,
          salesOfficerId: normalizedOfficer?.id || result.data?.officer_id,
          salesOfficerName: normalizedOfficer?.name || "Assigned sales officer",
          salesOfficerRole: normalizedOfficer?.role || "Sales Officer",
          bookingId: result.data?.id || `SQF-${Math.floor(10000 + Math.random() * 90000)}`,
          visitorName: currentUser.name,
          duration: "1.5 Hours",
        };
      });

      dispatch(confirmVisits(newUpcoming));

      router.replace({
        pathname: '/(screens)/booking-status',
        params: {
          date: selectedDate,
          time: formatSlotTime(bookings[0].slot.slot_start),
          propertyName: newUpcoming[0].title,
          propertyId: newUpcoming[0].projectId,
          bookingIds: newUpcoming.map((v) => v.id).join(","),
        }
      });
    } catch (error) {
      console.log('❌ Error creating site visit:', error);

      const errorMessage = error?.message || error || 'Failed to book site visit. Please try again.';

      if (errorMessage.includes('No officers available')) {
        Alert.alert(
          'No Officers Available',
          'Unfortunately, no sales officers are available for this time slot. Please try selecting a different date or time.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (errorMessage.includes('already have a booking')) {
        Alert.alert(
          'Booking Conflict',
          'You already have a site visit booked at this time. Please choose a different time slot.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (errorMessage.includes('fully booked')) {
        Alert.alert(
          'Slot Fully Booked',
          'This time slot is fully booked. Please select another time.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Booking Failed',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{ paddingTop: Platform.OS === "ios" ? insets.top : 40, backgroundColor: "white" }}>
        <View className="flex-row items-center justify-between px-6 py-0.5 bg-white border-b border-gray-200">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 justify-center"
          >
            <Feather name="arrow-left" size={24} color="#111827" />
          </Pressable>

          <Text className="text-[15px] font-manrope-bold text-[#111827]">
            Book a site visit
          </Text>

          <View className="w-10 h-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={-30}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 bg-white"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >

          {/* Select Date (shared by every property) */}
          <View className="mb-7 mt-1">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[14px] font-manrope-bold text-[#111827]">Select Date</Text>
              <View className="flex-row items-center">
                <Text className="text-[12px] font-manrope text-[#4B5563] mr-4">
                  {parseDateKey(calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      if (isPreviousMonthDisabled) return;
                      const d = parseDateKey(calendarMonth);
                      d.setMonth(d.getMonth() - 1);
                      setCalendarMonth(toLocalDateKey(d));
                    }}
                    disabled={isPreviousMonthDisabled}
                    className="w-[24px] h-[24px] border border-gray-200 rounded-full bg-white items-center justify-center"
                  >
                    <Feather name="chevron-left" size={12} color={isPreviousMonthDisabled ? "#D1D5DB" : "#9CA3AF"} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const d = parseDateKey(calendarMonth);
                      d.setMonth(d.getMonth() + 1);
                      setCalendarMonth(toLocalDateKey(d));
                    }}
                    className="w-[24px] h-[24px] border border-gray-200 rounded-full bg-white items-center justify-center"
                  >
                    <Feather name="chevron-right" size={12} color="#4B5563" />
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="border border-gray-200 rounded-[20px] pb-2 pt-2 bg-white overflow-hidden">
              <Calendar
                key={calendarMonth}
                current={calendarMonth}
                minDate={toLocalDateKey(now)}
                hideArrows={true}
                renderHeader={() => <View style={{ height: 0 }} />}
                onDayPress={(day) => {
                  const currentTodayKey = toLocalDateKey(now);
                  if (day.dateString < currentTodayKey) return;
                  setSelectedDate(day.dateString);
                }}
                onMonthChange={(month) => setCalendarMonth(month.dateString)}
                markingType={'custom'}
                markedDates={{
                  [selectedDate]: {
                    selected: true,
                    disableTouchEvent: true,
                    customStyles: {
                      container: {
                        backgroundColor: '#4A43EC',
                        elevation: 6,
                        shadowColor: '#4A43EC',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        borderWidth: 2,
                        borderColor: 'white',
                        justifyContent: 'center',
                        alignItems: 'center'
                      },
                      text: {
                        color: 'white',
                        fontFamily: 'manrope-extrabold',
                        fontSize: 14
                      }
                    }
                  }
                }}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#9CA3AF',
                  dayTextColor: '#111827',
                  textDisabledColor: '#D1D5DB',
                  textDayFontFamily: 'manrope-medium',
                  textDayHeaderFontFamily: 'manrope-bold',
                  textDayFontSize: 13.5,
                  textDayHeaderFontSize: 10,
                  'stylesheet.calendar.header': {
                    header: {
                      height: 0,
                      opacity: 0,
                    },
                    dayHeader: {
                      marginTop: 6,
                      marginBottom: 8,
                      width: 32,
                      textAlign: 'center',
                      fontSize: 10,
                      fontFamily: 'manrope-bold',
                      color: '#9CA3AF'
                    }
                  }
                }}
              />
            </View>
          </View>

          {/* One block per selected property: card + its own slot/officer lock */}
          {bookings.map((booking, index) => {
            const visit = booking.visit;
            const imageSource = getImageSource(visit.image || visit.imageMain);
            const isActive = index === activeIndex;
            const isUpcoming = activeIndex >= 0 && index > activeIndex;
            const requiresOfficer = Boolean(booking.officerMeta?.show_officer_dropdown);
            const selectedOfficer = booking.officers.map(normalizeOfficer).find((o) => o.id === booking.officerId);

            return (
              <View key={booking.visitId} className={`mb-4 rounded-2xl border ${booking.locked ? 'border-[#4A43EC]' : 'border-gray-200'} overflow-hidden`}>
                <View className={`flex-row p-3 ${booking.locked ? 'bg-[#F8F7FF]' : 'bg-white'}`}>
                  <Image source={imageSource} className="w-[64px] rounded-xl mr-3" resizeMode="cover" />
                  <View className="flex-1 justify-center">
                    <Text className="text-[13px] font-manrope-bold text-gray-900 mb-0.5" numberOfLines={1}>
                      {getVisitTitleLabel(visit) || "Property"}
                    </Text>
                    <Text className="text-[11px] font-manrope text-gray-500 mb-0.5" numberOfLines={1}>
                      {visit.projectName || visit.title || visit.name}
                    </Text>
                    {visit.location ? (
                      <View className="flex-row items-center">
                        <Feather name="map-pin" size={10} color="#9CA3AF" />
                        <Text className="text-[#9CA3AF] text-[10.5px] font-manrope ml-1" numberOfLines={1}>
                          {visit.location}
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => handleViewDetails(visit)}
                      className="flex-row items-center mt-1"
                    >
                      <Text className="text-[#4A43EC] text-[11px] font-manrope-bold">View Details</Text>
                      <Feather name="chevron-right" size={12} color="#4A43EC" style={{ marginLeft: 2 }} />
                    </Pressable>
                  </View>
                  {booking.locked && (
                    <View className="w-6 h-6 rounded-full bg-[#4A43EC] items-center justify-center self-start">
                      <Feather name="check" size={13} color="white" />
                    </View>
                  )}
                </View>

                {booking.locked ? (
                  <View className="px-3 pb-3 pt-1 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Feather name="clock" size={12} color="#4A43EC" />
                      <Text className="text-[12px] font-manrope-bold text-[#4A43EC] ml-1.5">
                        {formatSlotTime(booking.slot.slot_start)}
                      </Text>
                      {selectedOfficer && (
                        <>
                          <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
                          <Feather name="user-check" size={12} color="#6B7280" />
                          <Text className="text-[12px] font-manrope text-[#6B7280] ml-1.5" numberOfLines={1}>
                            {selectedOfficer.name}
                          </Text>
                        </>
                      )}
                    </View>
                    <Pressable onPress={() => handleUnlockBooking(index)} className="px-2 py-1">
                      <Text className="text-[11px] font-manrope-bold text-[#EF4444]">Edit</Text>
                    </Pressable>
                  </View>
                ) : isUpcoming ? (
                  <View className="px-3 pb-3 pt-1">
                    <Text className="text-[11.5px] font-manrope text-[#9CA3AF]">
                      Lock the slot above first to schedule this property
                    </Text>
                  </View>
                ) : isActive ? (
                  <View className="px-3 pb-3 pt-1 border-t border-gray-100">
                    <Text className="text-[12px] font-manrope-bold text-[#111827] mt-3 mb-3">
                      Select Time Slot{minStartAfter ? ` (after ${formatSlotTime(minStartAfter)})` : ''}
                    </Text>

                    {booking.slotsLoading ? (
                      <View className="py-6 items-center justify-center">
                        <ActivityIndicator size="small" color="#4A43EC" />
                        <Text className="text-[12px] font-manrope text-[#6B7280] mt-3">
                          Checking available slots...
                        </Text>
                      </View>
                    ) : activeFutureSlots.length > 0 ? (
                      <>
                        {slotGroups.morning.length > 0 && renderSlotSection(index, "MORNING", "sunrise", slotGroups.morning)}
                        {slotGroups.afternoon.length > 0 && renderSlotSection(index, "AFTERNOON", "sun", slotGroups.afternoon)}
                        {slotGroups.evening.length > 0 && renderSlotSection(index, "EVENING", "sunset", slotGroups.evening)}
                      </>
                    ) : (
                      <View className="border border-dashed border-gray-200 rounded-2xl p-5 items-center bg-gray-50 mb-2">
                        <Text className="text-[13px] font-manrope-bold text-[#111827]">
                          {!booking.propertyId ? "Property unit missing" : booking.slotError ? "Could not load time slots" : "No slots available"}
                        </Text>
                        <Text className="text-[11px] font-manrope text-[#6B7280] text-center mt-1">
                          {!booking.propertyId
                            ? "Please reopen the project and add a specific unit to your site visit."
                            : booking.slotError || "Try a different date."}
                        </Text>
                      </View>
                    )}

                    {booking.slot && (
                      <View className="mt-1 mb-3">
                        <Text className="text-[12px] font-manrope-bold text-[#111827] mb-3">Select Sales Officer</Text>
                        {booking.officersLoading ? (
                          <View className="py-5 items-center justify-center border border-gray-200 rounded-2xl bg-white">
                            <ActivityIndicator size="small" color="#4A43EC" />
                            <Text className="text-[12px] font-manrope text-[#6B7280] mt-3">Checking available sales officers...</Text>
                          </View>
                        ) : requiresOfficer ? (
                          <View className="relative">
                            <Pressable
                              onPress={() => {
                                if (booking.officers.length === 0) return;
                                updateBookingAt(index, { officerDropdownOpen: !booking.officerDropdownOpen });
                              }}
                              disabled={booking.officers.length === 0}
                              className={`bg-white border rounded-2xl px-4 py-3.5 flex-row items-center justify-between ${selectedOfficer ? 'border-[#B2A7FF]' : 'border-gray-200'} ${booking.officers.length === 0 ? 'opacity-60' : ''}`}
                            >
                              <View className="flex-row items-center flex-1 pr-3">
                                <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${selectedOfficer ? 'bg-[#F2EFFF]' : 'bg-gray-100'}`}>
                                  <Feather name="user-check" size={16} color={selectedOfficer ? "#4A43EC" : "#9CA3AF"} />
                                </View>
                                <View className="flex-1">
                                  <Text className={`text-[13px] font-manrope-bold ${selectedOfficer ? 'text-[#111827]' : 'text-[#9CA3AF]'}`} numberOfLines={1}>
                                    {selectedOfficer?.name || (booking.officers.length === 0 ? (booking.officerError ? "Could not load officers" : "No officers available") : "Choose sales officer")}
                                  </Text>
                                  <Text className="text-[11px] font-manrope text-[#6B7280] mt-0.5" numberOfLines={1}>
                                    {selectedOfficer?.isPrevious
                                      ? "Previous sales officer"
                                      : booking.officerError || selectedOfficer?.role || "Required before locking"}
                                  </Text>
                                </View>
                              </View>
                              <Feather name={booking.officerDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
                            </Pressable>

                            {booking.officerDropdownOpen && (
                              <View className="mt-2 bg-white border border-gray-200 rounded-2xl overflow-hidden">
                                {booking.officers.map(normalizeOfficer).map((officer, officerIndex, arr) => {
                                  const isSelectedOfficer = officer.id === booking.officerId;
                                  return (
                                    <Pressable
                                      key={officer.id}
                                      onPress={() => updateBookingAt(index, { officerId: officer.id, officerDropdownOpen: false })}
                                      className={`px-4 py-3.5 flex-row items-center justify-between ${officerIndex !== arr.length - 1 ? 'border-b border-gray-100' : ''} ${isSelectedOfficer ? 'bg-[#F8F7FF]' : 'bg-white'}`}
                                    >
                                      <View className="flex-1 pr-3">
                                        <Text className="text-[13px] font-manrope-bold text-[#111827]">{officer.name}</Text>
                                        <Text className="text-[11px] font-manrope text-[#6B7280] mt-0.5">
                                          {officer.isPrevious ? "Previous sales officer" : officer.role}
                                        </Text>
                                      </View>
                                      {isSelectedOfficer && <Feather name="check-circle" size={17} color="#4A43EC" />}
                                    </Pressable>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        ) : (
                          <View className="rounded-2xl border border-gray-200 bg-[#F8F9FB] px-4 py-3.5 flex-row items-center">
                            <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-white border border-gray-200">
                              <Feather name="user-check" size={16} color="#4A43EC" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-[13px] font-manrope-bold text-[#111827]">Sales officer will be assigned</Text>
                              <Text className="text-[11px] font-manrope text-[#6B7280] mt-0.5" numberOfLines={1}>
                                An available officer will be assigned for this slot.
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    <Pressable
                      onPress={() => handleLockBooking(index)}
                      disabled={!booking.slot || (requiresOfficer && !booking.officerId)}
                      className={`rounded-xl py-3 flex-row items-center justify-center ${booking.slot && (!requiresOfficer || booking.officerId) ? 'bg-[#4A43EC]' : 'bg-gray-300'}`}
                    >
                      <Text className="text-white font-manrope-bold text-[13px] mr-2">Lock this slot</Text>
                      <Feather name="lock" size={14} color="white" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* Number of Visitors */}
          <View className="bg-[#F8F9FB] rounded-[18px] p-4 flex-row justify-between items-center mb-8 mt-2">
            <View>
              <Text className="text-[13px] font-manrope-bold text-[#111827] mb-0.5">Number of Visitors</Text>
              <Text className="text-[11px] font-manrope text-[#9CA3AF]">Including children</Text>
            </View>
            <View className="flex-row items-center bg-white border border-gray-200 rounded-full p-[2px]">
              <Pressable
                onPress={() => setVisitors(Math.max(1, visitors - 1))}
                className="w-7 h-7 items-center justify-center rounded-full border border-gray-200 bg-white"
              >
                <Feather name="minus" size={13} color={visitors > 1 ? "#4A43EC" : "#D1D5DB"} />
              </Pressable>
              <Text className="text-[13px] font-manrope-bold text-[#111827] w-7 text-center">{visitors}</Text>
              <Pressable
                onPress={() => setVisitors(visitors + 1)}
                className="w-7 h-7 bg-[#4A43EC] rounded-full items-center justify-center"
              >
                <Feather name="plus" size={13} color="white" />
              </Pressable>
            </View>
          </View>


          {/* Notes */}
          <View className="mb-4">
            <Text className="text-[13px] font-manrope-bold text-[#4B5563] mb-3">Notes / Special Requests</Text>
            <View className="bg-[#F8F9FB] rounded-[14px] p-3.5">
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="e.g. Would like to see the penthouse floor, coming with senior citizens..."
                placeholderTextColor="#9CA3AF"
                className="text-[13px] font-manrope text-[#111827] h-16"
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />
            </View>
          </View>
          <Pressable
            onPress={handleConfirmVisit}
            disabled={creating || !allLocked}
            className={`rounded-[16px] py-[15px] flex-row items-center justify-center mt-2 mb-2 ${creating || !allLocked ? 'bg-gray-400' : 'bg-[#4A43EC]'}`}
          >
            {creating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text className="text-white font-manrope-bold text-[15px] mr-2">
                  Confirm Site Visit{bookings.length > 1 ? `s (${bookings.length})` : ''}
                </Text>
                <Feather name="arrow-right" size={16} color="white" />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <PropertyDetailModal
        visible={isDetailModalVisible}
        onClose={() => setIsDetailModalVisible(false)}
        project={detailModalData?.project}
        variant={detailModalData?.variant}
        readOnly
      />
    </View>
  );
}
