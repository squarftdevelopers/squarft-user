import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { router, useFocusEffect } from "expo-router";
import { getSearchHistoryThunk, deleteSearchHistoryThunk, clearAllSearchHistoryThunk } from "../../store/slices/searchSlice";
import { SearchHistoryItemSkeleton } from "../../components/SkeletonLoader";

const getSearchHistoryId = (item) => item?.id || item?.search_id || item?.history_id || null;

export default function RecentSearches() {
    const dispatch = useDispatch();
    const { searchHistory, loading, error } = useSelector((state) => state.search);
    const { isLoggedIn, token } = useSelector((state) => state.auth);

    useFocusEffect(useCallback(() => {
        if (isLoggedIn && token) {
            dispatch(getSearchHistoryThunk());
        }
    }, [isLoggedIn, token, dispatch]));

    const handleDeleteItem = (item) => {
        const id = getSearchHistoryId(item);
        if (!id) {
            Alert.alert('Cannot Delete Search', 'This search item is missing its history id.');
            return;
        }

        Alert.alert(
            'Delete Search',
            `Remove "${item.query_text || 'Filtered search'}" from history?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try { await dispatch(deleteSearchHistoryThunk(item)).unwrap(); }
                        catch (error) { Alert.alert('Unable to delete search', String(error)); }
                    }
                }
            ]
        );
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All History',
            'Are you sure you want to clear all search history?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try { await dispatch(clearAllSearchHistoryThunk()).unwrap(); }
                        catch (error) { Alert.alert('Unable to clear searches', String(error)); }
                    }
                }
            ]
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return 'Date unavailable';
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="pt-14 pb-4 px-5 bg-white border-b border-gray-100">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Pressable onPress={() => router.back()} className="mr-3">
                            <Feather name="arrow-left" size={24} color="#111827" />
                        </Pressable>
                        <View className="flex-1">
                            <Text className="text-xl font-manrope-bold text-gray-900">Recent Searches</Text>
                            {!loading && searchHistory.length > 0 && (
                                <Text className="text-sm text-gray-500 font-manrope">
                                    {searchHistory.length} {searchHistory.length === 1 ? 'search' : 'searches'}
                                </Text>
                            )}
                        </View>
                    </View>
                    {!loading && searchHistory.length > 0 && (
                        <Pressable onPress={handleClearAll} className="ml-2">
                            <Text className="text-sm font-manrope-bold text-red-500">Clear All</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Content */}
            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 100 }} 
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View>
                        {[1, 2, 3, 4, 5].map(i => <SearchHistoryItemSkeleton key={i} />)}
                    </View>
                ) : error ? (
                    <Pressable onPress={() => dispatch(getSearchHistoryThunk())} className="p-6"><Text className="text-red-500">{error} Tap to retry.</Text></Pressable>
                ) : searchHistory.length === 0 ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <MaterialCommunityIcons name="history" size={64} color="#D1D5DB" />
                        <Text className="text-gray-900 text-lg font-manrope-bold mt-4">No Search History</Text>
                        <Text className="text-gray-500 text-center mt-2 font-manrope px-8">
                            Your recent searches will appear here
                        </Text>
                        <Pressable
                            onPress={() => router.push('/(tabs)/home')}
                            className="mt-6 bg-[#4A43EC] px-6 py-3 rounded-xl"
                        >
                            <Text className="text-white font-manrope-bold">Start Searching</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View className="px-4 pt-2">
                        {searchHistory.map((item, index) => (
                            <View 
                                key={getSearchHistoryId(item) || index} 
                                className="flex-row items-center py-4 border-b border-gray-100"
                            >
                                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                                    <Feather name="search" size={18} color="#6B7280" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-manrope-semibold text-gray-900">
                                        {item.query_text || 'Filtered search'}
                                    </Text>
                                    <Text className="text-xs text-gray-500 font-manrope mt-1">
                                        {formatDate(item.searched_at)}
                                        {item.result_count !== undefined && item.result_count !== null && (
                                            <Text> • {item.result_count} results</Text>
                                        )}
                                    </Text>
                                </View>
                                <Pressable 
                                    onPress={() => handleDeleteItem(item)}
                                    className="w-8 h-8 items-center justify-center"
                                >
                                    <Feather name="x" size={20} color="#9CA3AF" />
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
