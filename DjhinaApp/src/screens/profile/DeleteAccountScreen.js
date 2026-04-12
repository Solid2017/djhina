import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { privacyApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius } from '../../theme';

export default function DeleteAccountScreen({ navigation }) {
  const { logout } = useApp();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = async () => {
    if (!confirmed) {
      return Alert.alert('Confirmation requise', 'Cochez la case de confirmation pour continuer.');
    }
    if (!password) {
      return Alert.alert('Erreur', 'Saisissez votre mot de passe pour confirmer.');
    }

    Alert.alert(
      '⚠️ Dernière confirmation',
      'Cette action est irréversible. Votre compte et toutes vos données seront supprimés définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const res = await privacyApi.deleteAccount(password);
            setLoading(false);

            if (res.ok) {
              Alert.alert(
                'Compte supprimé',
                'Votre compte a été supprimé. Vous allez être déconnecté.',
                [{ text: 'OK', onPress: () => logout() }]
              );
            } else {
              Alert.alert('Erreur', res.data?.message || 'Mot de passe incorrect.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Supprimer le compte</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Warning banner */}
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={28} color={Colors.error} />
          <Text style={styles.warningTitle}>Action irréversible</Text>
          <Text style={styles.warningText}>
            La suppression de votre compte entraînera la perte définitive de :
          </Text>
          <View style={styles.warningList}>
            {[
              'Votre profil et informations personnelles',
              'Tous vos billets achetés',
              'Votre historique de paiements',
              'Vos événements sauvegardés',
              'Vos messages et conversations',
            ].map((item, i) => (
              <View key={i} style={styles.warningItem}>
                <Ionicons name="close-circle" size={14} color={Colors.error} />
                <Text style={styles.warningItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          {/* Confirmation checkbox */}
          <TouchableOpacity style={styles.checkRow} onPress={() => setConfirmed(!confirmed)}>
            <View style={[styles.checkbox, confirmed && styles.checkboxActive]}>
              {confirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkText}>
              Je comprends que cette action est irréversible et que toutes mes données seront perdues.
            </Text>
          </TouchableOpacity>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirmez avec votre mot de passe</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color={Colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Votre mot de passe actuel"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={17} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.deleteBtn, (!confirmed || !password) && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={loading || !confirmed || !password}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.deleteBtnText}>Supprimer mon compte</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.error },
  scroll: { padding: 20 },
  warningBox: { backgroundColor: Colors.error + '10', borderRadius: Radius.xl, padding: 20, borderWidth: 1, borderColor: Colors.error + '30', alignItems: 'center', marginBottom: 20, gap: 8 },
  warningTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.error },
  warningText: { fontSize: Typography.sm, color: Colors.text, textAlign: 'center' },
  warningList: { alignSelf: 'stretch', gap: 6, marginTop: 4 },
  warningItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningItemText: { fontSize: Typography.sm, color: Colors.text, flex: 1 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, borderWidth: 1, borderColor: Colors.border },
  checkRow: { flexDirection: 'row', gap: 12, marginBottom: 20, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxActive: { backgroundColor: Colors.error, borderColor: Colors.error },
  checkText: { flex: 1, fontSize: Typography.sm, color: Colors.text, lineHeight: 20 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: Typography.sm, color: Colors.text, fontWeight: '500', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 50 },
  input: { flex: 1, color: Colors.text, fontSize: Typography.base },
  deleteBtn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
});
