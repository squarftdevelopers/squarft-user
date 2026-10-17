import { useEffect, useRef, useState } from 'react';
import { Animated, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Shimmer } from './SkeletonLoader';

export default function ProgressiveImage({ source, style, className, resizeMode = 'cover', imageStyle, onError, onLoad, ...props }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = typeof source === 'string' ? source.trim() : source?.uri;
  const validSource = typeof source === 'number' || (typeof uri === 'string' && uri.trim() && !['null', 'undefined', 'none'].includes(uri.trim().toLowerCase()));

  const localSource = typeof source === 'number' ? source : null;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    opacity.setValue(0);
  }, [opacity, uri, localSource]);

  const reveal = (event) => {
    setLoaded(true);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    onLoad?.(event);
  };

  return (
    <View className={className} style={[style, { overflow: 'hidden' }]}>
      {!validSource || failed ? (
        <View accessibilityLabel="No image available" style={{ width: '100%', height: '100%', backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
          <Ionicons name="image-outline" size={24} color="#94A3B8" />
          <Text style={{ color: '#64748B', fontSize: 10, textAlign: 'center', marginTop: 4 }}>No image available</Text>
        </View>
      ) : (
        <>
          {!loaded && <Shimmer style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}
          <Animated.Image {...props} source={typeof source === 'string' ? { uri } : source} resizeMode={resizeMode}
            onLoad={reveal} onError={(event) => { setFailed(true); onError?.(event); }}
            style={[{ width: '100%', height: '100%', opacity }, imageStyle]} />
        </>
      )}
    </View>
  );
}
