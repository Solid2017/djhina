import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius } from '../../theme';

const { width } = Dimensions.get('window');

function ContactCard({ contact, lastMsg, unread, onPress }) {
  const initials = contact.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  const timeStr = lastMsg
    ? new Date(lastMsg.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <TouchableOpacity style={styles.contactCard} onPress={onPress} activeOpacity={0.8}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {contact.avatar ? (
          <Image source={{ uri: contact.avatar }} style={styles.avatar} />
        ) : (
          <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.avatarGrad}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
        )}
        <View style={[styles.onlineDot, { backgroundColor: Colors.success }]} />
      </View>

      {/* Info */}
      <View style={styles.contactInfo}>
        <View style={styles.contactTopRow}>
          <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
          {timeStr ? <Text style={styles.contactTime}>{timeStr}</Text> : null}
        </View>
        <View style={styles.contactBottomRow}>
          {contact.eventContext ? (
            <View style={styles.eventBadge}>
              <Ionicons name="calendar-outline" size={10} color={Colors.primary} />
              <Text style={styles.eventBadgeText} numberOfLines={1}>{contact.eventContext}</Text>
            </View>
          ) : (
            <Text style={styles.contactMeta} numberOfLines={1}>
              {lastMsg ? (lastMsg.from === 'me' ? '→ ' : '') + lastMsg.text : contact.phone || contact.email || 'Nouveau contact'}
            </Text>
          )}
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen({ navigation }) {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('messages'); // messages | contacts

  const contacts = state.contacts || [];
  const conversations = state.conversations || {};

  // Contacts filtrés par recherche
  const filtered = contacts.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  // Contacts avec messages (pour onglet messages)
  const withMessages = filtered.filter(c => conversations[c.userId]?.length > 0);
  const withoutMessages = filtered.filter(c => !conversations[c.userId]?.length);

  const displayList = activeTab === 'messages' ? withMessages : filtered;

  const getLastMessage = (userId) => {
    const msgs = conversations[userId] || [];
    return msgs[msgs.length - 1] || null;
  };

  const getUnreadCount = (userId) => {
    return (conversations[userId] || []).filter(m => m.from !== 'me' && !m.read).length;
  };

  const totalUnread = contacts.reduce((sum, c) => sum + getUnreadCount(c.userId), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.primaryPale, Colors.background]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Messages</Text>
              <Text style={styles.headerSub}>
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                {totalUnread > 0 ? ` · ${totalUnread} non lu${totalUnread !== 1 ? 's' : ''}` : ''}
              </Text>
            </View>
            {/* Bouton QR perso */}
            <TouchableOpacity
              style={styles.qrBtn}
              onPress={() => navigation.navigate('MyQRCode')}
            >
              <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.qrBtnGrad}>
                <Ionicons name="qr-code" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un contact..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search !== '' && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {[
              { key: 'messages', label: 'Messages', count: withMessages.length },
              { key: 'contacts', label: 'Contacts', count: contacts.length },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                {activeTab === tab.key && (
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
                )}
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, activeTab === tab.key && { color: Colors.primary }]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Liste */}
      {displayList.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <LinearGradient colors={[Colors.primaryPale, Colors.background]} style={styles.emptyIconGrad}>
              <Ionicons name="qr-code-outline" size={52} color={Colors.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'messages' ? 'Aucun message' : 'Aucun contact'}
          </Text>
          <Text style={styles.emptyDesc}>
            Scannez le QR code d'un participant pour vous{'\n'}connecter et discuter avec lui
          </Text>
          <TouchableOpacity
            style={styles.scanContactBtn}
            onPress={() => navigation.navigate('ScanContact')}
          >
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.scanContactGrad}>
              <Ionicons name="scan-outline" size={18} color="#fff" />
              <Text style={styles.scanContactText}>Scanner un QR code</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={item => item.userId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ContactCard
              contact={item}
              lastMsg={getLastMessage(item.userId)}
              unread={getUnreadCount(item.userId)}
              onPress={() => navigation.navigate('Conversation', { contact: item })}
            />
          )}
          ListFooterComponent={
            activeTab === 'contacts' && withoutMessages.length === 0 && contacts.length > 0 ? (
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={() => navigation.navigate('ScanContact')}
              >
                <Ionicons name="scan-outline" size={16} color={Colors.primary} />
                <Text style={styles.addMoreText}>Scanner un nouveau contact</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* FAB scanner */}
      {displayList.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ScanContact')}
        >
          <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.fabGrad}>
            <Ionicons name="scan" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  qrBtn: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  qrBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 24, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  searchInput: { flex: 1, color: Colors.text, fontSize: Typography.sm },
  tabs: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4, gap: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: Radius.md, overflow: 'hidden', gap: 6 },
  tabText: { fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  tabCount: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, color: Colors.textMuted, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarGrad: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Typography.base, fontWeight: '800', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.surface },
  contactInfo: { flex: 1 },
  contactTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contactName: { fontSize: Typography.base, fontWeight: '700', color: Colors.text, flex: 1 },
  contactTime: { fontSize: Typography.xs, color: Colors.textMuted },
  contactBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contactMeta: { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1 },
  eventBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryPale, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  eventBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: '600', maxWidth: width * 0.4 },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { fontSize: 10, color: '#fff', fontWeight: '800' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  emptyIconWrap: { marginBottom: 8 },
  emptyIconGrad: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  scanContactBtn: { marginTop: 8, borderRadius: Radius.lg, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  scanContactGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 14 },
  scanContactText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  addMoreText: { color: Colors.primary, fontSize: Typography.sm, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 90, right: 24, borderRadius: 28, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  fabGrad: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
});
