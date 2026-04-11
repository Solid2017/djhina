import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { profileApi } from '../../services/api';
import { Colors, Typography, Radius } from '../../theme';

const COUNTRIES = [
  'Tchad', 'Cameroun', 'Nigeria', 'Niger', 'Soudan', 'République Centrafricaine',
  'Côte d\'Ivoire', 'Sénégal', 'Mali', 'Burkina Faso', 'Togo', 'Bénin', 'Ghana',
  'Guinée', 'Congo', 'République Démocratique du Congo', 'Gabon', 'Angola',
  'Éthiopie', 'Kenya', 'Tanzanie', 'Ouganda', 'Afrique du Sud',
  'Maroc', 'Algérie', 'Tunisie', 'Égypte',
  'France', 'Belgique', 'Suisse', 'Canada', 'États-Unis', 'Autre',
];

function Field({ label, icon, value, onChange, placeholder, multiline, keyboardType }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, multiline && { height: 90, alignItems: 'flex-start', paddingVertical: 12 }]}>
        <Ionicons name={icon} size={17} color={Colors.textMuted} style={[{ marginRight: 10 }, multiline && { marginTop: 2 }]} />
        <TextInput
          style={[styles.input, multiline && { textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType || 'default'}
        />
      </View>
    </View>
  );
}

export default function EditProfileScreen({ navigation }) {
  const { state, refreshUser } = useApp();
  const user = state.user;

  const [form, setForm] = useState({
    name:    user?.name    || '',
    phone:   user?.phone   || '',
    country: user?.country || 'Tchad',
    city:    user?.city    || '',
    bio:     user?.bio     || '',
  });
  const [loading, setLoading]           = useState(false);
  const [showCountry, setShowCountry]   = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert('Erreur', 'Le nom est requis.');
    setLoading(true);
    const res = await profileApi.update(form);
    setLoading(false);

    if (res.success) {
      if (refreshUser) await refreshUser();
      Alert.alert('Succès', 'Profil mis à jour.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Erreur', res.message || 'Impossible de mettre à jour le profil.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <LinearGradient colors={[Colors.primaryPale, Colors.background]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le profil</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
      </SafeAreaView>

      {/* Country picker modal */}
      <Modal visible={showCountry} animationType="slide" transparent onRequestClose={() => setShowCountry(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choisir un pays</Text>
              <TouchableOpacity onPress={() => setShowCountry(false)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Rechercher..."
                placeholderTextColor={Colors.textMuted}
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoFocus
              />
            </View>
            <FlatList
              data={COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))}
              keyExtractor={item => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, form.country === item && styles.pickerItemActive]}
                  onPress={() => { update('country', item); setShowCountry(false); }}
                >
                  <Text style={[styles.pickerItemText, form.country === item && { color: Colors.primary, fontWeight: '600' }]}>
                    {item}
                  </Text>
                  {form.country === item && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Field label="Nom complet" icon="person-outline" value={form.name} onChange={v => update('name', v)} placeholder="Votre nom" />
            <Field label="Téléphone" icon="call-outline" value={form.phone} onChange={v => update('phone', v)} placeholder="+235 66 00 00 00" keyboardType="phone-pad" />
            <Field label="Ville" icon="business-outline" value={form.city} onChange={v => update('city', v)} placeholder="N'Djamena" />

            {/* Country selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Pays</Text>
              <TouchableOpacity style={styles.countryBtn} onPress={() => { setCountrySearch(''); setShowCountry(true); }}>
                <Ionicons name="location-outline" size={17} color={Colors.primary} style={{ marginRight: 10 }} />
                <Text style={styles.countryBtnText}>{form.country}</Text>
                <Ionicons name="chevron-down" size={17} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Field label="Bio" icon="document-text-outline" value={form.bio} onChange={v => update('bio', v)} placeholder="Parlez-nous de vous..." multiline />

            <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.btn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Text style={styles.btnText}>Enregistrer</Text>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.text },
  scroll: { padding: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, borderWidth: 1, borderColor: Colors.border },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: Typography.sm, color: Colors.text, fontWeight: '500', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 50 },
  input: { flex: 1, color: Colors.text, fontSize: Typography.base },
  countryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, height: 50 },
  countryBtnText: { flex: 1, color: Colors.text, fontSize: Typography.base },
  btn: { height: 52, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  pickerSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, paddingHorizontal: 14, height: 44, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pickerSearchInput: { flex: 1, color: Colors.text, fontSize: Typography.sm },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  pickerItemActive: { backgroundColor: Colors.primaryPale },
  pickerItemText: { fontSize: Typography.base, color: Colors.text },
});
