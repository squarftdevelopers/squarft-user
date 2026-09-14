import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Shimmer } from './SkeletonLoader';

export default function ProgressiveImage({ source, style, resizeMode = 'cover', imageStyle, ...props }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    opacity.setValue(0);
  }, [opacity, source?.uri]);

  const reveal = () => {
    setLoaded(true);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };

  return (
    <View style={[style, { overflow: 'hidden' }]}> 
      {!loaded && <Shimmer style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}
      <Animated.Image
        {...props}
        source={source}
        resizeMode={resizeMode}
        onLoad={reveal}
        onError={reveal}
        style={[{ width: '100%', height: '100%', opacity }, imageStyle]}
      />
    </View>
  );
}
