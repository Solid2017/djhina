import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentsApi } from '../../services/api';
import { Colors, Typography, Radius } from '../../theme';

const PROVIDER_ICONS = {
  airtel_money: { icon: 'phone-portrait-outline', color: '#E53935' },
  moov_tchad:   { icon: 'phone-portrait-outline', color: '#1565C0' },
  cash:         { icon: 'cash-outline',            color: '#2E7D32' },
  free:         { icon: 'gift-outline',             color: '#6A1B9A' },
};

const STATUS_COLORS = {
  completed: Colors.success,
  pending:   '#F59E0B',
  failed:    Colors.error,
  refunded:  Colors.textMuted,
};

export default function TransactionHistoryScreen({ navigation }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal]       = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const res = await paymentsApi.history(20, 0);
    if (res.ok && res.data) {
      setPayments(res.data.data || []);
      setTotal(res.data.total || 0);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalSpent = payments
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + parseFloat(p.total), 0);

  const renderItem = ({ item }) => {
    const prov = PROVIDER_ICONS[item.provider] || { icon: 'card-outline', color: Colors.primary };
    const statusColor = STATUS_COLORS[item.status] || Colors.textMuted;

    return (
      <View style={styles.card}>
        <View style={[styles.providerIcon, { backgroundColor: prov.color + '18' }]}>
          <Ionicons name={prov.icon} size={22} color={prov.color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.event_title}</Text>
          <Text style={styles.ticketType}>{item.ticket_type_name} · {item.quantity} billet(s)</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>{item.provider_label}</Text>
            <View style={styles.dot} />
            <Text style={styles.metaText}>
              {item.paid_at
                ? new Date(item.paid_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                : new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              }
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.amount}>
            {parseInt(item.total).toLocaleString('fr-FR')}
          </Text>
          <Text style={styles.currency}>XAF</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status_label}</Text>
          </View>
        </View>
      </View>
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
        {/* Header */}
        <LinearGradient colors={[Colors.primaryPale, Colors.background]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historique</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{total}</Text>
            <Text style={styles.summaryLabel}>Transactions</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Colors.success + '12' }]}>
            <Text style={[styles.summaryNum, { color: Colors.success }]}>
              {(totalSpent / 1000).toFixed(0)}K
            </Text>
            <Text style={styles.summaryLabel}>FCFA dépensés</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Colors.primary + '12' }]}>
            <Text style={[styles.summaryNum, { color: Colors.primary }]}>
              {payments.filter(p => p.status === 'completed').length}
            </Text>
            <Text style={styles.summaryLabel}>Complétés</Text>
          </View>
        </View>
      </SafeAreaView>

      {payments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucune transaction</Text>
          <Text style={styles.emptyText}>Vos paiements apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  summaryNum: { fontSize: Typography.xl, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  providerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  eventTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  ticketType: { fontSize: Typography.xs, color: Colors.textSecondary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: Typography.xs, color: Colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: Typography.base, fontWeight: '800', color: Colors.text },
  currency: { fontSize: Typography.xs, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted },
});
