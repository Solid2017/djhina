import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius } from '../../theme';

function SettingItem({ icon, label, value, onPress, toggle, toggleValue, onToggle, arrow = true, color, highlight }) {
  return (
    <TouchableOpacity
      style={[styles.settingItem, highlight && { backgroundColor: highlight + '10', borderColor: highlight + '30' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: (color || Colors.primary) + '18' }]}>
        <Ionicons name={icon} size={18} color={color || Colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, highlight && { color: highlight }]}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.surfaceAlt, true: Colors.primary + '80' }}
          thumbColor={toggleValue ? Colors.primary : Colors.textMuted}
        />
      ) : arrow ? (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const { state, logout } = useApp();
  const user = state.user;

  const [notifEvents, setNotifEvents] = useState(true);
  const [notifTickets, setNotifTickets] = useState(true);
  const [biometric, setBiometric] = useState(false);

  const totalSpent = state.myTickets.reduce((sum, t) => sum + t.price, 0);
  const eventsAttended = state.myTickets.filter(t => t.status === 'used').length;
  const savedEvents = state.events.filter(e => e.isSaved).length;

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.primaryPale, Colors.background]}
          style={styles.header}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Mon Profil</Text>
              <TouchableOpacity style={styles.editBtn}>
                <Ionicons name="create-outline" size={20} color={Colors.primaryLight} />
              </TouchableOpacity>
            </View>

            {/* User card */}
            <View style={styles.userCard}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=35' }}
                  style={styles.avatar}
                />
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  style={styles.avatarBorder}
                />
                <TouchableOpacity style={styles.avatarEdit}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>

              <View style={styles.userMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{user?.country || 'Côte d\'Ivoire'}</Text>
                </View>
                <View style={styles.metaDot} />
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>Membre depuis {new Date(user?.joinedAt || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text>
                </View>
              </View>

              {/* Badges */}
              <View style={styles.badgesRow}>
                <View style={styles.badge}>
                  <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={styles.badgeGrad}>
                    <Ionicons name="star" size={12} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.badgeText}>Membre VIP</Text>
                </View>
                <View style={styles.badge}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.badgeGrad}>
                    <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.badgeText}>Vérifié</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { num: state.myTickets.length, label: 'Billets', icon: 'ticket', color: Colors.primary },
            { num: eventsAttended, label: 'Événements', icon: 'checkmark-circle', color: Colors.success },
            { num: savedEvents, label: 'Sauvegardés', icon: 'bookmark', color: Colors.accent },
            { num: `${(totalSpent / 1000).toFixed(0)}K`, label: 'FCFA dépensés', icon: 'wallet', color: Colors.music },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <LinearGradient colors={[stat.color + '20', stat.color + '08']} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
              <Text style={[styles.statNum, { color: stat.color }]}>{stat.num}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <View style={styles.settingsGroup}>
            <SettingItem icon="person-outline" label="Informations personnelles" value={user?.name} />
            <SettingItem icon="call-outline" label="Téléphone" value={user?.phone || '+235 66 00 00 00'} />
            <SettingItem icon="mail-outline" label="Email" value={user?.email} />
            <SettingItem icon="location-outline" label="Pays" value={user?.country} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paiements</Text>
          <View style={styles.settingsGroup}>
            <SettingItem icon="wallet-outline" label="Méthodes de paiement" />
            <SettingItem icon="receipt-outline" label="Historique des transactions" />
            <SettingItem icon="download-outline" label="Télécharger mes factures" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="notifications-outline"
              label="Nouveaux événements"
              toggle
              toggleValue={notifEvents}
              onToggle={setNotifEvents}
              arrow={false}
            />
            <SettingItem
              icon="ticket-outline"
              label="Statut des billets"
              toggle
              toggleValue={notifTickets}
              onToggle={setNotifTickets}
              arrow={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <View style={styles.settingsGroup}>
            <SettingItem icon="lock-closed-outline" label="Changer le mot de passe" />
            <SettingItem
              icon="finger-print-outline"
              label="Authentification biométrique"
              toggle
              toggleValue={biometric}
              onToggle={setBiometric}
              arrow={false}
            />
            <SettingItem icon="shield-outline" label="Confidentialité" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          <View style={styles.settingsGroup}>
            <SettingItem icon="help-circle-outline" label="Aide & Support" />
            <SettingItem icon="star-outline" label="Évaluer l'application" />
            <SettingItem icon="share-outline" label="Partager Djhina" />
            <SettingItem icon="information-circle-outline" label="À propos" value="v1.0.0" />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="log-out-outline"
              label="Se déconnecter"
              color={Colors.error}
              highlight={Colors.error}
              arrow={false}
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>DJHINA</Text>
          <Text style={styles.footerText}>Le Tchad vit ses événements</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 · © 2026 Djhina</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.text },
  editBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  userCard: { alignItems: 'center', paddingHorizontal: 24, gap: 6 },
  avatarWrap: { position: 'relative', marginBottom: 6 },
  avatarBorder: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 48, zIndex: -1 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: Colors.background },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  userName: { fontSize: Typography.xl, fontWeight: '800', color: Colors.text },
  userEmail: { fontSize: Typography.sm, color: Colors.textSecondary },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.xs, color: Colors.textMuted },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },
  badgesRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  badgeGrad: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 24, marginBottom: 8 },
  statCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, alignItems: 'center', gap: 6, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontSize: Typography.xl, fontWeight: '800' },
  statLabel: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },
  section: { paddingHorizontal: 24, marginBottom: 8 },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  settingsGroup: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  settingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
  settingValue: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 1 },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  footerLogo: { fontSize: Typography.lg, fontWeight: '800', color: Colors.textMuted, letterSpacing: 6 },
  footerText: { fontSize: Typography.xs, color: Colors.textMuted },
  footerVersion: { fontSize: Typography.xs, color: Colors.textMuted + '80', marginTop: 4 },
});
