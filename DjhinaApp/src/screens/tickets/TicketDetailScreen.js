import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Share, Dimensions, Image, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius, Shadow } from '../../theme';
import { formatPrice } from '../../data/mockData';

const { width } = Dimensions.get('window');

export default function TicketDetailScreen({ route, navigation }) {
  const { ticketId } = route.params;
  const { state } = useApp();
  const ticket = state.myTickets.find(t => t.id === ticketId);
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: false }),
    ]).start();

    if (ticket?.status === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.9, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 1500, useNativeDriver: false }),
        ])
      ).start();
    }
  }, []);

  if (!ticket) return null;

  const isActive = ticket.status === 'active';
  const isUsed = ticket.status === 'used';

  const handleShare = async () => {
    await Share.share({
      title: `Billet Djhina - ${ticket.eventTitle}`,
      message: `🎫 Mon billet Djhina\n📅 ${ticket.eventDate} · ${ticket.eventTime}\n📍 ${ticket.eventLocation}\n🎟 ${ticket.ticketType}\n🆔 ${ticket.id}`,
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#00071A', '#000F30', '#00071A']} style={StyleSheet.absoluteFill} />

      {/* Background glow */}
      {isActive && (
        <Animated.View style={[styles.bgGlow, { backgroundColor: ticket.ticketColor, opacity: glowAnim }]} />
      )}

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon Billet</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Main ticket card */}
          <View style={styles.ticketCard}>
            {/* Header gradient */}
            <LinearGradient
              colors={isActive ? [ticket.ticketColor + 'EE', ticket.ticketColor + 'AA', ticket.ticketColor + '55'] : ['#2A1F4A', '#000F30', '#00071A']}
              style={styles.cardTop}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.bgDeco1} />
              <View style={styles.bgDeco2} />

              {/* Event cover */}
              <Image source={{ uri: ticket.eventCover }} style={styles.eventCoverThumb} />

              {/* Status */}
              <View style={styles.statusRow}>
                <View style={[styles.statusPill, {
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'
                }]}>
                  <View style={[styles.statusDot, {
                    backgroundColor: isActive ? '#fff' : isUsed ? Colors.success : Colors.textMuted
                  }]} />
                  <Text style={[styles.statusText, { color: isActive ? '#fff' : isUsed ? Colors.success : Colors.textMuted }]}>
                    {isActive ? '● BILLET VALIDE' : isUsed ? '✓ BILLET UTILISÉ' : '✗ BILLET EXPIRÉ'}
                  </Text>
                </View>
                <Text style={styles.djhinaBrand}>DJHINA</Text>
              </View>

              <View style={styles.eventInfo}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{ticket.ticketType.toUpperCase()}</Text>
                </View>
                <Text style={styles.eventName}>{ticket.eventTitle}</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.infoText}>{ticket.eventDate} · {ticket.eventTime}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.infoText}>{ticket.eventLocation}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Perforated divider */}
            <View style={styles.perforation}>
              <View style={styles.perfCircleL} />
              {Array.from({ length: 16 }).map((_, i) => (
                <View key={i} style={styles.perfDash} />
              ))}
              <View style={styles.perfCircleR} />
            </View>

            {/* Bottom: QR Code */}
            <View style={styles.cardBottom}>
              <View style={styles.holderRow}>
                <View>
                  <Text style={styles.holderLabel}>TITULAIRE</Text>
                  <Text style={styles.holderName}>{ticket.holderName}</Text>
                </View>
                {ticket.seatNumber && (
                  <View style={styles.seatBox}>
                    <Text style={styles.seatLabel}>SIÈGE</Text>
                    <Text style={styles.seatValue}>{ticket.seatNumber}</Text>
                  </View>
                )}
              </View>

              {/* QR Code */}
              <Animated.View style={[styles.qrContainer, { transform: [{ scale: pulseAnim }] }]}>
                {isActive ? (
                  <View style={styles.qrFrame}>
                    <View style={[styles.qrCorner, styles.qrTL]} />
                    <View style={[styles.qrCorner, styles.qrTR]} />
                    <View style={[styles.qrCorner, styles.qrBL]} />
                    <View style={[styles.qrCorner, styles.qrBR]} />
                    <QRCode
                      value={ticket.qrData}
                      size={180}
                      backgroundColor="white"
                      color="#00071A"
                      logo={{ uri: 'https://i.pravatar.cc/50?img=1' }}
                      logoSize={28}
                      logoBackgroundColor="white"
                      logoBorderRadius={14}
                    />
                  </View>
                ) : (
                  <View style={styles.invalidQr}>
                    <Ionicons
                      name={isUsed ? 'checkmark-circle' : 'close-circle'}
                      size={64}
                      color={isUsed ? Colors.success : Colors.textMuted}
                    />
                    <Text style={[styles.invalidText, { color: isUsed ? Colors.success : Colors.textMuted }]}>
                      {isUsed ? 'BILLET VALIDÉ' : 'BILLET EXPIRÉ'}
                    </Text>
                  </View>
                )}
                <Text style={styles.qrHint}>
                  {isActive ? 'Présentez ce QR code à l\'entrée' : isUsed ? `Utilisé le ${new Date(ticket.purchasedAt).toLocaleDateString('fr-FR')}` : 'Ce billet n\'est plus valide'}
                </Text>
              </Animated.View>

              {/* Ticket ID */}
              <View style={styles.ticketIdRow}>
                <View style={styles.ticketIdLine} />
                <Text style={styles.ticketId}>{ticket.id}</Text>
                <View style={styles.ticketIdLine} />
              </View>
            </View>
          </View>

          {/* Details card */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Détails de réservation</Text>

            {[
              { label: 'Type de billet', value: ticket.ticketType, icon: 'ticket-outline' },
              { label: 'Prix payé', value: formatPrice(ticket.price, ticket.currency), icon: 'card-outline', highlight: true },
              { label: 'Méthode de paiement', value: ticket.paymentMethod, icon: 'wallet-outline' },
              { label: 'Téléphone', value: ticket.phone, icon: 'call-outline' },
              { label: 'Date d\'achat', value: new Date(ticket.purchasedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), icon: 'time-outline' },
            ].map((item, i) => (
              <View key={i} style={[styles.detailRow, i < 4 && styles.detailRowBorder]}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name={item.icon} size={16} color={Colors.primary} />
                </View>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={[styles.detailValue, item.highlight && { color: Colors.accent, fontWeight: '700' }]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Benefits card */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Avantages inclus</Text>
            {ticket.benefits?.map((benefit, i) => (
              <View key={i} style={styles.benefitRow}>
                <View style={[styles.benefitCheck, { backgroundColor: ticket.ticketColor + '20' }]}>
                  <Ionicons name="checkmark" size={14} color={ticket.ticketColor} />
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Badge button */}
          <TouchableOpacity
            style={styles.badgeBtn}
            onPress={() => setShowBadge(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              style={styles.badgeBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="id-card-outline" size={20} color="#fff" />
              <Text style={styles.badgeBtnText}>Voir mon Badge Numérique</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Digital badge overlay */}
          {showBadge && (
            <View style={styles.badgeOverlay}>
              <TouchableOpacity style={styles.badgeClose} onPress={() => setShowBadge(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.badge}>
                <LinearGradient
                  colors={[ticket.ticketColor, ticket.ticketColor + '88']}
                  style={styles.badgeGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.badgeDjhina}>DJHINA</Text>
                  <Text style={styles.badgeEventName}>{ticket.eventTitle}</Text>
                  <Image source={{ uri: 'https://i.pravatar.cc/150?img=35' }} style={styles.badgeAvatar} />
                  <Text style={styles.badgeHolder}>{ticket.holderName}</Text>
                  <Text style={styles.badgeTicketType}>{ticket.ticketType}</Text>
                  <View style={styles.badgeQrWrap}>
                    <QRCode value={ticket.qrData} size={100} backgroundColor="transparent" color="#fff" />
                  </View>
                  <Text style={styles.badgeId}>{ticket.id}</Text>
                  <View style={styles.badgeDate}>
                    <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.badgeDateText}>{ticket.eventDate}</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -100, alignSelf: 'center', filter: 'blur(80px)' },
  safeArea: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  ticketCard: { borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 },
  cardTop: { padding: 24, minHeight: 200, overflow: 'hidden', position: 'relative' },
  bgDeco1: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.06)', top: -40, right: -30 },
  bgDeco2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -20, left: 40 },
  eventCoverThumb: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', opacity: 0.18 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  djhinaBrand: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 3 },
  eventInfo: { gap: 6 },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  typeText: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  eventName: { fontSize: Typography.xl, fontWeight: '800', color: '#fff', lineHeight: 28 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.85)' },
  perforation: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, height: 1 },
  perfCircleL: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.background, marginLeft: -11 },
  perfCircleR: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.background, marginRight: -11 },
  perfDash: { flex: 1, height: 1, backgroundColor: Colors.border, marginHorizontal: 1 },
  cardBottom: { padding: 24, alignItems: 'center', backgroundColor: '#fff', gap: 20 },
  holderRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  holderLabel: { fontSize: 9, fontWeight: '700', color: '#888', letterSpacing: 1, marginBottom: 2 },
  holderName: { fontSize: Typography.base, fontWeight: '700', color: '#00071A' },
  seatBox: { alignItems: 'flex-end' },
  seatLabel: { fontSize: 9, fontWeight: '700', color: '#888', letterSpacing: 1, marginBottom: 2 },
  seatValue: { fontSize: Typography.base, fontWeight: '700', color: '#00071A' },
  qrContainer: { alignItems: 'center', gap: 12 },
  qrFrame: { padding: 12, backgroundColor: 'white', borderRadius: Radius.md, position: 'relative' },
  qrCorner: { position: 'absolute', width: 20, height: 20, borderColor: Colors.primary, borderWidth: 2 },
  qrTL: { top: 4, left: 4, borderRightWidth: 0, borderBottomWidth: 0 },
  qrTR: { top: 4, right: 4, borderLeftWidth: 0, borderBottomWidth: 0 },
  qrBL: { bottom: 4, left: 4, borderRightWidth: 0, borderTopWidth: 0 },
  qrBR: { bottom: 4, right: 4, borderLeftWidth: 0, borderTopWidth: 0 },
  qrHint: { fontSize: Typography.xs, color: '#666', textAlign: 'center', maxWidth: 220 },
  invalidQr: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', gap: 8 },
  invalidText: { fontSize: Typography.sm, fontWeight: '700', letterSpacing: 1 },
  ticketIdRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  ticketIdLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  ticketId: { fontSize: Typography.xs, color: '#888', fontWeight: '600', letterSpacing: 1 },
  detailsCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  detailIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  detailLabel: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary },
  detailValue: { fontSize: Typography.sm, color: Colors.text, fontWeight: '500' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  benefitCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1 },
  badgeBtn: { marginBottom: 12 },
  badgeBtnGrad: { height: 56, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  badgeBtnText: { fontSize: Typography.base, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  badgeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.xl, paddingTop: 40 },
  badgeClose: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  badge: { width: width - 96, borderRadius: Radius.xl, overflow: 'hidden' },
  badgeGrad: { padding: 24, alignItems: 'center', gap: 8 },
  badgeDjhina: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 4 },
  badgeEventName: { fontSize: Typography.md, fontWeight: '800', color: '#fff', textAlign: 'center' },
  badgeAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', marginVertical: 4 },
  badgeHolder: { fontSize: Typography.lg, fontWeight: '800', color: '#fff' },
  badgeTicketType: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 2 },
  badgeQrWrap: { marginVertical: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md },
  badgeId: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  badgeDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeDateText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)' },
});
