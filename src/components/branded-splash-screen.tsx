import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const DISPLAY_DURATION_MS = 1_600;
const FADE_DURATION_MS = 380;

type BrandedSplashScreenProps = {
  onFinish: () => void;
};

export function BrandedSplashScreen({ onFinish }: BrandedSplashScreenProps) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, DISPLAY_DURATION_MS);

    return () => clearTimeout(timer);
  }, [onFinish, opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, { opacity }]}
    >
      <StatusBar style="light" />
      <Image
        contentFit="cover"
        contentPosition="center"
        source={require('@/assets/images/splash-background.png')}
        style={StyleSheet.absoluteFill}
        transition={0}
      />
      <View style={styles.scrim} />

      <View style={styles.brand}>
        <View style={styles.logoFrame}>
          <Image
            contentFit="cover"
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            transition={0}
          />
        </View>

        <Text style={styles.title}>Mido</Text>
        <Text style={styles.tagline}>Meet in the middle,</Text>
        <Text style={styles.tagline}>
          <Text style={styles.taglineAccent}>love</Text> every moment.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    backgroundColor: '#120d2a',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 5, 25, 0.08)',
  },
  brand: {
    position: 'absolute',
    top: '25%',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoFrame: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 34,
    shadowColor: '#070314',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.42,
    shadowRadius: 18,
    elevation: 14,
  },
  logo: {
    width: 144,
    height: 144,
  },
  title: {
    marginTop: 14,
    color: '#fff7ef',
    fontSize: 54,
    fontWeight: '700',
    letterSpacing: -1.5,
    lineHeight: 62,
    textShadowColor: 'rgba(5, 2, 18, 0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  tagline: {
    color: '#fff7ef',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 23,
    textShadowColor: 'rgba(5, 2, 18, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  taglineAccent: {
    color: '#ff7c82',
    fontWeight: '700',
  },
});
