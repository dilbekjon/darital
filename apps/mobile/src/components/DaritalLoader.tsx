import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

interface DaritalLoaderProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  darkMode?: boolean;
}

const sizeMap = { sm: 48, md: 80, lg: 128 };

export function DaritalLoader({
  fullScreen = true,
  size = 'lg',
  darkMode = true,
}: DaritalLoaderProps) {
  const spinOuter = useRef(new Animated.Value(0)).current;
  const spinInner = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const outerLoop = Animated.loop(
      Animated.timing(spinOuter, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const innerLoop = Animated.loop(
      Animated.timing(spinInner, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    outerLoop.start();
    innerLoop.start();
    bounceLoop.start();
    pulseLoop.start();
    return () => {
      outerLoop.stop();
      innerLoop.stop();
      bounceLoop.stop();
      pulseLoop.stop();
    };
  }, [spinOuter, spinInner, bounce, pulse]);

  const rotateOuter = spinOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const rotateInner = spinInner.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const translateYBounce = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const scaleBounce = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const logoSize = sizeMap[size];
  const ringSize = logoSize + 32;
  const ringInnerSize = logoSize + 16;

  const containerStyle = fullScreen
    ? [styles.fullScreen, darkMode ? styles.bgDark : styles.bgLight]
    : styles.inline;

  return (
    <View style={containerStyle}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          {/* Outer dashed ring */}
          <Animated.View
            style={[
              styles.ring,
              styles.ringOuter,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderColor: darkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)',
                transform: [{ rotate: rotateOuter }],
              },
            ]}
          />
          {/* Inner ring (reverse) */}
          <Animated.View
            style={[
              styles.ring,
              styles.ringInner,
              {
                width: ringInnerSize,
                height: ringInnerSize,
                borderRadius: ringInnerSize / 2,
                borderColor: darkMode ? 'rgba(250, 204, 21, 0.4)' : 'rgba(234, 179, 8, 0.5)',
                transform: [{ rotate: rotateInner }],
              },
            ]}
          />
          {/* Logo with bounce */}
          <Animated.View
            style={[
              styles.logoWrap,
              {
                width: logoSize,
                height: logoSize,
                borderRadius: 16,
                transform: [
                  { translateY: translateYBounce },
                  { scale: scaleBounce },
                ],
              },
            ]}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  bgDark: {
    backgroundColor: '#111827',
  },
  bgLight: {
    backgroundColor: '#EFF6FF',
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  ringOuter: {
    borderStyle: 'dashed',
    borderWidth: 3,
  },
  ringInner: {
    borderStyle: 'solid',
  },
  logoWrap: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
