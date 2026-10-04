import { View, Text, Image, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { memo, useRef, useEffect, useMemo, useState } from 'react';
import TimelineItem from './TimelineItem';

const DOT_CENTER_OFFSET = 11;

const normalizeTimelineStatus = (status, index, currentStageIndex) => {
    const stageIndex = Number(currentStageIndex);
    if (Number.isFinite(stageIndex) && stageIndex > 0) {
        if (index + 1 < stageIndex) return 'completed';
        if (index + 1 === stageIndex) return 'current';
        return 'pending';
    }

    const normalized = String(status || '').toLowerCase();
    if (['completed', 'done', 'paid'].includes(normalized)) return 'completed';
    if (['current', 'active', 'in_progress', 'in-progress'].includes(normalized)) return 'current';
    if (['pending', 'upcoming', 'required', 'waiting'].includes(normalized)) return 'pending';
    return 'pending';
};

const formatTimelineTime = (item) => {
    const value = item.completed_at || item.created_at || item.updated_at;
    if (!value) return item.time || '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return item.time || '';
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatScheduledTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const getTimelineTitle = (item) =>
    item.stage_name || item.title || item.milestone || 'Deal update';

const getTimelineDescription = (item) =>
    item.details || item.description || item.note || '';

const TabTimeline = memo(function TabTimeline({ timeline = [], currentStageIndex = 0, activity = {} }) {
    const lineAnim = useRef(new Animated.Value(0)).current;
    const [itemLayouts, setItemLayouts] = useState({});
    const items = timeline;
    const activityItems = useMemo(() => [
        ...(activity.meetings || []).map((item) => ({
            ...item,
            id: `meeting-${item.id}`,
            title: item.agenda || 'Meeting scheduled',
            details: item.remarks || item.mode || '',
            created_at: item.created_at || (item.date && item.time ? `${item.date}T${item.time}` : item.date),
        })),
        ...(activity.notes || []).map((item) => ({
            ...item,
            id: `note-${item.id}`,
            title: 'Deal note',
            details: item.text,
        })),
        ...(activity.timeline || []).map((item) => ({ ...item, id: `update-${item.id || item.created_at}` })),
    ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)), [activity]);
    const statuses = useMemo(
        () => items.map((item, index) => normalizeTimelineStatus(item.status, index, currentStageIndex)),
        [items, currentStageIndex]
    );
    const completedCount = statuses.filter((status) => status === 'completed').length;
    const lastCompletedIndex = statuses.lastIndexOf('completed');
    const currentStatusIndex = statuses.indexOf('current');
    const currentStage = currentStatusIndex >= 0
        ? currentStatusIndex + 1
        : Math.min(items.length, completedCount + 1);
    const dotCenters = items.map((_, index) => {
        const itemLayout = itemLayouts[index];
        return itemLayout ? itemLayout.y + DOT_CENTER_OFFSET : null;
    });
    const firstDotCenter = dotCenters[0] ?? 14;
    const lastDotCenter = dotCenters[items.length - 1] ?? 14;
    const fillEndDotCenter = lastCompletedIndex >= 0
        ? dotCenters[lastCompletedIndex] ?? firstDotCenter
        : firstDotCenter;
    const trackHeight = Math.max(0, lastDotCenter - firstDotCenter);
    const fillHeight = Math.max(0, fillEndDotCenter - firstDotCenter);

    useEffect(() => {
        lineAnim.setValue(0);
        Animated.timing(lineAnim, {
            toValue: 1,
            duration: items.length * 120 + 400,
            useNativeDriver: false,
        }).start();
    }, [items.length, fillHeight, lineAnim]);

    return (
        <View>
            <View className="flex-row justify-between items-center mb-5">
                <Text className="text-[14px] font-manrope-bold text-[#111827]">Timeline Progress</Text>
                <View className="bg-[#EEEDFF] px-2.5 py-1 rounded-full">
                    <Text className="text-[10px] font-manrope-bold text-[#4F48ED]">Stage {currentStage} of {items.length || 1}</Text>
                </View>
            </View>

            {items.length === 0 ? (
                <View className="rounded-xl bg-[#F8F7FF] px-4 py-5">
                    <Text className="text-[12px] font-inter-medium text-[#6B7280]">Timeline details are not available yet.</Text>
                </View>
            ) : <View className="relative">
                {/* Static grey track */}
                <View
                    className="absolute left-[9px] w-[2px] bg-[#E5E7EB]"
                    style={{
                        top: firstDotCenter,
                        height: trackHeight,
                    }}
                />

                {/* Animated purple fill */}
                <Animated.View
                    style={{
                        position: 'absolute',
                        left: 9,
                        top: firstDotCenter,
                        width: 2,
                        backgroundColor: '#6231FF',
                        height: lineAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, fillHeight],
                        }),
                        borderRadius: 2,
                        zIndex: 1,
                    }}
                />

                {items.map((item, index) => {
                    const status = statuses[index];
                    const description = getTimelineDescription(item);
                    return (
                    <TimelineItem
                        key={item.id ?? `${getTimelineTitle(item)}-${index}`}
                        index={index}
                        onItemLayout={(itemIndex, layout) => {
                            setItemLayouts((prev) => {
                                const existing = prev[itemIndex];
                                if (existing?.y === layout.y && existing?.height === layout.height) return prev;
                                return { ...prev, [itemIndex]: layout };
                            });
                        }}
                        status={status}
                        title={getTimelineTitle(item)}
                        time={formatTimelineTime(item)}
                        badge={item.badge || (status === 'current' ? 'IN PROGRESS' : null)}
                        iconName={item.iconName || 'ellipse-outline'}
                    >
                        {item.images && (
                            <View className="flex-row gap-2 mt-2 mb-1">
                                {item.images.map((img, idx) => (
                                    <Image key={idx} source={{ uri: img }} className="w-[36px] h-[36px] rounded-[8px]" />
                                ))}
                                {item.extraImagesCount > 0 && (
                                    <View className="w-[36px] h-[36px] bg-[#F3F4F6] rounded-[8px] justify-center items-center">
                                        <Text className="text-[10px] font-inter-semibold text-[#4B5563]">+{item.extraImagesCount}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        {(item.actionText || item.scheduled_at) && item.actionIcon && (
                            <View className="mt-2 flex-row items-center bg-[#F3F4F6] px-2 py-1 rounded-[6px] self-start gap-1.5">
                                <Feather name={item.actionIcon} size={10} color="#6231FF" />
                                <Text className="text-[10px] font-inter-semibold text-[#1F2937]">{item.actionText || formatScheduledTime(item.scheduled_at)}</Text>
                            </View>
                        )}
                        {description && (
                            <View>
                                <Text className="text-[11px] font-inter-medium text-[#6B7280] mt-1 pr-4 leading-[16px] flex-1 mb-1">
                                    {description}
                                </Text>
                                {item.askingPrice && item.currentOffer && (
                                    <View className="mt-2 bg-[#FCFAFF] border border-[#EBE5FF] rounded-lg p-2.5">
                                        <View className="flex-row justify-between items-center mb-1">
                                            <Text className="text-[10px] font-inter-medium text-[#6B7280]">Asking Price:</Text>
                                            <Text className="text-[12px] font-inter-bold text-[#111827]">{item.askingPrice}</Text>
                                        </View>
                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-[10px] font-inter-medium text-[#6B7280]">Current Offer:</Text>
                                            <Text className="text-[12px] font-inter-bold text-[#6231FF]">{item.currentOffer}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </TimelineItem>
                    );
                })}
            </View>}

            {activityItems.length > 0 && (
                <View className="mt-2 pt-5 border-t border-[#EEF0F4]">
                    <Text className="text-[14px] font-manrope-bold text-[#111827] mb-3">Meetings & notes</Text>
                    {activityItems.map((item) => (
                        <View key={item.id} className="mb-3 rounded-xl border border-[#ECEAF8] bg-[#FCFBFF] px-3.5 py-3">
                            <View className="flex-row justify-between gap-3">
                                <Text className="flex-1 text-[12px] font-inter-bold text-[#27233A]">{getTimelineTitle(item)}</Text>
                                <Text className="text-[9px] font-inter-medium text-[#9CA3AF]">{formatTimelineTime(item)}</Text>
                            </View>
                            {!!getTimelineDescription(item) && (
                                <Text className="text-[11px] font-inter-medium text-[#6B7280] mt-1 leading-[16px]">{getTimelineDescription(item)}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
});

export default TabTimeline;
