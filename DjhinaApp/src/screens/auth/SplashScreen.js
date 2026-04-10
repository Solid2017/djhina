import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Colors, Typography } from '../../theme';

// useNativeDriver: true crashes silently on some web environments
const ND = Platform.OS !== 'web';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: ND }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: ND }),
    ]).start();

    // Ring pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.5, duration: 1200, useNativeDriver: ND }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 1200, useNativeDriver: ND }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 0.3, duration: 0, useNativeDriver: ND }),
          Animated.timing(ringOpacity, { toValue: 0.6, duration: 0, useNativeDriver: ND }),
        ]),
      ])
    ).start();

    // Tagline fade in
    setTimeout(() => {
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: ND }).start();
    }, 700);

    // Navigate after splash
    const timer = setTimeout(() => navigation.replace('Login'), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Light background gradient */}
      <LinearGradient
        colors={[Colors.background, Colors.primaryPale, Colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background decorative circles */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />

      {/* Pulsing ring */}
      <Animated.View
        style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      />

      {/* Logo */}
      <Animated.View
        style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}
      >
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: taglineOpacity }}>
        <Text style={styles.tagline}>Le Tchad vit ses événements</Text>
        <View style={styles.taglineDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerIcon}>✦</Text>
          <View style={styles.dividerLine} />
        </View>
      </Animated.View>

      {/* Version */}
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.12,
  },
  bgCircle1: {
    width: 400,
    height: 400,
    backgroundColor: Colors.primary,
    top: -100,
    right: -100,
  },
  bgCircle2: {
    width: 300,
    height: 300,
    backgroundColor: Colors.primaryLight,
    bottom: -50,
    left: -80,
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoImage: {
    width: 220,
    height: 220,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  tagline: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 16,
  },
  taglineDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  dividerLine: {
    width: 60,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerIcon: {
    color: Colors.primaryLight,
    fontSize: 12,
  },
  version: {
    position: 'absolute',
    bottom: 48,
    color: Colors.textMuted,
    fontSize: Typography.xs,
    letterSpacing: 2,
  },
});
