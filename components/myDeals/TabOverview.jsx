import { memo } from 'react';
import { View, Text } from 'react-native';

const formatValue = (val) => {
    const num = Number(val);
    if (!num) return '—';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${Number((num / 100000).toFixed(2))} L`;
    return `₹${num.toLocaleString('en-IN')}`;
};

const Row = ({ label, value }) => (
    <View className="flex-row justify-between items-center py-2.5 border-b border-[#F3F4F6]">
        <Text className="text-[12px] font-manrope-medium text-[#6B7280]">{label}</Text>
        <Text className="text-[13px] font-manrope-bold text-[#111827]">{value ?? '—'}</Text>
    </View>
);

const TabOverview = memo(function TabOverview({ deal = {} }) {
    return (
        <View className="bg-white rounded-[12px] p-4 border border-[#F3F4F6]"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Text className="text-[14px] font-manrope-bold text-[#111827] mb-3">Deal Summary</Text>
            <Row label="Property" value={deal.property_title} />
            <Row label="City" value={deal.city} />
            <Row label="Area" value={deal.area} />
            <Row label="Total Value" value={formatValue(deal.total_value)} />
            <Row label="Paid So Far" value={formatValue(deal.paid_so_far)} />
            <Row label="Status" value={deal.status ? deal.status.charAt(0).toUpperCase() + deal.status.slice(1) : '—'} />
        </View>
    );
});

export default TabOverview;
