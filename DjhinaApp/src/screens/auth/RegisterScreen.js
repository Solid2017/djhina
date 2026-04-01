import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const COUNTRIES = ['Côte d\'Ivoire', 'Sénégal', 'Mali', 'Burkina Faso', 'Togo', 'Bénin', 'Cameroun', 'Ghana', 'Nigeria'];

export default function RegisterScreen({ navigation }) {
  const { login } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', country: 'Côte d\'Ivoire' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [step, setStep] = useState(1);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validateStep1 = () => {
    if (!form.name.trim()) return 'Veuillez saisir votre nom complet.';
    if (!form.email.trim() || !form.email.includes('@')) return 'Email invalide.';
    if (!form.phone.trim() || form.phone.length < 8) return 'Numéro de téléphone invalide.';
    return null;
  };

  const validateStep2 = () => {
    if (form.password.length < 6) return 'Le mot de passe doit faire au moins 6 caractères.';
    if (form.password !== form.confirm) return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleRegister = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    login({
      id: 'user_' + Date.now(),
      name: form.name,
      email: form.email,
      phone: form.phone,
      avatar: `https://i.pravatar.cc/150?u=${form.email}`,
      role: 'user',
      country: form.country,
      joinedAt: new Date().toISOString(),
      eventsAttended: 0,
    });
    setLoading(false);
  };

  const Field = ({ label, icon, value, onChange, placeholder, type = 'default', secure, toggleSecure }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focusedField === label && styles.inputWrapFocused]}>
        <Ionicons name={icon} size={17} color={focusedField === label ? Colors.primary : Colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChange}
          keyboardType={type}
          autoCapitalize={type === 'email-address' ? 'none' : 'words'}
          secureTextEntry={secure}
          onFocus={() => setFocusedField(label)}
          onBlur={() => setFocusedField(null)}
        />
        {toggleSecure && (
          <TouchableOpacity onPress={toggleSecure}>
            <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={17} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
        <View style={styles.bgAccent} />

        <TouchableOpacity style={styles.backBtn} onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>D</Text>
          </View>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez la communauté Djhina</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>
          <View style={styles.stepLabels}>
            <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Infos personnelles</Text>
            <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Sécurité</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {error !== '' && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {step === 1 ? (
              <>
                <Field label="Nom complet" icon="person-outline" value={form.name} onChange={v => update('name', v)} placeholder="Jean Dupont" />
                <Field label="Email" icon="mail-outline" value={form.email} onChange={v => update('email', v)} placeholder="jean@email.com" type="email-address" />
                <Field label="Téléphone" icon="call-outline" value={form.phone} onChange={v => update('phone', v)} placeholder="+235 66 00 00 00" type="phone-pad" />

                {/* Country */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Pays</Text>
                  <View style={styles.countryRow}>
                    {COUNTRIES.slice(0, 4).map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.countryChip, form.country === c && styles.countryChipActive]}
                        onPress={() => update('country', c)}
                      >
                        <Text style={[styles.countryChipText, form.country === c && styles.countryChipTextActive]}>
                          {c.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.btnText}>Continuer</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Field
                  label="Mot de passe"
                  icon="lock-closed-outline"
                  value={form.password}
                  onChange={v => update('password', v)}
                  placeholder="Minimum 6 caractères"
                  secure={!showPassword}
                  toggleSecure={() => setShowPassword(!showPassword)}
                />
                <Field
                  label="Confirmer le mot de passe"
                  icon="shield-checkmark-outline"
                  value={form.confirm}
                  onChange={v => update('confirm', v)}
                  placeholder="Répétez le mot de passe"
                  secure={!showPassword}
                />

                <View style={styles.termsRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.termsText}>
                    En continuant, vous acceptez nos{' '}
                    <Text style={styles.termsLink}>Conditions d'utilisation</Text>
                    {' '}et notre{' '}
                    <Text style={styles.termsLink}>Politique de confidentialité</Text>
                  </Text>
                </View>

                <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.btnText}>Créer mon compte</Text>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
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
    paddingTop: 52,
    paddingBottom: 36,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  bgAccent: {
    position: 'absolute', width: 280, height: 280,
    borderRadius: 140, backgroundColor: '#fff',
    opacity: 0.07, top: -60, right: -60,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start', padding: 4 },
  header: { alignItems: 'center' },
  headerIcon: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  headerIconText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  title: { fontSize: Typography.xl, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.85)' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: 24, marginBottom: 6 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.surfaceAlt, borderWidth: 2, borderColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepLine: { width: 80, height: 2, backgroundColor: Colors.border },
  stepLineActive: { backgroundColor: Colors.primary },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 60, marginBottom: 24 },
  stepLabel: { fontSize: Typography.xs, color: Colors.textMuted },
  stepLabelActive: { color: Colors.primary, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 24,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 6,
  },
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
  input: { color: Colors.text, fontSize: Typography.base },
  countryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  countryChipActive: { backgroundColor: Colors.primaryPale, borderColor: Colors.primary },
  countryChipText: { fontSize: Typography.xs, color: Colors.text, fontWeight: '500' },
  countryChipTextActive: { color: Colors.primary },
  termsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, alignItems: 'flex-start' },
  termsText: { flex: 1, fontSize: Typography.xs, color: Colors.textMuted, lineHeight: 18 },
  termsLink: { color: Colors.primaryLight },
  btn: { height: 52, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, paddingBottom: 16 },
  loginText: { color: Colors.textMuted, fontSize: Typography.sm },
  loginLink: { color: Colors.primary, fontSize: Typography.sm, fontWeight: '700' },
});
