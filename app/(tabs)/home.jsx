import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Platform,
  Animated,
  Share,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FontAwesome,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  AntDesign,
  Octicons,
} from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect, useNavigation, router } from "expo-router";
import { toggleFavourite, toggleSeen, toggleContacted, toggleRecent, fetchRecommendedPropertiesThunk, fetchSavedPropertiesThunk, savePropertyThunk, unsavePropertyThunk, fetchHighGrowthProjectsThunk } from "../../store/slices/propertiesSlice";
import { currentUser } from "../../data/user";
import { fetchProfileThunk } from "../../store/slices/authSlice";
import SearchOverlay from "../../components/SearchOverlay";
import UserAvatar from "../../components/UserAvatar";
import { openFilter, togglePropertyType, clearFilters } from "../../store/slices/filterSlice";
import { setSearchActive } from "../../store/slices/appSlice";
import FeaturedCard from "../../components/FeaturedCard";
import { fetchFeaturedProjectsThunk, fetchProjectListThunk } from "../../store/slices/projectSlice";
import { LinearGradient } from "expo-linear-gradient";
import { RecommendedProjectsSkeleton, FeaturedProjectsSkeleton, ProjectInFocusSkeleton, HighGrowthLocalitiesSkeleton } from "../../components/SkeletonLoader";
import { buildProjectAddress, buildProjectPrice } from "../../services/projectDisplay";
import { useRefetchOnForeground } from "../../hooks/useRefetchOnForeground";
import { applyProjectFilters, hasActiveProjectFilters } from "../../services/projectFilters";

const CATEGORIES = [
  { id: "1", label: "Plot", image: require("../../assets/images/plot.png"), type: "Plot" },
  { id: "2", label: "Villa", image: require("../../assets/images/villa.png"), type: "Villa" },
  { id: "3", label: "Apartment", image: require("../../assets/images/apartment.png"), type: "Apartment" },
  { id: "4", label: "RowHouse", image: require("../../assets/images/rowhouse.png"), type: "Rowhouse" },
  { id: "5", label: "Shop", image: require("../../assets/images/Shop.png"), type: "Shop" },
  { id: "6", label: "Showroom", image: require("../../assets/images/showroom.png"), type: "Showroom" },
  { id: "7", label: "Office", image: require("../../assets/images/office.png"), type: "Office" },
];

const formatProjectPrice = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(0)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatProjectPriceRange = (minValue, maxValue) => {
  const minText = formatProjectPrice(minValue);
  const maxText = formatProjectPrice(maxValue);
  if (!minText && !maxText) return "";
  if (minText && maxText) return `${minText} - ${maxText}`;
  return minText || maxText;
};

const formatUnitCount = (value, singular, plural = `${singular}s`) => {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim();
  const number = Number(text);
  if (Number.isFinite(number)) return `${number} ${number === 1 ? singular : plural}`;
  return text;
};

const formatJoinedDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `Joined ${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
};

function RecommendedCard({ item, onToggleFav, onToggleSeen, onToggleContacted, onToggleRecent, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="bg-white rounded-2xl overflow-hidden mr-3 p-2.5"
      style={{
        width: 166, height: 245, paddingTop: 15, paddingLeft: 10,
        shadowColor: "#d2abc0ff",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 6,
      }}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={typeof item.image === "string" ? { uri: item.image } : item.image}
          style={{ width: 144, height: 148, borderRadius: 12 }}
          resizeMode="cover"
        />
        <TouchableOpacity
          onPress={() => onToggleFav(item.id)}
          style={{
            position: "absolute",
            top: 10,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={item.isFavourite ? "heart" : "heart-outline"}
            size={20}
            color={item.isFavourite ? "#f17676ff" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </View>
      <View className="px-1 pt-2 pb-2">
        <Text className="text-[12px] font-manrope-extrabold text-gray-900" numberOfLines={1}>
          {item.name || item.title || item.type}
        </Text>
        {!!item.price && (
          <Text className="mt-1 text-[12px] font-bold text-[#4A43EC]" numberOfLines={1}>
            {item.price}
          </Text>
        )}
        <View className="mt-1 flex-row items-center">
          <Ionicons name="location-outline" size={12} color="#FE8A71" />
          <Text className="ml-1 flex-1 text-[11px] text-gray-600" numberOfLines={1}>
            {item.location || item.area}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const PLACEHOLDERS = [
  'Search by "Location"',
  'Search by "Budget"',
  'Search by "property type"',
  'Search by "City"',
];

function AnimatedPlaceholder() {
  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIndex((prevIndex) => (prevIndex + 1) % PLACEHOLDERS.length);
        translateY.setValue(20);
        
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [translateY, opacity]);

  return (
    <View style={{ height: 24, overflow: "hidden", justifyContent: "center" }}>
      <Animated.Text
        style={{
          transform: [{ translateY }],
          opacity,
          fontSize: 14,
          color: "#9CA3AF",
        }}
      >
        {PLACEHOLDERS[index]}
      </Animated.Text>
    </View>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const searchActive = useSelector((state) => state.app.searchActive);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { token, profile, user } = useSelector((s) => s.auth);
  const {
    highGrowthProjects,
    highGrowthLoading,
    highGrowthCity,
    recommendedLoading, 
    favouriteProjects 
  } = useSelector((s) => s.properties);
  const { featured: apiFeatured, featuredLoading, list: projectList } = useSelector((s) => s.project);
  const unreadNotifications = useSelector((s) => s.notifications?.list?.filter((item) => !item.watched).length ?? 0);
  const coordinates = useSelector((s) => s.location.coordinates);
  const filters = useSelector((s) => s.filter);

  const handleShareApp = useCallback(async () => {
    try {
      await Share.share({
        title: "SquarFT",
        message: "Find properties and projects near you with SquarFT.",
      });
    } catch (error) {
      console.log("App sharing failed:", error);
    }
  }, []);

  const displayUserName = useMemo(() => {
    const profileUser = profile?.user || profile;
    const fullName = profileUser?.full_name || profileUser?.fullName || user?.full_name || user?.fullName;
    const firstName = profileUser?.first_name || profileUser?.firstName || user?.first_name || user?.firstName;
    const lastName = profileUser?.last_name || profileUser?.lastName || user?.last_name || user?.lastName;
    const fallbackName = profileUser?.name || user?.name || currentUser.name;
    return fullName || [firstName, lastName].filter(Boolean).join(" ").trim() || fallbackName;
  }, [profile, user]);

  const profileUser = profile?.user || profile;
  const displayAvatar = profileUser?.profilePictureUrl 
    || profileUser?.avatar_url 
    || profileUser?.avatarUrl 
    || user?.profilePictureUrl
    || user?.avatar_url
    || user?.avatarUrl
    || null;
  const displayJoinedDate = formatJoinedDate(
    profileUser?.created_at
      || profileUser?.created_date
      || user?.createdAt,
  );

  const featuredProjects = useMemo(() => {
    return (apiFeatured || []).map(project => ({
      ...project,
      isFavourite: favouriteProjects.includes(project.id),
    }));
  }, [apiFeatured, favouriteProjects]);

  const projectsInFocus = useMemo(() => {
    return featuredProjects.slice(0, 2).map((project) => ({
      ...project,
      image: project.cover_image_url || project.image_url || project.cover_image || project.image || project.imageMain,
      title: project.name || project.title || project.project_name || "Project",
      subtitle: project.display_location || buildProjectAddress(project),
      price: project.display_price
        || buildProjectPrice(project)
        || formatProjectPriceRange(project.price_from ?? project.min_price, project.price_to ?? project.max_price)
        || "Price on request",
      tag: "FEATURED PROJECT",
    }));
  }, [featuredProjects]);

  const refreshHomeData = useCallback(() => {
    if (!token) return Promise.resolve();
    console.log('🔄 [Home Screen] Refreshing properties and project data sets from API...');
    return Promise.allSettled([
      dispatch(fetchFeaturedProjectsThunk()),
      dispatch(fetchProjectListThunk()),
      dispatch(fetchRecommendedPropertiesThunk()),
      dispatch(fetchSavedPropertiesThunk()),
      dispatch(fetchHighGrowthProjectsThunk()),
      dispatch(fetchProfileThunk()),
    ]);
  }, [dispatch, token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshHomeData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshHomeData]);

  useEffect(() => {
    if (token && coordinates) dispatch(fetchRecommendedPropertiesThunk());
  }, [coordinates, dispatch, token]);

  useEffect(() => {
    if (token && !profile) {
      dispatch(fetchProfileThunk());
    }
  }, [dispatch, profile, token]);
  
  useEffect(() => {
    console.log('📊 [Home] Featured Projects State:', {
      loading: featuredLoading,
      count: featuredProjects.length,
      data: featuredProjects.slice(0, 2)
    });
  }, [featuredProjects, featuredLoading]);

  useFocusEffect(
    useCallback(() => {
      refreshHomeData();
      return () => undefined;
    }, [refreshHomeData])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('tabPress', (event) => {
      const targetPath = event?.target?.split('?')[0] ?? '';
      if (targetPath.includes('home')) {
        refreshHomeData();
      }
    });

    return () => unsubscribe?.();
  }, [navigation, refreshHomeData]);

  useRefetchOnForeground(refreshHomeData);

  const filteredProjectList = useMemo(() => (
    hasActiveProjectFilters(filters)
      ? applyProjectFilters(projectList || [], filters)
      : (projectList || [])
  ), [filters, projectList]);

  if (searchActive) {
    return (
      <SearchOverlay
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClose={() => { dispatch(setSearchActive(false)); setSearchQuery(''); }}
        insets={insets}
      />
    );
  }

  const handleToggleFav = async (id) => {
    if (!id) return;
    const isSaved = favouriteProjects.includes(id);
    if (!token) {
      dispatch(toggleFavourite(id));
      return;
    }

    try {
      if (isSaved) {
        await dispatch(unsavePropertyThunk({ itemType: 'project', itemId: id })).unwrap();
      } else {
        await dispatch(savePropertyThunk({ itemType: 'project', itemId: id })).unwrap();
      }
      dispatch(fetchSavedPropertiesThunk());
    } catch (error) {
      console.log('Save toggle failed:', error);
    }
  };
  const handleToggleSeen = (id) => dispatch(toggleSeen(id));
  const handleToggleContacted = (id) => dispatch(toggleContacted(id));
  const handleToggleRecent = (id) => dispatch(toggleRecent(id));

  const recommendedProjects = filteredProjectList.slice(0, 6).map((project) => {
    const displayName = project.name || project.title || project.project_name || project.property_name || 'Project';
    const locationText = project.display_location || buildProjectAddress(project);
    const displayPrice = project.display_price
      || buildProjectPrice(project)
      || formatProjectPriceRange(project.price_from ?? project.min_price, project.price_to ?? project.max_price)
      || '';

    const projectId = project.id ?? project.project_id ?? project.slug;
    return {
      ...project,
      id: projectId,
      title: displayName,
      name: displayName,
      type: displayName,
      price: displayPrice,
      area: project.area || locationText || '',
      beds: formatUnitCount(project.bedrooms || project.bhk || project.bedroom_count, 'Bed'),
      baths: formatUnitCount(project.bathrooms || project.bathroom_count, 'Bath'),
      image: project.cover_image_url || project.image_url || project.cover_image || project.imageMain || project.image || null,
      location: locationText || '',
      isFavourite: favouriteProjects.includes(projectId),
    };
  });

  const displayHighGrowthProjects = (highGrowthProjects || []).map(project => ({
    ...project,
    title: project.name || 'Project',
    location: project.location || '',
    priceRange: project.price_range || '',
    bhk: project.bhk_config || '',
    possession: project.possession || '',
    image: project.cover_image_url || project.image_url || project.cover_image || project.image || null,
    isFavourite: favouriteProjects.includes(project.id),
  }));

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A43EC"]} tintColor="#4A43EC" />}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: Platform.OS === "ios" ? insets.top : insets.top + 7,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Purple → transparent gradient background */}
          <LinearGradient
            colors={["#5751f7ff", "#bbb9e6ff", "#F9FAFB"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          />

          <Image
            source={require("../../assets/images/blur (3).png")}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: -40,
              top: -30,
              width: 565,
              height: 360,
              opacity: 0.7,
              zIndex: -1,
            }}
          />
          {/* Header Row */}
          <View className="flex-row justify-between items-center px-5 pt-2 pb-4 mb-4">
            <View className="flex-1 flex-row items-center gap-2 mr-3">
              <View className="w-[46px] h-[46px] relative">
                <UserAvatar
                  uri={displayAvatar}
                  name={displayUserName}
                  size={46}
                  style={{ borderWidth: 2, borderColor: "#FFFFFF" }}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1">
                  <Text
                    className="text-[15px] font-lato-bold text-white"
                    style={{ flexShrink: 1 }}
                    numberOfLines={1}
                  >
                    {displayUserName}
                  </Text>
                  <MaterialIcons name="verified" size={18} color="#3AFF08" />
                </View>
                {displayJoinedDate ? (
                  <Text className="text-[10px] font-lato-regular text-white mt-1">
                    {displayJoinedDate}
                  </Text>
                ) : null}
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => router.push("/(screens)/notifications")}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
                className="w-[44px] h-[44px] rounded-full bg-white items-center justify-center relative"
                style={{
                  shadowColor: "#4A43EC",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.14,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Ionicons name="notifications-outline" size={23} color="#4A43EC" />
                {unreadNotifications > 0 && (
                  <View className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full bg-[#FF3B30] border-2 border-white items-center justify-center px-1">
                    <Text className="text-white text-[8px] font-manrope-bold">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(screens)/chat-bot")}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Open chat bot"
                className="w-[44px] h-[44px] rounded-full bg-white items-center justify-center"
                style={{
                  shadowColor: "#4A43EC",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.14,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <MaterialCommunityIcons name="robot-outline" size={23} color="#4A43EC" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View className="flex-row px-5 gap-3 mb-5 ">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => dispatch(setSearchActive(true))}
              className="flex-1 flex-row items-center bg-[#FCFCFC] rounded-xl px-4 h-[44px] gap-[8px]"
              style={{ shadowColor: "#edabd8ff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 30, elevation: 4 }}
            >
              <FontAwesome name="search" size={20} color="#4A43EC" />
              <View className="flex-1 justify-center">
                <AnimatedPlaceholder />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(screens)/location-picker')}
              accessibilityRole="button"
              accessibilityLabel="Choose location on map"
              className="w-[44px] h-[44px] rounded-xl bg-white items-center justify-center"
              style={{ shadowColor: "#edabd8ff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 30, elevation: 4 }}
            >
              <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color="#4A43EC" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dispatch(openFilter())} className="flex-row items-center bg-[#4A43EC] rounded-xl px-5 h-[44px] gap-2">
              <AntDesign name="spotify" size={18} color="#7F88E5" />
              <Text className="text-white text-sm font-semibold">Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 21,
              paddingBottom: 18,
              gap: 13,
              paddingTop: 6,
            }}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  dispatch(clearFilters());
                  dispatch(togglePropertyType(cat.type));
                  router.push({ pathname: '/(screens)/property-listing', params: { category: cat.label } });
                }}
                className="items-center bg-white rounded-xl overflow-hidden"
                style={{
                  width: 78.01, height: 83,
                  shadowColor: "#f2afddff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 30, elevation: 4,
                }}
              >

                <Text className="text-[9px] text-black font-inter-regular py-2">
                  {cat.label}
                </Text>
                <Image
                  source={cat.image}
                  style={{ width: 60, height: 52, padding: 10 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recommended Properties */}
        <View style={{ position: "relative" }}>
          <Image
            source={require("../../assets/images/Ellipse 70 (2).png")}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 103,
              top: 20,
              width: 344,
              height: 287,
              opacity: 0.98,
              transform: [{ rotate: "180deg" }],
            }}
            resizeMode="contain"
          />
          <View className="flex-row justify-between items-center px-4 mt-2 mb-3">
            <Text className="text-[15px] font-manrope-extrabold text-gray-900">
              Recommended Projects
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => router.push({ pathname: "/(screens)/property-listing", params: { recommended: "1" } })}
            >
              <Text className="text-[12px] text-[#6C3BFF] font-manrope-bold">
                See All
              </Text>
              <Octicons name="triangle-right" size={22} color="#a081faff" />
            </TouchableOpacity>
          </View>

          {recommendedLoading ? (
            <RecommendedProjectsSkeleton count={2} />
          ) : recommendedProjects.length > 0 ? (
            <FlatList
              data={recommendedProjects}
              extraData={recommendedProjects}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id || item.slug)}
              contentContainerStyle={{
                paddingHorizontal: 14,
                paddingBottom: 12,
                paddingTop: 2,
              }}
              renderItem={({ item }) => {
                const itemId = item.id || item.project_id || item.slug;
                const itemSlug = item.slug || 'none';

                return (
                  <RecommendedCard
                    item={item}
                    onToggleFav={handleToggleFav}
                    onToggleSeen={handleToggleSeen}
                    onToggleContacted={handleToggleContacted}
                    onToggleRecent={handleToggleRecent}
                    onPress={() => {
                      console.log('🔍 [Recommended Grid] Navigating to details screen:', { id: itemId, slug: itemSlug });
                      router.push({
                        pathname: "/(screens)/project-detail",
                        params: { id: itemId, slug: itemSlug }
                      });
                    }}
                  />
                );
              }}
            />
          ) : (
            <View className="px-5 py-4">
              <Text className="text-[13px] text-gray-500">No recommended projects available right now.</Text>
            </View>
          )}
        </View>

        {/* Featured Projects */}
        <View style={{ position: "relative" }}>
          <Image
            source={require("../../assets/images/Ellipse 70 (2).png")}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 103,
              top: 20,
              width: 344,
              height: 287,
              opacity: 0.58,
            }}
            resizeMode="contain"
          />
          <View className="flex-row justify-between items-center px-5 mt-3 mb-4">
            <Text className="text-[15px] font-manrope-extrabold text-gray-900">Featured Projects</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: "/(screens)/property-listing", params: { featured: "1" } })}>
              <Text className="text-[12px] text-[#6C3BFF] font-manrope-bold">View All</Text>
            </TouchableOpacity>
          </View>
          {featuredLoading ? (
            <FeaturedProjectsSkeleton count={2} />
          ) : featuredProjects.length > 0 ? (
            <FlatList
              data={featuredProjects}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}
              renderItem={({ item }) => <FeaturedCard item={item} onToggleFav={handleToggleFav} />}
            />
          ) : (
            <View className="px-5 py-4">
              <Text className="text-[13px] text-gray-500">No featured projects available right now.</Text>
            </View>
          )}
        </View>

        {/* Cashback Banner */}
        <View className="mx-6 mt-6 mb-2 rounded-3xl overflow-hidden opacity-74" style={{ backgroundColor: "#6A5AE0", height: 115 }}>
          {/* Dark circle behind building */}
          <View style={{
            position: "absolute",
            right: -5,
            top: -32,
            width: 180,
            height: 140,
            borderRadius: 999,
            backgroundColor: "#4A43EC",
            opacity: 100,
          }} />
          {/* Text */}
          <View className="px-5 pt-3" style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 24 }}>GET YOUR 20%{"\n"}CASHBACK</Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 6 }}>* Expired 25 Aug 2022</Text>
          </View>
          {/* Building image */}
          <Image
            source={require("../../assets/images/unsplash_RFDP7_80v5B.png")}
            style={{ position: "absolute", right: 0, bottom: 0, width: 130, height: 120 }}
            resizeMode="cover"
          />
        </View>

        {/* Project in Focus */}
        <View className="flex-row justify-between items-center px-5 mt-6 mb-5 ml-2">
          <Text className="text-[15px] font-manrope-extrabold text-gray-900">Project in focus</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: "/(screens)/property-listing", params: { focus: "1" } })}>
            <Text className="text-sm text-indigo-500 font-manrope-bold">View All</Text>
          </TouchableOpacity>
        </View>
        {featuredLoading ? (
          <ProjectInFocusSkeleton count={2} />
        ) : projectsInFocus.length > 0 ? (
          projectsInFocus.map((project) => {
            const projectImage = typeof project.image === "string" ? { uri: project.image } : project.image;

            return (
              <TouchableOpacity
                key={project.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: "/(screens)/project-detail", params: { id: project.id, slug: project.slug || "none" } })}
                className="mx-6 mb-4 rounded-2xl overflow-hidden h-[190px]"
              >
                {projectImage ? (
                  <Image source={projectImage} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="w-full h-full bg-gray-200 items-center justify-center">
                    <MaterialCommunityIcons name="office-building-outline" size={34} color="#9CA3AF" />
                  </View>
                )}
                <View className="absolute inset-0 bg-black/55" />
                <View className="absolute top-4 right-4 bg-white/90 rounded-full px-3 py-1">
                  <Text className="text-[11px] font-bold text-gray-900">{project.price}</Text>
                </View>
                <View className="absolute bottom-4 left-4 right-4">
                  <Text className="text-[12px] font-public-bold text-[#e0733d] tracking-widest mb-1">{project.tag}</Text>
                  <Text className="text-[20px] font-public-bold text-white mb-0" numberOfLines={1}>{project.title}</Text>
                  <Text className="text-[14px] font-public-regular text-[#CBD5E1]" numberOfLines={1}>{project.subtitle}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View className="px-6 py-2">
            <Text className="text-[13px] text-gray-500">No projects in focus available right now.</Text>
          </View>
        )}

        {/* High Growth Localities */}
        <View className="flex-row justify-between items-center px-5 mt-10 mb-5">
          <Text className="text-[15px] font-manrope-extrabold text-[#0F172A]">
            High growth localities{highGrowthCity ? ` in ${highGrowthCity}` : ''}
          </Text>
          <TouchableOpacity onPress={() => router.push({ pathname: "/(screens)/property-listing", params: { highGrowth: "1" } })}>
            <Text className="text-sm text-[#6C3BFF] font-manrope-bold">View All</Text>
          </TouchableOpacity>
        </View>
        {highGrowthLoading ? (
          <HighGrowthLocalitiesSkeleton count={2} />
        ) : displayHighGrowthProjects.length > 0 ? (
          displayHighGrowthProjects.slice(0, 2).map((item) => {
            const itemImage = typeof item.image === "string" ? { uri: item.image } : item.image;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: "/(screens)/project-detail", params: { id: item.id, slug: item.slug || 'none' } })}
                className="mx-5 mb-3 bg-white rounded-2xl flex-row items-center border border-[#F1F5F9] px-2.5 py-3"
                style={{
                  minHeight: 110,
                  shadowColor: "#bcc0c2ff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 6.07, shadowRadius: 30, elevation: 1
                }}
              >
                <View className="w-[130px] h-[130px] rounded-2xl border border-indigo-100 overflow-hidden items-center justify-center">
                  {itemImage ? (
                    <Image source={itemImage} style={{ width: 130, height: 130 }} resizeMode="cover" />
                  ) : (
                    <View className="w-[130px] h-[130px] bg-gray-100 items-center justify-center">
                      <MaterialCommunityIcons name="office-building-outline" size={32} color="#9CA3AF" />
                    </View>
                  )}
                  <View className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-indigo-100 items-center justify-center">
                    <MaterialCommunityIcons name="check-decagram-outline" size={16} color="#6366F1" />
                  </View>
                </View>
                <View className="flex-1 px-4 self-stretch justify-around">
                  <View>
                    <Text className="text-[16px] font-public-bold text-[#0F172A]" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-[12px] font-public-regular text-gray-500" numberOfLines={1}>{item.location}</Text>
                    {item.priceRange && (
                      <Text className="text-[13px] font-manrope-bold text-[#6C3BFF] mt-1">{item.priceRange}</Text>
                    )}
                  </View>
                  <View className="flex-row justify-between items-center s">
                    {item.bhk && (
                      <View className="bg-slate-100 rounded-md px-2.5 py-1">
                        <Text className="text-[11px] text-gray-800 font-public-bold">{item.bhk}</Text>
                      </View>
                    )}
                  </View>
                    {item.possession && (
                      <Text className="text-[11px] text-gray-400">{item.possession}</Text>
                    )}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View className="px-5 py-4">
            <Text className="text-[13px] text-gray-500">No high growth projects available right now.</Text>
          </View>
        )}

        {/* Like the app? Share the app */}
        <View className="mx-4 mt-10 mb-15 rounded-3xl border border-[#4A43EC]/30 bg-white overflow-hidden">
          <View className="px-8 pt-6">
            <Text className="text-[18px] font-manrope-extrabold text-[#0F172A] tracking-widest">Like the app?{"\n"}Share the app</Text>
          </View>
          <Image
            source={require("../../assets/images/pana.png")}
            className="w-full h-[200px] bottom-8 left-4"
            resizeMode="contain"
          />
          <View className="flex-row gap-3 px-5 pb-6 top-[-6px]">
            <TouchableOpacity onPress={handleShareApp} className="flex-1 bg-indigo-600 rounded-full py-3 flex-row items-center justify-center gap-2">
              <FontAwesome6 name="arrow-up-from-bracket" size={16} color="#ffffff" />
              <Text className="text-[15px] top-[-1px] font-manrope-bold text-white">Share</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}
