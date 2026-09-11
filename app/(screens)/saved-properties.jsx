import React, { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { router, useFocusEffect } from "expo-router";
import { fetchSavedPropertiesThunk } from "../../store/slices/propertiesSlice";
import { fetchProjectListThunk } from "../../store/slices/projectSlice";
import { PropertyCardSkeleton } from "../../components/SkeletonLoader";
import ReraStatusBadge, { isReraApproved } from "../../components/ReraStatusBadge";
import {
  getSavedItemDetails,
  getSavedItemId,
  getSavedItemType,
  getSavedLocation,
  getSavedPrice,
  getSavedPrimaryImage,
  getSavedSecondaryImage,
  getSavedSummary,
} from "../../services/savedItemDisplay";

export default function SavedProperties() {
  const dispatch = useDispatch();
  const navigatingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const { savedProperties, loading, error } = useSelector((state) => state.properties);
  const { list: projectList } = useSelector((state) => state.project);
  const { isLoggedIn, token } = useSelector((state) => state.auth);

  useFocusEffect(useCallback(() => {
    if (isLoggedIn && token) {
      dispatch(fetchSavedPropertiesThunk());
      dispatch(fetchProjectListThunk());
    }
  }, [isLoggedIn, token, dispatch]));

  const onRefresh = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    setRefreshing(true);
    try {
      await Promise.allSettled([
        dispatch(fetchSavedPropertiesThunk()),
        dispatch(fetchProjectListThunk()),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [isLoggedIn, token, dispatch]);

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="pt-14 pb-4 px-5 bg-white border-b border-gray-100">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-3">
            <Feather name="arrow-left" size={24} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-manrope-bold text-gray-900">Saved Items</Text>
            {!loading && (
              <Text className="text-sm text-gray-500 font-manrope">
                {savedProperties.length} {savedProperties.length === 1 ? 'item' : 'items'}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4A43EC"]}
            tintColor="#4A43EC"
          />
        }
      >
        <View className="px-4 pt-4">
          {loading ? (
            [1, 2, 3].map(i => <PropertyCardSkeleton key={i} />)
          ) : error ? (
            <Pressable onPress={() => dispatch(fetchSavedPropertiesThunk())} className="py-8"><Text className="text-red-500 text-center">{error} Tap to retry.</Text></Pressable>
          ) : savedProperties.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Feather name="bookmark" size={64} color="#D1D5DB" />
              <Text className="text-gray-900 text-lg font-manrope-bold mt-4">No Saved Items</Text>
              <Text className="text-gray-500 text-center mt-2 font-manrope px-8">
                Start saving properties you like to view them here
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/home')}
                className="mt-6 bg-[#4A43EC] px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-manrope-bold">Explore Properties</Text>
              </Pressable>
            </View>
          ) : (
            savedProperties.map((property, index) => {
              const itemType = getSavedItemType(property);
              const isProject = itemType === 'project';
              const propertyDetails = getSavedItemDetails(property, projectList);
              const itemId = getSavedItemId(property);
              const title = propertyDetails.name || propertyDetails.title || 'Unnamed Property';
              const location = getSavedLocation(propertyDetails);
              const primaryImage = getSavedPrimaryImage(propertyDetails);
              const secondaryImage = getSavedSecondaryImage(propertyDetails);
              const imageCount = propertyDetails.total_images || propertyDetails.images?.length || (primaryImage ? 1 : 0);
              const bhkText = !isProject && propertyDetails.bedrooms ? `${propertyDetails.bedrooms} BHK` : null;
              const summaryText = getSavedSummary(propertyDetails, isProject);
              const price = getSavedPrice(propertyDetails);

              const openDetails = () => {
                if (navigatingRef.current) return;
                navigatingRef.current = true;
                router.push({
                  pathname: "/(screens)/project-detail",
                  params: { id: isProject ? itemId : propertyDetails.project_id, slug: isProject ? propertyDetails.slug || 'none' : 'none' },
                });
                setTimeout(() => {
                  navigatingRef.current = false;
                }, 700);
              };

              return (
              <View key={(itemId || property.id || index) + index} className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
                <View className="flex-row h-36 w-full">
                  <View className="flex-[2] relative bg-gray-200 border-r-2 border-white">
                    {primaryImage ? (
                      <Image source={{ uri: primaryImage }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="w-full h-full bg-gray-200 items-center justify-center">
                        <Feather name="image" size={32} color="#9CA3AF" />
                      </View>
                    )}
                    <View className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded">
                      <Text className="text-white text-[10px] font-manrope capitalize">{itemType}</Text>
                    </View>
                  </View>
                  <View className="flex-[1] relative bg-gray-200">
                    {secondaryImage ? (
                      <Image source={{ uri: secondaryImage }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="w-full h-full bg-gray-100 items-center justify-center">
                        <Feather name="image" size={24} color="#D1D5DB" />
                      </View>
                    )}
                    <View className="absolute bottom-2 right-2 bg-black/60 px-2 py-[2px] rounded">
                      <Text className="text-white text-[10px] font-manrope">1/{Math.max(imageCount, 1)}</Text>
                    </View>
                  </View>
                </View>
                <View className="px-3 pt-3 pb-2">
                  <Text className="text-[10px] text-[#6B7280] font-manrope mb-[4px]">
                    {bhkText ? `${location}  \u2022  ${bhkText}` : location}
                  </Text>
                  <View className="flex-row items-center mb-1">
                    <Text className="text-[15px] font-manrope-extrabold text-[#111827] flex-1" numberOfLines={2}>{title}</Text>
                    <ReraStatusBadge approved={isReraApproved(propertyDetails)} className="ml-2" />
                  </View>
                  <Text className="text-[11px] text-[#9CA3AF] font-manrope">{propertyDetails.pincode || ''}</Text>
                </View>
                <View className="mx-3 mb-2" style={{ borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#E5E7EB' }} />
                <View className="flex-row justify-between px-3 pb-3">
                  <View>
                    <Text className="text-[9px] text-[#9CA3AF] font-manrope-extrabold uppercase tracking-wide">
                      {summaryText}
                    </Text>
                    <Text className="text-[14px] font-manrope-extrabold text-[#111827] mt-1">
                      {price || 'Price on request'}
                    </Text>
                  </View>
                </View>
                {(isProject || propertyDetails.project_id) ? <View className="px-3 pb-3">
                  <Pressable
                    onPress={openDetails}
                    className="w-full border border-[#4A43EC] rounded-xl py-2 items-center justify-center"
                  >
                    <Text className="text-[#4A43EC] font-manrope-extrabold text-[13px]">View details</Text>
                  </Pressable>
                </View> : null}
              </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
