import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Vibration, ScrollView, Platform,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Typography, Radius } from '../../theme';

const buzz = (pattern) => {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(pattern);
  }
};

const { width, height } = Dimensions.get('window');
const SCAN_BOX = width * 0.7;

function ScanResult({ result, onClose, onRescan }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  const isValid = result.status === 'valid';

  return (
    <Animated.View style={[styles.resultOverlay, { opacity: opacityAnim }]}>
      <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={isValid ? [Colors.success + '20', Colors.success + '08'] : [Colors.error + '20', Colors.error + '08']}
          style={StyleSheet.absoluteFill}
          borderRadius={Radius.xl}
        />

        {/* Icon */}
        <View style={[styles.resultIcon, { backgroundColor: isValid ? Colors.successBg : Colors.errorBg }]}>
          <Ionicons
            name={isValid ? 'checkmark-circle' : 'close-circle'}
            size={56}
            color={isValid ? Colors.success : Colors.error}
          />
        </View>

        {/* Status */}
        <Text style={[styles.resultStatus, { color: isValid ? Colors.success : Colors.error }]}>
          {isValid ? 'ACCÈS AUTORISÉ' : result.status === 'used' ? 'BILLET DÉJÀ UTILISÉ' : 'BILLET INVALIDE'}
        </Text>

        {result.ticketData && (
          <View style={styles.resultDetails}>
            <View style={styles.resultRow}>
              <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.resultLabel}>Titulaire:</Text>
              <Text style={styles.resultValue}>{result.ticketData.holder}</Text>
            </View>
            <View style={styles.resultRow}>
              <Ionicons name="ticket-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.resultLabel}>Type:</Text>
              <Text style={styles.resultValue}>{result.ticketData.type}</Text>
            </View>
            {result.ticketData.eventTitle && (
              <View style={styles.resultRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.resultLabel}>Événement:</Text>
                <Text style={styles.resultValue} numberOfLines={1}>{result.ticketData.eventTitle}</Text>
              </View>
            )}
            <View style={styles.resultRow}>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.resultLabel}>Scanné à:</Text>
              <Text style={styles.resultValue}>{new Date().toLocaleTimeString('fr-FR')}</Text>
            </View>
          </View>
        )}

        {!isValid && (
          <Text style={styles.resultNote}>
            {result.status === 'used'
              ? 'Ce billet a déjà été validé. Contactez l\'organisation si besoin.'
              : 'Ce QR code ne correspond à aucun billet valide pour cet événement.'}
          </Text>
        )}

        {/* Actions */}
        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.rescanBtn} onPress={onRescan}>
            <Ionicons name="scan" size={18} color={Colors.primary} />
            <Text style={styles.rescanText}>Scanner encore</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.closeResultBtn, { backgroundColor: isValid ? Colors.success : Colors.error }]}
            onPress={onClose}
          >
            <Text style={styles.closeResultText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function ScannerScreen() {
  const { state, scanTicket } = useApp();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [mode, setMode] = useState('scanner'); // scanner | history

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cornerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (scanning) {
      // Scan line animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: SCAN_BOX - 4, duration: 2000, useNativeDriver: false }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
        ])
      ).start();

      // Corner pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(cornerAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(cornerAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
        ])
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [scanning]);

  const handleBarCodeScanned = ({ data }) => {
    if (!scanning) return;
    setScanning(false);

    let ticketData = null;
    let status = 'invalid';

    try {
      ticketData = JSON.parse(data);

      // Check in user's tickets
      const matchingTicket = state.myTickets.find(t => {
        try {
          const qr = JSON.parse(t.qrData);
          return qr.ticketId === ticketData.ticketId;
        } catch { return false; }
      });

      if (matchingTicket) {
        if (matchingTicket.status === 'active') {
          status = 'valid';
          buzz([0, 100, 50, 100]);
        } else if (matchingTicket.status === 'used') {
          status = 'used';
          buzz(500);
        } else {
          status = 'expired';
          buzz(500);
        }

        if (matchingTicket) {
          ticketData.eventTitle = matchingTicket.eventTitle;
        }
      } else {
        // Could be external ticket — validate format
        if (ticketData.ticketId && ticketData.eventId && ticketData.holder) {
          status = 'valid'; // Demo: accept any valid-format QR
          buzz([0, 100, 50, 100]);
        } else {
          buzz(500);
        }
      }
    } catch {
      buzz(500);
    }

    const result = { status, ticketData, rawData: data };
    setScanResult(result);
    scanTicket(data, status);
    setScanCount(c => c + 1);
  };

  const handleRescan = () => {
    setScanResult(null);
    setTimeout(() => setScanning(true), 300);
  };

  const cornerOpacity = cornerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.permText}>Vérification de la caméra...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient colors={[Colors.error + '20', Colors.error + '08']} style={styles.permIconWrap}>
          <Ionicons name="camera-off-outline" size={52} color={Colors.error} />
        </LinearGradient>
        <Text style={styles.permTitle}>Accès caméra refusé</Text>
        <Text style={styles.permDesc}>
          Autorisez l'accès à la caméra dans les réglages pour scanner les QR codes.
        </Text>
        <TouchableOpacity style={styles.permBtn}>
          <Text style={styles.permBtnText}>Ouvrir les réglages</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mode === 'scanner' ? (
        <>
          {/* Camera */}
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />

          {/* Dark overlay with scan box */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />

              {/* Scan box */}
              <View style={styles.scanBox}>
                {/* Corners */}
                <Animated.View style={[styles.corner, styles.tl, { opacity: cornerOpacity }]} />
                <Animated.View style={[styles.corner, styles.tr, { opacity: cornerOpacity }]} />
                <Animated.View style={[styles.corner, styles.bl, { opacity: cornerOpacity }]} />
                <Animated.View style={[styles.corner, styles.br, { opacity: cornerOpacity }]} />

                {/* Scan line */}
                {scanning && (
                  <Animated.View
                    style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]}
                  >
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
          <SafeAreaView edges={['top']} style={styles.scanHeader}>
            <View style={styles.scanHeaderContent}>
              <Text style={styles.scanTitle}>Scanner QR Code</Text>
              <View style={styles.scanHeaderRight}>
                <TouchableOpacity
                  onPress={() => setTorchOn(!torchOn)}
                  style={[styles.scanBtn, torchOn && styles.scanBtnActive]}
                >
                  <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={20} color={torchOn ? Colors.accent : '#fff'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMode('history')}
                  style={styles.scanBtn}
                >
                  <Ionicons name="list-outline" size={20} color="#fff" />
                  {state.scanHistory.length > 0 && (
                    <View style={styles.historyBadge}>
                      <Text style={styles.historyBadgeText}>{state.scanHistory.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          {/* Bottom info */}
          <View style={styles.scanFooter}>
            <LinearGradient colors={['transparent', 'rgba(0,7,26,0.95)']} style={StyleSheet.absoluteFill} />
            <View style={styles.scanInfo}>
              <View style={[styles.scanStatusDot, { backgroundColor: scanning ? Colors.success : Colors.warning }]} />
              <Text style={styles.scanInfoText}>
                {scanning ? 'Pointez le QR code du billet' : 'Traitement en cours...'}
              </Text>
            </View>
            <View style={styles.scanCountRow}>
              <Ionicons name="scan" size={14} color={Colors.textMuted} />
              <Text style={styles.scanCountText}>{scanCount} scan(s) effectué(s)</Text>
            </View>
          </View>

          {/* Result overlay */}
          {scanResult && (
            <ScanResult
              result={scanResult}
              onClose={() => { setScanResult(null); setScanning(true); }}
              onRescan={handleRescan}
            />
          )}
        </>
      ) : (
        // History view
        <View style={styles.historyContainer}>
          <SafeAreaView edges={['top']}>
            <View style={styles.historyHeader}>
              <TouchableOpacity onPress={() => setMode('scanner')} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.historyTitle}>Historique des scans</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>

          <ScrollView contentContainerStyle={styles.historyList} showsVerticalScrollIndicator={false}>
            {state.scanHistory.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="scan-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.historyEmptyText}>Aucun scan effectué</Text>
              </View>
            ) : (
              state.scanHistory.map((item, i) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={[styles.historyIconWrap, {
                    backgroundColor: item.scanResult === 'valid' ? Colors.successBg : Colors.errorBg
                  }]}>
                    <Ionicons
                      name={item.scanResult === 'valid' ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={item.scanResult === 'valid' ? Colors.success : Colors.error}
                    />
                  </View>
                  <View style={styles.historyItemInfo}>
                    <Text style={styles.historyItemStatus}>
                      {item.scanResult === 'valid' ? 'Accès autorisé' : item.scanResult === 'used' ? 'Billet déjà utilisé' : 'Billet invalide'}
                    </Text>
                    <Text style={styles.historyItemTime}>
                      {new Date(item.scannedAt).toLocaleDateString('fr-FR')} à {new Date(item.scannedAt).toLocaleTimeString('fr-FR')}
                    </Text>
                  </View>
                  <Ionicons
                    name={item.scanResult === 'valid' ? 'checkmark' : 'close'}
                    size={20}
                    color={item.scanResult === 'valid' ? Colors.success : Colors.error}
                  />
                </View>
              ))
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const OVERLAY_SIDE = (width - SCAN_BOX) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: 16, padding: 32 },
  permIconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  permTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  permDesc: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  permText: { fontSize: Typography.base, color: Colors.textSecondary },
  permBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg },
  permBtnText: { color: '#fff', fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,7,26,0.75)' },
  overlayMiddle: { height: SCAN_BOX, flexDirection: 'row' },
  overlaySide: { width: OVERLAY_SIDE, backgroundColor: 'rgba(0,7,26,0.75)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,7,26,0.75)' },
  scanBox: { width: SCAN_BOX, height: SCAN_BOX, overflow: 'hidden' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.accent, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2 },
  scanLineGrad: { height: '100%', width: '100%' },
  scanHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
  scanHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  scanTitle: { fontSize: Typography.md, fontWeight: '700', color: '#fff' },
  scanHeaderRight: { flexDirection: 'row', gap: 10 },
  scanBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,7,26,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  scanBtnActive: { borderColor: Colors.accent, backgroundColor: 'rgba(245,158,11,0.2)' },
  historyBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.primary, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  historyBadgeText: { fontSize: 8, color: '#fff', fontWeight: '700' },
  scanFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, alignItems: 'center', gap: 8 },
  scanInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanStatusDot: { width: 8, height: 8, borderRadius: 4 },
  scanInfoText: { fontSize: Typography.sm, color: '#fff', fontWeight: '600' },
  scanCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scanCountText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.5)' },
  // Result
  resultOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  resultCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 28, alignItems: 'center', gap: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  resultIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  resultStatus: { fontSize: Typography.lg, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  resultDetails: { width: '100%', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 14, gap: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultLabel: { fontSize: Typography.xs, color: Colors.textMuted, width: 70 },
  resultValue: { flex: 1, fontSize: Typography.sm, color: Colors.text, fontWeight: '600' },
  resultNote: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  resultActions: { flexDirection: 'row', gap: 12, width: '100%' },
  rescanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primary, backgroundColor: 'rgba(0,0,255,0.1)' },
  rescanText: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sm },
  closeResultBtn: { flex: 1, height: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  closeResultText: { color: '#fff', fontWeight: '700', fontSize: Typography.sm },
  // History
  historyContainer: { flex: 1, backgroundColor: Colors.background },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  historyTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  historyList: { paddingHorizontal: 24, paddingTop: 8 },
  historyEmpty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  historyEmptyText: { fontSize: Typography.base, color: Colors.textSecondary },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  historyIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  historyItemInfo: { flex: 1 },
  historyItemStatus: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  historyItemTime: { fontSize: Typography.xs, color: Colors.textMuted },
});
