import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";
import EmptyState from "./EmptyState";
import { fetchSavedPropertiesThunk } from "../../store/slices/propertiesSlice";
import { fetchProjectListThunk } from "../../store/slices/projectSlice";
import { PropertyCardSkeleton } from "../SkeletonLoader";
import ReraStatusBadge, { isReraApproved } from "../ReraStatusBadge";
import ImageLightbox from "../ImageLightbox";
import {
  getSavedItemDetails,
  getSavedItemId,
  getSavedItemType,
  getSavedLocation,
  getSavedPrice,
  getSavedPrimaryImage,
  getSavedSummary,
} from "../../services/savedItemDisplay";

const SavedTabContent = ({ refreshing = false, onRefresh }) => {
  const dispatch = useDispatch();
  const { savedProperties, loading } = useSelector((state) => state.properties);
  const { list: projectList } = useSelector((state) => state.project);
  const { isLoggedIn, token } = useSelector((state) => state.auth);
  const [galleryImages, setGalleryImages] = useState([]);

  useEffect(() => {
    if (isLoggedIn && token) {
      dispatch(fetchSavedPropertiesThunk());
      dispatch(fetchProjectListThunk());
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
        <Text className="text-gray-500 text-center mt-2">Please login to view your saved properties</Text>
        <Pressable onPress={() => router.push("/(auth)/login")} className="mt-6 bg-[#4A43EC] px-6 py-3 rounded-xl">
          <Text className="text-white font-bold">Login Now</Text>
        </Pressable>
      </View>
    );
  }

  if (savedProperties.length === 0) {
    return <EmptyState type="SAVED" />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 150 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A43EC"]} tintColor="#4A43EC" />}
    >
      <StatusBar style="dark" />
      <View className="mt-10 px-4 mb-6">
        {savedProperties.map((item, index) => {
          const itemType = getSavedItemType(item);
          const isPropertyType = itemType === "property";
          const details = getSavedItemDetails(item, projectList);
          const itemId = getSavedItemId(item);
          const primaryImage = getSavedPrimaryImage(details);
          const cardImages = [...new Set([
            primaryImage,
            ...(details.images || []).map((image) => typeof image === "string" ? image : image?.url || image?.thumbnail_url),
          ].filter(Boolean))];
          const location = getSavedLocation(details);
          const price = getSavedPrice(details);
          const summaryText = getSavedSummary(details, !isPropertyType);

          return (
            <View key={`${itemId || index}-${index}`} className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-10">
              <Pressable
                disabled={!primaryImage}
                onPress={() => setGalleryImages(cardImages)}
                className="h-36 relative"
              >
                  {primaryImage ? (
                    <Image source={{ uri: primaryImage }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full bg-[#F4F7FF] items-center justify-center">
                      <Feather name="image" size={32} color="#9CA3AF" />
                    </View>
                  )}
                  {primaryImage && <View className="absolute top-2 left-2 bg-black/40 px-2 py-0.5 rounded-md">
                    <Text className="text-white text-[10px] font-manrope">
                      {isPropertyType ? (details.type || "Property") : "Project"}
                    </Text>
                  </View>}
                  {cardImages.length > 1 && (
                    <View className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-md flex-row items-center">
                      <Feather name="images" size={11} color="white" />
                      <Text className="text-white text-[9px] font-manrope-bold ml-1">View {cardImages.length} Photos</Text>
                    </View>
                  )}
              </Pressable>

              <View className="px-3 pt-3 pb-2">
                <Text className="text-[10px] text-[#6B7280] font-manrope mb-[4px]" numberOfLines={1}>
                  {location}{isPropertyType && details.bedrooms ? ` - ${details.bedrooms} BHK` : ""}
                </Text>
                <View className="flex-row items-center mb-1">
                  <Text className="text-[15px] font-manrope-extrabold text-[#111827] flex-1" numberOfLines={1}>
                    {details.title || details.name || "Unnamed Asset"}
                  </Text>
                  <ReraStatusBadge approved={isReraApproved(details)} className="ml-2" />
                </View>
                <Text className="text-[11px] text-[#9CA3AF] font-manrope">{details.pincode || ""}</Text>
              </View>

              <View className="mx-3 mb-2" style={{ borderBottomWidth: 1, borderStyle: "dashed", borderColor: "#E5E7EB" }} />
              <View className="flex-row justify-between px-3 pb-3">
                <View>
                  <Text className="text-[9px] text-[#9CA3AF] font-manrope-extrabold uppercase tracking-wide">
                    {summaryText}
                  </Text>
                  <Text className="text-[14px] font-manrope-extrabold text-[#111827] mt-1">
                    {price}
                  </Text>
                </View>
              </View>
              <View className="px-3 pb-3">
                <Pressable
                  onPress={() => router.push({
                    pathname: isPropertyType ? "/(screens)/property-type" : "/(screens)/project-detail",
                    params: { id: itemId, slug: details.slug || "none" },
                  })}
                  className="w-full border border-[#4A43EC] rounded-xl py-2 items-center justify-center"
                >
                  <Text className="text-[#4A43EC] font-manrope-extrabold text-[13px]">View details</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <ImageLightbox visible={galleryImages.length > 0} images={galleryImages} onClose={() => setGalleryImages([])} />

      <View className="px-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[15px] font-manrope-extrabold text-[#111827]">{savedProperties.length} Saved Properties</Text>
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

export default SavedTabContent;
