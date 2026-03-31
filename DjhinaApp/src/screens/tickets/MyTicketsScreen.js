import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius } from '../../theme';
import { formatPrice } from '../../data/mockData';

const { width } = Dimensions.get('window');
const TABS = ['active', 'used', 'expired'];
const TAB_LABELS = { active: 'Actifs', used: 'Utilisés', expired: 'Expirés' };

function TicketCard({ ticket, onPress }) {
  const isActive = ticket.status === 'active';
  const isUsed = ticket.status === 'used';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.ticketCard}>
      {/* Top: Event info */}
      <LinearGradient
        colors={isActive ? [ticket.ticketColor + 'CC', ticket.ticketColor + '88'] : ['#2A1F4A', '#000F30']}
        style={styles.ticketTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        {/* Status badge */}
        <View style={[styles.statusBadge, {
          backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : isUsed ? Colors.successBg : Colors.errorBg
        }]}>
          <View style={[styles.statusDot, {
            backgroundColor: isActive ? '#fff' : isUsed ? Colors.success : Colors.textMuted
          }]} />
          <Text style={[styles.statusText, {
            color: isActive ? '#fff' : isUsed ? Colors.success : Colors.textMuted
          }]}>
            {isActive ? 'ACTIF' : isUsed ? 'UTILISÉ' : 'EXPIRÉ'}
          </Text>
        </View>

        {/* Event image thumbnail */}
        <Image source={{ uri: ticket.eventCover }} style={styles.eventThumb} />

        <View style={styles.ticketTopInfo}>
          <Text style={styles.ticketTypeBadge}>{ticket.ticketType}</Text>
          <Text style={styles.ticketEventName} numberOfLines={2}>{ticket.eventTitle}</Text>
          <View style={styles.ticketMeta}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.ticketMetaText}>{ticket.eventDate} · {ticket.eventTime}</Text>
          </View>
          <View style={styles.ticketMeta}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.ticketMetaText} numberOfLines={1}>{ticket.eventLocation}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tear line */}
      <View style={styles.tearLine}>
        <View style={styles.tearCircleLeft} />
        <View style={styles.tearDashes} />
        <View style={styles.tearCircleRight} />
      </View>

      {/* Bottom: QR + details */}
      <View style={styles.ticketBottom}>
        <View style={styles.ticketDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>N° Billet</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{ticket.id}</Text>
          </View>
          {ticket.seatNumber && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Siège</Text>
              <Text style={styles.detailValue}>{ticket.seatNumber}</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Titulaire</Text>
            <Text style={styles.detailValue}>{ticket.holderName}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Prix payé</Text>
            <Text style={[styles.detailValue, { color: ticket.ticketColor }]}>
              {formatPrice(ticket.price, ticket.currency)}
            </Text>
          </View>
        </View>

        {/* QR preview */}
        <View style={styles.qrWrap}>
          <View style={[styles.qrPreview, { opacity: isActive ? 1 : 0.3 }]}>
            {/* QR code placeholder pattern */}
            <View style={styles.qrPattern}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.qrRow}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <View
                      key={j}
                      style={[styles.qrCell, {
                        backgroundColor: Math.random() > 0.5 ? Colors.text : 'transparent'
                      }]}
                    />
                  ))}
                </View>
              ))}
            </View>
            <Ionicons name="qr-code" size={36} color={Colors.text} style={styles.qrIcon} />
          </View>
          <Text style={styles.qrHint}>
            {isActive ? 'Appuyez pour voir' : isUsed ? 'Scanné' : 'Invalide'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ tab }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <LinearGradient colors={[Colors.primary + '30', Colors.primary + '10']} style={StyleSheet.absoluteFill} borderRadius={48} />
        <Ionicons name="ticket-outline" size={48} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>
        {tab === 'active' ? 'Aucun billet actif' : tab === 'used' ? 'Aucun billet utilisé' : 'Aucun billet expiré'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {tab === 'active' ? 'Réservez votre premier événement !' : 'Vos billets utilisés apparaîtront ici.'}
      </Text>
    </View>
  );
}

export default function MyTicketsScreen({ navigation }) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('active');

  const filtered = state.myTickets.filter(t => t.status === activeTab);
  const counts = {
    active: state.myTickets.filter(t => t.status === 'active').length,
    used: state.myTickets.filter(t => t.status === 'used').length,
    expired: state.myTickets.filter(t => t.status === 'expired').length,
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        {/* Header */}
        <LinearGradient colors={[Colors.background, 'transparent']} style={styles.header}>
          <Text style={styles.headerTitle}>Mes Billets</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="download-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="filter-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats banner */}
        <View style={styles.statsBanner}>
          <LinearGradient colors={[Colors.primary + '20', Colors.accent + '10']} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{state.myTickets.length}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{counts.active}</Text>
            <Text style={styles.statLbl}>Actifs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: Colors.textMuted }]}>{counts.used}</Text>
            <Text style={styles.statLbl}>Utilisés</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.accent} />
            <Text style={styles.statLbl}>Sécurisés</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              {activeTab === tab && (
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={StyleSheet.absoluteFill} borderRadius={Radius.md} />
              )}
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {TAB_LABELS[tab]}
              </Text>
              {counts[tab] > 0 && (
                <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab && { color: Colors.primary }]}>
                    {counts[tab]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState tab={activeTab} />}
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.text },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  statsBanner: { marginHorizontal: 24, marginBottom: 16, borderRadius: Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: Typography.xl, fontWeight: '800', color: Colors.text },
  statLbl: { fontSize: Typography.xs, color: Colors.textMuted },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.divider },
  tabs: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4, gap: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: Radius.md, overflow: 'hidden' },
  tabActive: {},
  tabText: { fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  tabBadge: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 10, color: Colors.textMuted, fontWeight: '700' },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  // Ticket card
  ticketCard: { marginBottom: 20, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...{ shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 } },
  ticketTop: { padding: 20, position: 'relative', overflow: 'hidden' },
  bgCircle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', top: -30, right: -20 },
  bgCircle2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.03)', bottom: -20, left: 60 },
  eventThumb: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 110, opacity: 0.25 },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, marginBottom: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  ticketTopInfo: { gap: 4 },
  ticketTypeBadge: { alignSelf: 'flex-start', fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 1, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, marginBottom: 4 },
  ticketEventName: { fontSize: Typography.lg, fontWeight: '800', color: '#fff', lineHeight: 24 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ticketMetaText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', flex: 1 },
  tearLine: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background },
  tearCircleLeft: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.background, marginLeft: -10 },
  tearDashes: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border },
  tearCircleRight: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.background, marginRight: -10 },
  ticketBottom: { flexDirection: 'row', padding: 16, gap: 16, backgroundColor: Colors.surface },
  ticketDetails: { flex: 1, gap: 8 },
  detailItem: { gap: 1 },
  detailLabel: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  detailValue: { fontSize: Typography.xs, fontWeight: '600', color: Colors.text },
  qrWrap: { alignItems: 'center', gap: 6 },
  qrPreview: { width: 80, height: 80, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  qrPattern: { position: 'absolute', gap: 2, padding: 4 },
  qrRow: { flexDirection: 'row', gap: 2 },
  qrCell: { width: 10, height: 10, borderRadius: 1 },
  qrIcon: { position: 'absolute' },
  qrHint: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 },
  emptyTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textSecondary },
  emptySubtitle: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});
