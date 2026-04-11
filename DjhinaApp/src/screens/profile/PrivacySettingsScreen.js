import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { privacyApi } from '../../services/api';
import { Colors, Typography, Radius } from '../../theme';

function SettingRow({ icon, color, title, description, value, onToggle, disabled }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: (color || Colors.primary) + '18' }]}>
        <Ionicons name={icon} size={18} color={color || Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: Colors.surfaceAlt, true: (color || Colors.primary) + '80' }}
        thumbColor={value ? (color || Colors.primary) : Colors.textMuted}
      />
    </View>
  );
}

export default function PrivacySettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    privacy_profile_public: true,
    privacy_show_activity:  true,
    privacy_show_tickets:   false,
    data_share_analytics:   true,
    biometric_enabled:      false,
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    privacyApi.getSettings().then(res => {
      if (res.success) setSettings(res.data);
      setLoading(false);
    });
  }, []);

  const toggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);
    await privacyApi.updateSettings({ [key]: updated[key] });
    setSaving(false);
  };

  const handleExportData = async () => {
    Alert.alert(
      'Exporter mes données',
      'Voulez-vous télécharger toutes vos données personnelles ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Exporter',
          onPress: async () => {
            const res = await privacyApi.exportData();
            if (res.success) {
              Alert.alert('Données exportées', `Vos données incluent : profil, ${res.data.tickets?.length || 0} billets, ${res.data.payments?.length || 0} paiements.`);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées sous 30 jours.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () => navigation.navigate('DeleteAccount'),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <LinearGradient colors={[Colors.primaryPale, Colors.background]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confidentialité</Text>
          {saving
            ? <ActivityIndicator size="small" color={Colors.primary} style={{ width: 38 }} />
            : <View style={{ width: 38 }} />
          }
        </LinearGradient>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profil */}
        <Text style={styles.sectionTitle}>Visibilité du profil</Text>
        <View style={styles.card}>
          <SettingRow
            icon="person-circle-outline"
            color={Colors.primary}
            title="Profil public"
            description="Votre profil est visible par les autres utilisateurs"
            value={settings.privacy_profile_public}
            onToggle={() => toggle('privacy_profile_public')}
          />
          <SettingRow
            icon="time-outline"
            color={Colors.accent}
            title="Afficher mon activité"
            description="Les événements que vous aimez ou sauvegardez"
            value={settings.privacy_show_activity}
            onToggle={() => toggle('privacy_show_activity')}
          />
          <SettingRow
            icon="ticket-outline"
            color='#6A1B9A'
            title="Afficher mes billets"
            description="Vos billets achetés visibles sur votre profil"
            value={settings.privacy_show_tickets}
            onToggle={() => toggle('privacy_show_tickets')}
          />
        </View>

        {/* Données */}
        <Text style={styles.sectionTitle}>Données & Analyses</Text>
        <View style={styles.card}>
          <SettingRow
            icon="bar-chart-outline"
            color='#0E7490'
            title="Partage analytique"
            description="Aide à améliorer l'application (données anonymes)"
            value={settings.data_share_analytics}
            onToggle={() => toggle('data_share_analytics')}
          />
        </View>

        {/* Biométrie */}
        <Text style={styles.sectionTitle}>Sécurité biométrique</Text>
        <View style={styles.card}>
          <SettingRow
            icon="finger-print-outline"
            color={Colors.success}
            title="Connexion biométrique"
            description="Utilisez votre empreinte ou Face ID pour vous connecter"
            value={settings.biometric_enabled}
            onToggle={() => toggle('biometric_enabled')}
          />
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Mes données</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
            <View style={[styles.rowIcon, { backgroundColor: Colors.primary + '18' }]}>
              <Ionicons name="download-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Exporter mes données</Text>
              <Text style={styles.rowDesc}>Profil, billets, historique de paiements</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Zone dangereuse */}
        <Text style={[styles.sectionTitle, { color: Colors.error }]}>Zone sensible</Text>
        <View style={[styles.card, { borderColor: Colors.error + '30' }]}>
          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
            <View style={[styles.rowIcon, { backgroundColor: Colors.error + '18' }]}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: Colors.error }]}>Supprimer mon compte</Text>
              <Text style={styles.rowDesc}>Action irréversible — toutes vos données seront effacées</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.divider, gap: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
  rowDesc: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },
});
