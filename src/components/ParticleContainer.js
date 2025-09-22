import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

// A single animated particle
const Particle = ({ delay, duration }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Pulse animation
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.7, { duration: duration / 2 }),
        -1, // Loop indefinitely
        true // Reverse the animation
      )
    );
  }, [opacity, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const { width, height } = useWindowDimensions();
  const particleStyle = {
    position: 'absolute',
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    width: 4, // Particle size
    height: 4, // Particle size
    backgroundColor: 'rgba(74, 222, 128, 0.5)', // Greenish, semi-transparent color
    borderRadius: 2,
  };

  return <Animated.View style={[particleStyle, animatedStyle]} />;
};

// Container to hold all the particles
export default function ParticleContainer() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...Array(30)].map((_, i) => (
        <Particle
          key={i}
          delay={Math.random() * 2000} // Random start delay up to 2s
          duration={2000 + Math.random() * 2000} // Random duration between 2-4s
        />
      ))}
    </View>
  );
}