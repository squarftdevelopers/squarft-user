import { useEffect } from "react";
import { View, Text, Pressable, ScrollView, Image, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";
import EmptyState from "./EmptyState";
import { fetchContactedPropertiesThunk } from "../../store/slices/propertiesSlice";
import { PropertyCardSkeleton } from "../SkeletonLoader";
import ReraStatusBadge, { isReraApproved } from "../ReraStatusBadge";
import { buildProjectPrice } from "../../services/projectDisplay";

const STATUS_COLORS = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  pending_confirmation: { bg: "#FEF3C7", text: "#92400E" },
  confirmed: { bg: "#D1FAE5", text: "#065F46" },
  completed: { bg: "#DBEAFE", text: "#1E40AF" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
  cancelled_by_user: { bg: "#FEE2E2", text: "#991B1B" },
  cancelled_by_officer: { bg: "#FEE2E2", text: "#991B1B" },
  rescheduled: { bg: "#EDE9FE", text: "#5B21B6" },
  contacted: { bg: "#EDE9FE", text: "#5B21B6" },
};

const formatStatus = (status) => String(status || "contacted").replace(/_/g, " ");

const getImageUrl = (image) => {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.url || image.thumbnail_url || null;
};

const ContactedTabContent = ({ refreshing = false, onRefresh }) => {
  const dispatch = useDispatch();
  const { contactedProperties, loading } = useSelector((state) => state.properties);
  const { isLoggedIn, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isLoggedIn && token) {
      dispatch(fetchContactedPropertiesThunk());
    }
  }, [isLoggedIn, token, dispatch]);

  if (loading) {
    return (
      <View className="flex-1 bg-white pt-10 px-4">
        {[1, 2, 3].map((i) => <PropertyCardSkeleton key={i} />)}
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Feather name="log-in" size={48} color="#D1D5DB" />
        <Text className="text-gray-900 text-lg font-bold mt-4">Login Required</Text>
        <Text className="text-gray-500 text-center mt-2">Please login to view your contacted properties</Text>
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          className="mt-6 bg-[#4A43EC] px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Login Now</Text>
        </Pressable>
      </View>
    );
  }

  if (contactedProperties.length === 0) {
    return <EmptyState type="CONTACTED" />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 150 }}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={true}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A43EC"]} tintColor="#4A43EC" />}
    >
      <StatusBar style="dark" />
      <View className="mt-10 px-4 mb-6">
        {contactedProperties.map((property, index) => {
          const status = property.visit_status || property.booking_status || "contacted";
          const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.contacted;
          const images = Array.isArray(property.images) ? property.images : [];
          const coverImage = property.cover_image_url || property.cover_image || getImageUrl(images[0]);
          const secondImage = getImageUrl(images[1]);
          const title = property.name || property.title || "Project";
          const location = property.location || [property.area, property.city].filter(Boolean).join(", ");
          const priceText = property.display_price || buildProjectPrice(property) || "Price on request";
          const contactedDate = property.contacted_at
            ? new Date(property.contacted_at).toLocaleDateString("en-IN")
            : null;

          return (
            <View key={`${property.id}-${index}`} className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-10">
              <View className="flex-row h-36 w-full">
                <View className="flex-[2] relative bg-gray-200 border-r-2 border-white">
                  {coverImage ? (
                    <Image source={{ uri: coverImage }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full bg-gray-200 items-center justify-center">
                      <Feather name="image" size={32} color="#9CA3AF" />
                    </View>
                  )}
                  <View className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded">
                    <Text className="text-white text-[10px] font-manrope">{property.type || "Project"}</Text>
                  </View>
                </View>

                <View className="flex-[1] relative bg-gray-200">
                  {secondImage ? (
                    <Image source={{ uri: secondImage }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full bg-gray-100 items-center justify-center">
                      <Feather name="image" size={24} color="#D1D5DB" />
                    </View>
                  )}
                  <View className="absolute top-2 right-2 px-2 py-1 rounded" style={{ backgroundColor: statusStyle.bg }}>
                    <Text className="text-[9px] font-manrope-extrabold capitalize" style={{ color: statusStyle.text }}>
                      {formatStatus(status)}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="px-3 pt-3 pb-2">
                <Text className="text-[10px] text-[#6B7280] font-manrope mb-[4px]">
                  {location || "Location unavailable"}{contactedDate ? `  •  ${contactedDate}` : ""}
                </Text>
                <View className="flex-row items-center mb-1">
                  <Text className="text-[15px] font-manrope-extrabold text-[#111827] flex-1" numberOfLines={1}>
                    {title}
                  </Text>
                  <ReraStatusBadge approved={isReraApproved(property)} className="ml-2" />
                </View>
                <Text className="text-[11px] text-[#9CA3AF] font-manrope">{property.pincode || ""}</Text>
              </View>

              <View className="mx-3 mb-2" style={{ borderBottomWidth: 1, borderStyle: "dashed", borderColor: "#E5E7EB" }} />

              <View className="flex-row justify-between px-3 pb-3">
                <View>
                  <Text className="text-[9px] text-[#9CA3AF] font-manrope-extrabold uppercase tracking-wide">
                    {property.possession_status || property.type || "Project"}
                  </Text>
                  <Text className="text-[14px] font-manrope-extrabold text-[#111827] mt-1">
                    {priceText}
                  </Text>
                </View>
              </View>

              <View className="px-3 pb-3">
                <Pressable
                  onPress={() => router.push({ pathname: "/(screens)/project-detail", params: { id: property.id, slug: property.slug } })}
                  className="w-full border border-[#4A43EC] rounded-xl py-2 items-center justify-center"
                >
                  <Text className="text-[#4A43EC] font-manrope-extrabold text-[13px]">View details</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View className="px-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[15px] font-manrope-extrabold text-[#111827]">{contactedProperties.length} Contacted Properties</Text>
          <Pressable className="w-[32px] h-[32px] rounded-full border border-gray-200 items-center justify-center">
            <Feather name="share-2" size={14} color="#4B5563" />
          </Pressable>
        </View>
        <View className="bg-[#F4F2FF] rounded-xl p-4 mb-6">
          <Text className="text-[14px] font-manrope-extrabold text-[#111827] mb-1">Personalise your home search journey!</Text>
          <Text className="text-[12px] text-[#6B7280] font-manrope leading-[16px] mb-4 w-[85%]">
            Enhance your search{"\n"}experience with just 3 quick{"\n"}answers.
          </Text>
          <Pressable className="self-start border border-[#4A43EC] rounded-xl px-4 py-[8px] bg-white">
            <Text className="text-[#4A43EC] font-manrope-extrabold text-[12px]">Let&apos;s begin</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

export default ContactedTabContent;
