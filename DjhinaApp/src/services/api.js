/**
 * Service API Djhina
 * Couche de communication avec le backend Express/MySQL
 */

import { API_BASE } from '../config/api';

// ─── Gestion du token (en mémoire pour la session) ──────────────────
let _accessToken  = null;
let _refreshToken = null;

export const tokenManager = {
  getToken:         ()  => _accessToken,
  setToken:         (t) => { _accessToken = t; },
  getRefreshToken:  ()  => _refreshToken,
  setRefreshToken:  (t) => { _refreshToken = t; },
  setTokens:        (access, refresh) => { _accessToken = access; _refreshToken = refresh; },
  clear:            ()  => { _accessToken = null; _refreshToken = null; },
};

// ─── Fetch générique ────────────────────────────────────────────────
async function apiFetch(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = tokenManager.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const json = await res.json().catch(() => ({}));

    // Token expiré → tentative de refresh automatique
    if (res.status === 401 && json.expired && retry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return apiFetch(path, options, false);
    }

    return { ok: res.ok, status: res.status, data: json };
  } catch (err) {
    console.warn('[API] Erreur réseau :', err.message);
    return { ok: false, status: 0, error: err.message, data: null };
  }
}

async function refreshAccessToken() {
  const rt = tokenManager.getRefreshToken();
  if (!rt) return false;

  try {
    const res  = await fetch(`${API_BASE}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: rt }),
    });
    const json = await res.json();
    if (res.ok && json.data?.token) {
      tokenManager.setToken(json.data.token);
      return true;
    }
  } catch {}
  return false;
}

// ─── Normalisation : Backend → App ──────────────────────────────────
export function normalizeEvent(e) {
  let tags = [];
  try { tags = typeof e.tags === 'string' ? JSON.parse(e.tags) : (e.tags || []); } catch {}

  return {
    id:          e.id,
    title:       e.title        || '',
    subtitle:    e.subtitle     || '',
    description: e.description  || '',
    date:        e.date         || '',
    time:        e.time         || '',
    endTime:     e.end_time     || '',
    location:    e.location     || '',
    city:        e.city         || '',
    country:     e.country      || '',
    coverImage:  e.cover_image  || '',
    capacity:    e.capacity     || 0,
    registered:  e.registered   || 0,
    isFeatured:  Boolean(e.is_featured),
    tags,
    category:    e.category     || 'other',
    organizer: {
      name:     e.organizer_name     || '',
      avatar:   e.organizer_avatar   || '',
      verified: Boolean(e.organizer_verified),
    },
    likes:   e.likes_count   || 0,
    comments:e.comments_count || 0,
    shares:  0,
    isLiked: Boolean(e.is_liked),
    isSaved: Boolean(e.is_saved),
    minPrice: e.min_price,
    maxPrice: e.max_price,
    // Ticket types inclus dans getOne
    tickets: (e.ticketTypes || []).map(normalizeTicketType),
  };
}

export function normalizeTicketType(tt) {
  const remaining = (parseInt(tt.available) || 0) - (parseInt(tt.sold) || 0);
  let benefits = ['Accès standard'];
  try {
    if (Array.isArray(tt.benefits))         benefits = tt.benefits;
    else if (typeof tt.benefits === 'string') benefits = JSON.parse(tt.benefits);
    else if (tt.description)                 benefits = [tt.description];
  } catch {}

  return {
    id:        tt.id,
    type:      tt.name      || 'Standard',
    price:     parseFloat(tt.price) || 0,
    currency:  tt.currency  || 'XAF',
    available: parseInt(tt.available) || 0,
    sold:      parseInt(tt.sold)      || 0,
    soldOut:   !tt.is_active || remaining <= 0,
    benefits,
    color:     tt.color || '#0000FF',
  };
}

export function normalizeTicket(t) {
  return {
    id:            t.id,
    ticket_number: t.ticket_number,
    eventId:       t.event_id,
    eventTitle:    t.event_title    || t.title    || '',
    eventDate:     t.event_date     || t.date      || '',
    eventTime:     t.event_time     || t.time      || '',
    eventLocation: t.event_location || t.location  || '',
    eventCover:    t.event_cover    || t.cover_image|| '',
    ticketType:    t.ticket_type_name || t.type_name || 'Standard',
    ticketColor:   t.type_color     || '#0000FF',
    price:         parseFloat(t.price_paid) || 0,
    currency:      t.currency       || 'XAF',
    benefits:      [],
    paymentMethod: t.provider       || '',
    phone:         t.holder_phone   || '',
    purchasedAt:   t.created_at     || new Date().toISOString(),
    status:        t.status         || 'active',
    holderName:    t.holder_name    || '',
    qrData:        t.qr_data        || '',
    qrImage:       t.qr_image       || '',
  };
}

// ─── Auth ────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    }),

  register: ({ name, email, phone, password, country }) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body:   JSON.stringify({ name, email, phone, password, country }),
    }),

  me: () => apiFetch('/api/auth/me'),

  logout: () =>
    apiFetch('/api/auth/logout', { method: 'POST' }),

  updateProfile: (data) =>
    apiFetch('/api/auth/profile', {
      method: 'PUT',
      body:   JSON.stringify(data),
    }),

  // Upload avatar via multipart/form-data
  uploadAvatar: async (imageUri) => {
    const token = tokenManager.getToken();
    const filename = imageUri.split('/').pop();
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('avatar', {
      uri:  imageUri,
      name: `avatar_${Date.now()}.${ext}`,
      type: mimeType,
    });

    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method:  'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Ne pas mettre Content-Type ici : fetch le génère automatiquement avec le boundary
        },
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data: json };
    } catch (err) {
      console.warn('[API] uploadAvatar erreur:', err.message);
      return { ok: false, error: err.message, data: null };
    }
  },

  changePassword: (currentPassword, newPassword) =>
    apiFetch('/api/auth/change-password', {
      method: 'PUT',
      body:   JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─── Événements ──────────────────────────────────────────────────────
export const eventsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams({ limit: 50, sort: 'date', order: 'ASC', ...params }).toString();
    return apiFetch(`/api/events?${q}`);
  },

  getOne: (id) => apiFetch(`/api/events/${id}`),

  like: (id) => apiFetch(`/api/events/${id}/like`, { method: 'POST' }),

  save: (id) => apiFetch(`/api/events/${id}/save`, { method: 'POST' }),

  getComments: (id) => apiFetch(`/api/events/${id}/comments`),

  addComment: (id, content) =>
    apiFetch(`/api/events/${id}/comments`, {
      method: 'POST',
      body:   JSON.stringify({ content }),
    }),
};

// ─── Tickets ─────────────────────────────────────────────────────────
export const ticketsApi = {
  myTickets: () => apiFetch('/api/tickets/my'),

  purchase: ({ event_id, ticket_type_id, quantity, provider, phone, holder_name }) =>
    apiFetch('/api/tickets/purchase', {
      method: 'POST',
      body:   JSON.stringify({ event_id, ticket_type_id, quantity, provider, phone, holder_name }),
    }),

  getTicket: (id) => apiFetch(`/api/tickets/${id}`),

  verify: (qrData) =>
    apiFetch('/api/tickets/verify', {
      method: 'POST',
      body:   JSON.stringify({ qr_data: qrData }),
    }),
};

// ─── Notifications ───────────────────────────────────────────────────
export const notificationsApi = {
  list:       ()   => apiFetch('/api/notifications'),
  markRead:   (id) => apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead:()   => apiFetch('/api/notifications/read-all',  { method: 'PUT' }),
  remove:     (id) => apiFetch(`/api/notifications/${id}`,     { method: 'DELETE' }),
};

// ─── Agenda (sessions + speakers) ────────────────────────────────────
export const agendaApi = {
  getEventAgenda: (eventId) => apiFetch(`/api/agenda/${eventId}`),
};

// ─── Messages speakers ────────────────────────────────────────────────
export const speakerMessagesApi = {
  getMessages: (speakerId) =>
    apiFetch(`/api/speakers/${speakerId}/messages`),

  sendMessage: (speakerId, content, event_id) =>
    apiFetch(`/api/speakers/${speakerId}/messages`, {
      method: 'POST',
      body:   JSON.stringify({ content, event_id: event_id || undefined }),
    }),
};
