import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, TextInput, KeyboardAvoidingView, Platform, Animated,
  Share, FlatList, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius, Shadow } from '../../theme';
import { COMMENTS, formatDate, formatPrice } from '../../data/mockData';
import PaymentModal from '../../components/PaymentModal';
import { agendaApi } from '../../services/api';

const { width, height } = Dimensions.get('window');
const IMG_HEIGHT = 320;

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { state, toggleLike, toggleSave } = useApp();
  const event = state.events.find(e => e.id === eventId);
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('info');
  const [selectedTicket, setSelectedTicket] = useState(event?.tickets[0] || null);
  const [showPayment, setShowPayment] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(COMMENTS);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [agenda, setAgenda] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaLoaded, setAgendaLoaded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({ inputRange: [IMG_HEIGHT - 100, IMG_HEIGHT], outputRange: [0, 1], extrapolate: 'clamp' });
  const imageScale = scrollY.interpolate({ inputRange: [-100, 0], outputRange: [1.15, 1], extrapolate: 'clamp' });
  const imageTranslate = scrollY.interpolate({ inputRange: [0, IMG_HEIGHT], outputRange: [0, IMG_HEIGHT * 0.5], extrapolate: 'clamp' });

  useEffect(() => {
    if (activeTab === 'programme' && !agendaLoaded) {
      setAgendaLoading(true);
      agendaApi.getEventAgenda(eventId).then(res => {
        if (res.ok && res.data?.data?.sessions) {
          setAgenda(res.data.data.sessions);
        }
        setAgendaLoading(false);
        setAgendaLoaded(true);
      });
    }
  }, [activeTab, agendaLoaded, eventId]);

  if (!event) return null;

  const progress = event.registered / event.capacity;

  const SESSION_TYPE_LABEL = {
    conference: 'Conférence', workshop: 'Atelier', panel: 'Panel',
    keynote: 'Keynote', networking: 'Networking', break: 'Pause',
  };
  const SESSION_TYPE_COLOR = {
    conference: Colors.primary, workshop: Colors.accent, panel: '#8B5CF6',
    keynote: Colors.warning, networking: '#10B981', break: Colors.textMuted,
  };
  const getSessionTypeLabel = (t) => SESSION_TYPE_LABEL[t] || t;
  const getSessionTypeColor = (t) => SESSION_TYPE_COLOR[t] || Colors.primary;
  const formatSessionTime = (dt) => {
    if (!dt) return '';
    try { return new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return dt; }
  };
  const TAB_LABELS = { info: 'Info', programme: 'Programme', billets: 'Billets', commentaires: 'Avis' };
  const availableTickets = event.tickets.filter(t => !t.soldOut);

  const handleShare = async () => {
    await Share.share({
      title: event.title,
      message: `🎉 Découvrez "${event.title}" sur Djhina !\n📅 ${formatDate(event.date)} à ${event.time}\n📍 ${event.location}\n\nTéléchargez l'app Djhina pour réserver vos billets.`,
    });
  };

  const submitComment = () => {
    if (!comment.trim()) return;
    setComments(c => [{
      id: 'new_' + Date.now(),
      user: state.user?.name || 'Vous',
      avatar: state.user?.avatar || 'https://i.pravatar.cc/150?img=35',
      text: comment.trim(),
      time: 'À l\'instant',
      likes: 0,
    }, ...c]);
    setComment('');
  };

  const getCatColor = (cat) => {
    const map = { music: Colors.music, sport: Colors.sport, culture: Colors.culture, business: Colors.business, food: Colors.food, festival: Colors.festival };
    return map[cat] || Colors.primary;
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Sticky header (appears on scroll) */}
      <Animated.View style={[styles.stickyHeader, { paddingTop: insets.top, opacity: headerOpacity }]}>
        <LinearGradient colors={[Colors.background, 'transparent']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.heroWrap}>
          <Animated.Image
            source={{ uri: event.coverImage }}
            style={[styles.heroImage, { transform: [{ scale: imageScale }, { translateY: imageTranslate }] }]}
          />
          <LinearGradient
            colors={['rgba(0,7,26,0.1)', 'rgba(0,7,26,0.5)', Colors.background]}
            style={styles.heroGradient}
          />

          {/* Float buttons */}
          <SafeAreaView edges={['top']} style={styles.heroButtons}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.floatBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroActionsRight}>
              <TouchableOpacity onPress={() => toggleSave(event.id)} style={styles.floatBtn}>
                <Ionicons name={event.isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={event.isSaved ? Colors.accent : '#fff'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.floatBtn}>
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Organizer */}
          <View style={styles.organizerChip}>
            <Image source={{ uri: event.organizer.avatar }} style={styles.orgAvatar} />
            <Text style={styles.orgName}>{event.organizer.name}</Text>
            {event.organizer.verified && (
              <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Category & title */}
          <View style={[styles.catTag, { backgroundColor: getCatColor(event.category) + '20' }]}>
            <Text style={[styles.catTagText, { color: getCatColor(event.category) }]}>
              {event.category.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventSubtitle}>{event.subtitle}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <TouchableOpacity onPress={() => toggleLike(event.id)} style={styles.statItem}>
              <Ionicons name={event.isLiked ? 'heart' : 'heart-outline'} size={18} color={event.isLiked ? Colors.error : Colors.textMuted} />
              <Text style={styles.statText}>{event.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('commentaires')} style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.statText}>{event.comments}</Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.statText}>{event.registered} inscrits</Text>
            </View>
            <TouchableOpacity onPress={handleShare} style={styles.statItem}>
              <Ionicons name="share-social-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.statText}>{event.shares}</Text>
            </TouchableOpacity>
          </View>

          {/* Info cards */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <LinearGradient colors={['rgba(0,0,255,0.15)', 'rgba(0,0,255,0.05)']} style={styles.infoCardGrad} />
              <Ionicons name="calendar" size={22} color={Colors.primary} />
              <View>
                <Text style={styles.infoCardLabel}>Date</Text>
                <Text style={styles.infoCardValue}>{formatDate(event.date).split(',')[0]}</Text>
                <Text style={styles.infoCardSub}>{event.date}</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <LinearGradient colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)']} style={styles.infoCardGrad} />
              <Ionicons name="time" size={22} color={Colors.accent} />
              <View>
                <Text style={styles.infoCardLabel}>Heure</Text>
                <Text style={styles.infoCardValue}>{event.time}</Text>
                <Text style={styles.infoCardSub}>Fin : {event.endTime}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoCard, { flexDirection: 'row', gap: 12, marginBottom: 16 }]}>
            <LinearGradient colors={['rgba(20,184,166,0.15)', 'rgba(20,184,166,0.05)']} style={styles.infoCardGrad} />
            <Ionicons name="location" size={22} color={Colors.sport} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCardLabel}>Lieu</Text>
              <Text style={styles.infoCardValue}>{event.location}</Text>
              <Text style={styles.infoCardSub}>{event.city}, {event.country}</Text>
            </View>
            <TouchableOpacity style={styles.mapBtn}>
              <Ionicons name="map-outline" size={16} color={Colors.primary} />
              <Text style={styles.mapBtnText}>Carte</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {['info', 'programme', 'billets', 'commentaires'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                {activeTab === tab && (
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
                )}
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {TAB_LABELS[tab] || tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {activeTab === 'info' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.description} numberOfLines={showFullDesc ? undefined : 4}>
                {event.description}
              </Text>
              <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)} style={styles.moreBtn}>
                <Text style={styles.moreBtnText}>{showFullDesc ? 'Voir moins' : 'Lire plus'}</Text>
                <Ionicons name={showFullDesc ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primaryLight} />
              </TouchableOpacity>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Tags</Text>
              <View style={styles.tagsRow}>
                {event.tags.map(tag => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Capacité</Text>
              <View style={styles.capacityWrap}>
                <View style={styles.capacityRow}>
                  <Text style={styles.capacityLabel}>{event.registered} / {event.capacity} inscrits</Text>
                  <Text style={styles.capacityPct}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={styles.capacityBar}>
                  <LinearGradient
                    colors={progress > 0.8 ? [Colors.error, Colors.warning] : [Colors.primary, Colors.accent]}
                    style={[styles.capacityFill, { width: `${Math.min(progress * 100, 100)}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
                {progress > 0.85 && (
                  <Text style={styles.urgency}>⚡ Plus que {event.capacity - event.registered} places disponibles !</Text>
                )}
              </View>
            </View>
          )}

          {activeTab === 'programme' && (
            <View style={styles.tabContent}>
              {(agendaLoading || !agendaLoaded) ? (
                <View style={styles.progLoading}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                  <Text style={styles.progLoadingText}>Chargement du programme…</Text>
                </View>
              ) : agenda.length === 0 ? (
                <View style={styles.progEmpty}>
                  <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.progEmptyText}>Aucune session publiée</Text>
                </View>
              ) : (
                agenda.map((session) => (
                  <View key={session.id} style={styles.sessionCard}>
                    {/* Type badge + room */}
                    <View style={styles.sessionMeta}>
                      <View style={[styles.sessionTypeBadge, { backgroundColor: getSessionTypeColor(session.type) + '25' }]}>
                        <Text style={[styles.sessionTypeText, { color: getSessionTypeColor(session.type) }]}>
                          {getSessionTypeLabel(session.type)}
                        </Text>
                      </View>
                      {session.room ? (
                        <View style={styles.sessionRoom}>
                          <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                          <Text style={styles.sessionRoomText}>{session.room}</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.sessionTitle}>{session.title}</Text>

                    {session.start_time ? (
                      <View style={styles.sessionTimeRow}>
                        <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                        <Text style={styles.sessionTimeText}>
                          {formatSessionTime(session.start_time)}
                          {session.end_time ? ` — ${formatSessionTime(session.end_time)}` : ''}
                        </Text>
                      </View>
                    ) : null}

                    {session.description ? (
                      <Text style={styles.sessionDesc} numberOfLines={2}>{session.description}</Text>
                    ) : null}

                    {/* Speakers list */}
                    {session.speakers && session.speakers.length > 0 && (
                      <View style={styles.speakersWrap}>
                        <Text style={styles.speakersLabel}>Intervenant(s)</Text>
                        {session.speakers.map(sp => (
                          <TouchableOpacity
                            key={sp.id}
                            style={styles.speakerChip}
                            activeOpacity={0.75}
                            onPress={() => navigation.navigate('SpeakerChat', {
                              speaker: {
                                id: sp.id,
                                name: sp.name,
                                photo: sp.photo,
                                job_title: sp.job_title,
                                company: sp.company,
                              },
                              eventTitle: event.title,
                            })}
                          >
                            {sp.photo ? (
                              <Image source={{ uri: sp.photo }} style={styles.speakerPhoto} />
                            ) : (
                              <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.speakerPhotoGrad}>
                                <Text style={styles.speakerInitial}>{sp.name?.[0]?.toUpperCase() || '?'}</Text>
                              </LinearGradient>
                            )}
                            <View style={styles.speakerInfo}>
                              <Text style={styles.speakerName} numberOfLines={1}>{sp.name}</Text>
                              {(sp.job_title || sp.company) ? (
                                <Text style={styles.speakerTitle} numberOfLines={1}>
                                  {sp.job_title}{sp.job_title && sp.company ? ' · ' : ''}{sp.company}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.chatBtnWrap}>
                              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.chatBtnGrad}>
                                <Ionicons name="chatbubble" size={14} color="#fff" />
                                <Text style={styles.chatBtnText}>Chat</Text>
                              </LinearGradient>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'billets' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Choisissez votre billet</Text>
              {event.tickets.map(ticket => (
                <TouchableOpacity
                  key={ticket.id}
                  style={[styles.ticketOption, selectedTicket?.id === ticket.id && styles.ticketOptionActive, ticket.soldOut && styles.ticketOptionSoldOut]}
                  onPress={() => !ticket.soldOut && setSelectedTicket(ticket)}
                  activeOpacity={ticket.soldOut ? 1 : 0.8}
                >
                  {selectedTicket?.id === ticket.id && !ticket.soldOut && (
                    <LinearGradient
                      colors={[ticket.color + '20', ticket.color + '05']}
                      style={StyleSheet.absoluteFill}
                      borderRadius={Radius.lg}
                    />
                  )}
                  <View style={[styles.ticketColorBar, { backgroundColor: ticket.soldOut ? Colors.textMuted : ticket.color }]} />
                  <View style={styles.ticketInfo}>
                    <View style={styles.ticketTopRow}>
                      <Text style={[styles.ticketType, ticket.soldOut && { color: Colors.textMuted }]}>{ticket.type}</Text>
                      {ticket.soldOut ? (
                        <View style={styles.soldOutBadge}>
                          <Text style={styles.soldOutText}>COMPLET</Text>
                        </View>
                      ) : (
                        <Text style={[styles.ticketPrice, { color: ticket.color }]}>
                          {formatPrice(ticket.price, ticket.currency)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.benefitsList}>
                      {ticket.benefits.map((b, i) => (
                        <View key={i} style={styles.benefitItem}>
                          <Ionicons name="checkmark-circle" size={13} color={ticket.soldOut ? Colors.textMuted : ticket.color} />
                          <Text style={[styles.benefitText, ticket.soldOut && { color: Colors.textMuted }]}>{b}</Text>
                        </View>
                      ))}
                    </View>
                    {!ticket.soldOut && (
                      <Text style={styles.remaining}>{ticket.available - ticket.sold} places restantes</Text>
                    )}
                  </View>
                  {selectedTicket?.id === ticket.id && !ticket.soldOut && (
                    <View style={styles.ticketCheck}>
                      <Ionicons name="checkmark-circle" size={22} color={ticket.color} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === 'commentaires' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>{comments.length} Commentaires</Text>

              {/* Comment input */}
              <View style={styles.commentInput}>
                <Image
                  source={{ uri: state.user?.avatar || 'https://i.pravatar.cc/150?img=35' }}
                  style={styles.commentAvatar}
                />
                <TextInput
                  style={styles.commentField}
                  placeholder="Écrire un commentaire..."
                  placeholderTextColor={Colors.textMuted}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
                <TouchableOpacity onPress={submitComment} style={[styles.sendBtn, { opacity: comment.trim() ? 1 : 0.4 }]}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.sendGrad}>
                    <Ionicons name="send" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {comments.map(c => (
                <View key={c.id} style={styles.commentItem}>
                  <Image source={{ uri: c.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>{c.user}</Text>
                      <Text style={styles.commentTime}>{c.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                    <View style={styles.commentActions}>
                      <TouchableOpacity style={styles.commentAction}>
                        <Ionicons name="heart-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.commentActionText}>{c.likes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.commentAction}>
                        <Text style={styles.commentActionText}>Répondre</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient colors={['transparent', Colors.background]} style={styles.bottomGrad} pointerEvents="none" />
        <View style={styles.bottomContent}>
          {selectedTicket && (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedLabel}>{selectedTicket.type}</Text>
              <Text style={styles.selectedPrice}>{formatPrice(selectedTicket.price, selectedTicket.currency)}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.ctaWrap}
            onPress={() => setShowPayment(true)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              style={styles.ctaBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="ticket-outline" size={18} color={Colors.textDark} />
              <Text style={styles.ctaBtnText}>Réserver & Payer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {showPayment && selectedTicket && (
        <PaymentModal
          visible={showPayment}
          onClose={() => setShowPayment(false)}
          event={event}
          ticketType={selectedTicket}
          navigation={navigation}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stickyTitle: { flex: 1, fontSize: Typography.base, fontWeight: '700', color: Colors.text, textAlign: 'center', marginHorizontal: 8 },
  headerRight: { flexDirection: 'row', gap: 8 },
  scroll: { flex: 1 },
  heroWrap: { height: IMG_HEIGHT, overflow: 'hidden' },
  heroImage: { width, height: IMG_HEIGHT + 50, position: 'absolute' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  floatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,7,26,0.65)', alignItems: 'center', justifyContent: 'center' },
  heroActionsRight: { flexDirection: 'row', gap: 10 },
  organizerChip: { position: 'absolute', bottom: 16, left: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  orgAvatar: { width: 24, height: 24, borderRadius: 12 },
  orgName: { fontSize: Typography.xs, color: Colors.text, fontWeight: '600' },
  content: { padding: 24, paddingTop: 8 },
  catTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, marginBottom: 10 },
  catTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  eventTitle: { fontSize: Typography.xxl, fontWeight: '800', color: Colors.text, lineHeight: 36, marginBottom: 6 },
  eventSubtitle: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 20, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.divider },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: Typography.sm, color: Colors.textMuted },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoCard: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  infoCardGrad: { ...StyleSheet.absoluteFillObject },
  infoCardLabel: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 2 },
  infoCardValue: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text },
  infoCardSub: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', backgroundColor: 'rgba(0,0,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md },
  mapBtnText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4, marginBottom: 20, gap: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.md, overflow: 'hidden' },
  tabActive: {},
  tabText: { fontSize: Typography.sm, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  tabContent: {},
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  description: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 22 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  moreBtnText: { fontSize: Typography.sm, color: Colors.primaryLight, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  tagText: { fontSize: Typography.xs, color: Colors.textSecondary },
  capacityWrap: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border },
  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  capacityLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  capacityPct: { fontSize: Typography.sm, fontWeight: '700', color: Colors.accent },
  capacityBar: { height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  capacityFill: { height: '100%', borderRadius: 4 },
  urgency: { fontSize: Typography.xs, color: Colors.warning, marginTop: 4 },
  ticketOption: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 12, borderWidth: 2, borderColor: Colors.border, overflow: 'hidden' },
  ticketOptionActive: { borderColor: Colors.primary },
  ticketOptionSoldOut: { opacity: 0.6 },
  ticketColorBar: { width: 6, backgroundColor: Colors.primary },
  ticketInfo: { flex: 1, padding: 14, gap: 8 },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketType: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  ticketPrice: { fontSize: Typography.md, fontWeight: '700' },
  soldOutBadge: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  soldOutText: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  benefitsList: { gap: 4 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitText: { fontSize: Typography.xs, color: Colors.textSecondary },
  remaining: { fontSize: Typography.xs, color: Colors.success, marginTop: 2 },
  ticketCheck: { padding: 14, justifyContent: 'center' },
  commentInput: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 20, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 10, borderWidth: 1, borderColor: Colors.border },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentField: { flex: 1, color: Colors.text, fontSize: Typography.sm, maxHeight: 100 },
  sendBtn: {},
  sendGrad: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentBody: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 12, borderWidth: 1, borderColor: Colors.border },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentUser: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text },
  commentTime: { fontSize: Typography.xs, color: Colors.textMuted },
  commentText: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
  commentActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: Typography.xs, color: Colors.textMuted },
  // ── Programme tab styles ──────────────────────────────────────
  progLoading: { alignItems: 'center', paddingVertical: 48, gap: 14 },
  progLoadingText: { fontSize: Typography.sm, color: Colors.textMuted },
  progEmpty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  progEmptyText: { fontSize: Typography.sm, color: Colors.textMuted },
  sessionCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 14, gap: 6 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sessionTypeBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full },
  sessionTypeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  sessionRoom: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sessionRoomText: { fontSize: 11, color: Colors.textMuted },
  sessionTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  sessionTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sessionTimeText: { fontSize: Typography.sm, color: Colors.textSecondary },
  sessionDesc: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 18 },
  speakersWrap: { marginTop: 8, gap: 8 },
  speakersLabel: { fontSize: Typography.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  speakerChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 10, borderWidth: 1, borderColor: Colors.border },
  speakerPhoto: { width: 40, height: 40, borderRadius: 20 },
  speakerPhotoGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  speakerInitial: { fontSize: Typography.base, fontWeight: '800', color: '#fff' },
  speakerInfo: { flex: 1, gap: 2 },
  speakerName: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text },
  speakerTitle: { fontSize: Typography.xs, color: Colors.textSecondary },
  chatBtnWrap: { borderRadius: Radius.md, overflow: 'hidden' },
  chatBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  chatBtnText: { fontSize: Typography.xs, fontWeight: '700', color: '#fff' },
  // ─────────────────────────────────────────────────────────────
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomGrad: { height: 40, position: 'absolute', top: -40, left: 0, right: 0 },
  bottomContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, gap: 12, backgroundColor: Colors.background },
  selectedInfo: { flex: 1 },
  selectedLabel: { fontSize: Typography.xs, color: Colors.textMuted },
  selectedPrice: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  ctaWrap: { flex: 2 },
  ctaBtn: { height: 52, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaBtnText: { fontSize: Typography.base, fontWeight: '700', color: Colors.textDark },
});
