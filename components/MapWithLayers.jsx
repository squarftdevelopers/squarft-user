import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'hybrid', label: 'Hybrid' },
];

// Keep native map methods available through the caller's original ref.
const MapWithLayers = forwardRef(function MapWithLayers({ component: NativeMap, style, className, children, mapType = 'standard', layersTop = 12, ...props }, ref) {
  const [selectedType, setSelectedType] = useState(mapType);
  const [expanded, setExpanded] = useState(false);
  return (
    <View className={className} style={style}>
      <NativeMap {...props} ref={ref} style={StyleSheet.absoluteFill} mapType={selectedType}>{children}</NativeMap>
      <View pointerEvents="box-none" style={[styles.controls, { top: layersTop }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change map appearance" accessibilityState={{ expanded }}
          onPress={() => setExpanded(value => !value)} hitSlop={4} style={styles.button}>
          <Ionicons name="layers-outline" size={21} color="#4A43EC" />
        </Pressable>
        {expanded && <View style={styles.menu}>
          {TYPES.map(type => <Pressable key={type.value} accessibilityRole="radio" accessibilityState={{ checked: selectedType === type.value }}
            accessibilityLabel={`${type.label} map`} onPress={() => { setSelectedType(type.value); setExpanded(false); }}
            style={[styles.option, selectedType === type.value && styles.selected]}>
            <Text style={[styles.label, selectedType === type.value && styles.selectedLabel]}>{type.label}</Text>
            {selectedType === type.value && <Ionicons name="checkmark" size={17} color="#4A43EC" />}
          </Pressable>)}
        </View>}
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  controls: { position: 'absolute', right: 12, alignItems: 'flex-end', zIndex: 20 },
  button: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  menu: { marginTop: 6, width: 148, padding: 4, borderRadius: 13, backgroundColor: '#fff', elevation: 5, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  option: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 9 },
  selected: { backgroundColor: '#F0EEFF' },
  label: { fontSize: 13, color: '#334155' },
  selectedLabel: { color: '#4A43EC', fontWeight: '600' },
});
export default MapWithLayers;
