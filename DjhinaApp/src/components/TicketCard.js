import React from 'react';
import {
  View, Text, StyleSheet, Image,
  Dimensions, Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import theme from '../theme';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW - 32, 420);

/* ── Helpers ──────────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
};
const fmtPrice = (p, c = 'XAF') => {
  if (!p || p == 0) return 'Gratuit';
  return `${Number(p).toLocaleString('fr-FR')} ${c}`;
};

const STATUS_CONFIG = {
  active:    { label: 'VALIDE',    color: '#00D68F', bg: 'rgba(0,214,143,.15)' },
  used:      { label: 'UTILISÉ',   color: '#8B5CF6', bg: 'rgba(139,92,246,.15)' },
  expired:   { label: 'EXPIRÉ',    color: '#F59E0B', bg: 'rgba(245,158,11,.15)' },
  cancelled: { label: 'ANNULÉ',    color: '#EF4444', bg: 'rgba(239,68,68,.15)'  },
};

/* ── Composant ────────────────────────────────────────────── */
export default function TicketCard({ ticket, onPress, showActions, onShare }) {
  const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.active;
  const qrValue = ticket.qr_data || ticket.ticket_number || 'INVALID';

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.9 : 1} onPress={onPress} style={styles.wrapper}>

      {/* ── Ombre colorée ── */}
      <View style={[styles.shadow, { shadowColor: theme.colors.primary }]} />

      <View style={styles.card}>

        {/* ── Bande déco top ── */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryLight, theme.colors.primary]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.topBar}
        />

        {/* ── Header événement ── */}
        <LinearGradient
          colors={['#0000AA', '#000070']}
          style={styles.eventHeader}
        >
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              🎭 {ticket.category_label || ticket.ticket_type_name || 'Événement'}
            </Text>
          </View>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {ticket.event_title}
          </Text>
          <View style={styles.metaRow}>
            {ticket.event_date && (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>📅 {fmtDate(ticket.event_date)}</Text>
              </View>
            )}
            {ticket.event_location && (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>📍 {ticket.event_location}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ── Ligne perforée ── */}
        <View style={styles.perfRow}>
          <View style={styles.perfCircleLeft} />
          <View style={styles.dashes} />
          <Text style={styles.perfScissors}>✂</Text>
          <View style={styles.dashes} />
          <View style={styles.perfCircleRight} />
        </View>

        {/* ── Corps ── */}
        <View style={styles.body}>

          {/* Infos bénéficiaire */}
          <View style={styles.infoSection}>

            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TITULAIRE</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>{ticket.holder_name}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TYPE</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>{ticket.ticket_type_name || '—'}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <Text style={[styles.fieldValue, { fontSize: 11 }]} numberOfLines={1}>
                  {ticket.holder_email || '—'}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TÉLÉPHONE</Text>
                <Text style={styles.fieldValue}>{ticket.holder_phone || '—'}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>MONTANT</Text>
                <Text style={[styles.fieldValue, styles.priceValue]}>
                  {fmtPrice(ticket.price_paid, ticket.currency)}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>DATE D'ACHAT</Text>
                <Text style={[styles.fieldValue, { fontSize: 11 }]}>
                  {fmtDate(ticket.created_at || ticket.purchase_date)}
                </Text>
              </View>
            </View>

            {/* Statut */}
            <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.color + '44' }]}>
              <View style={[styles.statusDot, { backgroundColor: st.color }]} />
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>

          </View>

          {/* QR Code */}
          <View style={styles.qrSection}>
            <View style={styles.qrFrame}>
              <QRCode
                value={qrValue}
                size={110}
                color="#00071A"
                backgroundColor="#FFFFFF"
                quietZone={4}
              />
            </View>
            <Text style={styles.qrLabel}>Scanner à l'entrée</Text>
            <Text style={styles.qrNote}>Présentez à l'agent</Text>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.ticketNumber}>N° {ticket.ticket_number}</Text>
          <Text style={styles.branding}>
            <Text style={{ color: theme.colors.primary }}>Djhina</Text> · Tchad 🇹🇩
          </Text>
        </View>

        {/* ── Actions ── */}
        {showActions && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
              <Text style={styles.actionBtnText}>🔗 Partager</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </TouchableOpacity>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginVertical: 8 },

  shadow: {
    position: 'absolute',
    width: CARD_W, height: '100%',
    borderRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 24,
    elevation: 12,
  },

  card: {
    width: CARD_W,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,255,.3)',
  },

  topBar: { height: 4 },

  // ── Header
  eventHeader: { padding: 18, paddingBottom: 14 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,.15)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,.2)',
  },
  categoryText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  eventTitle:   { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 26 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaChip: {
    backgroundColor: 'rgba(0,0,0,.3)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,.1)',
  },
  metaText: { color: '#c7d8ff', fontSize: 11 },

  // ── Perforation
  perfRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background, paddingHorizontal: 8,
  },
  perfCircleLeft: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 2, borderColor: 'rgba(0,0,255,.3)',
    marginLeft: -12,
  },
  perfCircleRight: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 2, borderColor: 'rgba(0,0,255,.3)',
    marginRight: -12,
  },
  dashes: { flex: 1, height: 2, borderTopWidth: 2, borderColor: 'rgba(0,0,255,.3)', borderStyle: 'dashed' },
  perfScissors: { color: theme.colors.primaryLight, fontSize: 14, marginHorizontal: 4 },

  // ── Body
  body: {
    flexDirection: 'row', padding: 16,
    gap: 16, alignItems: 'flex-start',
  },
  infoSection: { flex: 1, gap: 10 },

  fieldRow: { flexDirection: 'row', gap: 12 },
  field:    { flex: 1 },
  fieldLabel: {
    fontSize: 9.5, fontWeight: '700',
    letterSpacing: 1.5, color: theme.colors.primaryLight,
    textTransform: 'uppercase', marginBottom: 3,
  },
  fieldValue: { fontSize: 13, fontWeight: '600', color: '#fff' },
  priceValue: { fontSize: 16, fontWeight: '800', color: '#00D68F' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 2, marginTop: 4,
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  // ── QR
  qrSection: { alignItems: 'center', gap: 6, flexShrink: 0 },
  qrFrame: {
    backgroundColor: '#fff', borderRadius: 12, padding: 6,
    shadowColor: '#0000FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  qrLabel: {
    fontSize: 9.5, fontWeight: '700',
    letterSpacing: 1, color: theme.colors.primaryLight,
    textTransform: 'uppercase',
  },
  qrNote: { fontSize: 9, color: '#7ea3ff', textAlign: 'center', maxWidth: 110 },

  // ── Footer
  footer: {
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,255,.2)',
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  ticketNumber: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, color: '#7ea3ff', letterSpacing: 2 },
  branding:     { fontSize: 11, fontWeight: '700', color: theme.colors.primaryLight, letterSpacing: 1.5 },

  // ── Actions
  actionsRow: {
    paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', justifyContent: 'center',
  },
  actionBtn: {
    backgroundColor: 'rgba(0,0,255,.1)',
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(0,0,255,.3)',
  },
  actionBtnText: { color: '#7ea3ff', fontSize: 13, fontWeight: '600' },
});
