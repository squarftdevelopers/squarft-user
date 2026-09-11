import { useEffect, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Image, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";
import { selectRecentProjects, selectRecentProjectsLoading } from "../../store/slices/recentProjectsSlice";
import { PropertyCardSkeleton } from "../SkeletonLoader";
import { fetchProjectListThunk } from "../../store/slices/projectSlice";
import { buildProjectAddress, buildProjectPrice } from "../../services/projectDisplay";

const toImageSource = (value) => {
  if (typeof value === "string" && value.trim()) return { uri: value };
  return value || null;
};

const findProjectByTracker = (tracker, projects) =>
  projects.find((project) =>
    String(project.id) === String(tracker.id)
    || String(project.slug) === String(tracker.id)
    || String(project.project_id) === String(tracker.id)
  );

/**
 * RecentTabContent Component
 * 
 * Displays projects that the user has recently viewed (within the last 3 days).
 * Projects are automatically tracked and sorted by most recent view first.
 * 
 * Recent project views are persisted per authenticated user by the API.
 */
const RecentTabContent = ({ refreshing = false, onRefresh }) => {
  const dispatch = useDispatch();
  const recentProjects = useSelector(selectRecentProjects);
  const loading = useSelector(selectRecentProjectsLoading);

  const { list: allProjects } = useSelector((state) => state.project || {});

  // Enrich recent trackers with full project data
  useEffect(() => {
    if (!allProjects?.length) {
      dispatch(fetchProjectListThunk());
    }
  }, [allProjects?.length, dispatch]);

  const enrichedRecentProjects = useMemo(() => recentProjects
    .map((tracker) => {
      const projectSource = allProjects || [];
      const project = findProjectByTracker(tracker, projectSource);
      if (project) {
        return {
          ...project,
          lastViewedAt: tracker.lastViewedAt,
        };
      }

      return null;
    })
    .filter(Boolean), [allProjects, recentProjects]);

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const viewedAt = typeof timestamp === 'number' ? timestamp : Date.parse(timestamp);
    if (!Number.isFinite(viewedAt)) return '';
    const diff = Math.max(0, now - viewedAt);
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 3) return `${days}d ago`;
    return 'Recently';
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white pt-10 px-4">
        {[1, 2, 3].map((i) => <PropertyCardSkeleton key={i} />)}
      </View>
    );
  }

  if (enrichedRecentProjects.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6 bg-white">
        <Feather name="clock" size={48} color="#D1D5DB" />
        <Text className="text-gray-900 text-lg font-bold mt-4">No Recent Projects</Text>
        <Text className="text-gray-500 text-center mt-2">
          Projects you view will appear here for 3 days
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/home")}
          className="mt-6 bg-[#4A43EC] px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Browse Projects</Text>
        </Pressable>
      </View>
    );
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
        <View className="mb-4">
          <Text className="text-[15px] font-manrope-extrabold text-gray-900">
            Recent Projects ({enrichedRecentProjects.length})
          </Text>
          <Text className="text-[12px] text-gray-500 mt-1">
            Projects viewed in the last 3 days
          </Text>
        </View>

        {enrichedRecentProjects.map((project, index) => {
          const coverImage = project.cover_image_url || project.image_url || project.cover_image || project.image || project.imageMain;
          const imageSource = toImageSource(coverImage);
          const title = project.name || project.title || "Project";
          const location = buildProjectAddress(project) || project.location || [project.area, project.city].filter(Boolean).join(", ");
          const priceText = buildProjectPrice(project) || project.price || project.display_price || "Price on request";
          const timeAgo = formatTimeAgo(project.lastViewedAt);

          return (
            <View 
              key={`${project.id}-${index}`} 
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4"
            >
              <View className="flex-row h-36 w-full">
                <View className="flex-[2] relative bg-gray-200 border-r-2 border-white">
                  {imageSource ? (
                    <Image 
                      source={imageSource}
                      className="w-full h-full" 
                      resizeMode="cover" 
                    />
                  ) : (
                    <View className="w-full h-full bg-gray-200 items-center justify-center">
                      <Feather name="image" size={32} color="#9CA3AF" />
                    </View>
                  )}
                  <View className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded">
                    <Text className="text-white text-[10px] font-manrope">
                      {project.type || "Project"}
                    </Text>
                  </View>
                </View>

                <View className="flex-[1] relative bg-gray-100 items-center justify-center">
                  <Feather name="clock" size={24} color="#4A43EC" />
                  <Text className="text-[10px] text-gray-600 font-manrope-bold mt-2">
                    {timeAgo}
                  </Text>
                </View>
              </View>

              <View className="px-3 pt-3 pb-2">
                <Text className="text-[10px] text-[#6B7280] font-manrope mb-[4px]">
                  {location || "Location unavailable"}
                </Text>
                <Text 
                  className="text-[15px] font-manrope-extrabold text-[#111827]" 
                  numberOfLines={1}
                >
                  {title}
                </Text>
              </View>

              <View 
                className="mx-3 mb-2" 
                style={{ 
                  borderBottomWidth: 1, 
                  borderStyle: "dashed", 
                  borderColor: "#E5E7EB" 
                }} 
              />

              <View className="flex-row justify-between px-3 pb-3">
                <View>
                  <Text className="text-[9px] text-[#9CA3AF] font-manrope-extrabold uppercase tracking-wide">
                    {project.possession_status || project.type || "Project"}
                  </Text>
                  <Text className="text-[14px] font-manrope-extrabold text-[#111827] mt-1">
                    {priceText}
                  </Text>
                </View>
              </View>

              <View className="px-3 pb-3">
                <Pressable
                  onPress={() => 
                    router.push({ 
                      pathname: "/(screens)/project-detail", 
                      params: { id: project.id, slug: project.slug } 
                    })
                  }
                  className="w-full border border-[#4A43EC] rounded-xl py-2 items-center justify-center"
                >
                  <Text className="text-[#4A43EC] font-manrope-extrabold text-[13px]">
                    View again
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View className="px-4 mb-6">
        <View className="bg-[#F4F2FF] rounded-xl p-4">
          <View className="flex-row items-center mb-2">
            <Feather name="info" size={16} color="#4A43EC" />
            <Text className="text-[12px] font-manrope-bold text-[#111827] ml-2">
              About Recent Projects
            </Text>
          </View>
          <Text className="text-[11px] text-[#6B7280] font-manrope leading-[16px]">
            Projects appear here when you view them and automatically disappear after 3 days. 
            Viewing a project again resets its 3-day timer.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default RecentTabContent;
