import React, { createContext, useContext, useReducer } from 'react';
import { EVENTS, generateTicketId } from '../data/mockData';

const AppContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  events: EVENTS,
  myTickets: [],
  notifications: [],
  scanHistory: [],
};

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isAuthenticated: true, user: action.payload };

    case 'LOGOUT':
      return { ...initialState, events: state.events };

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

    case 'PURCHASE_TICKET': {
      const { event, ticketType, quantity, paymentMethod, phone } = action.payload;
      const ticketInfo = event.tickets.find(t => t.id === ticketType.id);

      const newTickets = Array.from({ length: quantity }, (_, i) => ({
        id: generateTicketId(),
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        eventCover: event.coverImage,
        ticketType: ticketType.type,
        ticketColor: ticketType.color,
        price: ticketType.price,
        currency: ticketType.currency,
        benefits: ticketType.benefits,
        paymentMethod,
        phone,
        purchasedAt: new Date().toISOString(),
        status: 'active', // active | used | expired
        holderName: action.payload.holderName,
        seatNumber: ticketInfo ? `Sec ${String.fromCharCode(65 + i)}-${Math.floor(Math.random() * 200) + 1}` : null,
        qrData: JSON.stringify({
          ticketId: generateTicketId(),
          eventId: event.id,
          type: ticketType.type,
          holder: action.payload.holderName,
          ts: Date.now(),
        }),
      }));

      const updatedEvents = state.events.map(e =>
        e.id === event.id
          ? {
              ...e,
              tickets: e.tickets.map(t =>
                t.id === ticketType.id ? { ...t, sold: t.sold + quantity } : t
              ),
              registered: e.registered + quantity,
            }
          : e
      );

      return {
        ...state,
        myTickets: [...state.myTickets, ...newTickets],
        events: updatedEvents,
      };
    }

    case 'SCAN_TICKET': {
      const { qrData, scanResult } = action.payload;
      const historyEntry = {
        id: 'scan_' + Date.now(),
        qrData,
        scanResult,
        scannedAt: new Date().toISOString(),
      };

      let updatedTickets = state.myTickets;
      if (scanResult === 'valid') {
        updatedTickets = state.myTickets.map(t => {
          try {
            const parsed = JSON.parse(t.qrData);
            const scanned = JSON.parse(qrData);
            if (parsed.ticketId === scanned.ticketId) {
              return { ...t, status: 'used' };
            }
          } catch {}
          return t;
        });
      }

      return {
        ...state,
        myTickets: updatedTickets,
        scanHistory: [historyEntry, ...state.scanHistory],
      };
    }

    case 'ADD_NOTIFICATION': {
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const login = (userData) => dispatch({ type: 'LOGIN', payload: userData });
  const logout = () => dispatch({ type: 'LOGOUT' });
  const toggleLike = (eventId) => dispatch({ type: 'TOGGLE_LIKE', payload: eventId });
  const toggleSave = (eventId) => dispatch({ type: 'TOGGLE_SAVE', payload: eventId });
  const addComment = (eventId, comment) => dispatch({ type: 'ADD_COMMENT', payload: { eventId, comment } });

  const purchaseTicket = (event, ticketType, quantity, paymentMethod, phone, holderName) => {
    dispatch({
      type: 'PURCHASE_TICKET',
      payload: { event, ticketType, quantity, paymentMethod, phone, holderName },
    });
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: 'notif_' + Date.now(),
        type: 'ticket',
        title: 'Billet confirmé !',
        message: `Votre billet pour "${event.title}" a été émis avec succès.`,
        time: new Date().toISOString(),
        read: false,
      },
    });
  };

  const scanTicket = (qrData, scanResult) =>
    dispatch({ type: 'SCAN_TICKET', payload: { qrData, scanResult } });

  return (
    <AppContext.Provider value={{ state, login, logout, toggleLike, toggleSave, addComment, purchaseTicket, scanTicket }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
