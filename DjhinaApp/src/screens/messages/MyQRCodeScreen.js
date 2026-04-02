import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius } from '../../theme';

export default function MyQRCodeScreen({ navigation }) {
  const { state } = useApp();
  const user = state.user;
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Tickets actifs pour permettre le mode "contexte événement"
  const activeTickets = (state.myTickets || []).filter(t => t.status === 'active');
  const uniqueEvents = activeTickets.reduce((acc, t) => {
    if (!acc.find(e => e.eventId === t.eventId)) {
      acc.push({ eventId: t.eventId, title: t.eventTitle, date: t.eventDate });
    }
    return acc;
  }, []);

  const selectedEvent = uniqueEvents.find(e => e.eventId === selectedEventId);

  // Données encodées dans le QR
  const qrPayload = JSON.stringify({
    type:       'djhina_user',
    userId:     user?.id,
    name:       user?.name,
    phone:      user?.phone,
    email:      user?.email,
    avatar:     user?.avatar,
    country:    user?.country,
    ...(selectedEvent && {
      eventId:    selectedEvent.eventId,
      eventTitle: selectedEvent.title,
      eventDate:  selectedEvent.date,
    }),
    ts: Date.now(),
  });

  const handleShare = async () => {
    await Share.share({
      message: `👋 Retrouvez-moi sur Djhina !\n\n${user?.name}\n📱 ${user?.phone || ''}\n📧 ${user?.email || ''}\n\nTéléchargez l'app Djhina : djhina.td`,
    });
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mon QR Code</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Carte QR */}
        <View style={styles.qrCard}>
          <LinearGradient colors={[Colors.primaryPale, '#fff']} style={StyleSheet.absoluteFill} borderRadius={Radius.xl} />

          {/* User info */}
          <View style={styles.userSection}>
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.avatarGrad}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userSub}>{user?.phone || user?.email}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
              <Text style={styles.verifiedText}>Vérifié</Text>
            </View>
          </View>

          {/* QR Code */}
          <View style={styles.qrWrap}>
            <View style={styles.qrInner}>
              <QRCode
                value={qrPayload}
                size={200}
                color={Colors.text}
                backgroundColor="#fff"
                logo={null}
              />
            </View>
            {/* Coins décoratifs */}
            {[
              { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderRightWidth: 0, borderBottomWidth: 0 },
              { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderLeftWidth: 0, borderBottomWidth: 0 },
              { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderRightWidth: 0, borderTopWidth: 0 },
              { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderLeftWidth: 0, borderTopWidth: 0 },
            ].map((s, i) => (
              <View key={i} style={[styles.corner, s]} />
            ))}
          </View>

          {/* Instruction */}
          <View style={styles.scanHint}>
            <Ionicons name="scan-outline" size={16} color={Colors.primary} />
            <Text style={styles.scanHintText}>
              Faites scanner ce QR code par un autre participant
            </Text>
          </View>

          {/* Contexte événement affiché */}
          {selectedEvent && (
            <View style={styles.eventContext}>
              <LinearGradient colors={[Colors.primary + '15', Colors.primary + '05']} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
              <Ionicons name="calendar" size={16} color={Colors.primary} />
              <Text style={styles.eventContextText} numberOfLines={1}>{selectedEvent.title}</Text>
              <TouchableOpacity onPress={() => setSelectedEventId(null)}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sélection contexte événement */}
        {uniqueEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adapter à un événement</Text>
            <Text style={styles.sectionDesc}>
              Associez votre QR à un événement pour que les contacts voient où vous vous êtes rencontrés.
            </Text>
            {uniqueEvents.map(event => (
              <TouchableOpacity
                key={event.eventId}
                style={[styles.eventOption, selectedEventId === event.eventId && styles.eventOptionActive]}
                onPress={() => setSelectedEventId(selectedEventId === event.eventId ? null : event.eventId)}
              >
                {selectedEventId === event.eventId && (
                  <LinearGradient colors={[Colors.primary + '12', Colors.primary + '04']} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
                )}
                <View style={[styles.eventOptionIcon, selectedEventId === event.eventId && { backgroundColor: Colors.primary + '20' }]}>
                  <Ionicons name="calendar" size={18} color={selectedEventId === event.eventId ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventOptionTitle, selectedEventId === event.eventId && { color: Colors.primary }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.eventOptionDate}>{event.date}</Text>
                </View>
                {selectedEventId === event.eventId && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Infos partagées */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations partagées</Text>
          <View style={styles.infoGroup}>
            {[
              { icon: 'person-outline', label: 'Nom', value: user?.name },
              { icon: 'call-outline', label: 'Téléphone', value: user?.phone || '—' },
              { icon: 'mail-outline', label: 'Email', value: user?.email },
              { icon: 'location-outline', label: 'Pays', value: user?.country || '—' },
            ].map((item, i) => (
              <View key={i} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.divider }]}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon} size={16} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.base, fontWeight: '700', color: '#fff' },
  shareBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },
  qrCard: { backgroundColor: '#fff', borderRadius: Radius.xl, padding: 24, alignItems: 'center', gap: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8 },
  userSection: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  avatarGrad: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Typography.base, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  userSub: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryPale, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  verifiedText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  qrWrap: { position: 'relative', padding: 16 },
  qrInner: { backgroundColor: '#fff', padding: 12, borderRadius: Radius.md },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: Colors.primary },
  scanHint: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryPale, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full },
  scanHintText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: '500', textAlign: 'center', flex: 1 },
  eventContext: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, width: '100%', overflow: 'hidden', borderWidth: 1, borderColor: Colors.primary + '30' },
  eventContextText: { flex: 1, fontSize: Typography.xs, color: Colors.primary, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionDesc: { fontSize: Typography.xs, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  eventOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  eventOptionActive: { borderColor: Colors.primary + '60' },
  eventOptionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  eventOptionTitle: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
  eventOptionDate: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 1 },
  infoGroup: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.primaryPale, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: Typography.xs, color: Colors.textMuted },
  infoValue: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text, marginTop: 1 },
});
