import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { privacyApi } from '../../services/api';
import { Colors, Typography, Radius } from '../../theme';

function PasswordField({ label, value, onChange, visible, toggle }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={17} color={Colors.textMuted} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          placeholder="••••••••"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={toggle}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={17} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen({ navigation }) {
  const [current, setCurrent]   = useState('');
  const [newPass, setNewPass]   = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]   = useState(false);

  const strength = () => {
    if (newPass.length === 0) return null;
    if (newPass.length < 6)  return { label: 'Trop court', color: Colors.error, width: '25%' };
    if (newPass.length < 8)  return { label: 'Faible', color: '#F59E0B', width: '50%' };
    if (!/[A-Z]/.test(newPass) || !/[0-9]/.test(newPass))
                             return { label: 'Moyen', color: '#F59E0B', width: '70%' };
    return { label: 'Fort', color: Colors.success, width: '100%' };
  };

  const handleSubmit = async () => {
    if (!current || !newPass || !confirm) {
      return Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
    }
    if (newPass.length < 6) {
      return Alert.alert('Erreur', 'Le nouveau mot de passe doit faire au moins 6 caractères.');
    }
    if (newPass !== confirm) {
      return Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas.');
    }

    setLoading(true);
    const res = await privacyApi.changePassword(current, newPass);
    setLoading(false);

    if (res.success) {
      Alert.alert('Succès', 'Mot de passe modifié. Reconnectez-vous.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Erreur', res.message || 'Mot de passe actuel incorrect.');
    }
  };

  const s = strength();

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <LinearGradient colors={[Colors.primaryPale, Colors.background]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mot de passe</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Choisissez un mot de passe fort avec au moins 8 caractères, une majuscule et un chiffre.
            </Text>
          </View>

          <View style={styles.card}>
            <PasswordField
              label="Mot de passe actuel"
              value={current}
              onChange={setCurrent}
              visible={showCurrent}
              toggle={() => setShowCurrent(!showCurrent)}
            />
            <PasswordField
              label="Nouveau mot de passe"
              value={newPass}
              onChange={setNewPass}
              visible={showNew}
              toggle={() => setShowNew(!showNew)}
            />

            {/* Strength indicator */}
            {s && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBar}>
                  <View style={[styles.strengthFill, { width: s.width, backgroundColor: s.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: s.color }]}>{s.label}</Text>
              </View>
            )}

            <PasswordField
              label="Confirmer le nouveau mot de passe"
              value={confirm}
              onChange={setConfirm}
              visible={showConfirm}
              toggle={() => setShowConfirm(!showConfirm)}
            />

            {confirm.length > 0 && newPass !== confirm && (
              <View style={styles.matchError}>
                <Ionicons name="close-circle" size={14} color={Colors.error} />
                <Text style={styles.matchErrorText}>Les mots de passe ne correspondent pas</Text>
              </View>
            )}
            {confirm.length > 0 && newPass === confirm && (
              <View style={styles.matchOk}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.matchOkText}>Les mots de passe correspondent</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.btn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Text style={styles.btnText}>Modifier le mot de passe</Text>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text },
  scroll: { padding: 20 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: Colors.primaryPale, borderRadius: Radius.lg, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: Colors.primary + '30', alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: Typography.xs, color: Colors.primaryLight, lineHeight: 18 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, borderWidth: 1, borderColor: Colors.border },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: Typography.sm, color: Colors.text, fontWeight: '500', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 50 },
  input: { flex: 1, color: Colors.text, fontSize: Typography.base },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: -8 },
  strengthBar: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: Typography.xs, fontWeight: '600', width: 60 },
  matchError: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 12, marginTop: -8 },
  matchErrorText: { fontSize: Typography.xs, color: Colors.error },
  matchOk: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 12, marginTop: -8 },
  matchOkText: { fontSize: Typography.xs, color: Colors.success },
  btn: { height: 52, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
});
