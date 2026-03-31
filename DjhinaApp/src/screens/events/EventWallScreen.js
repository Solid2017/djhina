import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, Image, Dimensions, Animated, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { CATEGORIES, formatDate, formatPrice } from '../../data/mockData';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

function FeaturedCard({ event, onPress, onLike, onSave }) {
  const progress = event.registered / event.capacity;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={styles.featuredCard}>
      <Image source={{ uri: event.coverImage }} style={styles.featuredImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,7,26,0.6)', 'rgba(0,7,26,0.96)']}
        style={styles.featuredGradient}
      />

      {/* Badge */}
      <View style={styles.featuredBadge}>
        <View style={[styles.dot, { backgroundColor: Colors.accent }]} />
        <Text style={styles.featuredBadgeText}>EN VEDETTE</Text>
      </View>

      {/* Actions */}
      <View style={styles.featuredActions}>
        <TouchableOpacity onPress={onSave} style={styles.actionBtn}>
          <Ionicons
            name={event.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={event.isSaved ? Colors.accent : '#fff'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onLike} style={styles.actionBtn}>
          <Ionicons
            name={event.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={event.isLiked ? '#EF4444' : '#fff'}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.featuredContent}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryTagText}>{event.category.toUpperCase()}</Text>
        </View>
        <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.featuredMeta}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{formatDate(event.date).split(' ').slice(0, 3).join(' ')}</Text>
          <View style={styles.metaDot} />
          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{event.city}</Text>
        </View>

        {/* Capacity bar */}
        <View style={styles.capacityRow}>
          <View style={styles.capacityBar}>
            <View style={[styles.capacityFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
          <Text style={styles.capacityText}>{Math.round(progress * 100)}% complet</Text>
        </View>

        {/* Ticket price & CTA */}
        <View style={styles.featuredBottom}>
          <View>
            <Text style={styles.priceLabel}>À partir de</Text>
            <Text style={styles.price}>
              {formatPrice(Math.min(...event.tickets.filter(t => !t.soldOut).map(t => t.price)))}
            </Text>
          </View>
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            style={styles.reserveBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.reserveBtnText}>Réserver</Text>
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EventListCard({ event, onPress, onLike, onSave }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.listCard}>
      <Image source={{ uri: event.coverImage }} style={styles.listImage} />
      <LinearGradient colors={['transparent', 'rgba(0,7,26,0.5)']} style={StyleSheet.absoluteFill} />
      <View style={styles.listOverlay}>
        <View style={[styles.catBadge, { backgroundColor: getCatColor(event.category) + '30' }]}>
          <Text style={[styles.catBadgeText, { color: getCatColor(event.category) }]}>
            {event.category}
          </Text>
        </View>
        <View style={styles.listActions}>
          <TouchableOpacity onPress={onSave}>
            <Ionicons name={event.isSaved ? 'bookmark' : 'bookmark-outline'} size={17} color={event.isSaved ? Colors.accent : '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onLike}>
            <Ionicons name={event.isLiked ? 'heart' : 'heart-outline'} size={17} color={event.isLiked ? '#EF4444' : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.listMeta}>
          <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
          <Text style={styles.listMetaText}>{event.date}</Text>
          <View style={styles.metaDot} />
          <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
          <Text style={styles.listMetaText}>{event.city}</Text>
        </View>
        <View style={styles.listBottom}>
          <Text style={styles.listPrice}>
            {formatPrice(Math.min(...event.tickets.filter(t => !t.soldOut).map(t => t.price)))}
          </Text>
          <View style={styles.listStats}>
            <Ionicons name="heart" size={11} color={Colors.error} />
            <Text style={styles.listStatsText}>{event.likes}</Text>
            <Ionicons name="people" size={11} color={Colors.textMuted} style={{ marginLeft: 6 }} />
            <Text style={styles.listStatsText}>{event.registered}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getCatColor(cat) {
  const map = { music: Colors.music, sport: Colors.sport, culture: Colors.culture, business: Colors.business, food: Colors.food, festival: Colors.festival };
  return map[cat] || Colors.primary;
}

export default function EventWallScreen({ navigation }) {
  const { state, toggleLike, toggleSave } = useApp();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    setRefreshing(false);
  };

  const filtered = state.events.filter(e => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.city.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || e.category === activeCategory;
    return matchSearch && matchCat;
  });

  const featured = filtered.filter(e => e.isFeatured);
  const regular = filtered.filter(e => !e.isFeatured);

  return (
    <View style={styles.container}>
      {/* Sticky header blur */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <LinearGradient colors={['rgba(0,7,26,0.98)', 'rgba(0,7,26,0)']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bonjour 👋</Text>
              <Text style={styles.headerTitle}>Découvrez les événements</Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn}>
              <Image
                source={{ uri: state.user?.avatar || 'https://i.pravatar.cc/150?img=35' }}
                style={styles.avatar}
              />
              <View style={styles.avatarOnline} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher à N'Djaména, Moundou..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search !== '' && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="options-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
              >
                {activeCategory === cat.id && (
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.catChipGrad}
                  />
                )}
                <Ionicons
                  name={`${cat.icon}-outline`}
                  size={14}
                  color={activeCategory === cat.id ? '#fff' : Colors.textMuted}
                />
                <Text style={[styles.catChipText, activeCategory === cat.id && styles.catChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>

        {/* Featured section */}
        {featured.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>En Vedette</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={featured}
              keyExtractor={i => i.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + 16}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
              renderItem={({ item }) => (
                <View style={{ width: CARD_WIDTH }}>
                  <FeaturedCard
                    event={item}
                    onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                    onLike={() => toggleLike(item.id)}
                    onSave={() => toggleSave(item.id)}
                  />
                </View>
              )}
            />
          </View>
        )}

        {/* All events */}
        <View style={[styles.section, { paddingHorizontal: 24 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>
                {activeCategory === 'all' ? 'Tous les événements' : CATEGORIES.find(c => c.id === activeCategory)?.label}
              </Text>
            </View>
            <Text style={styles.eventCount}>{filtered.length} événements</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Aucun événement trouvé</Text>
              <Text style={styles.emptySubtext}>Essayez une autre recherche</Text>
            </View>
          ) : (
            filtered.map(event => (
              <EventListCard
                key={event.id}
                event={event}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                onLike={() => toggleLike(event.id)}
                onSave={() => toggleSave(event.id)}
              />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 10 },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  greeting: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  headerTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  avatarBtn: { position: 'relative' },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: Colors.primary },
  avatarOnline: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.background },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 16, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: Typography.sm },
  filterBtn: { marginLeft: 10, backgroundColor: 'rgba(0,0,255,0.15)', padding: 6, borderRadius: Radius.sm },
  categoriesScroll: { marginBottom: 8 },
  categoriesContent: { paddingHorizontal: 24, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: 'hidden' },
  catChipActive: { borderColor: Colors.primary },
  catChipGrad: { ...StyleSheet.absoluteFillObject, borderRadius: Radius.full },
  catChipText: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: '500' },
  catChipTextActive: { color: '#fff' },
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 0 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionAccent: { width: 4, height: 20, borderRadius: 2, backgroundColor: Colors.accent },
  sectionTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  seeAll: { fontSize: Typography.sm, color: Colors.primaryLight },
  eventCount: { fontSize: Typography.xs, color: Colors.textMuted },
  // Featured card
  featuredCard: { height: 360, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface },
  featuredImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  featuredGradient: { ...StyleSheet.absoluteFillObject },
  featuredBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,7,26,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  featuredBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.accent, letterSpacing: 1 },
  featuredActions: { position: 'absolute', top: 12, right: 12, gap: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,7,26,0.6)', alignItems: 'center', justifyContent: 'center' },
  featuredContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  categoryTag: { alignSelf: 'flex-start', backgroundColor: `${Colors.primary}50`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, marginBottom: 8 },
  categoryTagText: { fontSize: 9, fontWeight: '700', color: Colors.primaryLight, letterSpacing: 1 },
  featuredTitle: { fontSize: Typography.lg, fontWeight: '700', color: '#fff', marginBottom: 8, lineHeight: 26 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  metaText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  capacityBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  capacityFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  capacityText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)' },
  featuredBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  price: { fontSize: Typography.md, fontWeight: '700', color: '#fff' },
  reserveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.lg },
  reserveBtnText: { color: Colors.textDark, fontSize: Typography.sm, fontWeight: '700' },
  // List card
  listCard: { height: 120, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 12, backgroundColor: Colors.surface, flexDirection: 'row' },
  listImage: { width: 120, height: '100%' },
  listOverlay: { position: 'absolute', top: 8, left: 8, bottom: 0, right: 0, padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  catBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  listActions: { flexDirection: 'row', gap: 8 },
  listInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  listTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text, marginTop: 20 },
  listMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listMetaText: { fontSize: 10, color: Colors.textMuted },
  listBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listPrice: { fontSize: Typography.sm, fontWeight: '700', color: Colors.accent },
  listStats: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listStatsText: { fontSize: 10, color: Colors.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: Typography.md, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: Typography.sm, color: Colors.textMuted },
});
