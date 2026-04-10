import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius } from '../../theme';

export default function ConversationScreen({ route, navigation }) {
  const { contact } = route.params;
  const { state, sendMessage } = useApp();
  const [text, setText] = useState('');
  const flatListRef = useRef(null);
  const inputAnim = useRef(new Animated.Value(0)).current;

  const messages = state.conversations[contact.userId] || [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(contact.userId, text.trim());
    setText('');
  };

  const initials = contact.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Grouper les messages par date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = new Date(msg.ts).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  const renderData = Object.entries(groupedMessages).flatMap(([dateKey, msgs]) => [
    { type: 'date', key: 'date_' + dateKey, dateKey },
    ...msgs.map(m => ({ type: 'msg', ...m })),
  ]);

  const renderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>{formatDate(item.dateKey)}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const isMe = item.from === 'me';
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.msgAvatar}>
            {contact.avatar ? (
              <Image source={{ uri: contact.avatar }} style={styles.msgAvatarImg} />
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              {contact.avatar ? (
                <Image source={{ uri: contact.avatar }} style={styles.headerAvatar} />
              ) : (
                <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']} style={styles.headerAvatarGrad}>
                  <Text style={styles.headerAvatarText}>{initials}</Text>
                </LinearGradient>
              )}
              <View>
                <Text style={styles.headerName}>{contact.name}</Text>
                <View style={styles.headerStatus}>
                  <View style={styles.statusDot} />
                  <Text style={styles.headerStatusText}>En ligne</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.headerAction}>
              <Ionicons name="person-circle-outline" size={26} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          {/* Contexte événement */}
          {contact.eventContext && (
            <View style={styles.eventContextBar}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.eventContextText} numberOfLines={1}>
                Rencontrés à : {contact.eventContext}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIcon}>
              {contact.avatar ? (
                <Image source={{ uri: contact.avatar }} style={styles.emptyChatAvatar} />
              ) : (
                <LinearGradient colors={[Colors.primaryPale, Colors.background]} style={styles.emptyChatAvatarGrad}>
                  <Text style={styles.emptyChatInitials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={styles.emptyChatName}>{contact.name}</Text>
            {contact.phone && (
              <Text style={styles.emptyChatMeta}>📱 {contact.phone}</Text>
            )}
            {contact.eventContext && (
              <Text style={styles.emptyChatMeta}>🎫 {contact.eventContext}</Text>
            )}
            <Text style={styles.emptyChatHint}>Envoyez un message pour démarrer la conversation !</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={renderData}
            keyExtractor={(item, i) => item.key || item.id || String(i)}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <LinearGradient
              colors={text.trim() ? [Colors.primary, Colors.primaryLight] : [Colors.surfaceAlt, Colors.surfaceAlt]}
              style={styles.sendBtnGrad}
            >
              <Ionicons name="send" size={18} color={text.trim() ? '#fff' : Colors.textMuted} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 4 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  headerAvatarGrad: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: '800', fontSize: Typography.base },
  headerName: { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  headerStatusText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)' },
  headerAction: { padding: 4 },
  eventContextBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingBottom: 10 },
  eventContextText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', flex: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyChatIcon: { marginBottom: 8 },
  emptyChatAvatar: { width: 80, height: 80, borderRadius: 40 },
  emptyChatAvatarGrad: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyChatInitials: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  emptyChatName: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text },
  emptyChatMeta: { fontSize: Typography.sm, color: Colors.textSecondary },
  emptyChatHint: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  dateText: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: '500' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  messageRowMe: { justifyContent: 'flex-end' },
  msgAvatar: { marginBottom: 2 },
  msgAvatarImg: { width: 30, height: 30, borderRadius: 15 },
  msgAvatarGrad: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  bubble: { maxWidth: '75%', borderRadius: Radius.lg, overflow: 'hidden' },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4, padding: 12 },
  bubbleMeGrad: { padding: 12 },
  bubbleTextMe: { fontSize: Typography.sm, color: '#fff', lineHeight: 20 },
  bubbleTextThem: { fontSize: Typography.sm, color: Colors.text, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  inputWrap: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 120 },
  input: { color: Colors.text, fontSize: Typography.sm, lineHeight: 20 },
  sendBtn: { borderRadius: 22, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGrad: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
