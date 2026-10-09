import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { confirmVisits } from "../../store/slices/propertiesSlice";
import { createSiteVisitThunk, updateSiteVisitThunk } from "../../store/slices/visitSlice";
import { visitApi } from "../../services/visitApi";
import { currentUser } from "../../data/user";
import { maskProjectName } from "../../services/projectDisplay";

const MINUTES_PER_PROPERTY = 90;
const FALLBACK = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80";
const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
const propertyId = (v) => [v?.propertyIds?.[0], v?.property_id, v?.propertyId, v?.id].find(isUuid);
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const time = (v) => new Date(v).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const duration = (m) => m % 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m / 60} ${m === 60 ? "hour" : "hours"}`;
const officerData = (v = {}) => ({ ...v, id: v.officer_id || v.id, name: v.full_name || [v.first_name, v.last_name].filter(Boolean).join(" ") || "Sales Officer" });

export default function BookSiteVisit() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const raw = useSelector((s) => s.properties.bookedSiteVisits);
  const { token, isLoggedIn } = useSelector((s) => s.auth);
  const today = dayKey();
  const [date, setDate] = useState(params.initialDate >= today ? params.initialDate : today);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [slotMeta, setSlotMeta] = useState(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [officers, setOfficers] = useState([]);
  const [officerId, setOfficerId] = useState(null);
  const [officerLoading, setOfficerLoading] = useState(false);
  const [officerOpen, setOfficerOpen] = useState(false);
  const [visitors, setVisitors] = useState(Number(params.initialVisitors) || 1);
  const [notes, setNotes] = useState(params.initialNotes || "");
  const [creating, setCreating] = useState(false);

  const cart = useMemo(() => Array.from(new Map(raw.map((v) => [String(v.id).replace(/_reschedule_.*/, ""), v])).values()), [raw]);
  const selectedIds = useMemo(() => params.selectedIds ? String(params.selectedIds).split(",") : cart.map((v) => String(v.id)), [params.selectedIds, cart]);
  const visits = useMemo(() => selectedIds.map((id) => cart.find((v) => String(v.id) === id)).filter(Boolean), [selectedIds, cart]);
  const propertyIds = useMemo(() => visits.map(propertyId).filter(Boolean), [visits]);
  const propertyIdsKey = propertyIds.join(",");
  const firstPropertyId = propertyIds[0];
  const propertyCount = propertyIds.length;
  const selectedSlotStart = slot?.slot_start;
  const totalMinutes = propertyIds.length * MINUTES_PER_PROPERTY;
  const officer = officers.map(officerData).find((v) => v.id === officerId);

  useEffect(() => {
    setSlot(null); setOfficerId(null); setOfficers([]);
    if (!token || !firstPropertyId || propertyCount !== visits.length) return;
    let active = true; setSlotLoading(true); setSlotError("");
    visitApi.getAvailableSlots(token, firstPropertyId, date, null, propertyCount)
      .then((r) => { if (active) { setSlots(r.data || []); setSlotMeta(r.meta || null); } })
      .catch((e) => { if (active) { setSlots([]); setSlotError(e.message); } })
      .finally(() => active && setSlotLoading(false));
    return () => { active = false; };
  }, [token, date, propertyIdsKey, firstPropertyId, propertyCount, visits.length]);

  useEffect(() => {
    if (!token || !selectedSlotStart || !firstPropertyId) return;
    let active = true; setOfficerLoading(true); setOfficers([]); setOfficerId(null);
    visitApi.getAvailableOfficers(token, firstPropertyId, selectedSlotStart, slotMeta?.branch_id, propertyCount)
      .then((r) => active && setOfficers(r.data || []))
      .catch((e) => active && Alert.alert("Availability", e.message))
      .finally(() => active && setOfficerLoading(false));
    return () => { active = false; };
  }, [token, selectedSlotStart, propertyIdsKey, firstPropertyId, propertyCount, slotMeta?.branch_id]);

  const availableSlots = slots.filter((v) => new Date(v.slot_start) > new Date());
  const groups = { Morning: [], Afternoon: [], Evening: [] };
  availableSlots.forEach((v) => { const h = new Date(v.slot_start).getHours(); groups[h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening"].push(v); });

  const submit = async () => {
    if (!isLoggedIn) return Alert.alert("Login Required", "Please log in first.");
    if (propertyIds.length !== visits.length) return Alert.alert("Property unavailable", "A selected item has no property unit. Please remove it and add a specific unit again.");
    if (!slot || !officerId) return;
    setCreating(true);
    try {
      const result = await dispatch(createSiteVisitThunk({ property_ids: propertyIds, slot_start: slot.slot_start, branch_id: slotMeta?.branch_id, officer_id: officerId, visitors_count: visitors, user_note: notes || null })).unwrap();
      const rows = result.data?.visits || [];
      if (params.rescheduleVisitId) dispatch(updateSiteVisitThunk({ visitId: params.rescheduleVisitId, updateData: { status: "rescheduled" } }));
      const labelDate = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const upcoming = visits.map((visit, index) => {
        const row = rows[index] || {};
        return { id: row.id || `${propertyIds[index]}_${Date.now()}`, projectId: visit.projectId || String(visit.id).replace(/\d{13}$/, ""), propertyIds: visit.propertyIds?.length ? visit.propertyIds : [propertyIds[index]], title: visit.title || visit.name, location: visit.location, image: visit.image || visit.imageMain || FALLBACK, status: "UPCOMING", dateFull: `${labelDate} · ${time(row.slot_start || slot.slot_start)}`, slot_start: row.slot_start, slot_end: row.slot_end, isoDate: row.slot_start, visitors, notes, salesOfficerId: officerId, salesOfficerName: officer?.name, salesOfficerRole: "Sales Officer", bookingId: row.id, visitorName: currentUser.name, duration: "1.5 Hours", visitGroupId: result.data?.visit_group_id };
      });
      dispatch(confirmVisits(upcoming));
      router.replace({ pathname: "/(screens)/booking-status", params: { date, time: time(slot.slot_start), propertyName: upcoming[0]?.title, propertyId: upcoming[0]?.projectId, bookingIds: upcoming.map((v) => v.id).join(",") } });
    } catch (e) { Alert.alert("Booking Failed", e?.message || String(e)); }
    finally { setCreating(false); }
  };

  return <View className="flex-1 bg-white">
    <View style={{ paddingTop: Platform.OS === "ios" ? insets.top : 40 }} className="border-b border-gray-200"><View className="h-12 px-5 flex-row items-center justify-between"><Pressable onPress={() => router.back()} className="w-10"><Feather name="arrow-left" size={23} /></Pressable><Text className="text-[15px] font-manrope-bold">Book a site visit</Text><View className="w-10" /></View></View>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 44 }} keyboardShouldPersistTaps="handled">
      <View className="rounded-2xl bg-[#F5F3FF] border border-[#DDD8FF] p-4 flex-row items-center mb-6"><View className="w-10 h-10 rounded-full bg-[#4A43EC] items-center justify-center"><Feather name="map" size={17} color="white" /></View><View className="ml-3 flex-1"><Text className="text-[13px] font-manrope-bold">{visits.length} {visits.length === 1 ? "property" : "properties"} in one visit</Text><Text className="text-[11px] font-manrope text-gray-500 mt-0.5">One officer · {duration(totalMinutes)} · selected order</Text></View></View>
      <Text className="text-[14px] font-manrope-bold mb-3">Visit order</Text>
      {visits.map((v, i) => <View key={v.id} className="border border-gray-200 rounded-2xl p-3 mb-2 flex-row items-center"><View className="w-7 h-7 rounded-full bg-[#4A43EC] items-center justify-center"><Text className="text-white text-[11px] font-manrope-bold">{i + 1}</Text></View><Image source={{ uri: typeof (v.image || v.imageMain) === "string" ? (v.image || v.imageMain) : FALLBACK }} className="w-12 h-12 rounded-xl mx-3" /><View className="flex-1"><Text numberOfLines={1} className="text-[12px] font-manrope-bold">{v.variant || v.title || v.name}</Text><Text numberOfLines={1} className="text-[10.5px] font-manrope text-gray-500">{maskProjectName(v.projectName || v.title || v.name)}</Text></View><Text className="text-[10px] text-[#4A43EC] font-manrope-bold">90 MIN</Text></View>)}

      <Text className="text-[14px] font-manrope-bold mt-6 mb-3">Select date</Text><View className="border border-gray-200 rounded-2xl overflow-hidden"><Calendar current={date} minDate={today} onDayPress={(d) => setDate(d.dateString)} markedDates={{ [date]: { selected: true, selectedColor: "#4A43EC" } }} theme={{ arrowColor: "#4A43EC", todayTextColor: "#4A43EC", textMonthFontFamily: "manrope-bold", textDayFontFamily: "manrope-medium" }} /></View>
      <Text className="text-[14px] font-manrope-bold mt-7">Choose starting time</Text><Text className="text-[11px] font-manrope text-gray-500 mt-1 mb-4">Only times where one officer is free for the full {duration(totalMinutes)} are shown.</Text>
      {slotLoading ? <ActivityIndicator color="#4A43EC" style={{ marginVertical: 28 }} /> : availableSlots.length ? Object.entries(groups).map(([name, data]) => data.length ? <View key={name} className="mb-5"><Text className="text-[10px] font-manrope-extrabold text-gray-500 mb-3 tracking-[1px]">{name.toUpperCase()}</Text><View className="flex-row flex-wrap gap-3">{data.map((v) => { const active = slot?.slot_start === v.slot_start; return <Pressable key={v.slot_start} onPress={() => setSlot(v)} className={`w-[30.5%] h-11 rounded-xl border items-center justify-center ${active ? "bg-[#4A43EC] border-[#4A43EC]" : "border-gray-200"}`}><Text className={`text-[12px] font-manrope-bold ${active ? "text-white" : "text-gray-900"}`}>{time(v.slot_start)}</Text></Pressable>; })}</View></View> : null) : <View className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5"><Text className="text-center text-[12px] font-manrope-bold">No complete visit window available</Text><Text className="text-center text-[11px] text-gray-500 mt-1">{slotError || "Try another date."}</Text></View>}

      {slot && <View className="mt-3"><Text className="text-[14px] font-manrope-bold mb-3">Choose sales officer</Text>{officerLoading ? <ActivityIndicator color="#4A43EC" /> : <><Pressable disabled={!officers.length} onPress={() => setOfficerOpen(!officerOpen)} className="border border-gray-200 rounded-2xl p-4 flex-row items-center"><Feather name="user-check" size={18} color="#4A43EC" /><View className="ml-3 flex-1"><Text className="text-[13px] font-manrope-bold">{officer?.name || (officers.length ? "Select an available officer" : "No officer available")}</Text><Text className="text-[11px] text-gray-500 mt-0.5">Assigned to the complete visit</Text></View><Feather name={officerOpen ? "chevron-up" : "chevron-down"} size={18} /></Pressable>{officerOpen && <View className="border border-gray-200 rounded-2xl mt-2 overflow-hidden">{officers.map(officerData).map((v, i) => <Pressable key={v.id} onPress={() => { setOfficerId(v.id); setOfficerOpen(false); }} className={`p-4 flex-row justify-between ${i ? "border-t border-gray-100" : ""}`}><Text className="font-manrope-bold text-[13px]">{v.name}</Text>{officerId === v.id && <Feather name="check-circle" size={17} color="#4A43EC" />}</Pressable>)}</View>}</>}</View>}

      <View className="bg-gray-50 rounded-2xl p-4 flex-row justify-between items-center mt-7"><View><Text className="text-[13px] font-manrope-bold">Number of visitors</Text><Text className="text-[11px] text-gray-400">Including children</Text></View><View className="flex-row items-center"><Pressable onPress={() => setVisitors(Math.max(1, visitors - 1))} className="w-8 h-8 rounded-full border border-gray-200 bg-white items-center justify-center"><Feather name="minus" size={13} color="#4A43EC" /></Pressable><Text className="w-9 text-center font-manrope-bold">{visitors}</Text><Pressable onPress={() => setVisitors(visitors + 1)} className="w-8 h-8 rounded-full bg-[#4A43EC] items-center justify-center"><Feather name="plus" size={13} color="white" /></Pressable></View></View>
      <Text className="text-[13px] font-manrope-bold mt-6 mb-3">Additional details</Text><TextInput value={notes} onChangeText={setNotes} multiline textAlignVertical="top" placeholder="Anything the sales officer should know?" placeholderTextColor="#9CA3AF" className="h-24 bg-gray-50 rounded-2xl p-4 text-[13px] font-manrope" />
      <Pressable onPress={submit} disabled={creating || !slot || !officerId} className={`rounded-2xl py-4 mt-6 flex-row justify-center ${creating || !slot || !officerId ? "bg-gray-300" : "bg-[#4A43EC]"}`}>{creating ? <ActivityIndicator color="white" /> : <><Text className="text-white font-manrope-bold text-[15px] mr-2">Book site visit</Text><Feather name="arrow-right" size={17} color="white" /></>}</Pressable>
    </ScrollView></KeyboardAvoidingView>
  </View>;
}
