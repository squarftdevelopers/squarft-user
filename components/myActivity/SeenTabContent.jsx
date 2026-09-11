import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { selectSeenProjects } from '../../store/slices/projectViewTrackingSlice';
import { fetchProjectListThunk } from '../../store/slices/projectSlice';
import { buildProjectAddress, buildProjectPrice } from '../../services/projectDisplay';

const toImageSource = (value) => {
  if (typeof value === 'string' && value.trim()) return { uri: value };
  return value || null;
};

const findProjectByTracker = (tracker, projects) =>
  projects.find((project) =>
    String(project.id) === String(tracker.id)
    || String(project.slug) === String(tracker.id)
    || String(project.project_id) === String(tracker.id)
  );

/**
 * SeenTabContent Component
 * 
 * Displays projects viewed 5+ times in the last 7 days, using persisted API activity.
 */
export default function SeenTabContent({ refreshing = false, onRefresh }) {
  const dispatch = useDispatch();
  
  // Select all qualified "seen" projects (count >= 5, not expired)
  const seenTrackers = useSelector(selectSeenProjects);
  const { list: apiProjects = [] } = useSelector((state) => state.project || {});

  useEffect(() => {
    if (apiProjects.length === 0) {
      dispatch(fetchProjectListThunk());
    }
  }, [apiProjects.length, dispatch]);
  
  // Memoize the display data
  const displayProjects = useMemo(() => {
    const projectSource = apiProjects;

    return seenTrackers.map((tracker) => {
      const project = findProjectByTracker(tracker, projectSource);
      const image = project?.cover_image_url
        || project?.image_url
        || project?.cover_image
        || project?.image
        || project?.imageMain
        || null;

      return {
        ...(project || {}),
        id: project?.id || tracker.id,
        slug: project?.slug,
        trackerId: tracker.id,
        viewCount: tracker.count,
        firstQualifiedAt: tracker.firstQualifiedAt,
        title: project?.name || project?.title || project?.project_name || `Project ${String(tracker.id).slice(0, 8)}`,
        location: buildProjectAddress(project || {}) || project?.location || 'Location unavailable',
        priceText: buildProjectPrice(project || {}) || 'Price on request',
        image,
      };
    });
  }, [apiProjects, seenTrackers]);

  const renderSeenProject = ({ item }) => {
    // Calculate days remaining
    const qualifiedAt = typeof item.firstQualifiedAt === 'number'
      ? item.firstQualifiedAt
      : Date.parse(item.firstQualifiedAt);
    const daysRemaining = Number.isFinite(qualifiedAt)
      ? Math.max(0, Math.ceil((7 * 24 * 60 * 60 * 1000 - (Date.now() - qualifiedAt)) / (24 * 60 * 60 * 1000)))
      : 0;

    const imageSource = toImageSource(item.image);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push({
          pathname: '/(screens)/project-detail',
          params: { id: item.id, slug: item.slug || 'none' }
        })}
        className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row">
          <View className="w-[120px] h-[120px] bg-gray-100 items-center justify-center">
            {imageSource ? (
              <Image source={imageSource} className="w-full h-full" resizeMode="cover" />
            ) : (
              <MaterialCommunityIcons name="office-building-outline" size={40} color="#9CA3AF" />
            )}
          </View>

          <View className="flex-1 p-3 justify-between">
            <View>
              <Text className="text-[15px] font-manrope-bold text-gray-900" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1" numberOfLines={1}>
                {item.location}
              </Text>
              <Text className="text-[13px] font-manrope-bold text-gray-900 mt-1" numberOfLines={1}>
                {item.priceText}
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1">
                Viewed {item.viewCount} times
              </Text>
            </View>

            <View className="flex-row items-center justify-between mt-2">
              <View className="bg-purple-50 rounded-lg px-2 py-1">
                <Text className="text-[11px] text-purple-700 font-manrope-bold">
                  {daysRemaining} days left
                </Text>
              </View>
              <MaterialCommunityIcons name="eye-check-outline" size={20} color="#8B5CF6" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <MaterialCommunityIcons name="eye-off-outline" size={64} color="#D1D5DB" />
      <Text className="text-[16px] font-manrope-bold text-gray-700 mt-4 text-center">
        No Seen Projects Yet
      </Text>
      <Text className="text-[13px] text-gray-500 mt-2 text-center">
        Projects you view 5+ times will appear here for 7 days
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={displayProjects}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSeenProject}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 70 }}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A43EC"]} tintColor="#4A43EC" />}
      />
    </View>
  );
}
