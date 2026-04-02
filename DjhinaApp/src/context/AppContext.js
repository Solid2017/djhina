import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { EVENTS } from '../data/mockData';
import {
  tokenManager,
  authApi,
  eventsApi,
  ticketsApi,
  notificationsApi,
  normalizeEvent,
  normalizeTicket,
} from '../services/api';
import { Alert } from 'react-native';

const AppContext = createContext();

const initialState = {
  user:            null,
  isAuthenticated: false,
  events:          [],
  eventsLoading:   true,
  myTickets:       [],
  notifications:   [],
  scanHistory:     [],
  lastPurchasedTickets: [],
  contacts:        [],   // amis ajoutés via QR
  conversations:   {},   // { [contactId]: [{id,text,from,ts}] }
};

function appReducer(state, action) {
  switch (action.type) {

    case 'SET_EVENTS':
      return { ...state, events: action.payload, eventsLoading: false };

    case 'EVENTS_LOADING':
      return { ...state, eventsLoading: action.payload };

    case 'LOGIN':
      return { ...state, isAuthenticated: true, user: action.payload };

    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };

    case 'SET_TICKETS':
      return { ...state, myTickets: action.payload };

    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };

    case 'LOGOUT':
      return {
        ...initialState,
        events:        state.events,
        eventsLoading: false,
      };

    case 'TOGGLE_LIKE': {
      const events = state.events.map(e =>
        e.id === action.payload
          ? { ...e, isLiked: !e.isLiked, likes: e.isLiked ? e.likes - 1 : e.likes + 1 }
          : e
      );
      return { ...state, events };
    }

    case 'TOGGLE_SAVE': {
      const events = state.events.map(e =>
        e.id === action.payload ? { ...e, isSaved: !e.isSaved } : e
      );
      return { ...state, events };
    }

    case 'ADD_COMMENT': {
      const events = state.events.map(e =>
        e.id === action.payload.eventId
          ? { ...e, comments: e.comments + 1 }
          : e
      );
      return { ...state, events };
    }

    case 'PURCHASE_SUCCESS': {
      const { newTickets, eventId, quantity } = action.payload;
      const updatedEvents = state.events.map(e =>
        e.id === eventId
          ? { ...e, registered: e.registered + quantity }
          : e
      );
      return {
        ...state,
        myTickets:            [...state.myTickets, ...newTickets],
        lastPurchasedTickets: newTickets,
        events:               updatedEvents,
      };
    }

    case 'SCAN_TICKET': {
      const { qrData, scanResult } = action.payload;
      const historyEntry = {
        id:         'scan_' + Date.now(),
        qrData,
        scanResult,
        scannedAt:  new Date().toISOString(),
      };
      let updatedTickets = state.myTickets;
      if (scanResult === 'valid') {
        updatedTickets = state.myTickets.map(t => {
          try {
            const parsed  = JSON.parse(t.qrData  || '{}');
            const scanned = JSON.parse(qrData || '{}');
            if (parsed.ticketId === scanned.ticketId) return { ...t, status: 'used' };
          } catch {}
          return t;
        });
      }
      return {
        ...state,
        myTickets:   updatedTickets,
        scanHistory: [historyEntry, ...state.scanHistory],
      };
    }

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };

    case 'ADD_CONTACT': {
      const exists = state.contacts.find(c => c.userId === action.payload.userId);
      if (exists) return state;
      return { ...state, contacts: [action.payload, ...state.contacts] };
    }

    case 'SEND_MESSAGE': {
      const { contactId, message } = action.payload;
      const prev = state.conversations[contactId] || [];
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [contactId]: [...prev, message],
        },
      };
    }

    case 'RECEIVE_MESSAGE': {
      const { contactId, message } = action.payload;
      const prev = state.conversations[contactId] || [];
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [contactId]: [...prev, message],
        },
      };
    }

    case 'MARK_NOTIFICATION_READ': {
      const notifications = state.notifications.map(n =>
        n.id === action.payload ? { ...n, read: true } : n
      );
      return { ...state, notifications };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ─── Chargement initial des événements ────────────────────────────
  useEffect(() => {
    loadPublicEvents();
  }, []);

  const loadPublicEvents = async () => {
    dispatch({ type: 'EVENTS_LOADING', payload: true });
    try {
      const result = await eventsApi.list({ limit: 50 });
      if (result.ok && result.data?.data?.length) {
        dispatch({ type: 'SET_EVENTS', payload: result.data.data.map(normalizeEvent) });
      } else {
        // Fallback : données locales si le serveur est inaccessible
        console.warn('[AppContext] Serveur inaccessible, utilisation des données locales');
        dispatch({ type: 'SET_EVENTS', payload: EVENTS });
      }
    } catch (e) {
      console.warn('[AppContext] Erreur chargement events:', e.message);
      dispatch({ type: 'SET_EVENTS', payload: EVENTS });
    }
  };

  // ─── Auth : connexion ─────────────────────────────────────────────
  const login = useCallback(async (emailOrUserData, password) => {
    // Appel depuis LoginScreen → email + password → appel API
    if (password !== undefined) {
      const res = await authApi.login(emailOrUserData, password);
      if (!res.ok) {
        return { ok: false, message: res.data?.message || 'Erreur de connexion.' };
      }
      const { token, refreshToken, user } = res.data.data;
      tokenManager.setTokens(token, refreshToken);
      dispatch({ type: 'LOGIN', payload: user });
      // Charger billets + notifications après login
      loadMyTickets();
      loadNotifications();
      return { ok: true, user };
    }
    // Appel legacy avec objet user direct (mock / démo)
    dispatch({ type: 'LOGIN', payload: emailOrUserData });
    return { ok: true };
  }, []);

  // ─── Auth : inscription ───────────────────────────────────────────
  const register = useCallback(async (formData) => {
    const res = await authApi.register(formData);
    if (!res.ok) {
      return { ok: false, message: res.data?.message || 'Erreur d\'inscription.' };
    }
    const { token, refreshToken, user } = res.data.data;
    tokenManager.setTokens(token, refreshToken);
    dispatch({ type: 'LOGIN', payload: user });
    return { ok: true, user };
  }, []);

  // ─── Auth : déconnexion ───────────────────────────────────────────
  const logout = useCallback(async () => {
    authApi.logout().catch(() => {});
    tokenManager.clear();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // ─── Mes billets ──────────────────────────────────────────────────
  const loadMyTickets = useCallback(async () => {
    const res = await ticketsApi.myTickets();
    if (res.ok && res.data?.data) {
      dispatch({ type: 'SET_TICKETS', payload: res.data.data.map(normalizeTicket) });
    }
  }, []);

  // ─── Notifications ────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    const res = await notificationsApi.list();
    if (res.ok && res.data?.data) {
      dispatch({ type: 'SET_NOTIFICATIONS', payload: res.data.data });
    }
  }, []);

  // ─── Like (toggle optimiste + API) ───────────────────────────────
  const toggleLike = useCallback((eventId) => {
    dispatch({ type: 'TOGGLE_LIKE', payload: eventId }); // optimiste
    if (state.isAuthenticated) {
      eventsApi.like(eventId).catch(() => {
        dispatch({ type: 'TOGGLE_LIKE', payload: eventId }); // rollback si erreur
      });
    }
  }, [state.isAuthenticated]);

  // ─── Sauvegarde (toggle optimiste + API) ─────────────────────────
  const toggleSave = useCallback((eventId) => {
    dispatch({ type: 'TOGGLE_SAVE', payload: eventId }); // optimiste
    if (state.isAuthenticated) {
      eventsApi.save(eventId).catch(() => {
        dispatch({ type: 'TOGGLE_SAVE', payload: eventId }); // rollback
      });
    }
  }, [state.isAuthenticated]);

  // ─── Commentaire ─────────────────────────────────────────────────
  const addComment = useCallback((eventId, comment) => {
    dispatch({ type: 'ADD_COMMENT', payload: { eventId, comment } });
    if (state.isAuthenticated) {
      eventsApi.addComment(eventId, comment).catch(() => {});
    }
  }, [state.isAuthenticated]);

  // ─── Achat de billet (appel API réel) ────────────────────────────
  const purchaseTicket = useCallback(async (event, ticketType, quantity, paymentMethod, phone, holderName) => {
    const res = await ticketsApi.purchase({
      event_id:       event.id,
      ticket_type_id: ticketType.id,
      quantity,
      provider:       paymentMethod,
      phone,
      holder_name:    holderName,
    });

    if (!res.ok) {
      return {
        ok: false,
        message: res.data?.message || 'Erreur lors de l\'achat du billet.',
      };
    }

    // Construire les objets tickets pour l'état local
    const { issuedTickets } = res.data.data;
    const newTickets = (issuedTickets || []).map((t) => ({
      id:            t.id,
      ticket_number: t.ticketNumber,
      eventId:       event.id,
      eventTitle:    event.title,
      eventDate:     event.date,
      eventTime:     event.time,
      eventLocation: event.location,
      eventCover:    event.coverImage,
      ticketType:    ticketType.type,
      ticketColor:   ticketType.color || '#0000FF',
      price:         ticketType.price,
      currency:      ticketType.currency,
      benefits:      ticketType.benefits || [],
      paymentMethod,
      phone,
      purchasedAt:   new Date().toISOString(),
      status:        'active',
      holderName,
      qrData:        t.qrData  || '',
      qrImage:       t.qrImage || '',
    }));

    dispatch({
      type:    'PURCHASE_SUCCESS',
      payload: { newTickets, eventId: event.id, quantity },
    });

    dispatch({
      type:    'ADD_NOTIFICATION',
      payload: {
        id:      'notif_' + Date.now(),
        type:    'ticket',
        title:   'Billet confirmé !',
        message: `Votre billet pour "${event.title}" a été émis avec succès.`,
        time:    new Date().toISOString(),
        read:    false,
      },
    });

    return { ok: true, tickets: newTickets };
  }, []);

  // ─── Scan de ticket ──────────────────────────────────────────────
  const scanTicket = useCallback((qrData, scanResult) => {
    dispatch({ type: 'SCAN_TICKET', payload: { qrData, scanResult } });
  }, []);

  // ─── Mise à jour avatar ───────────────────────────────────────────
  const updateAvatar = useCallback(async (imageUri) => {
    const res = await authApi.uploadAvatar(imageUri);
    if (res.ok && res.data?.data?.avatar) {
      const fullUrl = res.data.data.avatar.startsWith('http')
        ? res.data.data.avatar
        : `${require('../config/api').API_BASE}${res.data.data.avatar}`;
      dispatch({ type: 'UPDATE_USER', payload: { avatar: fullUrl } });
      return { ok: true, avatar: fullUrl };
    }
    return { ok: false, message: res.data?.message || 'Erreur upload avatar.' };
  }, []);

  // ─── Ajouter un contact (depuis scan QR) ─────────────────────────
  const addContact = useCallback((contactData) => {
    dispatch({ type: 'ADD_CONTACT', payload: contactData });
  }, []);

  // ─── Envoyer un message ───────────────────────────────────────────
  const sendMessage = useCallback((contactId, text) => {
    const message = {
      id:   'msg_' + Date.now() + Math.random().toString(36).slice(2),
      text,
      from: 'me',
      ts:   new Date().toISOString(),
      read: true,
    };
    dispatch({ type: 'SEND_MESSAGE', payload: { contactId, message } });

    // Simulation réponse automatique (à remplacer par WebSocket plus tard)
    setTimeout(() => {
      const replies = [
        '😊 Merci !', 'Super de vous rencontrer ici !',
        'On se retrouve à l\'événement 👋', 'Avec plaisir !',
        'À tout à l\'heure !', '🎉 Profitez bien de l\'événement !',
      ];
      dispatch({
        type: 'RECEIVE_MESSAGE',
        payload: {
          contactId,
          message: {
            id:   'msg_' + Date.now() + '_r',
            text: replies[Math.floor(Math.random() * replies.length)],
            from: contactId,
            ts:   new Date().toISOString(),
            read: false,
          },
        },
      });
    }, 1500 + Math.random() * 2000);
  }, []);

  // ─── Marquer notification lue ─────────────────────────────────────
  const markNotificationRead = useCallback((id) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    notificationsApi.markRead(id).catch(() => {});
  }, []);

  // ─── Rafraîchir les données ───────────────────────────────────────
  const refreshData = useCallback(() => {
    loadPublicEvents();
    if (state.isAuthenticated) {
      loadMyTickets();
      loadNotifications();
    }
  }, [state.isAuthenticated]);

  return (
    <AppContext.Provider value={{
      state,
      login,
      register,
      logout,
      toggleLike,
      toggleSave,
      addComment,
      purchaseTicket,
      scanTicket,
      markNotificationRead,
      refreshData,
      loadMyTickets,
      addContact,
      sendMessage,
      updateAvatar,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
