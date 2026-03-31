import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { useApp } from '../context/AppContext';
import { Colors, Typography, Radius, Spacing } from '../theme';
import { MOBILE_MONEY_PROVIDERS, formatPrice } from '../data/mockData';

const { height } = Dimensions.get('window');

const STEPS = { select: 0, payment: 1, confirm: 2, success: 3 };

export default function PaymentModal({ visible, onClose, event, ticketType, navigation }) {
  const { state, purchaseTicket } = useApp();

  const [step, setStep] = useState(STEPS.select);
  const [quantity, setQuantity] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [phone, setPhone] = useState(state.user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === STEPS.success) {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: false }),
        Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      ]).start();
    }
  }, [step]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const totalPrice = ticketType.price * quantity;
  const fees = Math.round(totalPrice * 0.02);
  const totalWithFees = totalPrice + fees;

  const handleSendOTP = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setOtpSent(true);
    setTimer(60);
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!otp || otp.length < 4) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    purchaseTicket(
      event,
      ticketType,
      quantity,
      selectedProvider?.name || 'Mobile Money',
      phone,
      state.user?.name || 'Participant'
    );
    setLoading(false);
    setStep(STEPS.success);
  };

  const handleClose = () => {
    if (step === STEPS.success) {
      onClose();
      navigation.navigate('MyTickets');
    } else {
      onClose();
    }
    // Reset state
    setTimeout(() => {
      setStep(STEPS.select);
      setQuantity(1);
      setSelectedProvider(null);
      setOtp('');
      setOtpSent(false);
    }, 400);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['Billet', 'Paiement', 'Confirmation'].map((label, i) => (
        <React.Fragment key={i}>
          <View style={styles.stepItem}>
            <View style={[styles.stepBall, i < step && styles.stepBallDone, i === step && styles.stepBallActive]}>
              {i < step ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={[styles.stepNum, i === step && { color: '#fff' }]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{label}</Text>
          </View>
          {i < 2 && <View style={[styles.stepConnector, i < step && styles.stepConnectorDone]} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={step !== STEPS.success ? onClose : undefined}
      onBackButtonPress={step !== STEPS.success ? onClose : undefined}
      style={styles.modal}
      propagateSwipe
      backdropOpacity={0.75}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      avoidKeyboard
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          {/* Handle */}
          <View style={styles.handle} />

          {step === STEPS.success ? (
            // SUCCESS SCREEN
            <Animated.View style={[styles.successContainer, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
              <View style={styles.successIconWrap}>
                <LinearGradient colors={[Colors.success, '#34D399']} style={styles.successIcon}>
                  <Ionicons name="checkmark" size={48} color="#fff" />
                </LinearGradient>
                {/* Rings */}
                <View style={styles.ring1} />
                <View style={styles.ring2} />
              </View>
              <Text style={styles.successTitle}>Paiement réussi !</Text>
              <Text style={styles.successSubtitle}>
                Votre billet pour <Text style={{ color: Colors.accent, fontWeight: '700' }}>{event.title}</Text> a été émis avec succès.
              </Text>

              <View style={styles.successDetails}>
                <LinearGradient colors={[Colors.primary + '15', Colors.accent + '08']} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
                <View style={styles.successRow}>
                  <Text style={styles.successRowLabel}>Événement</Text>
                  <Text style={styles.successRowValue} numberOfLines={1}>{event.title}</Text>
                </View>
                <View style={styles.successRow}>
                  <Text style={styles.successRowLabel}>Type de billet</Text>
                  <Text style={styles.successRowValue}>{ticketType.type}</Text>
                </View>
                <View style={styles.successRow}>
                  <Text style={styles.successRowLabel}>Quantité</Text>
                  <Text style={styles.successRowValue}>{quantity} billet(s)</Text>
                </View>
                <View style={styles.successRow}>
                  <Text style={styles.successRowLabel}>Montant total</Text>
                  <Text style={[styles.successRowValue, { color: Colors.accent, fontWeight: '700' }]}>
                    {formatPrice(totalWithFees)}
                  </Text>
                </View>
                <View style={styles.successRow}>
                  <Text style={styles.successRowLabel}>Méthode</Text>
                  <Text style={styles.successRowValue}>{selectedProvider?.name}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={handleClose} activeOpacity={0.85} style={{ width: '100%' }}>
                <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.successBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="ticket-outline" size={20} color="#fff" />
                  <Text style={styles.successBtnText}>Voir mes billets</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Réservation</Text>
                  <Text style={styles.headerEvent} numberOfLines={1}>{event.title}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {renderStepIndicator()}

              {/* STEP 0: Select quantity */}
              {step === STEPS.select && (
                <View style={styles.stepContent}>
                  {/* Selected ticket */}
                  <View style={[styles.selectedTicket, { borderColor: ticketType.color + '60' }]}>
                    <LinearGradient colors={[ticketType.color + '20', ticketType.color + '08']} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
                    <View style={[styles.ticketColorDot, { backgroundColor: ticketType.color }]} />
                    <View style={styles.selectedTicketInfo}>
                      <Text style={styles.ticketTypeName}>{ticketType.type}</Text>
                      <Text style={[styles.ticketTypePrice, { color: ticketType.color }]}>
                        {formatPrice(ticketType.price, ticketType.currency)} / billet
                      </Text>
                    </View>
                    <View style={styles.ticketCheck}>
                      <Ionicons name="checkmark-circle" size={20} color={ticketType.color} />
                    </View>
                  </View>

                  {/* Quantity */}
                  <View style={styles.quantitySection}>
                    <Text style={styles.quantityLabel}>Nombre de billets</Text>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        onPress={() => setQuantity(q => Math.max(1, q - 1))}
                        style={[styles.qtyBtn, quantity === 1 && styles.qtyBtnDisabled]}
                      >
                        <Ionicons name="remove" size={18} color={quantity === 1 ? Colors.textMuted : Colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyNum}>{quantity}</Text>
                      <TouchableOpacity
                        onPress={() => setQuantity(q => Math.min(10, q + 1))}
                        style={[styles.qtyBtn, quantity === 10 && styles.qtyBtnDisabled]}
                      >
                        <Ionicons name="add" size={18} color={quantity === 10 ? Colors.textMuted : Colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Price summary */}
                  <View style={styles.priceSummary}>
                    <Text style={styles.summaryTitle}>Récapitulatif</Text>
                    {[
                      { label: `${ticketType.type} × ${quantity}`, value: formatPrice(totalPrice) },
                      { label: 'Frais de service (2%)', value: formatPrice(fees), small: true },
                    ].map((row, i) => (
                      <View key={i} style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, row.small && { fontSize: Typography.xs, color: Colors.textMuted }]}>{row.label}</Text>
                        <Text style={[styles.summaryValue, row.small && { fontSize: Typography.xs, color: Colors.textMuted }]}>{row.value}</Text>
                      </View>
                    ))}
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryTotal}>Total</Text>
                      <Text style={[styles.summaryTotalValue, { color: Colors.accent }]}>{formatPrice(totalWithFees)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => setStep(STEPS.payment)} activeOpacity={0.85}>
                    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={styles.nextBtnText}>Choisir le paiement</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 1: Payment method */}
              {step === STEPS.payment && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Mode de paiement</Text>
                  <Text style={styles.stepSubtitle}>Sélectionnez votre opérateur Mobile Money</Text>

                  <View style={styles.providersGrid}>
                    {MOBILE_MONEY_PROVIDERS.map(provider => (
                      <TouchableOpacity
                        key={provider.id}
                        onPress={() => setSelectedProvider(provider)}
                        style={[styles.providerCard, selectedProvider?.id === provider.id && [styles.providerCardActive, { borderColor: provider.color }]]}
                        activeOpacity={0.8}
                      >
                        {selectedProvider?.id === provider.id && (
                          <LinearGradient colors={[provider.color + '20', provider.color + '08']} style={StyleSheet.absoluteFill} borderRadius={Radius.lg} />
                        )}
                        <Text style={styles.providerIcon}>{provider.icon}</Text>
                        <Text style={[styles.providerName, selectedProvider?.id === provider.id && { color: provider.color }]}>
                          {provider.name}
                        </Text>
                        {selectedProvider?.id === provider.id && (
                          <View style={[styles.providerCheck, { backgroundColor: provider.color }]}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Numéro Mobile Money</Text>
                    <View style={[styles.inputWrap, selectedProvider && { borderColor: selectedProvider.color + '80' }]}>
                      <Ionicons name="call-outline" size={17} color={selectedProvider?.color || Colors.textMuted} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.input}
                        placeholder="+235 66 00 00 00"
                        placeholderTextColor={Colors.textMuted}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.navBtns}>
                    <TouchableOpacity onPress={() => setStep(STEPS.select)} style={styles.backBtn}>
                      <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
                      <Text style={styles.backBtnText}>Retour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setStep(STEPS.confirm)}
                      disabled={!selectedProvider || !phone.trim()}
                      style={{ flex: 2 }}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={selectedProvider && phone.trim() ? [Colors.primary, Colors.primaryDark] : [Colors.textMuted, Colors.textMuted]}
                        style={styles.nextBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.nextBtnText}>Confirmer</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 2: OTP confirmation */}
              {step === STEPS.confirm && (
                <View style={styles.stepContent}>
                  <View style={styles.confirmHeader}>
                    <View style={[styles.confirmIcon, { backgroundColor: selectedProvider?.color + '20' }]}>
                      <Text style={styles.confirmIconText}>{selectedProvider?.icon}</Text>
                    </View>
                    <Text style={styles.confirmTitle}>Confirmation</Text>
                    <Text style={styles.confirmSubtitle}>
                      Un code OTP sera envoyé au {phone}
                    </Text>
                  </View>

                  {/* Final summary */}
                  <View style={[styles.priceSummary, { marginBottom: 20 }]}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Billet × {quantity}</Text>
                      <Text style={styles.summaryValue}>{formatPrice(totalPrice)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { fontSize: Typography.xs, color: Colors.textMuted }]}>Frais</Text>
                      <Text style={[styles.summaryValue, { fontSize: Typography.xs, color: Colors.textMuted }]}>{formatPrice(fees)}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryTotal}>À débiter</Text>
                      <Text style={[styles.summaryTotalValue, { color: selectedProvider?.color || Colors.accent }]}>
                        {formatPrice(totalWithFees)}
                      </Text>
                    </View>
                  </View>

                  {/* OTP */}
                  {!otpSent ? (
                    <TouchableOpacity onPress={handleSendOTP} disabled={loading} activeOpacity={0.85}>
                      <LinearGradient
                        colors={[selectedProvider?.color || Colors.primary, (selectedProvider?.color || Colors.primary) + 'CC']}
                        style={styles.nextBtn}
                      >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                          <>
                            <Ionicons name="send-outline" size={18} color="#fff" />
                            <Text style={styles.nextBtnText}>Envoyer le code OTP</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={styles.otpSection}>
                        <Text style={styles.otpLabel}>Code OTP reçu</Text>
                        <Text style={styles.otpHint}>Entrez le code envoyé au {phone}</Text>
                        <TextInput
                          style={styles.otpInput}
                          placeholder="••••"
                          placeholderTextColor={Colors.textMuted}
                          value={otp}
                          onChangeText={setOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                          textAlign="center"
                        />
                        {timer > 0 ? (
                          <Text style={styles.timerText}>Renvoyer dans {timer}s</Text>
                        ) : (
                          <TouchableOpacity onPress={handleSendOTP}>
                            <Text style={styles.resendText}>Renvoyer le code</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.navBtns}>
                        <TouchableOpacity onPress={() => setStep(STEPS.payment)} style={styles.backBtn}>
                          <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
                          <Text style={styles.backBtnText}>Retour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handlePayment}
                          disabled={loading || otp.length < 4}
                          style={{ flex: 2 }}
                          activeOpacity={0.85}
                        >
                          <LinearGradient
                            colors={[selectedProvider?.color || Colors.accent, (selectedProvider?.color || Colors.accent) + 'CC']}
                            style={styles.nextBtn}
                          >
                            {loading ? <ActivityIndicator color="#fff" /> : (
                              <>
                                <Ionicons name="lock-closed" size={18} color="#fff" />
                                <Text style={styles.nextBtnText}>Payer {formatPrice(totalWithFees)}</Text>
                              </>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}

              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  container: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, maxHeight: height * 0.9, borderTopWidth: 1, borderColor: Colors.border },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text },
  headerEvent: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2, maxWidth: 240 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  stepItem: { alignItems: 'center', gap: 4 },
  stepBall: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border },
  stepBallActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepBallDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepNum: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  stepLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '500' },
  stepLabelActive: { color: Colors.primary },
  stepConnector: { flex: 1, height: 2, backgroundColor: Colors.border, marginBottom: 14 },
  stepConnectorDone: { backgroundColor: Colors.success },
  stepContent: { padding: 24 },
  stepTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  stepSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 20 },
  selectedTicket: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 14, borderWidth: 2, marginBottom: 20, overflow: 'hidden', gap: 12 },
  ticketColorDot: { width: 12, height: 12, borderRadius: 6 },
  selectedTicketInfo: { flex: 1 },
  ticketTypeName: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  ticketTypePrice: { fontSize: Typography.sm, fontWeight: '600', marginTop: 2 },
  ticketCheck: {},
  quantitySection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  quantityLabel: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 4 },
  qtyBtn: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyNum: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text, minWidth: 32, textAlign: 'center' },
  priceSummary: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 16, marginBottom: 20, overflow: 'hidden' },
  summaryTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: Typography.sm, color: Colors.text, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: Colors.divider, marginVertical: 8 },
  summaryTotal: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  summaryTotalValue: { fontSize: Typography.lg, fontWeight: '800' },
  nextBtn: { height: 52, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nextBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  providersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  providerCard: { width: '47%', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 14, borderWidth: 2, borderColor: Colors.border, gap: 6, overflow: 'hidden', position: 'relative' },
  providerCardActive: { borderWidth: 2 },
  providerIcon: { fontSize: 28 },
  providerName: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  providerCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 8, fontWeight: '500' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 50 },
  input: { flex: 1, color: Colors.text, fontSize: Typography.base },
  navBtns: { flexDirection: 'row', gap: 12 },
  backBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  backBtnText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' },
  confirmHeader: { alignItems: 'center', gap: 8, marginBottom: 24 },
  confirmIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  confirmIconText: { fontSize: 36 },
  confirmTitle: { fontSize: Typography.xl, fontWeight: '800', color: Colors.text },
  confirmSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
  otpSection: { alignItems: 'center', marginBottom: 24, gap: 8 },
  otpLabel: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  otpHint: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },
  otpInput: { width: 180, height: 64, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.primary, fontSize: 32, fontWeight: '800', color: Colors.text, textAlign: 'center', letterSpacing: 12, marginTop: 8 },
  timerText: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 4 },
  resendText: { fontSize: Typography.sm, color: Colors.primaryLight, fontWeight: '600', marginTop: 4 },
  // Success
  successContainer: { padding: 32, alignItems: 'center', gap: 16 },
  successIconWrap: { position: 'relative', marginBottom: 8 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.success, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12 },
  ring1: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 58, borderWidth: 2, borderColor: Colors.success + '40' },
  ring2: { position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, borderRadius: 68, borderWidth: 1, borderColor: Colors.success + '20' },
  successTitle: { fontSize: Typography.xxl, fontWeight: '800', color: Colors.text },
  successSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  successDetails: { width: '100%', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 16, overflow: 'hidden', gap: 10 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between' },
  successRowLabel: { fontSize: Typography.sm, color: Colors.textMuted },
  successRowValue: { fontSize: Typography.sm, color: Colors.text, fontWeight: '600', maxWidth: 160, textAlign: 'right' },
  successBtn: { height: 56, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  successBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
});
