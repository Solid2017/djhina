import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: false }),
    ]).start();
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      shake();
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message || 'Email ou mot de passe incorrect.');
      shake();
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@djhina.td');
    setPassword('Demo@1234');
    setLoading(true);
    const result = await login('demo@djhina.td', 'Demo@1234');
    setLoading(false);
    if (!result.ok) {
      setError(result.message || 'Compte démo indisponible.');
      shake();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Blue gradient header branding section */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight, '#6B8FFF']}
        style={styles.brandHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.bgAccent1} />
        <View style={styles.bgAccent2} />

        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCard}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.logoTagline}>Événements au Tchad 🇹🇩</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Form card */}
          <Animated.View
            style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Text style={styles.cardTitle}>Connexion</Text>
            <Text style={styles.cardSubtitle}>Accédez à tous vos événements</Text>

            {error !== '' && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email ou téléphone</Text>
              <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedField === 'email' ? Colors.primary : Colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'password' ? Colors.primary : Colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.loginBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Se connecter</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Demo login */}
            <TouchableOpacity style={styles.demoBtn} onPress={handleDemoLogin}>
              <Text style={styles.demoBtnText}>Essai rapide (compte démo)</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social login */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  brandHeader: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  bgAccent1: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: '#fff',
    opacity: 0.08, top: -80, right: -60,
  },
  bgAccent2: {
    position: 'absolute', width: 250, height: 250,
    borderRadius: 125, backgroundColor: '#fff',
    opacity: 0.06, bottom: -60, left: -60,
  },
  keyboardView: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 0 },
  logoSection: { alignItems: 'center' },
  logoCard: {
    width: 140,
    height: 140,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    padding: 8,
  },
  logoImage: { width: '100%', height: '100%' },
  logoTagline: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.9)', fontWeight: '500', letterSpacing: 0.5 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: -20,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  cardTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 24 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.errorBg, borderRadius: Radius.md,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: `${Colors.error}40`,
  },
  errorText: { color: Colors.error, fontSize: Typography.sm, flex: 1 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: Typography.sm, color: Colors.text, marginBottom: 8, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 50,
  },
  inputWrapFocused: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.text, fontSize: Typography.base },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { color: Colors.primaryLight, fontSize: Typography.sm },
  loginBtn: {
    height: 52, borderRadius: Radius.lg,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
  },
  loginBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  demoBtn: {
    alignItems: 'center', paddingVertical: 14, marginTop: 10,
  },
  demoBtnText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: Typography.sm },
  socialRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    height: 46, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  socialIcon: { fontSize: 16, fontWeight: '800', color: '#EA4335' },
  socialText: { color: Colors.text, fontSize: Typography.sm, fontWeight: '500' },
  registerRow: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 24, paddingBottom: 8,
  },
  registerText: { color: Colors.textMuted, fontSize: Typography.sm },
  registerLink: { color: Colors.primary, fontSize: Typography.sm, fontWeight: '700' },
});
