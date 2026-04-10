import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Share, ScrollView, Alert, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import theme from '../../theme';
import TicketCard from '../../components/TicketCard';

const API_BASE = 'http://localhost:3000'; // Remplacer par l'URL de prod en déploiement

export default function TicketDetailScreen({ route, navigation }) {
  const { ticketId } = route.params || {};
  const { state } = useApp();

  const ticket = state.myTickets?.find(t => t.id === ticketId)
               || state.lastPurchasedTickets?.[0];

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const [confetti, setConfetti] = useState(route.params?.fromPurchase || false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: false }),
    ]).start();

    if (confetti) {
      const t = setTimeout(() => setConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleShare = async () => {
    if (!ticket) return;
    const viewUrl = `${API_BASE}/tickets/${ticket.ticket_number}/view`;
    try {
      await Share.share({
        title: `Mon billet — ${ticket.event_title}`,
        message: `🎭 Billet Djhina\n\nÉvénement : ${ticket.event_title}\nTitulaire : ${ticket.holder_name}\nN° : ${ticket.ticket_number}\n\n📱 Voir mon billet : ${viewUrl}`,
        url: viewUrl,
      });
    } catch (e) { /* ignore */ }
  };

  const handleOpenWeb = () => {
    if (!ticket) return;
    const url = `${API_BASE}/tickets/${ticket.ticket_number}/view`;
    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir le navigateur.'));
  };

  if (!ticket) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Ionicons name="ticket-outline" size={56} color={theme.colors.primaryLight} />
          <Text style={styles.notFoundTitle}>Billet introuvable</Text>
          <Text style={styles.notFoundSub}>Ce billet n'existe pas ou a été supprimé.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Billet</Text>
        <TouchableOpacity style={styles.shareIconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.colors.primaryLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Confetti banner ── */}
        {confetti && (
          <LinearGradient
            colors={['rgba(0,214,143,.15)', 'transparent']}
            style={styles.successBanner}
          >
            <Text style={styles.successEmoji}>🎉</Text>
            <View>
              <Text style={styles.successTitle}>Réservation confirmée !</Text>
              <Text style={styles.successSub}>Votre billet a été émis avec succès.</Text>
            </View>
          </LinearGradient>
        )}

        {/* ── Ticket Card ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          <TicketCard
            ticket={ticket}
            showActions={false}
          />
        </Animated.View>

        {/* ── Boutons d'action ── */}
        <View style={styles.actionsGrid}>

          <TouchableOpacity style={styles.actionCard} onPress={handleShare}>
            <LinearGradient colors={['rgba(0,0,255,.2)', 'rgba(0,0,255,.1)']} style={styles.actionGrad}>
              <Ionicons name="share-social-outline" size={26} color={theme.colors.primaryLight} />
              <Text style={styles.actionLabel}>Partager</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleOpenWeb}>
            <LinearGradient colors={['rgba(0,0,255,.2)', 'rgba(0,0,255,.1)']} style={styles.actionGrad}>
              <Ionicons name="open-outline" size={26} color={theme.colors.primaryLight} />
              <Text style={styles.actionLabel}>Voir & Imprimer</Text>
            </LinearGradient>
          </TouchableOpacity>

        </View>

        {/* ── Instructions ── */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            <Ionicons name="information-circle-outline" size={15} color={theme.colors.primaryLight} /> Instructions
          </Text>
          <Text style={styles.infoText}>• Présentez le QR code à l'entrée de l'événement.</Text>
          <Text style={styles.infoText}>• Le QR code est unique et à usage unique.</Text>
          <Text style={styles.infoText}>• Ce billet est personnel et non-transférable.</Text>
          <Text style={styles.infoText}>• En cas de problème, contactez l'organisateur.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: theme.colors.background },
  scroll:    { padding: 16, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,255,.2)',
  },
  backIconBtn:  { padding: 6 },
  shareIconBtn: { padding: 6 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    color: '#fff', fontSize: 16, fontWeight: '700',
  },

  // Not found
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
  notFoundSub:   { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6 },
  backBtn: {
    marginTop: 20, backgroundColor: theme.colors.primary,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10,
  },
  backBtnText: { color: '#fff', fontWeight: '700' },

  // Success banner
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(0,214,143,.25)',
  },
  successEmoji: { fontSize: 28 },
  successTitle: { color: '#00D68F', fontSize: 14, fontWeight: '700' },
  successSub:   { color: '#7ea3ff', fontSize: 12, marginTop: 2 },

  // Actions grid
  actionsGrid: {
    flexDirection: 'row', gap: 12, marginTop: 16,
  },
  actionCard: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,255,.3)' },
  actionGrad: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  actionLabel: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '600' },

  // Info box
  infoBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,255,.2)',
    gap: 6,
  },
  infoTitle: { color: theme.colors.primaryLight, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  infoText:  { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
});
