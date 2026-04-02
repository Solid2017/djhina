import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useApp } from '../context/AppContext';
import { Colors, Typography } from '../theme';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import EventWallScreen from '../screens/events/EventWallScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import MyTicketsScreen from '../screens/tickets/MyTicketsScreen';
import TicketDetailScreen from '../screens/tickets/TicketDetailScreen';
import ScannerScreen from '../screens/scanner/ScannerScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Messages
import MessagesScreen from '../screens/messages/MessagesScreen';
import ConversationScreen from '../screens/messages/ConversationScreen';
import MyQRCodeScreen from '../screens/messages/MyQRCodeScreen';
import ScanContactScreen from '../screens/messages/ScanContactScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabBarIcon({ focused, name, label, badge }) {
  return (
    <View style={styles.tabItem}>
      {focused && (
        <LinearGradient
          colors={[Colors.primaryPale, 'transparent']}
          style={styles.tabActiveGlow}
        />
      )}
      <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
        <Ionicons
          name={focused ? name : `${name}-outline`}
          size={22}
          color={focused ? Colors.primary : Colors.textMuted}
        />
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

function MainTabs() {
  const { state } = useApp();
  const ticketCount = state.myTickets.filter(t => t.status === 'active').length;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <LinearGradient
            colors={[Colors.surface, Colors.surface]}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="EventWall"
        component={EventWallScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} name="home" label="Accueil" />
          ),
        }}
      />
      <Tab.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} name="ticket" label="Billets" badge={ticketCount} />
          ),
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.scannerTabBtn}>
              <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.scannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="qr-code" size={26} color="#fff" />
              </LinearGradient>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              name="chatbubbles"
              label="Messages"
              badge={
                Object.values(state.conversations || {})
                  .flat()
                  .filter(m => m.from !== 'me' && !m.read).length
              }
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} name="person" label="Profil" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MyQRCode"
        component={MyQRCodeScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ScanContact"
        component={ScanContactScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { state } = useApp();

  return (
    <NavigationContainer>
      {state.isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 68,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    width: 60,
  },
  tabActiveGlow: {
    position: 'absolute',
    top: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
  },
  tabIconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabIconWrapActive: {
    backgroundColor: Colors.primaryPale,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  scannerTabBtn: {
    marginBottom: Platform.OS === 'ios' ? 14 : 10,
  },
  scannerGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
});
