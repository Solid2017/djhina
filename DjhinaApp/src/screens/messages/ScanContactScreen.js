import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Vibration, Platform, Image,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius } from '../../theme';

const buzz = (p) => { if (Platform.OS !== 'web') Vibration.vibrate(p); };
const { width } = Dimensions.get('window');
const SCAN_BOX = width * 0.7;
const OVERLAY_SIDE = (width - SCAN_BOX) / 2;

function ContactFoundCard({ contact, onAdd, onDismiss }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  const initials = contact.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <Animated.View style={[styles.resultOverlay, { opacity }]}>
      <Animated.View style={[styles.resultCard, { transform: [{ scale }] }]}>
        <LinearGradient colors={[Colors.primary + '15', Colors.primary + '05']} style={StyleSheet.absoluteFill} borderRadius={Radius.xl} />

        {/* Avatar */}
        <View style={styles.contactAvatar}>
          {contact.avatar ? (
            <Image source={{ uri: contact.avatar }} style={styles.contactAvatarImg} />
          ) : (
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.contactAvatarGrad}>
              <Text style={styles.contactAvatarText}>{initials}</Text>
            </LinearGradient>
          )}
          <View style={styles.contactAvatarCheck}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        </View>

        <Text style={styles.foundTitle}>Contact trouvé !</Text>
        <Text style={styles.foundName}>{contact.name}</Text>

        {/* Infos */}
        <View style={styles.foundInfo}>
          {contact.phone && (
            <View style={styles.foundRow}>
              <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.foundText}>{contact.phone}</Text>
            </View>
          )}
          {contact.email && (
            <View style={styles.foundRow}>
              <Ionicons name="mail-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.foundText}>{contact.email}</Text>
            </View>
          )}
          {contact.country && (
            <View style={styles.foundRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.foundText}>{contact.country}</Text>
            </View>
          )}
          {contact.eventContext && (
            <View style={[styles.foundRow, styles.foundEventRow]}>
              <Ionicons name="calendar" size={14} color={Colors.primary} />
              <Text style={[styles.foundText, { color: Colors.primary, fontWeight: '600' }]}>
                {contact.eventContext}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.foundActions}>
          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Ignorer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.addBtnGrad}>
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function ScanContactScreen({ navigation }) {
  const { state, addContact } = useApp();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [foundContact, setFoundContact] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [alreadyAdded, setAlreadyAdded] = useState(false);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cornerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => setHasPermission(status === 'granted'));
  }, []);

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: SCAN_BOX - 4, duration: 2000, useNativeDriver: false }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(cornerAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(cornerAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [scanning]);

  const handleScan = ({ data }) => {
    if (!scanning) return;
    setScanning(false);

    try {
      const parsed = JSON.parse(data);

      // QR de type profil utilisateur Djhina
      if (parsed.type === 'djhina_user' && parsed.userId) {
        buzz([0, 80, 40, 80]);

        // Vérifier si c'est soi-même
        if (parsed.userId === state.user?.id) {
          setFoundContact({ ...parsed, isSelf: true });
          return;
        }

        // Vérifier si déjà ajouté
        const existing = (state.contacts || []).find(c => c.userId === parsed.userId);
        if (existing) {
          setAlreadyAdded(true);
          setFoundContact({ ...parsed, name: parsed.name, eventContext: parsed.eventTitle });
          return;
        }

        setFoundContact({
          userId:       parsed.userId,
          name:         parsed.name,
          phone:        parsed.phone,
          email:        parsed.email,
          avatar:       parsed.avatar,
          country:      parsed.country,
          eventContext: parsed.eventTitle || null,
          scannedAt:    new Date().toISOString(),
        });
      } else {
        // QR inconnu ou billet
        buzz(400);
        setFoundContact({ unknown: true });
      }
    } catch {
      buzz(400);
      setFoundContact({ unknown: true });
    }
  };

  const handleAdd = () => {
    if (foundContact && !foundContact.isSelf && !foundContact.unknown) {
      addContact(foundContact);
      navigation.replace('Conversation', { contact: foundContact });
    }
  };

  const handleDismiss = () => {
    setFoundContact(null);
    setAlreadyAdded(false);
    setTimeout(() => setScanning(true), 300);
  };

  const cornerOpacity = cornerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  if (hasPermission === null) return (
    <View style={[styles.container, styles.centered]}>
      <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
      <Text style={{ color: Colors.textSecondary }}>Vérification caméra...</Text>
    </View>
  );

  if (hasPermission === false) return (
    <View style={[styles.container, styles.centered]}>
      <Ionicons name="camera-off-outline" size={52} color={Colors.error} />
      <Text style={styles.permTitle}>Accès caméra refusé</Text>
      <Text style={styles.permDesc}>Autorisez l'accès dans les réglages.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanning ? handleScan : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanBox}>
            <Animated.View style={[styles.corner, styles.tl, { opacity: cornerOpacity }]} />
            <Animated.View style={[styles.corner, styles.tr, { opacity: cornerOpacity }]} />
            <Animated.View style={[styles.corner, styles.bl, { opacity: cornerOpacity }]} />
            <Animated.View style={[styles.corner, styles.br, { opacity: cornerOpacity }]} />
            {scanning && (
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]}>
                <LinearGradient
                  colors={['transparent', Colors.accent, Colors.primary, Colors.accent, 'transparent']}
                  style={styles.scanLineGrad}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              </Animated.View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scanner un contact</Text>
          <TouchableOpacity
            onPress={() => setTorchOn(!torchOn)}
            style={[styles.headerBtn, torchOn && styles.headerBtnActive]}
          >
            <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={20} color={torchOn ? Colors.accent : '#fff'} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Footer */}
      <View style={styles.footer}>
        <LinearGradient colors={['transparent', 'rgba(0,7,26,0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.footerContent}>
          <Ionicons name="people-outline" size={22} color={Colors.accent} />
          <Text style={styles.footerTitle}>Scanner le QR d'un participant</Text>
          <Text style={styles.footerSub}>
            Demandez à votre contact d'afficher son QR depuis{'\n'}l'onglet Messages → Mon QR Code
          </Text>
        </View>
      </View>

      {/* Résultat */}
      {foundContact && !foundContact.unknown && !foundContact.isSelf && (
        <ContactFoundCard
          contact={foundContact}
          onAdd={handleAdd}
          onDismiss={handleDismiss}
        />
      )}

      {/* Soi-même */}
      {foundContact?.isSelf && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <Ionicons name="person-circle-outline" size={56} color={Colors.warning} />
            <Text style={styles.foundTitle}>C'est votre propre QR !</Text>
            <Text style={styles.foundName}>Faites scanner votre QR par un autre participant.</Text>
            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
              <Text style={styles.dismissText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Déjà ajouté */}
      {alreadyAdded && foundContact && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <LinearGradient colors={[Colors.success + '20', Colors.success + '08']} style={StyleSheet.absoluteFill} borderRadius={Radius.xl} />
            <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
            <Text style={styles.foundTitle}>Déjà dans vos contacts</Text>
            <Text style={styles.foundName}>{foundContact.name}</Text>
            <View style={styles.foundActions}>
              <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
                <Text style={styles.dismissText}>Scanner encore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.replace('Conversation', { contact: foundContact })}
              >
                <LinearGradient colors={[Colors.success, '#34D399']} style={styles.addBtnGrad}>
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                  <Text style={styles.addBtnText}>Ouvrir</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* QR inconnu */}
      {foundContact?.unknown && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <Ionicons name="help-circle-outline" size={56} color={Colors.warning} />
            <Text style={styles.foundTitle}>QR non reconnu</Text>
            <Text style={[styles.foundName, { color: Colors.textSecondary, fontWeight: '400' }]}>
              Ce QR code n'est pas un profil Djhina.{'\n'}(Peut-être un billet ?)
            </Text>
            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
              <Text style={styles.dismissText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, backgroundColor: Colors.background },
  permTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  permDesc: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,7,26,0.75)' },
  overlayMiddle: { height: SCAN_BOX, flexDirection: 'row' },
  overlaySide: { width: OVERLAY_SIDE, backgroundColor: 'rgba(0,7,26,0.75)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,7,26,0.75)' },
  scanBox: { width: SCAN_BOX, height: SCAN_BOX, overflow: 'hidden' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Colors.accent, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2 },
  scanLineGrad: { height: '100%', width: '100%' },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,7,26,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerBtnActive: { borderColor: Colors.accent, backgroundColor: 'rgba(245,158,11,0.2)' },
  headerTitle: { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 50, paddingTop: 24 },
  footerContent: { alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  footerTitle: { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
  footerSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
  resultOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  resultCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 28, alignItems: 'center', gap: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  contactAvatar: { position: 'relative' },
  contactAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  contactAvatarGrad: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  contactAvatarCheck: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.success, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surface },
  foundTitle: { fontSize: Typography.sm, fontWeight: '600', color: Colors.primary },
  foundName: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  foundInfo: { width: '100%', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 14, gap: 10 },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foundEventRow: { backgroundColor: Colors.primaryPale, padding: 8, borderRadius: Radius.md },
  foundText: { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1 },
  foundActions: { flexDirection: 'row', gap: 12, width: '100%' },
  dismissBtn: { flex: 1, height: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  dismissText: { color: Colors.textSecondary, fontWeight: '600', fontSize: Typography.sm },
  addBtn: { flex: 1.5, borderRadius: Radius.lg, overflow: 'hidden' },
  addBtnGrad: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.sm },
});
