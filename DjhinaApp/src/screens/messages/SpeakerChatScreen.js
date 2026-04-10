/**
 * SpeakerChatScreen
 * Permet à un utilisateur connecté d'envoyer des messages à un speaker
 * et de lire les réponses de l'organisateur.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Radius } from '../../theme';
import { speakerMessagesApi } from '../../services/api';

export default function SpeakerChatScreen({ route, navigation }) {
  const { speaker, eventTitle } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  // ── Load conversation history ──────────────────────────────
  const loadMessages = useCallback(async () => {
    const res = await speakerMessagesApi.getMessages(speaker.id);
    if (res.ok && Array.isArray(res.data?.data)) {
      setMessages(res.data.data);
    }
    setLoading(false);
  }, [speaker.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Send a message ─────────────────────────────────────────
  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    const res = await speakerMessagesApi.sendMessage(speaker.id, content);
    if (res.ok) {
      await loadMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    } else {
      setText(content); // restore on network failure
    }
    setSending(false);
  };

  // ── Helpers ────────────────────────────────────────────────
  const initials = speaker.name
    ?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  // Each DB row → [ user-sent bubble, optional reply bubble ]
  const renderData = messages.flatMap((msg) => {
    const items = [{
      key: msg.id,
      type: 'sent',
      text: msg.content,
      ts: msg.created_at,
    }];
    if (msg.reply) {
      items.push({
        key: msg.id + '_reply',
        type: 'reply',
        text: msg.reply,
        ts: msg.replied_at,
      });
    }
    return items;
  });

  // ── Render a single bubble ─────────────────────────────────
  const renderItem = ({ item }) => {
    const isMe = item.type === 'sent';
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.msgAvatar}>
            {speaker.photo ? (
              <Image source={{ uri: speaker.photo }} style={styles.msgAvatarImg} />
            ) : (
              <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.msgAvatarGrad}>
                <Text style={styles.msgAvatarText}>{initials}</Text>
              </LinearGradient>
            )}
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {isMe ? (
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.bubbleMeGrad}>
              <Text style={styles.bubbleTextMe}>{item.text}</Text>
              <Text style={styles.bubbleTime}>{formatTime(item.ts)}</Text>
            </LinearGradient>
          ) : (
            <>
              <Text style={styles.bubbleTextThem}>{item.text}</Text>
              <Text style={[styles.bubbleTime, { color: Colors.textMuted }]}>{formatTime(item.ts)}</Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const firstName = speaker.name?.split(' ')[0] || 'Speaker';

  // ── UI ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Header ────────────────────────────────────────────── */}
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              {speaker.photo ? (
                <Image source={{ uri: speaker.photo }} style={styles.headerAvatar} />
              ) : (
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                  style={styles.headerAvatarGrad}
                >
                  <Text style={styles.headerAvatarText}>{initials}</Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.headerName} numberOfLines={1}>{speaker.name}</Text>
                {(speaker.job_title || speaker.company) ? (
                  <Text style={styles.headerSub} numberOfLines={1}>
                    {speaker.job_title}
                    {speaker.job_title && speaker.company ? ' · ' : ''}
                    {speaker.company}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {eventTitle ? (
            <View style={styles.eventBar}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.eventBarText} numberOfLines={1}>{eventTitle}</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </LinearGradient>

      {/* ── Body ──────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : renderData.length === 0 ? (
          <View style={styles.emptyChat}>
            {speaker.photo ? (
              <Image source={{ uri: speaker.photo }} style={styles.emptyChatAvatar} />
            ) : (
              <LinearGradient
                colors={[Colors.primaryPale, Colors.background]}
                style={styles.emptyChatAvatarGrad}
              >
                <Text style={styles.emptyChatInitials}>{initials}</Text>
              </LinearGradient>
            )}
            <Text style={styles.emptyChatName}>{speaker.name}</Text>
            {(speaker.job_title || speaker.company) ? (
              <Text style={styles.emptyChatMeta}>
                {speaker.job_title}
                {speaker.job_title && speaker.company ? ' · ' : ''}
                {speaker.company}
              </Text>
            ) : null}
            <Text style={styles.emptyChatHint}>
              {'Posez votre question à ' + firstName + ' !\nL\'organisateur vous répondra dès que possible.'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={renderData}
            keyExtractor={item => item.key}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* ── Input bar ─────────────────────────────────────── */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder={'Message à ' + firstName + '…'}
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <LinearGradient
              colors={
                text.trim() && !sending
                  ? [Colors.primary, Colors.primaryLight]
                  : [Colors.surfaceAlt, Colors.surfaceAlt]
              }
              style={styles.sendBtnGrad}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={text.trim() ? '#fff' : Colors.textMuted}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingBottom: 4 },
  headerContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  headerAvatarGrad: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: '#fff', fontWeight: '800', fontSize: Typography.base },
  headerName: { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  eventBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingBottom: 10,
  },
  eventBarText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', flex: 1 },

  // Empty / loading states
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyChat: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, gap: 10,
  },
  emptyChatAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  emptyChatAvatarGrad: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyChatInitials: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  emptyChatName: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text },
  emptyChatMeta: { fontSize: Typography.sm, color: Colors.textSecondary },
  emptyChatHint: {
    fontSize: Typography.sm, color: Colors.textMuted,
    textAlign: 'center', marginTop: 8, lineHeight: 20,
  },

  // Messages list
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  messageRowMe: { justifyContent: 'flex-end' },
  msgAvatar: { marginBottom: 2 },
  msgAvatarImg: { width: 30, height: 30, borderRadius: 15 },
  msgAvatarGrad: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  msgAvatarText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  bubble: { maxWidth: '75%', borderRadius: Radius.lg, overflow: 'hidden' },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderBottomLeftRadius: 4, padding: 12,
  },
  bubbleMeGrad: { padding: 12 },
  bubbleTextMe: { fontSize: Typography.sm, color: '#fff', lineHeight: 20 },
  bubbleTextThem: { fontSize: Typography.sm, color: Colors.text, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 4, textAlign: 'right' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    maxHeight: 120,
  },
  input: { color: Colors.text, fontSize: Typography.sm, lineHeight: 20 },
  sendBtn: { borderRadius: 22, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGrad: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
