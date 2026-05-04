// VacanSee - Campus Space Reservation System

const { useState, useEffect, useRef } = React;

// ==================== CONFIGURATION ====================
// Hour options (1 to 12 for 12-hour picker)
const HOUR_OPTIONS = [];
for (let hour = 1; hour <= 12; hour++) {
  HOUR_OPTIONS.push(hour.toString());
}
// Minute options (only 00 and 30)
const MINUTE_OPTIONS = ['00', '30'];
const AM_PM_OPTIONS = ['AM', 'PM'];
const COUNTRY_PHONE_CODES = [
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+1', label: 'United States/Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+971', label: 'UAE (+971)' }
];

const COUNTRY_PHONE_RULES = {
  '+63': { min: 10, max: 10, label: 'Philippines local number must be 10 digits (e.g., 9171234567).' },
  '+1': { min: 10, max: 10, label: 'US/Canada number must be 10 digits.' },
  '+44': { min: 10, max: 10, label: 'UK local number must be 10 digits.' },
  '+61': { min: 9, max: 9, label: 'Australia local number must be 9 digits.' },
  '+65': { min: 8, max: 8, label: 'Singapore number must be 8 digits.' },
  '+81': { min: 10, max: 10, label: 'Japan local number must be 10 digits.' },
  '+82': { min: 10, max: 10, label: 'South Korea local number must be 10 digits.' },
  '+91': { min: 10, max: 10, label: 'India number must be 10 digits.' },
  '+971': { min: 9, max: 9, label: 'UAE local number must be 9 digits.' }
};

const EQUIPMENT_DATA = {
  'Performing Arts Theatre': [
    'Tables', 'Chairs', 'Philippine Flag', 'University Flag', 'College Flag',
    'LCD Projector', 'White Screen', 'TV', 'Still Camera', 'Video Camera', 
    'Sound System', 'Microphone', 'Speaker', 'Lights Set-Up', 'Podium'
  ],
  'Quadrangle': [
    'Tables', 'Chairs', 'Philippine Flag', 'University Flag', 'College Flag',
    'LCD Projector', 'White Screen', 'TV', 'Still Camera', 'Video Camera', 
    'Sound System', 'Microphone', 'Speaker', 'Lights Set-Up', 'Podium'
  ],
  'Radio Room': [
    'Tables', 'Chairs', 'Philippine Flag', 'University Flag', 'College Flag',
    'LCD Projector', 'White Screen', 'TV', 'Still Camera', 'Video Camera', 
    'Sound System', 'Microphone', 'Speaker', 'Lights Set-Up', 'Podium'
  ],
  'TV Studio': [
    'Tables', 'Chairs', 'Philippine Flag', 'University Flag', 'College Flag',
    'LCD Projector', 'White Screen', 'TV', 'Still Camera', 'Video Camera', 
    'Sound System', 'Microphone', 'Speaker', 'Lights Set-Up', 'Podium'
  ]
};

// Default equipment fallback for all unmapped/new facilities.
const DEFAULT_EQUIPMENT = [
  'Tables',
  'Chairs',
  'Philippine Flag',
  'University Flag',
  'College Flag',
  'LCD Projector',
  'White Screen',
  'TV',
  'Still Camera',
  'Video Camera',
  'Sound System',
  'Microphone',
  'Speaker',
  'Lights Set-Up',
  'Podium'

];

// ==================== API SERVICE ====================
// Use same origin as the page to ensure cookies work
const API_BASE = window.location.origin + '/api';

const apiService = {
  async login(username, password) {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  async logout() {
    const response = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Logout failed');
    return response.json();
  },

  async getRooms() {
    const response = await fetch(`${API_BASE}/rooms`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch rooms');
    return response.json();
  },

  async getReservations() {
    const response = await fetch(`${API_BASE}/reservations`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch reservations');
    return response.json();
  },

  async createReservation(formData) {
    const response = await fetch(`${API_BASE}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });
    if (!response.ok) throw new Error('Failed to create reservation');
    return response.json();
  },

  async approveConceptStage1(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}/approve-concept`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },

  async approveFinalStage2(id, formData) {
    const response = await fetch(`${API_BASE}/reservations/${id}/upload-final-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },

  async approveReservation(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}/approve-final`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },

  async denyReservation(id, reason) {
    const response = await fetch(`${API_BASE}/reservations/${id}/deny`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },

  async deleteReservation(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },

  async expireReservation(id) {
    // Called by the frontend when the 5-day Stage 2 deadline has elapsed.
    // The backend should mark the reservation as denied/expired.
    const response = await fetch(`${API_BASE}/reservations/${id}/expire`, {
      method: 'POST',
      credentials: 'include'
    });
    // Non-critical: ignore errors silently (backend may already have processed it)
    if (!response.ok) return null;
    return response.json();
  },

  async uploadFinalForm(id, finalFormUrl) {
    const response = await fetch(`${API_BASE}/reservations/${id}/upload-final-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ final_form_url: finalFormUrl })
    });
    if (!response.ok) throw new Error('Failed to upload final form');
    return response.json();
  },

  async approveFinal(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}/approve-final`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to approve');
    return response.json();
  },

  async getCalendarEvents() {
    const response = await fetch(`${API_BASE}/calendar-events`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch calendar events');
    return response.json();
  },

  async deleteEventWithReason(id, reason, action = 'cancel') {
    const response = await fetch(`${API_BASE}/reservations/${id}/delete-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason, action })
    });
    if (!response.ok) throw new Error('Failed to delete event');
    return response.json();
  },

  async archiveReservation(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}/archive`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to archive reservation');
    return response.json();
  },

  async createHoliday(payload) {
    const response = await fetch(`${API_BASE}/holidays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Failed to create holiday');
    return data;
  },

  async deleteHoliday(holidayId) {
    const response = await fetch(`${API_BASE}/holidays/${holidayId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Failed to delete holiday');
    return data;
  },

  async getDataMiningAnalytics(filters = {}) {
    const params = new URLSearchParams();
    if (filters.department) params.set('department', filters.department);
    if (filters.heatmap_month) params.set('heatmap_month', filters.heatmap_month);
    if (filters.filter_start_month) params.set('filter_start_month', filters.filter_start_month);
    if (filters.filter_end_month) params.set('filter_end_month', filters.filter_end_month);
    if (filters.months) params.set('months', String(filters.months));
    const query = params.toString();
    const response = await fetch(`${API_BASE}/data-mining/analytics${query ? `?${query}` : ''}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch analytics');
    const payload = await response.json();
    if (payload.status !== 'success') throw new Error(payload.message || 'Analytics fetch failed');
    return payload.data;
  },

  async getCurrentSemesterForecast() {
    const response = await fetch(`${API_BASE}/data-mining/forecast/current-semester`, { credentials: 'include' });
    const payload = await response.json();
    if (!response.ok || payload.status !== 'success') {
      throw new Error(payload.message || payload.error || 'Failed to fetch forecast');
    }
    return payload;
  },

  async retrainForecastModel() {
    const response = await fetch(`${API_BASE}/data-mining/forecast/retrain`, {
      method: 'POST',
      credentials: 'include'
    });
    const payload = await response.json();
    if (!response.ok || payload.status !== 'success') {
      throw new Error(payload.message || payload.error || 'Failed to retrain forecast model');
    }
    return payload;
  },

  async getMonthlyReport(year, month) {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const response = await fetch(`${API_BASE}/data-mining/reports/monthly?${params.toString()}`, { credentials: 'include' });
    const payload = await response.json();
    if (!response.ok || payload.status !== 'success') {
      throw new Error(payload.message || payload.error || 'Failed to fetch monthly report');
    }
    return payload;
  },

  async generateMonthlyReport(year, month) {
    const response = await fetch(`${API_BASE}/data-mining/reports/monthly/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ year, month })
    });
    const payload = await response.json();
    if (!response.ok || payload.status !== 'success') {
      throw new Error(payload.message || payload.error || 'Failed to generate monthly report');
    }
    return payload;
  },

  async downloadMonthlyReportExcel(year, month) {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const response = await fetch(`${API_BASE}/data-mining/reports/monthly/export?${params.toString()}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      let message = 'Failed to download monthly report file';
      try {
        const payload = await response.json();
        message = payload.message || payload.error || message;
      } catch {
        // Ignore JSON parsing for non-JSON responses.
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const nameMatch = disposition.match(/filename="?([^";]+)"?/i);
    const filename = nameMatch ? nameMatch[1] : `monthly_report_${year}_${String(month).padStart(2, '0')}.xlsx`;
    return { blob, filename };
  },

  async adminCreateFacility(payload) {
    const response = await fetch(`${API_BASE}/admin/facilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create facility');
    return data;
  },

  async adminUpdateFacility(id, payload) {
    const response = await fetch(`${API_BASE}/admin/facilities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update facility');
    return data;
  },

  async adminDeleteFacility(id) {
    const response = await fetch(`${API_BASE}/admin/facilities/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete facility');
    return data;
  },

  async adminUploadFacilityImage(file, previousImageUrl = '') {
    const formData = new FormData();
    formData.append('image', file);
    if (previousImageUrl) {
      formData.append('previous_image_url', previousImageUrl);
    }
    const response = await fetch(`${API_BASE}/admin/facilities/upload-image`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to upload image');
    return data.image_url;
  },

  async adminGetUsers() {
    const response = await fetch(`${API_BASE}/admin/users`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch users');
    return data;
  },

  async adminCreateUser(payload) {
    const response = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create user');
    return data;
  },

  async adminUpdateUser(id, payload) {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update user');
    return data;
  },

  async adminDeleteUser(id) {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete user');
    return data;
  },

  async updateMyPassword(currentPassword, newPassword) {
    const response = await fetch(`${API_BASE}/settings/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update password');
    return data;
  },

  async updateMyProfile(username) {
    const response = await fetch(`${API_BASE}/settings/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update profile');
    return data;
  },

  async askFacilitiesAssistant(messages, facilities = [], calendarEvents = []) {
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ messages, facilities, calendar_events: calendarEvents })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to contact AI assistant');
    return data;
  }
};

function confirmDeleteAction(targetLabel) {
  return window.confirm(
    `WARNING: You are about to permanently delete ${targetLabel}.\n\nThis action cannot be undone.\n\nPress OK to continue.`
  );
}

// ==================== MAIN APP ====================
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [reservations, setReservations] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedRes, setSelectedRes] = useState(null);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [eventActionType, setEventActionType] = useState('delete');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seenNotifications, setSeenNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seenNotifications') || '[]'); } catch { return []; }
  });
  const realtimeSyncInFlightRef = useRef(false);

  const isAdmin = currentUser?.role === 'admin';
  const isPhase1Admin = currentUser?.role === 'admin_phase1';
  const isAdminOrPhase1 = isAdmin || isPhase1Admin;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const withRetry = async (task, attempts = 3, baseDelay = 700) => {
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await task();
      } catch (err) {
        lastError = err;
        if (i < attempts - 1) {
          await wait(baseDelay * (i + 1));
        }
      }
    }
    throw lastError || new Error('Request failed');
  };

  const getAllowedViewsForRole = (role) => {
    const baseViews = ['dashboard', 'calendar', 'facilities', 'archive'];
    if (role === 'admin' || role === 'admin_phase1') {
      return [...baseViews, 'reservations', 'analytics', 'settings'];
    }
    return baseViews;
  };

  const getNotificationKey = (notification) => {
    if (isAdminOrPhase1) {
      if (notification.notification_type === 'final-submitted') return `admin-final-${notification.id}`;
      if (notification.notification_type === 'approved') return `admin-approved-${notification.id}`;
      if (notification.notification_type === 'denied') return `admin-denied-${notification.id}`;
      return `admin-pending-${notification.id}`;
    }
    // For users, key by status type
    if (notification.notification_type === 'concept-approved') return `user-concept-${notification.id}`;
    if (notification.notification_type === 'approved') return `user-approved-${notification.id}`;
    return `user-${notification.id}`;
  };

  // Compute unread notifications
  const getUnreadNotifications = () => {
    if (!currentUser) return [];
    if (isAdminOrPhase1) {
      // Both admin and admin_phase1 see all non-archived requests as notifications
      return reservations
        .filter(r => !r.archived_at)
        .filter(r => {
          // Notify for all status changes except archived
          if (!seenNotifications.includes(`admin-pending-${r.id}`) && r.status === 'pending') return true;
          if (!seenNotifications.includes(`admin-final-${r.id}`) && r.status === 'concept-approved' && (r.final_form_url || r.final_form_uploaded)) return true;
          if (!seenNotifications.includes(`admin-approved-${r.id}`) && r.status === 'approved') return true;
          if (!seenNotifications.includes(`admin-denied-${r.id}`) && r.status === 'denied') return true;
          return false;
        })
        .map(r => {
          let notification_type = 'pending';
          if (r.status === 'concept-approved' && (r.final_form_url || r.final_form_uploaded)) notification_type = 'final-submitted';
          else if (r.status === 'approved') notification_type = 'approved';
          else if (r.status === 'denied') notification_type = 'denied';
          return { ...r, notification_type };
        });
    }
    // Users see their own reservations: denied/cancelled, concept-approved, or fully approved
    return reservations
      .filter(r => r.user_id === currentUser.id && !r.archived_at)
      .filter(r => {
        if (r.status === 'denied' && !seenNotifications.includes(`user-${r.id}`)) return true;
        if ((r.status === 'cancelled' || r.status === 'deleted') && !seenNotifications.includes(`user-${r.id}`)) return true;
        if (r.status === 'concept-approved' && !seenNotifications.includes(`user-concept-${r.id}`)) return true;
        if (r.status === 'approved' && !seenNotifications.includes(`user-approved-${r.id}`)) return true;
        return false;
      })
      .map(r => {
        let notification_type = r.status;
        if (r.status === 'concept-approved') notification_type = 'concept-approved';
        else if (r.status === 'approved') notification_type = 'approved';
        return { ...r, notification_type };
      });
  };

  const hasUnread = getUnreadNotifications().length > 0;

  const markNotificationSeen = (notification) => {
    const key = getNotificationKey(notification);
    const updated = [...seenNotifications, key];
    setSeenNotifications(updated);
    localStorage.setItem('seenNotifications', JSON.stringify(updated));
  };

  const markAllNotificationsSeen = () => {
    const notifications = getUnreadNotifications();
    const keys = notifications.map(n => getNotificationKey(n));
    const updated = [...seenNotifications, ...keys];
    setSeenNotifications(updated);
    localStorage.setItem('seenNotifications', JSON.stringify(updated));
  };

  // Check for existing session on page load
  useEffect(() => {
    (async () => {
      try {
        const res = await withRetry(() => fetch(`${API_BASE}/me`, { credentials: 'include' }), 3, 800);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            setCurrentUser({
              id: data.user_id,
              username: data.username,
              role: data.role,
              department: data.department
            });
          }
        }
      } catch (err) {
        // No session or error - will show login
      }
      setCheckingSession(false);
    })();
  }, []);

  // Load data when user is set
  useEffect(() => {
    if (currentUser) {
      let cancelled = false;

      (async () => {
        const results = await Promise.allSettled([
          withRetry(() => apiService.getRooms(), 3, 800),
          withRetry(() => apiService.getReservations(), 3, 800),
          withRetry(() => apiService.getCalendarEvents(), 3, 800),
        ]);

        if (cancelled) return;

        const [roomsResult, reservationsResult, calendarResult] = results;

        if (roomsResult.status === 'fulfilled') {
          setRooms(roomsResult.value);
        }
        if (reservationsResult.status === 'fulfilled') {
          setReservations(reservationsResult.value);
        }
        if (calendarResult.status === 'fulfilled') {
          setCalendarEvents(calendarResult.value);
        }

        const failed = [roomsResult, reservationsResult, calendarResult]
          .filter((r) => r.status === 'rejected')
          .map((r) => r.reason?.message || 'Request failed');

        if (failed.length > 0) {
          setError(failed.join(' | '));
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [currentUser]);

  const handleLogin = async (username, password) => {
    setLoading(true);
    try {
      const res = await apiService.login(username, password);
      if (res.status === 'success') {
        setCurrentUser({
          id: res.user_id,
          username: res.username,
          role: res.role,
          department: res.department
        });
        setError('');
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (e) {
      setError('Login failed');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setCurrentUser(null);
      setReservations([]);
    } catch (err) {
      setError('Logout failed');
    }
  };

  const refreshReservationsOnly = async () => {
    const updatedReservations = await apiService.getReservations();
    setReservations(updatedReservations);
    return updatedReservations;
  };

  const refreshCalendarOnly = async () => {
    const updatedEvents = await apiService.getCalendarEvents();
    setCalendarEvents(updatedEvents);
    return updatedEvents;
  };

  const refreshReservationsAndCalendar = async () => {
    const [updatedReservations, updatedEvents] = await Promise.all([
      apiService.getReservations(),
      apiService.getCalendarEvents(),
    ]);
    setReservations(updatedReservations);
    setCalendarEvents(updatedEvents);
    return { updatedReservations, updatedEvents };
  };

  const handleArchive = async (id) => {
    setLoading(true);
    try {
      await apiService.archiveReservation(id);
      await refreshReservationsAndCalendar();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  // Real-time sync for reservation list, requests, and notifications.
  useEffect(() => {
    if (!currentUser) return;

    let disposed = false;

    const syncRealtime = async () => {
      if (disposed || document.hidden || realtimeSyncInFlightRef.current) return;

      realtimeSyncInFlightRef.current = true;
      try {
        const [reservationsResult, calendarResult] = await Promise.allSettled([
          withRetry(() => apiService.getReservations(), 2, 600),
          withRetry(() => apiService.getCalendarEvents(), 2, 600),
        ]);

        if (disposed) return;

        if (reservationsResult.status === 'fulfilled') {
          setReservations(reservationsResult.value);
        }
        if (calendarResult.status === 'fulfilled') {
          setCalendarEvents(calendarResult.value);
        }
      } finally {
        realtimeSyncInFlightRef.current = false;
      }
    };

    // Poll every 15 seconds while app is active.
    const intervalId = setInterval(syncRealtime, 15000);

    // Refresh immediately when tab becomes visible or window regains focus.
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncRealtime();
      }
    };
    const handleFocus = () => {
      syncRealtime();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Prime once so users get fresh values quickly after login.
    syncRealtime();

    return () => {
      disposed = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser]);

  // Show loading while checking session
  if (checkingSession) {
    return React.createElement('div', { className: 'h-screen flex items-center justify-center bg-slate-200' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-4xl font-bold text-sky-500 mb-4' }, 'VacanSee'),
        React.createElement(InlineSpinner, { label: 'Loading session...' })
      )
    );
  }

  if (!currentUser) {
    return React.createElement(LoginPage, { onLogin: handleLogin, loading, error });
  }

  const archive = reservations.filter(r => r.archived_at || r.status === 'denied' || r.status === 'cancelled' || r.status === 'deleted');

  // UI matching index-old.jsx (sidebar layout)
  return React.createElement('div', { className: 'flex h-screen bg-slate-50 overflow-hidden' },
    // Mobile overlay
    mobileMenuOpen && React.createElement('div', { 
      className: 'fixed inset-0 bg-black/50 z-40 md:hidden',
      onClick: () => setMobileMenuOpen(false)
    }),
    // Sidebar
    React.createElement(Sidebar, { 
      currentView, 
      setView: (view) => { setCurrentView(view); setMobileMenuOpen(false); }, 
      user: currentUser, 
      onLogout: handleLogout, 
      isAdmin: isAdminOrPhase1,
      mobileMenuOpen,
      onClose: () => setMobileMenuOpen(false)
    }),
    // Main content area
    React.createElement('div', { className: 'flex-1 flex flex-col min-w-0' },
      // Header
      React.createElement(Header, { 
        title: currentView, 
        onOpenProfile: () => setActiveModal('profile'), 
        onOpenNotifications: () => setActiveModal('notifications'),
        hasUnread,
        user: currentUser,
        onMenuClick: () => setMobileMenuOpen(true)
      }),
      // Error banner
      error && React.createElement('div', { className: 'bg-red-100 text-red-700 px-4 py-2 mx-4 md:mx-8 mt-4 rounded flex justify-between items-center text-sm' },
        React.createElement('span', {}, error),
        React.createElement('button', { onClick: () => setError(''), className: 'text-red-700 hover:text-red-900 font-bold' }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' }))
      ),
      // Main content
      React.createElement('main', { className: 'flex-1 overflow-y-auto p-4 md:p-8' },
        loading && React.createElement('div', { className: 'mb-4 bg-white border rounded-xl shadow-sm' },
          React.createElement(InlineSpinner, { label: 'Fetching latest data...' })
        ),
        currentView === 'dashboard' && React.createElement(Dashboard, { reservations, rooms, archive, user: currentUser, loading, onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); }, onBook: (roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); }, onArchive: handleArchive, onRefresh: refreshReservationsOnly }),
        currentView === 'calendar' && React.createElement(CalendarView, {
          events: calendarEvents,
          rooms,
          isAdmin: isAdminOrPhase1,
          onAddHoliday: () => setActiveModal('holiday'),
          onViewEvent: (e) => { setSelectedRes(e); setActiveModal('eventDetails'); }
        }),
        currentView === 'facilities' && React.createElement(FacilitiesView, {
          rooms,
          isAdmin: isAdminOrPhase1,
          onBook: (roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); },
          onRoomsUpdated: async () => {
            const data = await apiService.getRooms();
            setRooms(data);
          },
          onNotify: (message) => {
            setNotification(message);
            setActiveModal('notification');
          }
        }),
        currentView === 'settings' && isAdminOrPhase1 && React.createElement(SettingsView, {
          currentUser,
          rooms,
          onRoomsUpdated: async () => {
            const data = await apiService.getRooms();
            setRooms(data);
          },
          onNotify: (message) => {
            setNotification(message);
            setActiveModal('notification');
          }
        }),
        currentView === 'reservations' && isAdminOrPhase1 && React.createElement(AdminRequests, { reservations: reservations.filter(r => !r.archived_at), loading, onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); }, onArchive: handleArchive }),
        currentView === 'analytics' && isAdminOrPhase1 && React.createElement(AnalyticsView, { reservations }),
        currentView === 'archive' && React.createElement(ArchiveView, {
          archive,
          user: currentUser,
          isAdmin: isAdminOrPhase1,
          loading,
          onDelete: async (id) => {
            if (!confirmDeleteAction('this reservation record')) return;
            await apiService.deleteReservation(id);
            setReservations(reservations.filter(r => r.id !== id));
          }
        })
      )
    ),
    // Modals
    activeModal === 'reservation' && React.createElement(ReservationModal, { initialData: selectedRes || {}, rooms, calendarEvents, onClose: () => setActiveModal(null), onSubmit: async (fd) => { setLoading(true); try { await apiService.createReservation(fd); setNotification('Created!'); setActiveModal('notification'); await refreshReservationsOnly(); } catch (err) { setError(err.message); } finally { setLoading(false); } }, loading }),
    activeModal === 'details' && React.createElement(DetailsModal, { 
      res: selectedRes, 
      user: currentUser, 
      rooms,
      onClose: () => setActiveModal(null), 
      onApproveStage1: async () => { 
        setLoading(true); 
        try { 
          await apiService.approveConceptStage1(selectedRes.id); 
          const updatedReservations = await refreshReservationsOnly(); 
          setSelectedRes(updatedReservations.find(r => r.id === selectedRes.id) || selectedRes);
          setNotification('Concept Approved! User can now submit final form.'); 
          setActiveModal('notification'); 
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); } 
      }, 
      onApproveFinal: async (id) => { 
        setLoading(true); 
        try { 
          await apiService.approveFinal(id); 
          await refreshReservationsAndCalendar();
          setNotification('Reservation fully approved! Now visible on calendar.'); 
          setActiveModal('notification'); 
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); } 
      },
      onUploadFinalForm: async (id, finalFormUrl) => { 
        setLoading(true); 
        try { 
          await apiService.uploadFinalForm(id, finalFormUrl); 
          const updatedReservations = await refreshReservationsOnly(); 
          setSelectedRes(updatedReservations.find(r => r.id === id) || selectedRes);
          setNotification('Final form submitted! Awaiting admin approval.'); 
          setActiveModal('notification'); 
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); } 
      },
      onArchive: handleArchive,
      onDenyClick: () => setActiveModal('deny'), 
      loading 
    }),
    activeModal === 'deny' && React.createElement(DenyModal, { res: selectedRes, onClose: () => setActiveModal('details'), onConfirm: async (reason) => { setLoading(true); try { await apiService.denyReservation(selectedRes.id, reason); if ((selectedRes.status || '').toLowerCase() === 'concept-approved') { await refreshReservationsAndCalendar(); } else { await refreshReservationsOnly(); } setNotification('Denied'); setActiveModal('notification'); } catch (err) { setError(err.message); } finally { setLoading(false); } }, loading }),

    activeModal === 'profile' && React.createElement(ProfileModal, {
      user: currentUser,
      onClose: () => setActiveModal(null),
      onLogout: handleLogout,
      onProfileUpdated: (nextUser) => setCurrentUser(nextUser)
    }),
    activeModal === 'notifications' && React.createElement(NotificationsListModal, {
      notifications: getUnreadNotifications(),
      user: currentUser,
      isAdmin: isAdminOrPhase1,
      onClose: () => setActiveModal(null),
      onMarkSeen: markNotificationSeen,
      onMarkAllSeen: markAllNotificationsSeen,
      onViewRequest: (r) => { setSelectedRes(r); setActiveModal('details'); }
    }),
    activeModal === 'notification' && React.createElement(NotificationModal, { message: notification, onClose: () => setActiveModal(null) }),
    activeModal === 'eventDetails' && React.createElement(EventDetailsModal, { 
      event: selectedRes, 
      rooms, 
      user: currentUser,
      isAdmin,
      loading,
      onClose: () => setActiveModal(null),
      onDeleteClick: (actionType) => {
        if (selectedRes && (selectedRes.event_type === 'holiday' || selectedRes.is_holiday)) {
          
          // ADD A CONFIRMATION HERE SO ADMINS DON'T MISCLICK
          if (!window.confirm("Are you sure you want to delete this holiday?")) return;

          setLoading(true);
          
          // FIX THE ID BUG HERE: Use selectedRes.holiday_id OR selectedRes.id
          const targetId = selectedRes.holiday_id || selectedRes.id; 
          
          apiService.deleteHoliday(targetId)
            .then(async () => {
              await refreshCalendarOnly();
              setNotification('Holiday deleted successfully.');
              setActiveModal('notification');
            })
            .catch((err) => setError(err.message || 'Failed to delete holiday'))
            .finally(() => setLoading(false));
          return;
        }
        
        // Normal reservation logic
        setEventActionType(actionType || 'delete');
        setActiveModal('deleteEvent');
      }
    }),
    activeModal === 'deleteEvent' && React.createElement(DeleteEventModal, {
      event: selectedRes,
      actionType: eventActionType,
      onClose: () => setActiveModal('eventDetails'),
      onConfirm: async (reason) => {
        setLoading(true);
        try {
          // Use the actionType directly (either 'cancel' or 'delete')
          await apiService.deleteEventWithReason(selectedRes.id, reason, eventActionType);
          await refreshReservationsAndCalendar();
          setNotification(eventActionType === 'cancel' ? 'Event cancelled and user notified' : 'Event deleted permanently');
          setActiveModal('notification');
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
      },
      loading
    }),
    activeModal === 'holiday' && React.createElement(HolidayModal, {
      onClose: () => setActiveModal(null),
      onConfirm: async (payload) => {
        setLoading(true);
        try {
          await apiService.createHoliday(payload);
          await refreshCalendarOnly();
          setNotification('Holiday added to calendar. Reservations are now blocked for that date.');
          setActiveModal('notification');
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
      },
      loading
    }),
    React.createElement(AIChatbotWidget, { user: currentUser, rooms, calendarEvents })
  );
}

// Components
function LoginPage({ onLogin, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const handleSubmit = (e) => { e.preventDefault(); onLogin(username, password); };
  const loginBgStyle = {
    backgroundImage: `url('${window.location.origin}/design.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };
  
  return React.createElement('div', { className: 'h-screen flex items-center justify-center', style: loginBgStyle },
    React.createElement('form', { onSubmit: handleSubmit, className: 'bg-white/95 backdrop-blur-sm p-12 rounded-2xl shadow-xl w-full max-w-md' },
      React.createElement('h1', { className: 'text-4xl font-bold text-center mb-2' }, 'VacanSee'),
      React.createElement('p', { className: 'text-slate-500 text-center mb-8' }, 'Reservation System'),
      React.createElement('input', { value: username, onChange: (e) => setUsername(e.target.value), className: 'w-full p-3 border rounded-lg mb-4', placeholder: 'Username', required: true }),
      React.createElement('input', { type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), className: 'w-full p-3 border rounded-lg', placeholder: 'Password', required: true }),
      React.createElement('label', { className: 'flex items-center gap-2 text-xs text-slate-600 mt-2 mb-4 select-none' },
        React.createElement('input', {
          type: 'checkbox',
          checked: showPassword,
          onChange: (e) => setShowPassword(e.target.checked)
        }),
        'Show password'
      ),
      error && React.createElement('p', { className: 'text-red-500 text-center mb-4' }, error),
      React.createElement('button', { type: 'submit', disabled: loading, className: 'w-full bg-sky-500 text-white p-3 rounded-lg font-bold' }, loading ? 'Signing in...' : 'Sign In'),
      React.createElement('p', { className: 'text-xs text-slate-400 text-center mt-6' }, "Try: Guest/Guesting123")
    )
  );
}

// Smoothie-style SVG icons (inline, 24x24, stroke-based)
function SmoothieIcon({ name, cls }) {
  const s = { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', strokeWidth: 1.5, stroke: 'currentColor', className: cls || 'w-5 h-5' };
  const paths = {
    dashboard: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H18v-.008Zm0 2.25h.008v.008H18V15Z',
    facilities: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z',
    reservations: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
    analytics: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
    archive: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z',
    logout: 'M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25',
    close: 'M6 18 18 6M6 6l12 12',
    bell: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
    user: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
    clock: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
    check: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    'check-simple': 'M4.5 12.75l6 6 9-13.5',
    tag: 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z M6 6h.008v.008H6V6Z',
    'map-pin': 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
    printer: 'M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z',
    flag: 'M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5',
    wrench: 'M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z',
    building: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
    trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
    ban: 'M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636',
    'mail-open': 'M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z',
    menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
    pencil: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125',
    'info': 'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
    'document': 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
    'calendar-days': 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  };
  if (name === 'settings') {
    return React.createElement('svg', s,
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z' }),
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' })
    );
  }
  return paths[name]
    ? React.createElement('svg', s, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: paths[name] }))
    : null;
}

function Sidebar({ currentView, setView, user, onLogout, isAdmin, mobileMenuOpen, onClose }) {
  const NavBtn = ({ id, label, icon }) => React.createElement('button', {
    onClick: () => setView(id),
    className: `flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${currentView === id ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`
  },
    React.createElement('span', { className: `shrink-0 ${currentView === id ? 'text-sky-500' : 'text-slate-400'}` },
      React.createElement(SmoothieIcon, { name: icon })
    ),
    React.createElement('span', null, label)
  );

  return React.createElement('aside', { className: `fixed md:relative z-50 w-64 bg-white border-r flex flex-col py-6 px-4 h-full transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}` },
    React.createElement('button', {
      onClick: onClose,
      className: 'absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 transition-colors md:hidden'
    }, React.createElement(SmoothieIcon, { name: 'close' })),

    React.createElement('div', { className: 'flex items-center gap-2.5 px-3 mb-8' },
      React.createElement('span', { className: 'text-xl font-bold text-sky-500 tracking-tight' }, 'VacanSee')
    ),

    React.createElement('nav', { className: 'flex-1 space-y-1' },
      React.createElement(NavBtn, { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }),
      React.createElement(NavBtn, { id: 'calendar', label: 'Event Calendar', icon: 'calendar' }),
      React.createElement(NavBtn, { id: 'facilities', label: 'Facilities', icon: 'facilities' }),
      isAdmin && React.createElement('div', { className: 'pt-3 mt-3 border-t border-slate-100' },
        React.createElement('p', { className: 'text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-3' }, 'Admin'),
        React.createElement(NavBtn, { id: 'reservations', label: 'Requests', icon: 'reservations' }),
        React.createElement(NavBtn, { id: 'analytics', label: 'Analytics', icon: 'analytics' }),
        React.createElement(NavBtn, { id: 'settings', label: 'Settings', icon: 'settings' })
      ),
      React.createElement('div', { className: 'pt-3 mt-3 border-t border-slate-100' },
        React.createElement(NavBtn, { id: 'archive', label: 'Archive', icon: 'archive' })
      )
    ),

    React.createElement('div', { className: 'pt-4 border-t border-slate-100 flex items-center gap-3 px-1' },
      React.createElement('div', { className: 'w-9 h-9 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold text-sm shrink-0' }, user.username[0].toUpperCase()),
      React.createElement('div', { className: 'flex-1 overflow-hidden' },
        React.createElement('p', { className: 'font-semibold text-sm truncate text-slate-800' }, user.username),
        React.createElement('button', {
          onClick: onLogout,
          className: 'text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors mt-0.5'
        },
          React.createElement(SmoothieIcon, { name: 'logout', cls: 'w-3.5 h-3.5' }),
          'Log out'
        )
      )
    )
  );
}

function Header({ title, onOpenProfile, onOpenNotifications, hasUnread, user, onMenuClick }) {
  return React.createElement('header', { className: 'bg-white border-b px-4 md:px-8 py-4 flex justify-between items-center' },
    React.createElement('div', { className: 'flex items-center gap-3' },
      // Hamburger menu for mobile
      React.createElement('button', { 
        onClick: onMenuClick, 
        className: 'p-2 text-slate-500 hover:text-sky-500 md:hidden',
        title: 'Menu'
      }, React.createElement(SmoothieIcon, { name: 'menu', cls: 'w-5 h-5' })),
      React.createElement('h2', { className: 'text-lg md:text-xl font-bold text-slate-800 capitalize' }, title)
    ),
    React.createElement('div', { className: 'flex gap-2 items-center' },
      // Notification bell
      React.createElement('button', { 
        onClick: onOpenNotifications, 
        className: 'p-2 text-slate-400 hover:text-sky-500 transition relative',
        title: 'Notifications'
      }, 
        React.createElement(SmoothieIcon, { name: 'bell', cls: 'w-5 h-5' }),

        hasUnread && React.createElement('span', { className: 'absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse' })
      ),
      // Profile button
      React.createElement('button', { 
        onClick: onOpenProfile, 
        className: 'ml-2 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-sky-50 hover:border-sky-300 transition-all overflow-hidden',
        title: 'Profile'
      }, React.createElement(SmoothieIcon, { name: 'user', cls: 'w-5 h-5' }))
    )
  );
}

function StatCard({ label, val }) {
  return React.createElement('div', { className: 'bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border text-center' },
    React.createElement('p', { className: 'text-xs md:text-sm text-slate-500 mb-1' }, label),
    React.createElement('p', { className: 'text-2xl md:text-3xl font-bold text-sky-600' }, val)
  );
}

function InlineSpinner({ label = 'Loading...' }) {
  return React.createElement('div', { className: 'flex items-center justify-center gap-3 py-6 text-slate-500' },
    React.createElement('span', {
      className: 'inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500'
    }),
    React.createElement('span', { className: 'text-sm font-medium' }, label)
  );
}

function Badge({ status }) {
  const colors = { pending: 'bg-yellow-100 text-yellow-700', 'concept-approved': 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', denied: 'bg-red-100 text-red-700', archived: 'bg-amber-100 text-amber-700', cancelled: 'bg-yellow-100 text-yellow-700', deleted: 'bg-yellow-100 text-yellow-700' };
  return React.createElement('span', { className: `px-3 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-slate-100 text-slate-700'}` }, status);
}

// Hook: live countdown for concept-approved reservations awaiting Stage 2.
// Returns { msLeft, hasExpired } and notifies the backend when the deadline passes.
function useStage2Countdown(reservation, onExpired) {
  const [msLeft, setMsLeft] = useState(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    const isEligible =
      reservation.status === 'concept-approved' &&
      !reservation.final_form_uploaded &&
      !reservation.final_form_url;

    if (!isEligible) {
      setMsLeft(null);
      return;
    }

    const anchor = reservation.concept_approved_at || reservation.date_filed;
    if (!anchor) {
      setMsLeft(null);
      return;
    }

    const deadline = new Date(new Date(anchor).getTime() + 5 * 24 * 60 * 60 * 1000);

    const tick = () => {
      const remaining = deadline - new Date();
      setMsLeft(remaining);

      // When the deadline passes for the first time in this session, tell the backend.
      if (remaining <= 0 && !notifiedRef.current) {
        notifiedRef.current = true;
        apiService.expireReservation(reservation.id)
          .then(() => { if (onExpired) onExpired(reservation.id); })
          .catch(() => {}); // non-critical — backend scheduler will catch it too
      }
    };

    tick(); // run immediately
    const id = setInterval(tick, 30000); // refresh every 30 s (status changes via polling)
    return () => clearInterval(id);
  }, [reservation.id, reservation.status, reservation.concept_approved_at, reservation.date_filed,
      reservation.final_form_uploaded, reservation.final_form_url]);

  return msLeft;
}

// Countdown display component used inside the reservation list.
function Stage2CountdownBadge({ reservation, onExpired }) {
  const msLeft = useStage2Countdown(reservation, onExpired);

  if (msLeft === null) return null;

  if (msLeft <= 0) {
    return React.createElement('span', { className: 'flex items-center gap-1 text-xs text-red-500 font-bold ml-1' },
      React.createElement(SmoothieIcon, { name: 'clock', cls: 'w-3.5 h-3.5 shrink-0' }),
      'Deadline passed — awaiting system update'
    );
  }

  const days    = Math.floor(msLeft / (24 * 60 * 60 * 1000));
  const hours   = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));

  return React.createElement('span', { className: 'flex items-center gap-1 text-xs text-orange-500 font-semibold ml-1' },
    React.createElement(SmoothieIcon, { name: 'clock', cls: 'w-3.5 h-3.5 shrink-0' }),
    `${days}d ${hours}h ${minutes}m left to upload final form`
  );
}

function Dashboard({ reservations, rooms, archive, user, onViewDetails, onBook, onArchive, onRefresh, loading }) {
  const toTimestamp = (isoString) => {
    if (!isoString) return Number.MAX_SAFE_INTEGER;
    const dt = new Date(isoString);
    return Number.isNaN(dt.getTime()) ? Number.MAX_SAFE_INTEGER : dt.getTime();
  };

  const formatReservationMeta = (reservation) => {
    const start = reservation.start_time ? new Date(reservation.start_time) : null;
    const end = reservation.end_time ? new Date(reservation.end_time) : null;
    const hasValidStart = start && !Number.isNaN(start.getTime());
    const hasValidEnd = end && !Number.isNaN(end.getTime());

    const dateText = hasValidStart
      ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Date unavailable';
    const timeText = hasValidStart && hasValidEnd
      ? `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      : '';
    const facilityText = reservation.room_name || 'Unknown facility';

    return [dateText, timeText, facilityText].filter(Boolean).join(' • ');
  };

  const byUpcomingThenRecent = (a, b) => {
    const now = Date.now();
    const aTs = toTimestamp(a.start_time);
    const bTs = toTimestamp(b.start_time);
    const aUpcoming = aTs >= now;
    const bUpcoming = bTs >= now;

    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    if (aUpcoming && bUpcoming) return aTs - bTs;
    if (!aUpcoming && !bUpcoming) return bTs - aTs;
    return (b.id || 0) - (a.id || 0);
  };

  // Show all user's reservations, including archived, for analytics/statistics
  const userRes = reservations.filter(r => r.user_id === user.id);
  const orderedUserRes = [...userRes].sort(byUpcomingThenRecent);
  // Show all approved, including archived, for analytics/statistics
  const approved = reservations.filter(r => r.status === 'approved');
  
  return React.createElement('div', { className: 'space-y-6 md:space-y-8' },
    // Stats row
    React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4' },
      React.createElement(StatCard, { label: 'My Reservations', val: userRes.length }),
      React.createElement(StatCard, { label: 'Approved', val: approved.length }),
      React.createElement(StatCard, { label: 'Pending', val: userRes.filter(r => r.status === 'pending').length }),
      React.createElement(StatCard, { label: 'Archived', val: archive.length })
    ),
    // Single-column full-width layout for My Reservations
    React.createElement('div', { className: 'w-full' },
      React.createElement('div', { className: 'bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border w-full' },
        React.createElement('h3', { className: 'font-bold text-lg mb-4 text-slate-800' }, 'My Reservations'),
        loading
          ? React.createElement(InlineSpinner, { label: 'Loading reservations...' })
          : orderedUserRes.length === 0 
          ? React.createElement('p', { className: 'text-slate-400 py-8 text-center' }, 'No reservations yet. Book a space to get started!')
          : React.createElement('div', { className: 'max-h-72 overflow-y-auto space-y-2 pr-1' },
              orderedUserRes.map(r => React.createElement('div', { key: r.id, className: `p-4 rounded-xl border mb-1 ${r.status === 'denied' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-transparent hover:bg-sky-50 cursor-pointer'} transition` },
                React.createElement('div', { className: 'flex justify-between items-start gap-2' },
                  React.createElement('div', { className: 'flex-1 min-w-0', onClick: () => onViewDetails(r), style: { cursor: 'pointer' } }, 
                    React.createElement('p', { className: 'font-bold text-slate-800 truncate' }, r.activity_purpose), 
                    React.createElement('p', { className: 'text-sm text-slate-500' }, formatReservationMeta(r)),
                    r.status === 'denied' && r.denial_reason && React.createElement('p', { className: 'text-xs text-red-500 mt-1 italic' }, `Reason: ${r.denial_reason}`),
                    // Live 5-day countdown for concept-approved — calls backend when deadline passes
                    React.createElement(Stage2CountdownBadge, {
                      reservation: r,
                      onExpired: onRefresh
                    })
                  ),
                  React.createElement('div', { className: 'flex flex-col items-end gap-1 shrink-0' },
                    React.createElement(Badge, { status: r.status }),
                    (['denied', 'approved'].includes(r.status)) && React.createElement('button', {
                      className: 'text-xs text-slate-400 hover:text-amber-600 hover:bg-amber-50 px-2 py-0.5 rounded transition mt-1 border border-slate-200',
                      title: 'Archive this reservation',
                      onClick: (e) => { e.stopPropagation(); if (onArchive) onArchive(r.id); }
                    }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'archive', cls: 'w-3 h-3 mr-1' }), 'Archive'))
                  )
                )
              ))
            )
      )
    )
    // Quick Book feature removed
  );
}

function ReservationModal({ initialData, rooms, calendarEvents, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    room_id: initialData?.room_id || '',
    activity_purpose: '',
    person_in_charge: '',
    department_temp: '',
    contact_country_code: '+63',
    contact_number: '',
    event_start_date: '',
    event_end_date: '',
    start_hour: '',
    start_minute: '',
    start_period: '',
    end_hour: '',
    end_minute: '',
    end_period: '',
    concept_paper_url: '',
    division: '',
    requester_type: '',
    num_attendees: '',
    activity_classification: '',
    equipment: {},
    housekeeping_needed: false,
    housekeeping_count: '',
    security_guard_needed: false,
    security_guard_count: '',
    engineering_aircon: false,
    engineering_elevator: false,
    engineering_electrical_setup: false,
    engineering_others: ''
  });
  const [hasEndDate, setHasEndDate] = useState(false);
  const [localError, setLocalError] = useState('');
  const contactRule = COUNTRY_PHONE_RULES[form.contact_country_code] || { min: 7, max: 12, label: 'Contact number should be 7 to 12 digits.' };

  // Get available equipment based on selected room
  const selectedRoomObj = rooms.find(r => r.id == form.room_id);
  const availableEquip = selectedRoomObj
    ? (EQUIPMENT_DATA[selectedRoomObj.name] || DEFAULT_EQUIPMENT)
    : [];

  const handleEquipChange = (item, qty) => {
    const nextValue = qty === '' ? '' : (parseInt(qty, 10) || 0);
    setForm({
      ...form,
      equipment: {
        ...form.equipment,
        [item]: nextValue
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    const missingFields = [];
    
    // Helper to validate Google Drive links
    const isValidGoogleDriveLink = (url) => {
      if (!url) return true; // Allow empty for now 
      const trimmed = url.trim();
      return trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com');
    };
    
    if (!form.room_id) missingFields.push('Space');
    if (!form.activity_purpose?.trim()) missingFields.push('Activity Purpose');
    if (!form.person_in_charge?.trim()) missingFields.push('Person In Charge');
    if (!form.contact_number?.trim()) missingFields.push('Contact');
    if (!form.event_start_date) missingFields.push('Start Date');
    if (hasEndDate && !form.event_end_date) missingFields.push('End Date');
    if (!form.concept_paper_url?.trim()) missingFields.push('Concept Paper Link');
    if (form.concept_paper_url?.trim() && !isValidGoogleDriveLink(form.concept_paper_url)) {
      missingFields.push('Concept Paper Link must be a valid Google Drive or Docs link');
    }
    if (!form.division?.trim()) missingFields.push('Division');
    if (!form.requester_type) missingFields.push('Requester Type (Student/Employee/Other)');
    if (!form.num_attendees || Number(form.num_attendees) < 1) missingFields.push('Number of Attendees');
    if (!form.activity_classification) missingFields.push('Activity Classification');

    if (!form.start_hour || !form.start_minute || !form.start_period || !form.end_hour || !form.end_minute || !form.end_period) {
      missingFields.push('Complete Start/End Time (Hour, Min, AM/PM)');
    }

    if (missingFields.length > 0) {
      setLocalError(`Please complete the following required fields: ${missingFields.join(', ')}.`);
      return;
    }

    if (form.housekeeping_needed && (!form.housekeeping_count || Number(form.housekeeping_count) < 1)) {
      setLocalError('Please enter how many housekeeping staff are needed.');
      return;
    }
    if (form.security_guard_needed && (!form.security_guard_count || Number(form.security_guard_count) < 1)) {
      setLocalError('Please enter how many security guards are needed.');
      return;
    }

    const contactDigits = (form.contact_number || '').replace(/\D/g, '');
    if (!contactDigits) {
      setLocalError('Please provide a valid contact number.');
      return;
    }
    if (contactDigits.length < contactRule.min || contactDigits.length > contactRule.max) {
      setLocalError(contactRule.label);
      return;
    }

    const convertTo24Hour = (hourString, period) => {
      const hour12 = Number(hourString);
      if (!hour12 || !period) return null;
      if (period === 'AM') return hour12 === 12 ? 0 : hour12;
      return hour12 === 12 ? 12 : hour12 + 12;
    };

    const startHour24 = convertTo24Hour(form.start_hour, form.start_period);
    const endHour24 = convertTo24Hour(form.end_hour, form.end_period);

    if (startHour24 === null || endHour24 === null) {
      setLocalError('Please select complete start and end times.');
      return;
    }

    // Preserve allowed booking window from the previous form (6:00 to 22:30)
    if (startHour24 < 6 || startHour24 > 22 || endHour24 < 6 || endHour24 > 22) {
      setLocalError('Reservation time must be between 6:00 AM and 10:30 PM.');
      return;
    }

    // Combine hour and minute into time string
    const startTime = `${String(startHour24).padStart(2, '0')}:${form.start_minute}`;
    const endTime = `${String(endHour24).padStart(2, '0')}:${form.end_minute}`;

    // Validate end time is after start time
    if (startTime >= endTime) {
      setLocalError('End time must be after start time.');
      return;
    }

    // Check for double booking against approved calendar events
    const effectiveEndDate = hasEndDate ? form.event_end_date : form.event_start_date;
    const newStartIso = `${form.event_start_date}T${startTime}`;
    const newEndIso = `${effectiveEndDate}T${endTime}`;
    const newStartDate = new Date(newStartIso);
    const newEndDate = new Date(newEndIso);

    if (Number.isNaN(newStartDate.getTime()) || Number.isNaN(newEndDate.getTime())) {
      setLocalError('Please provide valid start/end dates and times.');
      return;
    }

    if (newEndDate <= newStartDate) {
      setLocalError('End date/time must be after start date/time.');
      return;
    }

    const now = new Date();
    if (newStartDate < now) {
      setLocalError('Start date/time cannot be in the past. Please pick a future schedule.');
      return;
    }

    const maxReservationSpanMs = 7 * 24 * 60 * 60 * 1000;
    if ((newEndDate.getTime() - newStartDate.getTime()) > maxReservationSpanMs) {
      setLocalError('End date/time is too far from the start date/time. Maximum allowed span is 7 days.');
      return;
    }

    const newRoomId = parseInt(form.room_id);

    const holidayConflict = (calendarEvents || []).find(e => {
      const isHoliday = e.event_type === 'holiday' || e.is_holiday;
      if (!isHoliday || !e.start_time || !e.end_time) return false;
      const holidayStart = new Date(e.start_time);
      const holidayEnd = new Date(e.end_time);
      if (Number.isNaN(holidayStart.getTime()) || Number.isNaN(holidayEnd.getTime())) return false;
      return newStartDate <= holidayEnd && newEndDate >= holidayStart;
    });

    if (holidayConflict) {
      const holidayName = holidayConflict.holiday_name || holidayConflict.activity_purpose || 'holiday';
      setLocalError(`Reservations are suspended on this date due to ${holidayName}. Please pick another date.`);
      return;
    }

    const conflict = (calendarEvents || []).find(e => {
      if (e.event_type === 'holiday' || e.is_holiday) return false;
      const eventStatus = String(e.status || '').toLowerCase();
      if (eventStatus === 'cancelled' || eventStatus === 'deleted' || eventStatus === 'denied') return false;
      if (e.room_id != newRoomId) return false;
      if (!e.start_time || !e.end_time) return false;
      const eventStart = new Date(e.start_time);
      const eventEnd = new Date(e.end_time);
      if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) return false;
      return newStartDate < eventEnd && newEndDate > eventStart;
    });

    if (conflict) {
      const roomName = rooms?.find(r => r.id == newRoomId)?.name || 'This space';
      const conflictStart = conflict.start_time ? new Date(conflict.start_time).toLocaleString() : '';
      const conflictEnd = conflict.end_time ? new Date(conflict.end_time).toLocaleString() : '';
      setLocalError(`Double Booking Detected: ${roomName} is already reserved for "${conflict.activity_purpose}" during this range (${conflictStart} - ${conflictEnd}).`);
      return;
    }

    // Combine date with times for the API
    const servicesData = {
      housekeeping: {
        needed: !!form.housekeeping_needed,
        count: form.housekeeping_needed ? Number(form.housekeeping_count || 0) : 0
      },
      security_guard: {
        needed: !!form.security_guard_needed,
        count: form.security_guard_needed ? Number(form.security_guard_count || 0) : 0
      },
      requester_type: form.requester_type,
      engineering: {
        aircon: !!form.engineering_aircon,
        elevator: !!form.engineering_elevator,
        electrical_setup: !!form.engineering_electrical_setup,
        others: (form.engineering_others || '').trim()
      }
    };

    const formData = {
      ...form,
      contact_number: `${form.contact_country_code} ${contactDigits}`,
      start_time: newStartIso,
      end_time: newEndIso,
      equipment_data: {
        ...form.equipment,
        services: servicesData
      },
      // Map frontend field names to backend column names
      attendees: form.num_attendees,
      classification: form.activity_classification
    };
    onSubmit(formData);
  };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto' },
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('div', {},
          React.createElement('h3', { className: 'font-bold text-lg text-slate-800' }, 'New Reservation'),
          React.createElement('p', { className: 'text-xs text-slate-500' }, 'Fill in details by section for faster review')
        ),
        React.createElement('button', { onClick: onClose, className: 'text-2xl' }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' }))
      ),
      // Error banner
      localError && React.createElement('div', { className: 'mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-start gap-2' },
        React.createElement('span', {}, '⚠️'),
        React.createElement('p', {}, localError)
      ),
      React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
        React.createElement('div', { className: 'border rounded-xl p-4 bg-slate-50/60' },
          React.createElement('p', { className: 'text-xs uppercase tracking-wider font-bold text-slate-500 mb-3' }, 'Activity Details'),
          React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            React.createElement('select', { 
              value: form.room_id, 
              onChange: (e) => setForm({ ...form, room_id: e.target.value, equipment: {} }), 
              className: 'w-full p-2 border rounded bg-white', 
              required: true 
            },
              React.createElement('option', { value: '' }, 'Select space'),
              [...rooms].reverse().map(r => React.createElement('option', { key: r.id, value: r.id }, `${r.name} (${r.capacity})`)
            )),
            React.createElement('input', { placeholder: 'Activity Purpose', value: form.activity_purpose, onChange: (e) => setForm({ ...form, activity_purpose: e.target.value }), className: 'w-full p-2 border rounded bg-white', required: true }),
            React.createElement('input', { placeholder: 'Person In Charge', value: form.person_in_charge, onChange: (e) => setForm({ ...form, person_in_charge: e.target.value }), className: 'w-full p-2 border rounded bg-white' }),
            React.createElement('div', { className: 'flex flex-col gap-1' },
              React.createElement('input', { placeholder: 'Department (optional — leave blank to use your account department)', value: form.department_temp || '', onChange: (e) => setForm({ ...form, department_temp: e.target.value }), className: 'w-full p-2 border rounded bg-white text-sm' }),
              React.createElement('p', { className: 'text-xs text-slate-400 px-1' }, 'Optional: overrides your account department on the print form and event details.')
            ),
            React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
              React.createElement('select', {
                value: form.contact_country_code,
                onChange: (e) => setForm({ ...form, contact_country_code: e.target.value }),
                className: 'col-span-1 p-2 border rounded bg-white text-sm'
              },
                COUNTRY_PHONE_CODES.map(c => React.createElement('option', { key: c.code, value: c.code }, c.code))
              ),
              React.createElement('input', {
                placeholder: 'Contact Number',
                value: form.contact_number,
                onChange: (e) => {
                  const digitsOnly = String(e.target.value || '').replace(/\D/g, '');
                  setForm({ ...form, contact_number: digitsOnly.slice(0, contactRule.max) });
                },
                className: 'col-span-2 w-full p-2 border rounded bg-white',
                inputMode: 'numeric',
                maxLength: contactRule.max
              }),
              React.createElement('p', { className: 'col-span-3 text-[11px] text-slate-500' }, contactRule.label)
            ),
            React.createElement('input', { placeholder: 'Division', value: form.division, onChange: (e) => setForm({ ...form, division: e.target.value }), className: 'w-full p-2 border rounded bg-white' }),
            React.createElement('div', { className: 'w-full p-2 border rounded bg-white' },
              React.createElement('p', { className: 'text-xs font-semibold text-slate-600 mb-2' }, 'Requester Type'),
              React.createElement('div', { className: 'flex flex-wrap gap-4 text-sm text-slate-700' },
                ['Student', 'Employee', 'Other'].map((type) => React.createElement('label', { key: type, className: 'inline-flex items-center gap-2 cursor-pointer' },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: form.requester_type === type,
                    onChange: () => setForm({ ...form, requester_type: form.requester_type === type ? '' : type })
                  }),
                  type
                ))
              )
            ),
            React.createElement('input', { type: 'number', placeholder: 'Number of Attendees', min: '1', value: form.num_attendees, onChange: (e) => setForm({ ...form, num_attendees: e.target.value }), className: 'w-full p-2 border rounded bg-white' }),
            React.createElement('select', {
              value: form.activity_classification,
              onChange: (e) => setForm({ ...form, activity_classification: e.target.value }),
              className: 'w-full p-2 border rounded bg-white'
            },
              React.createElement('option', { value: '' }, 'Activity Classification'),
              ['Institutional', 'Curricular', 'Outside Group', 'Co-Curricular', 'Extra-Curricular'].map(c =>
                React.createElement('option', { key: c, value: c }, c)
              )
            )
          )
        ),

        React.createElement('div', { className: 'border rounded-xl p-4 bg-slate-50/60' },
          React.createElement('p', { className: 'text-xs uppercase tracking-wider font-bold text-slate-500 mb-3' }, 'Schedule'),
          React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            React.createElement('div', { className: 'space-y-1' },
              React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'Start Date'),
              React.createElement('input', { type: 'date', value: form.event_start_date, onChange: (e) => setForm({ ...form, event_start_date: e.target.value }), className: 'w-full p-2 border rounded bg-white', required: true })
            ),
            React.createElement('div', { className: 'space-y-1' },
              React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'Date Range'),
              React.createElement('label', { className: 'flex items-center gap-2 text-sm text-slate-700 p-2 border rounded bg-white' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: hasEndDate,
                  onChange: (e) => {
                    const checked = e.target.checked;
                    setHasEndDate(checked);
                    if (checked) {
                      setForm({ ...form, event_end_date: form.event_end_date || form.event_start_date });
                    } else {
                      setForm({ ...form, event_end_date: '' });
                    }
                  }
                }),
                'Add end date (multi-day reservation)'
              ),
              hasEndDate && React.createElement('input', {
                type: 'date',
                value: form.event_end_date,
                onChange: (e) => setForm({ ...form, event_end_date: e.target.value }),
                className: 'w-full p-2 border rounded bg-white',
                required: true
              })
            ),
            React.createElement('div', { className: 'space-y-1' },
              React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'Start Time'),
              React.createElement('div', { className: 'flex gap-2 items-center' },
                React.createElement('select', { 
                  value: form.start_hour, 
                  onChange: (e) => setForm({ ...form, start_hour: e.target.value }), 
                  className: 'w-1/3 p-2 border rounded bg-white', 
                  required: true 
                },
                  React.createElement('option', { value: '' }, 'Hour'),
                  HOUR_OPTIONS.map(h => React.createElement('option', { key: h, value: h }, h))
                ),
                React.createElement('span', { className: 'text-slate-500 font-bold' }, ':'),
                React.createElement('select', { 
                  value: form.start_minute, 
                  onChange: (e) => setForm({ ...form, start_minute: e.target.value }), 
                  className: 'w-1/3 p-2 border rounded bg-white', 
                  required: true 
                },
                  React.createElement('option', { value: '' }, 'Min'),
                  MINUTE_OPTIONS.map(m => React.createElement('option', { key: m, value: m }, m))
                ),
                React.createElement('select', {
                  value: form.start_period,
                  onChange: (e) => setForm({ ...form, start_period: e.target.value }),
                  className: 'w-1/3 p-2 border rounded bg-white',
                  required: true
                },
                  React.createElement('option', { value: '' }, 'AM/PM'),
                  AM_PM_OPTIONS.map(period => React.createElement('option', { key: period, value: period }, period))
                )
              )
            ),
            React.createElement('div', { className: 'space-y-1' },
              React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'End Time'),
              React.createElement('div', { className: 'flex gap-2 items-center' },
                React.createElement('select', { 
                  value: form.end_hour, 
                  onChange: (e) => setForm({ ...form, end_hour: e.target.value }), 
                  className: 'w-1/3 p-2 border rounded bg-white', 
                  required: true 
                },
                  React.createElement('option', { value: '' }, 'Hour'),
                  HOUR_OPTIONS.map(h => React.createElement('option', { key: h, value: h }, h))
                ),
                React.createElement('span', { className: 'text-slate-500 font-bold' }, ':'),
                React.createElement('select', { 
                  value: form.end_minute, 
                  onChange: (e) => setForm({ ...form, end_minute: e.target.value }), 
                  className: 'w-1/3 p-2 border rounded bg-white', 
                  required: true 
                },
                  React.createElement('option', { value: '' }, 'Min'),
                  MINUTE_OPTIONS.map(m => React.createElement('option', { key: m, value: m }, m))
                ),
                React.createElement('select', {
                  value: form.end_period,
                  onChange: (e) => setForm({ ...form, end_period: e.target.value }),
                  className: 'w-1/3 p-2 border rounded bg-white',
                  required: true
                },
                  React.createElement('option', { value: '' }, 'AM/PM'),
                  AM_PM_OPTIONS.map(period => React.createElement('option', { key: period, value: period }, period))
                )
              )
            )
          )
        ),

        // SERVICES SECTION
        React.createElement('div', { className: 'space-y-3 border rounded-xl p-4 bg-slate-50/60' },
          React.createElement('p', { className: 'text-sm font-bold text-slate-700' }, 'Services Needed'),

          React.createElement('div', { className: 'bg-slate-50 border rounded p-3 space-y-2' },
            React.createElement('label', { className: 'flex items-center gap-2 text-sm font-medium text-slate-700' },
              React.createElement('input', {
                type: 'checkbox',
                checked: form.housekeeping_needed,
                onChange: (e) => setForm({ ...form, housekeeping_needed: e.target.checked, housekeeping_count: e.target.checked ? form.housekeeping_count : '' })
              }),
              'Housekeeping Staff Needed'
            ),
            form.housekeeping_needed && React.createElement('input', {
              type: 'number',
              min: '1',
              placeholder: 'How many housekeeping staff?',
              value: form.housekeeping_count,
              onChange: (e) => setForm({ ...form, housekeeping_count: e.target.value }),
              className: 'w-full p-2 border rounded bg-white text-sm'
            })
          ),

          React.createElement('div', { className: 'bg-slate-50 border rounded p-3 space-y-2' },
            React.createElement('label', { className: 'flex items-center gap-2 text-sm font-medium text-slate-700' },
              React.createElement('input', {
                type: 'checkbox',
                checked: form.security_guard_needed,
                onChange: (e) => setForm({ ...form, security_guard_needed: e.target.checked, security_guard_count: e.target.checked ? form.security_guard_count : '' })
              }),
              'Security Guard Needed'
            ),
            form.security_guard_needed && React.createElement('input', {
              type: 'number',
              min: '1',
              placeholder: 'How many security guards?',
              value: form.security_guard_count,
              onChange: (e) => setForm({ ...form, security_guard_count: e.target.value }),
              className: 'w-full p-2 border rounded bg-white text-sm'
            })
          ),

          React.createElement('div', { className: 'bg-slate-50 border rounded p-3 space-y-2' },
            React.createElement('p', { className: 'text-sm font-medium text-slate-700' }, 'Engineering Services'),
            React.createElement('label', { className: 'flex items-center gap-2 text-sm text-slate-700' },
              React.createElement('input', {
                type: 'checkbox',
                checked: form.engineering_aircon,
                onChange: (e) => setForm({ ...form, engineering_aircon: e.target.checked })
              }),
              'Aircon'
            ),
            React.createElement('label', { className: 'flex items-center gap-2 text-sm text-slate-700' },
              React.createElement('input', {
                type: 'checkbox',
                checked: form.engineering_elevator,
                onChange: (e) => setForm({ ...form, engineering_elevator: e.target.checked })
              }),
              'Elevator'
            ),
            React.createElement('label', { className: 'flex items-center gap-2 text-sm text-slate-700' },
              React.createElement('input', {
                type: 'checkbox',
                checked: form.engineering_electrical_setup,
                onChange: (e) => setForm({ ...form, engineering_electrical_setup: e.target.checked })
              }),
              'Electrical Set-up'
            ),
            React.createElement('input', {
              type: 'text',
              placeholder: 'Others (please specify)',
              value: form.engineering_others,
              onChange: (e) => setForm({ ...form, engineering_others: e.target.value }),
              className: 'w-full p-2 border rounded bg-white text-sm'
            })
          )
        ),
        
        // EQUIPMENT SECTION
        availableEquip && availableEquip.length > 0 && React.createElement('div', { className: 'mt-4 border-t pt-4' },
          React.createElement('p', { className: 'text-sm font-bold text-slate-700 mb-2' }, 'Equipment / Services Provided:'),
          React.createElement('div', { className: 'grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1' },
            availableEquip.map(item => 
              React.createElement('div', { key: item, className: 'flex items-center justify-between bg-slate-50 p-2 rounded border' },
                React.createElement('span', { className: 'text-[10px] text-slate-600 font-medium' }, item),
                React.createElement('input', { 
                  type: 'number', 
                  min: '0',
                  value: form.equipment[item] ?? 0,
                  onChange: (e) => handleEquipChange(item, e.target.value),
                  onFocus: () => {
                    if ((form.equipment[item] ?? 0) === 0) {
                      setForm({
                        ...form,
                        equipment: {
                          ...form.equipment,
                          [item]: ''
                        }
                      });
                    }
                  },
                  onBlur: () => {
                    if (form.equipment[item] === '') {
                      setForm({
                        ...form,
                        equipment: {
                          ...form.equipment,
                          [item]: 0
                        }
                      });
                    }
                  },
                  className: 'w-12 p-1 text-xs border rounded text-center bg-white'
                })
              )
            )
          )
        ),

        React.createElement('div', { className: 'border rounded-xl p-4 bg-slate-50/60' },
          React.createElement('p', { className: 'text-xs uppercase tracking-wider font-bold text-slate-500 mb-3' }, 'Requirements'),
          React.createElement('input', { 
            type: 'url', 
            placeholder: 'Concept Paper Google Drive Link (docs.google.com or drive.google.com)', 
            value: form.concept_paper_url, 
            onChange: (e) => setForm({ ...form, concept_paper_url: e.target.value }), 
            className: 'w-full p-2 border rounded bg-white', 
            required: true,
            pattern: 'https?://(drive|docs)\\.google\\.com/.*',
            title: 'Please enter a valid Google Drive or Google Docs link.'
          })
        ),
        
        React.createElement('button', { type: 'submit', disabled: loading, className: 'w-full bg-sky-500 text-white p-2 rounded font-bold mt-4' }, loading ? '...' : 'Create')
      )
    )
  );
}

function AdminRequests({ reservations, onViewDetails, onArchive, loading }) {
  // Show all non-archived requests for admin and admin_phase1 (from all users)
  const toTimestamp = (isoString) => {
    if (!isoString) return 0;
    const dt = new Date(isoString);
    return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
  };

  const statusPriority = {
    pending: 1,
    'concept-approved': 2,
    approved: 3,
    denied: 4,
    cancelled: 5,
    deleted: 5,
  };

  const orderedRequests = [...reservations].sort((a, b) => {
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;

    const aFiled = toTimestamp(a.date_filed || a.start_time);
    const bFiled = toTimestamp(b.date_filed || b.start_time);
    if (aFiled !== bFiled) return bFiled - aFiled;

    return (b.id || 0) - (a.id || 0);
  });

  return React.createElement('div',
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Requests'),
    loading
      ? React.createElement(InlineSpinner, { label: 'Loading requests...' })
      : orderedRequests.length === 0
      ? React.createElement('p', { className: 'text-slate-500' }, 'None')
      : orderedRequests.map(r =>
          React.createElement('div', { key:r.id, className: `p-4 rounded-lg border mb-2 ${r.status === 'pending' ? 'bg-white' : r.status === 'concept-approved' ? 'bg-blue-50' : r.status === 'approved' ? 'bg-green-50' : r.status === 'denied' ? 'bg-red-50' : 'bg-slate-50'}` },
            React.createElement('div', { className: 'flex justify-between' },
              React.createElement('div', {}, React.createElement('p', { className: 'font-bold' }, r.activity_purpose), React.createElement('p', { className: 'text-sm' }, r.user)),
              React.createElement(Badge, { status: r.status })
            ),
            // Only allow clicking to view details, not to cancel/delete, for pending requests
            r.status !== 'pending' && React.createElement('div', { className: 'mt-2 flex gap-2' },
              React.createElement('button', {
                className: 'px-3 py-1 rounded bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold',
                onClick: () => onViewDetails(r)
              }, 'View Details'),
              onArchive && !['pending', 'concept-approved'].includes(r.status) && React.createElement('button', {
                className: 'px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold',
                onClick: () => onArchive(r.id)
              }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'archive', cls: 'w-3 h-3 mr-1 inline' }), 'Archive'))
            ),
            r.status === 'pending' && React.createElement('div', { className: 'mt-2 flex gap-2' },
              React.createElement('button', {
                className: 'px-3 py-1 rounded bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold',
                onClick: () => onViewDetails(r)
              }, 'View Details')
            )
          )
    )
  );
}

function DetailsModal({ res, user, rooms, onClose, onApproveStage1, onApproveFinal, onDenyClick, onUploadFinalForm, onArchive, loading }) {
  const [finalFormLink, setFinalFormLink] = useState('');
  const isAdmin = user.role === 'admin';
  const isPhase1Admin = user.role === 'admin_phase1';
  const isOwner = res.user_id === user.id;

  // Get requested equipment (filter numeric quantities > 0 and ignore non-qty entries like services)
  const requestedEquip = res.equipment_data
    ? Object.entries(res.equipment_data).filter(([key, qty]) => key !== 'services' && typeof qty === 'number' && qty > 0)
    : [];
  const requestedServices = res.equipment_data?.services || {};

  // Format datetime to readable 12-hour format
  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const handlePrint = () => {
    try {
    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const firstNonEmpty = (...values) => {
      for (const value of values) {
        if (value === null || value === undefined) continue;
        const asString = String(value).trim();
        if (asString) return asString;
      }
      return '';
    };

    const start = res.start_time ? new Date(res.start_time) : null;
    const end = res.end_time ? new Date(res.end_time) : null;
    const startDateNeeded = start ? start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const endDateNeeded = end ? end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const dateNeeded = startDateNeeded && endDateNeeded
      ? (startDateNeeded === endDateNeeded ? startDateNeeded : `${startDateNeeded} to ${endDateNeeded}`)
      : (startDateNeeded || endDateNeeded || '');
    const startTime = start ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
    const endTime = end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
    const dateFiledSource = res.date_filed || res.created_at || res.submitted_at;
    const dateFiled = dateFiledSource
      ? new Date(dateFiledSource).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';
    const departmentCompany = firstNonEmpty(
      res.department_temp,
      res.department,
      res.department_name,
      res.company,
      res.organization,
      res.school_department,
      res.division,
      res.user_department,
      res.requestor_department
    );
    const divisionName = firstNonEmpty(res.division, res.department, res.department_name, res.user_department);
    const attendeeCount = firstNonEmpty(res.attendees, res.num_attendees, res.participants);
    const personInCharge = firstNonEmpty(res.person_in_charge, res.requestor_name, res.requested_by, res.full_name);
    const contactNumber = firstNonEmpty(res.contact_number, res.contact, res.phone_number, res.mobile_number);
    const normalizedRequesterType = firstNonEmpty(
      res.equipment_data?.services?.requester_type,
      res.requester_type,
      res.requestor_type,
      res.user_type
    ).toLowerCase();
    const requesterIsStudent = normalizedRequesterType.includes('student');
    const requesterIsEmployee = normalizedRequesterType.includes('employee') || normalizedRequesterType.includes('faculty') || normalizedRequesterType.includes('staff');
    const requesterIsOther = Boolean(normalizedRequesterType) && !requesterIsStudent && !requesterIsEmployee;
    const normalizedActivityClassification = firstNonEmpty(res.classification, res.activity_classification)
      .toLowerCase()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const isClassification = (label) => normalizedActivityClassification === label;
    const selectedRoom = rooms?.find(r => Number(r.id) === Number(res.room_id));
    const roomName = selectedRoom?.name || '';
    const roomCode = (selectedRoom?.code || '').toLowerCase();
    const normalizedRoomName = roomName.toLowerCase();

    const matchesFacility = (...keywords) =>
      keywords.some((key) => normalizedRoomName.includes(key) || roomCode === key || roomCode.includes(key));

    const isPAT = matchesFacility('pat', 'performing arts theatre', 'performing arts theater');
    const isCollegeLobby = matchesFacility('college lobby');
    const isQuadrangle = matchesFacility('quadrangle', 'quad');
    const isStudioRoom = matchesFacility('studio room');
    const isOthersFacility = Boolean(roomName) && ![
      isPAT,
      isCollegeLobby,
      isQuadrangle,
      isStudioRoom
    ].some(Boolean);

    const equipmentQty = Object.fromEntries(requestedEquip.map(([item, qty]) => [String(item).toLowerCase(), qty]));
    const yesNo = (value) => (value ? 'Yes' : 'No');
    const checkbox = (checked) => (checked ? '☑' : '☐');
    const hasMatch = (needle) => Object.keys(equipmentQty).some((k) => k.includes(needle));
    const qtyByNeedle = (needle) => {
      const entry = Object.entries(equipmentQty).find(([k]) => k.includes(needle));
      return entry ? entry[1] : '';
    };
    const deriveBucketHeaderUrl = () => {
      const imageCandidates = [
        selectedRoom?.image_url,
        ...(rooms || []).map((r) => r?.image_url)
      ].filter(Boolean);

      const bucketBase = imageCandidates.find((url) => String(url).includes('/storage/v1/object/public/'));
      if (!bucketBase) {
        return `${window.location.origin}/header2.png`;
      }

      const marker = '/storage/v1/object/public/';
      const [originPart, bucketAndKey] = String(bucketBase).split(marker);
      if (!originPart || !bucketAndKey) {
        return `${window.location.origin}/header2.png`;
      }

      return `${originPart}${marker}image_loc/facilities/header2.png`;
    };

    const headerImageUrl = deriveBucketHeaderUrl();

    const htmlContent = `
      <html>
      <head>
        <title>Common Facility Request Form</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            background: #aaa;
            display: flex;
            justify-content: center;
            padding: 30px;
          }
          .page {
            width: 8.5in;
            min-height: 14in;
            background: white;
            padding: 0.5in 0.75in;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          }
          .header-img { width: 100%; display: block; margin-bottom: 8px; }
          .form-title-row {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            margin-bottom: 6px;
            gap: 12px;
          }
          .form-title-spacer {}
          .form-title {
            font-size: 14pt;
            font-weight: bold;
            text-align: center;
            padding: 4px 0;
          }
          .form-code-wrap { display: flex; justify-content: flex-end; }
          .form-code {
            border: 1px solid black;
            padding: 2px 5px;
            font-size: 7.5pt;
            text-align: center;
            line-height: 1.4;
          }
          .fields-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
          }
          .fields-table td {
            border: none;
            padding: 5px 6px;
            font-size: 10pt;
            white-space: nowrap;
          }
          .fields-table td b { font-weight: bold; }
          .uline {
            display: inline-block;
            border-bottom: 1px solid black;
            vertical-align: bottom;
          }
          .person-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
          }
          .person-table td {
            border: none;
            padding: 4px 6px;
            font-size: 10pt;
          }
          .person-table td.label-cell {
            text-align: center;
            font-size: 9pt;
            font-style: italic;
            padding-top: 2px;
          }
          .classification-label {
            font-weight: bold;
            font-size: 10pt;
            margin: 10px 0 4px;
          }
          .class-table {
            width: 100%;
            border-collapse: collapse;
          }
          .class-table td {
            border: none;
            padding: 3px 6px;
            font-size: 10pt;
            text-align: center;
          }
          .classification-option { text-align: center; }
          .chk {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10pt;
            margin: 3px 0;
            white-space: nowrap;
          }
          .section-header {
            text-align: center;
            font-weight: bold;
            font-size: 10pt;
            padding: 7px 0 4px;
          }
          .box-table {
            width: 100%;
            border-collapse: collapse;
            margin: 2px 0;
          }
          .box-table td {
            border: 1px solid black;
            padding: 6px 8px;
            font-size: 10pt;
            vertical-align: top;
          }
          .facility-col { width: 33.33%; }
          .equip-col { width: 33.33%; }
          .sig-space { height: 70px; }
          .sig-space-sm { height: 50px; }
          .sig-line {
            border-top: 1px solid black;
            text-align: center;
            font-weight: bold;
            font-size: 10pt;
            padding-top: 3px;
            margin-top: 2px;
          }
          .sig-role {
            text-align: center;
            font-size: 9pt;
          }
          .col-hdr {
            background: #e0e0e0;
            font-weight: bold;
            text-align: center;
            font-size: 10pt;
            padding: 5px 8px;
          }
          .no-right { border-right: none !important; }
          .no-left  { border-left:  none !important; }
          .note {
            font-size: 9pt;
            font-weight: bold;
            margin: 8px 0 6px;
            line-height: 1.4;
          }
          .footer-label {
            font-size: 9pt;
            margin: 8px 0 4px;
          }
          .footer-table {
            width: 100%;
            border-collapse: collapse;
          }
          .footer-table td {
            border: none;
            padding: 1px 6px;
            font-size: 9pt;
            vertical-align: top;
            width: 33.33%;
          }
          @media print {
            @page { size: legal; margin: 0; }
            body { background: white; padding: 0; }
            .page { box-shadow: none; margin: 0; width: 8.5in; min-height: 14in; }
          }
        </style>
      </head>
      <body>
        <div class="page">

          <img src="${headerImageUrl}" class="header-img" alt="Header" />

          <div class="form-title-row">
            <div class="form-title-spacer"></div>
            <div class="form-title">COMMON FACILITY REQUEST FORM</div>
            <div class="form-code-wrap">
              <div class="form-code">
                <div>UPHSJ/HK-CFRF-01</div>
                <div>01-06-2020 01</div>
              </div>
            </div>
          </div>

          <table class="fields-table">
            <tr>
              <td><b>Activity/Purpose:</b> <span class="uline" style="width:220px;">${escapeHtml(res.activity_purpose)}</span></td>
              <td><b>Department/Company:</b> <span class="uline" style="width:175px;">${escapeHtml(departmentCompany)}</span></td>
            </tr>
            <tr>
              <td><b>Division:</b> <span class="uline" style="width:220px;">${escapeHtml(divisionName)}</span></td>
              <td>${checkbox(requesterIsStudent)} Student &nbsp; ${checkbox(requesterIsEmployee)} Employee &nbsp; ${checkbox(requesterIsOther)} Others</td>
            </tr>
            <tr>
              <td><b>Number of Attendees:</b> <span class="uline" style="width:140px;">${escapeHtml(attendeeCount)}</span></td>
              <td><b>Date Needed:</b> <span class="uline" style="width:170px;">${escapeHtml(dateNeeded)}</span></td>
            </tr>
            <tr>
              <td><b>Date Filed:</b> <span class="uline" style="width:170px;">${escapeHtml(dateFiled)}</span></td>
              <td><b>Time Needed:</b> <span class="uline" style="width:85px;">${escapeHtml(startTime)}</span> to <span class="uline" style="width:85px;">${escapeHtml(endTime)}</span></td>
            </tr>
          </table>

          <table class="person-table">
            <tr>
              <td style="width:65%; font-size:9pt;">
                <b>Person in Charge of the Activity:</b>
                <span style="display:inline-block; text-align:center; vertical-align:top; margin-left:4px;">
                  <span class="uline" style="width:140px; display:block;">${escapeHtml(personInCharge)}</span>
                  <span style="font-size:8pt; font-style:italic;">Signature over Printed Name</span>
                </span>
              </td>
              <td style="width:35%; font-size:9pt; text-align:center;">
                <span style="display:inline-block; text-align:center;">
                  <span class="uline" style="width:120px; display:block;">${escapeHtml(contactNumber)}</span>
                  <span style="font-size:8pt; font-style:italic;">Contact Number</span>
                </span>
              </td>
            </tr>
          </table>

          <div class="classification-label">CLASSIFICATION OF ACTIVITIES:</div>
          <table class="class-table" style="margin-top:4px;">
            <tr>
              <td class="classification-option">${checkbox(isClassification('institutional'))} Institutional</td>
              <td class="classification-option">${checkbox(isClassification('curricular'))} Curricular</td>
              <td class="classification-option">${checkbox(isClassification('outside group'))} Outside Group</td>
            </tr>
            <tr>
              <td class="classification-option">${checkbox(isClassification('co curricular'))} Co-Curricular</td>
              <td class="classification-option">${checkbox(isClassification('extra curricular'))} Extra Curricular</td>
              <td></td>
            </tr>
          </table>

          <div class="section-header">FACILITY REQUEST</div>
          <table class="box-table">
            <tr>
              <td class="facility-col">
                <div class="chk">${checkbox(isPAT)} PAT</div>
                <div class="chk">${checkbox(isStudioRoom)} STUDIO ROOM</div>
                <div class="chk">${checkbox(isQuadrangle)} QUADRANGLE</div>
              </td>
              <td class="facility-col">
                <div class="chk">${checkbox(isCollegeLobby)} COLLEGE LOBBY</div>
                <div class="chk">${checkbox()} BASIC ED. MINI AUDI</div>
                <div class="chk">${checkbox()} OVAL</div>
              </td>
              <td class="facility-col">
                <div class="chk">${checkbox()} GYM & SPORTS CENTER</div>
                <div class="chk">${checkbox()} SWIMMING POOL</div>
                <div class="chk">${checkbox(isOthersFacility)} OTHERS: <span class="uline" style="width:90px;">${isOthersFacility ? escapeHtml(roomName) : ''}</span></div>
              </td>
            </tr>
          </table>

          <div class="section-header">EQUIPMENT/SERVICES TO BE PROVIDED</div>
          <table class="box-table">
            <tr>
              <td class="equip-col">
                <div class="chk">${checkbox(hasMatch('table'))} Tables <span class="uline" style="width:60px;">${escapeHtml(qtyByNeedle('table'))}</span></div>
                <div class="chk">${checkbox(hasMatch('chair'))} Chairs <span class="uline" style="width:60px;">${escapeHtml(qtyByNeedle('chair'))}</span></div>
                <div class="chk">${checkbox(hasMatch('philippine flag'))} Philippine Flag <span class="uline" style="width:40px;">${escapeHtml(qtyByNeedle('philippine flag'))}</span></div>
                <div class="chk">${checkbox(hasMatch('university flag'))} University Flag <span class="uline" style="width:40px;">${escapeHtml(qtyByNeedle('university flag'))}</span></div>
                <div class="chk">${checkbox(hasMatch('college flag'))} College Flag <span class="uline" style="width:40px;">${escapeHtml(qtyByNeedle('college flag'))}</span></div>
              </td>
              <td class="equip-col">
                <div class="chk">${checkbox(hasMatch('lcd projector'))} LCD Projector <span class="uline" style="width:30px;">${escapeHtml(qtyByNeedle('lcd projector'))}</span></div>
                <div class="chk">${checkbox(hasMatch('white screen'))} White Screen <span class="uline" style="width:30px;">${escapeHtml(qtyByNeedle('white screen'))}</span></div>
                <div class="chk">${checkbox(hasMatch('tv'))} TV <span class="uline" style="width:50px;">${escapeHtml(qtyByNeedle('tv'))}</span></div>
                <div class="chk">${checkbox(hasMatch('still camera'))} Still Camera <span class="uline" style="width:30px;">${escapeHtml(qtyByNeedle('still camera'))}</span></div>
                <div class="chk">${checkbox(hasMatch('video camera'))} Video Camera <span class="uline" style="width:30px;">${escapeHtml(qtyByNeedle('video camera'))}</span></div>
              </td>
              <td class="equip-col">
                <div class="chk">${checkbox(hasMatch('sound system'))} Sound System <span class="uline" style="width:30px;">${escapeHtml(qtyByNeedle('sound system'))}</span></div>
                <div class="chk">${checkbox(hasMatch('microphone'))} Microphone <span class="uline" style="width:30px;">${escapeHtml(qtyByNeedle('microphone'))}</span></div>
                <div class="chk">${checkbox(hasMatch('speaker'))} Speaker <span class="uline" style="width:40px;">${escapeHtml(qtyByNeedle('speaker'))}</span></div>
                <div class="chk">${checkbox(hasMatch('lights set-up') || hasMatch('lights setup'))} Lights Set-up <span class="uline" style="width:30px;">${escapeHtml(qtyByNeedle('lights'))}</span></div>
                <div class="chk">${checkbox(hasMatch('podium'))} Podium <span class="uline" style="width:20px;">${escapeHtml(qtyByNeedle('podium'))}</span></div>
              </td>
            </tr>
          </table>

          <table class="box-table" style="margin-top:6px;">
            <tr>
              <td class="col-hdr" style="width:28%;">HOUSEKEEPING</td>
              <td class="col-hdr" style="width:28%;">SECURITY</td>
              <td class="col-hdr" style="width:44%;">ENGINEERING SERVICES</td>
            </tr>
            <tr>
              <td style="vertical-align:bottom; padding-bottom:6px; width:28%;">
                <div class="chk">${checkbox(requestedServices.housekeeping?.needed)} HK Staff <span class="uline" style="width:50px;">${escapeHtml(requestedServices.housekeeping?.count || '')}</span></div>
                <div style="height:68px;"></div>
                <div class="sig-line">DR. ALMA O. VILORIA</div>
                <div class="sig-role">VP for Quality Management System Admi. Quality<br> MGT System Administration</div>
              </td>
              <td style="vertical-align:bottom; padding-bottom:6px; width:28%;">
                <div class="chk">${checkbox(requestedServices.security_guard?.needed)} Security Guard<span class="uline" style="width:50px;">${escapeHtml(requestedServices.security_guard.count || '')}</span></div>
                <div style="height:68px;"></div>
                <div class="sig-line">MR. CRISANTO NERO</div>
                <div class="sig-role">VCS-SSEM-P</div>
              </td>
              <td style="width:44%; padding:6px 8px; vertical-align:bottom; padding-bottom:6px;">
                <div class="chk">${checkbox(requestedServices.engineering?.aircon)} Aircon &nbsp;&nbsp; ${checkbox(requestedServices.engineering?.electrical_setup)} Electrical Set-up</div>
                <div class="chk">${checkbox(requestedServices.engineering?.elevator)} Elevator &nbsp;&nbsp; ${checkbox(Boolean(requestedServices.engineering?.others))} Others <span class="uline" style="width:50px;">${escapeHtml(requestedServices.engineering?.others || '')}</span></div>
                <div style="height:28px;"></div>
                <div class="sig-line">ENGR. RODRIGO SANTOS JR.</div>
                <div class="sig-role">General Services Director - School</div>
              </td>
            </tr>
          </table>

          <div class="note">NOTE: THIS FORM MUST BE ACCOMPLISHED AND APPROVED WITHIN 5 WORKING DAYS UPON INITIAL RESERVATION TO AVOID CANCELLATION.</div>

          <table class="box-table" style="font-size:9pt;">
            <tr>
              <td style="width:33.33%; vertical-align:top; padding:6px 8px; font-size:9pt;">
                <div>Noted by:</div>
                <div style="height:55px;"></div>
                <div class="sig-line"></div>
                <div class="sig-role" style="font-size:8pt;">DEAN/DEPARTMENT HEAD</div>
              </td>
              <td class="no-right" style="width:33.33%; vertical-align:top; padding:6px 8px; font-size:9pt;">
                <div>Recommending Approval:</div>
                <div style="font-size:8pt;font-style:italic;">(For Audiovisual Facilities UPHSL)</div>
                <div style="height:30px;"></div>
                <div class="sig-line" style="font-size:9pt;">MR. RUEL B. RILLORAZA</div>
                <div class="sig-role" style="font-size:8pt;">Head/Audiovisual Facilities</div>
              </td>
              <td class="no-left" style="width:33.33%; vertical-align:top; padding:6px 8px; font-size:9pt;">
                <div>Recommending Approval:</div>
                <div style="font-size:8pt;font-style:italic;">(For Athletic Facilities)</div>
                <div style="height:30px;"></div>
                <div class="sig-line" style="font-size:9pt;">DR. MICHAEL N. VERDEJO, MAED</div>
                <div class="sig-role" style="font-size:8pt;">Athletic Director</div>
              </td>
            </tr>
            <tr>
              <td class="no-right" style="vertical-align:top; padding:6px 8px; font-size:9pt;">
                <div style="height:50px;"></div>
                <div class="sig-line" style="font-size:9pt;">MR. MANUELITO V. CASTRILLO</div>
                <div class="sig-role" style="font-size:8pt;">Exec. VP for Administration Jonelta System</div>
              </td>
              <td class="no-right no-left" style="vertical-align:top; padding:6px 8px; font-size:9pt;">
                <div>Approved by:</div>
                <div style="height:40px;"></div>
                <div class="sig-line" style="font-size:9pt;">DR. FERDINAND C. SOMIDO</div>
                <div class="sig-role" style="font-size:8pt;">Executive School Director</div>
              </td>
              <td class="no-left" style="vertical-align:top; padding:6px 8px; font-size:9pt;">
                <div style="height:50px;"></div>
                <div class="sig-line" style="font-size:9pt;">DR. ARCADIO L. TAMAYO</div>
                <div class="sig-role" style="font-size:8pt;">Chancellor-UPH-DJGTMU</div>
              </td>
            </tr>
          </table>

          <div class="footer-label">Provide a copy of accomplishment form to the following:</div>
          <table class="footer-table">
            <tr>
              <td>&bull; Engineering Services Office<br>&bull; Housekeeping Department</td>
              <td>&bull; Security Department<br>&bull; Audiovisual (MU)</td>
              <td>&bull; Audiovisual Facilities Office<br>&bull; Athletic Department</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const printFromIframe = () => {
      const frame = document.createElement('iframe');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      document.body.appendChild(frame);

      const frameWindow = frame.contentWindow;
      const doc = frameWindow?.document;
      if (!doc || !frameWindow) {
        alert('Unable to open print preview in this browser.');
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Give Chrome a short moment to lay out the iframe content before printing.
      try {
        setTimeout(() => {
          frameWindow.focus();
          frameWindow.print();
        }, 120);
      } catch (e) {
        alert('Printing was blocked. Please allow pop-ups/printing for this site.');
      } finally {
        setTimeout(() => frame.remove(), 1000);
      }
    };

    // Chrome-safe strategy: print directly from hidden iframe (no new tab).
    printFromIframe();
    } catch (err) {
      console.error('Print form failed:', err);
      alert('Print failed. Please refresh and try again.');
    }
  };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl' },
      // Header
      React.createElement('div', { className: 'flex justify-between items-start mb-6' },
        React.createElement('div', {},
          React.createElement('h3', { className: 'text-2xl font-bold text-slate-800' }, res.activity_purpose),
          React.createElement(Badge, { status: res.status })
        ),
        React.createElement('button', { onClick: onClose, className: 'p-1 hover:bg-slate-100 rounded-full text-slate-600 text-xl' }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' }))
      ),

      // Details grid
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 text-sm' },
        // Left column - basic info
        React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'user', cls: 'w-3.5 h-3.5 mr-1.5 inline' }), 'Identification')),
            React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
              React.createElement('div', {},
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'Requester'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, res.user || 'N/A')
              ),
              React.createElement('div', {},
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'Person in Charge'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, res.person_in_charge || 'N/A')
              ),
              React.createElement('div', {},
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'Contact'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, res.contact_number || 'N/A')
              ),
              React.createElement('div', {},
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'Department'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, res.department_temp || res.department || res.division || 'N/A')
              )
            )
          ),
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'calendar', cls: 'w-3.5 h-3.5 mr-1.5 inline' }), 'Event Info')),
            React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
              React.createElement('div', {},
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'Start Time'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, formatDateTime(res.start_time))
              ),
              React.createElement('div', {},
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'End Time'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, formatDateTime(res.end_time))
              ),
              React.createElement('div', { className: 'col-span-2' },
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'Facility'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, res.room_name || 'N/A')
              )
            )
          ),
          
          // Equipment and Services Requested Section
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'wrench', cls: 'w-3.5 h-3.5 mr-1.5 inline' }), 'Equipment / Services Requested')),
            requestedEquip.length > 0 
              ? React.createElement('div', { className: 'grid gap-2' },
                  requestedEquip.map(([item, qty]) => 
                    React.createElement('div', { key: item, className: 'flex justify-between bg-slate-50 px-3 py-2 rounded border border-slate-100' },
                      React.createElement('span', { className: 'text-slate-600 font-medium text-xs' }, item),
                      React.createElement('span', { className: 'font-bold text-sky-600 text-xs' }, `x${qty}`)
                    )
                  )
                )
              : React.createElement('p', { className: 'text-slate-400 italic text-xs' }, 'No equipment requested.')
            ,
            React.createElement('div', { className: 'grid gap-2 mt-2' },
              React.createElement('div', { className: 'flex justify-between bg-slate-50 px-3 py-2 rounded border border-slate-100' },
                React.createElement('span', { className: 'text-slate-600 font-medium text-xs' }, 'Housekeeping'),
                React.createElement('span', { className: 'font-bold text-slate-700 text-xs' },
                  requestedServices.housekeeping?.needed
                    ? `Yes${requestedServices.housekeeping.count ? ` (${requestedServices.housekeeping.count})` : ''}`
                    : 'No'
                )
              ),
              React.createElement('div', { className: 'flex justify-between bg-slate-50 px-3 py-2 rounded border border-slate-100' },
                React.createElement('span', { className: 'text-slate-600 font-medium text-xs' }, 'Security Guard'),
                React.createElement('span', { className: 'font-bold text-slate-700 text-xs' },
                  requestedServices.security_guard?.needed
                    ? `Yes${requestedServices.security_guard.count ? ` (${requestedServices.security_guard.count})` : ''}`
                    : 'No'
                )
              ),
              React.createElement('div', { className: 'bg-slate-50 px-3 py-2 rounded border border-slate-100' },
                React.createElement('p', { className: 'text-slate-600 font-medium text-xs mb-1' }, 'Engineering Services'),
                React.createElement('p', { className: 'text-xs text-slate-700' },
                  [
                    requestedServices.engineering?.aircon ? 'Aircon' : null,
                    requestedServices.engineering?.elevator ? 'Elevator' : null,
                    requestedServices.engineering?.electrical_setup ? 'Electrical Set-up' : null,
                    requestedServices.engineering?.others ? `Others: ${requestedServices.engineering.others}` : null
                  ].filter(Boolean).join(', ') || 'None'
                )
              )
            )
          )
        ),

        // Right column - document stages
        React.createElement('div', { className: 'space-y-4' },
          React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'document', cls: 'w-3.5 h-3.5 mr-1.5 inline' }), 'Process Documents')),
          
          // Stage 1: Concept Paper
          React.createElement('div', { className: 'bg-slate-50 p-4 rounded-xl border border-slate-200' },
            React.createElement('p', { className: 'text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider' }, 'Stage 1: Concept Paper'),
            res.concept_paper_url 
              ? React.createElement('a', { href: res.concept_paper_url, target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-600 underline font-medium text-xs break-all' }, res.concept_paper_url)
              : React.createElement('p', { className: 'text-slate-400 text-xs' }, 'No concept paper submitted')
          ),

          // Stage 2: Final Form
          React.createElement('div', { className: `p-4 rounded-xl border ${res.status === 'concept-approved' ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-slate-200'}` },
            React.createElement('p', { className: 'text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider' }, 'Stage 2: Facility Form'),
            res.final_form_url
              ? React.createElement('div', {},
                  React.createElement('p', { className: 'text-green-600 font-bold flex items-center gap-2 text-sm' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'check', cls: 'w-4 h-4 mr-1 text-green-600 inline' }), 'Link Submitted')),
                  React.createElement('a', { href: res.final_form_url, target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-600 underline text-xs break-all block mt-1' }, res.final_form_url)
                )
              : res.status === 'concept-approved'
                ? React.createElement('div', { className: 'space-y-3' },
                    React.createElement('p', { className: 'text-xs text-slate-700 leading-relaxed font-bold' }, 'Concept approved! Please submit your signed Facility Form.'),
                    React.createElement('button', { onClick: handlePrint, className: 'flex items-center gap-2 text-indigo-600 font-bold text-xs hover:text-indigo-700' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'printer', cls: 'w-4 h-4 mr-1.5 inline' }), 'Print Form Template')),
                    isOwner && React.createElement('div', { className: 'space-y-2 mt-2' },
                      React.createElement('input', { 
                        type: 'url', 
                        value: finalFormLink, 
                        onChange: (e) => setFinalFormLink(e.target.value),
                        placeholder: 'Paste Google Drive or Docs link here...', 
                        className: 'w-full border border-slate-300 p-2 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none' 
                      }),
                      React.createElement('button', { 
                        onClick: () => { 
                          if (!finalFormLink?.trim()) {
                            alert('Please provide a link');
                            return;
                          }
                          if (!(finalFormLink.includes('drive.google.com') || finalFormLink.includes('docs.google.com'))) {
                            alert('Link must be from Google Drive or Google Docs');
                            return;
                          }

                          const proceed = window.confirm(
                            `Final check before submitting Phase 2:\n\nIs this the Google Drive link you want to save?\n\n${finalFormLink}\n\nPlease make sure this link is accessible to UPHSL (set sharing permissions appropriately), otherwise your Facility Form cannot be reviewed.`
                          );
                          if (!proceed) {
                            return;
                          }

                          onUploadFinalForm(res.id, finalFormLink); 
                        }, 
                        disabled: !finalFormLink || loading,
                        className: 'w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-bold text-xs shadow-md transition-colors disabled:opacity-50'
                      }, loading ? 'Submitting...' : 'Submit Form Link')
                    )
                  )
                : React.createElement('p', { className: 'text-slate-400 text-xs flex items-center gap-2' }, '⏳ Awaiting Stage 1 Approval')
          )
        )
      ),

      // Action buttons (admin/phase1 admin, and archive for regular users)
      React.createElement('div', { className: 'mt-8 pt-6 border-t border-slate-100 flex gap-4' },
        // Stage 1 approval - both admin and admin_phase1 can approve/deny
        (isAdmin || isPhase1Admin) && res.status === 'pending' && React.createElement(React.Fragment, {},
          React.createElement('button', { onClick: onApproveStage1, disabled: loading, className: 'flex-1 bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors disabled:opacity-50' }, loading ? 'Processing...' : 'Approve Concept'),
          React.createElement('button', { onClick: onDenyClick, className: 'flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors' }, 'Deny Request')
        ),
        // Stage 2 approval (only full admin)
        isAdmin && res.status === 'concept-approved' && res.final_form_url && React.createElement(React.Fragment, {},
          React.createElement('button', { onClick: () => onApproveFinal(res.id), disabled: loading, className: 'flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors disabled:opacity-50' }, loading ? 'Processing...' : 'Final Approve'),
          React.createElement('button', { onClick: onDenyClick, className: 'flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors' }, 'Deny Final')
        ),
        // Stage 2 view-only for phase1 admin
        isPhase1Admin && res.status === 'concept-approved' && res.final_form_url && React.createElement('div', { className: 'flex-1 bg-slate-100 text-slate-500 py-3 rounded-lg font-bold shadow-md flex items-center justify-center' }, 'Waiting for full admin approval'),
        // Cancel/Delete logic
        (() => {
          // Remove Cancel Event button for admin/phase1 admin
          return null;
        })()
      )
    )
  );
}

function DenyModal({ res, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl p-6 max-w-sm' },
      React.createElement('h3', { className: 'font-bold mb-4' }, 'Deny?'),
      React.createElement('textarea', { value: reason, onChange: (e) => setReason(e.target.value), placeholder: 'Reason...', className: 'w-full p-2 border rounded mb-4', rows: 3 }),
      React.createElement('div', { className: 'flex gap-2' },
        React.createElement('button', { onClick: onClose, className: 'flex-1 bg-slate-300 p-2 rounded' }, 'Cancel'),
        React.createElement('button', { onClick: () => reason && onConfirm(reason), disabled: !reason || loading, className: 'flex-1 bg-red-500 text-white p-2 rounded' }, 'Deny')
      )
    )
  );
}

function DeleteEventModal({ event, actionType, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const isCancelAction = actionType === 'cancel';
  const title = isCancelAction ? React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'ban', cls: 'w-5 h-5 mr-1.5 inline text-red-500' }), 'Cancel Event') : React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'trash', cls: 'w-5 h-5 mr-1.5 inline text-red-500' }), 'Delete Event Permanently');
  const description = isCancelAction
    ? 'Are you sure you want to cancel "'
    : 'Are you sure you want to permanently delete "';
  const detail = isCancelAction
    ? '"? The user will be notified.'
    : '"? This action cannot be undone.';
  const placeholder = isCancelAction
    ? 'Reason for cancellation (required)...'
    : 'Reason for permanent deletion (required)...';
  const confirmLabel = isCancelAction ? 'Cancel Event' : 'Delete Permanently';
  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-3xl p-6 max-w-sm shadow-2xl' },
      React.createElement('h3', { className: 'font-bold text-lg mb-2 text-slate-800' }, title),
      React.createElement('p', { className: 'text-sm text-slate-600 mb-4' }, 
        description, React.createElement('strong', {}, event?.activity_purpose), detail
      ),
      React.createElement('textarea', { 
        value: reason, 
        onChange: (e) => setReason(e.target.value), 
        placeholder, 
        className: 'w-full p-3 border rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-300', 
        rows: 3 
      }),
      React.createElement('div', { className: 'flex gap-2' },
        React.createElement('button', { onClick: onClose, className: 'flex-1 bg-slate-200 hover:bg-slate-300 p-3 rounded-xl font-semibold transition-colors' }, 'Cancel'),
        React.createElement('button', { 
          onClick: () => reason && onConfirm(reason), 
          disabled: !reason || loading, 
          className: 'flex-1 bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl font-semibold disabled:opacity-50 transition-colors' 
        }, loading ? (isCancelAction ? 'Cancelling...' : 'Deleting...') : confirmLabel)
      )
    )
  );
}

function HolidayModal({ onClose, onConfirm, loading }) {
  const [form, setForm] = useState({
    title: '',
    holiday_date: '',
    notes: ''
  });
  const [localError, setLocalError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (!form.title.trim()) {
      setLocalError('Holiday title is required.');
      return;
    }
    if (!form.holiday_date) {
      setLocalError('Holiday date is required.');
      return;
    }
    onConfirm({
      title: form.title.trim(),
      holiday_date: form.holiday_date,
      notes: (form.notes || '').trim()
    });
  };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl' },
      React.createElement('h3', { className: 'font-bold text-lg mb-1 text-slate-800' }, 'Add Holiday to Calendar'),
      React.createElement('p', { className: 'text-sm text-slate-500 mb-4' }, 'This will block new reservations on the selected date.'),
      localError && React.createElement('div', { className: 'mb-3 p-2 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200' }, localError),
      React.createElement('form', { onSubmit: submit, className: 'space-y-3' },
        React.createElement('input', {
          type: 'text',
          placeholder: 'Holiday title (e.g., Foundation Day)',
          value: form.title,
          onChange: (e) => setForm({ ...form, title: e.target.value }),
          className: 'w-full p-2 border rounded'
        }),
        React.createElement('input', {
          type: 'date',
          value: form.holiday_date,
          onChange: (e) => setForm({ ...form, holiday_date: e.target.value }),
          className: 'w-full p-2 border rounded'
        }),
        React.createElement('textarea', {
          placeholder: 'Notes (optional)',
          value: form.notes,
          onChange: (e) => setForm({ ...form, notes: e.target.value }),
          className: 'w-full p-2 border rounded min-h-[90px]'
        }),
        React.createElement('div', { className: 'flex gap-2 pt-1' },
          React.createElement('button', {
            type: 'button',
            onClick: onClose,
            className: 'flex-1 bg-slate-200 hover:bg-slate-300 p-3 rounded-xl font-semibold transition-colors'
          }, 'Cancel'),
          React.createElement('button', {
            type: 'submit',
            disabled: loading,
            className: 'flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl font-semibold disabled:opacity-50 transition-colors'
          }, loading ? 'Saving...' : 'Add Holiday')
        )
      )
    )
  );
}

function ProfileModal({ user, onClose, onLogout, onProfileUpdated }) {
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError('');
  }, [user]);

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative' },
      React.createElement('button', { onClick: onClose, className: 'absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors' }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' })),

      React.createElement('div', { className: 'flex flex-col items-center text-center mb-8' },
        React.createElement('div', { className: 'w-24 h-24 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold text-4xl mb-4 border-4 border-white shadow-sm' }, user.username[0].toUpperCase()),
        React.createElement('h3', { className: 'text-2xl font-bold text-slate-800 mb-1' }, user.username),
        React.createElement('p', { className: 'text-xs font-bold text-sky-500 uppercase tracking-widest' }, user.role)
      ),

      React.createElement('div', { className: 'space-y-6 border-t pt-6' },
        React.createElement('div', { className: 'flex flex-col' },
          React.createElement('span', { className: 'text-xs font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Profile Name'),
          React.createElement('span', { className: 'w-full p-2 border rounded-lg text-sm font-semibold text-slate-700 bg-slate-50' }, user.username),
          React.createElement('p', { className: 'text-xs text-slate-500 mt-1' }, 'PYour profile name')
        ),
        React.createElement('div', { className: 'flex flex-col' },
          React.createElement('span', { className: 'text-xs font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Department'),
          React.createElement('span', { className: 'text-sm font-semibold text-slate-700' }, user.department || 'N/A')
        )
      ),

      localError && React.createElement('p', { className: 'text-xs text-red-500 mt-3 text-center' }, localError),

      React.createElement('button', {
        onClick: onLogout,
        className: 'w-full mt-6 flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 text-red-500 hover:bg-red-50 font-bold transition-all text-sm border border-slate-100'
      }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'logout', cls: 'w-4 h-4 mr-2 inline' }), 'Sign Out'))
    )
  );
}

function ChartCanvas({ type, data, options }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new window.Chart(canvasRef.current, {
      type,
      data,
      options
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type, JSON.stringify(data), JSON.stringify(options)]);

  return React.createElement('div', { className: 'h-[300px]' },
    React.createElement('canvas', { ref: canvasRef })
  );
}

function AnalyticsKpiCard({ label, value, detail, onClick, active = false }) {
  const clickable = typeof onClick === 'function';
  const cardClass = [
    'bg-white border rounded-3xl p-5 shadow-sm',
    clickable ? 'cursor-pointer hover:border-sky-300 hover:shadow-md transition' : '',
    active ? 'border-sky-400 ring-2 ring-sky-100' : ''
  ].join(' ').trim();

  return React.createElement('div', { className: cardClass, onClick: clickable ? onClick : undefined },
    React.createElement('p', { className: 'text-xs font-bold uppercase tracking-wider text-slate-400 mb-3' }, label),
    React.createElement('p', { className: 'text-2xl font-bold text-slate-800 leading-tight break-words' }, value),
    React.createElement('p', { className: 'text-sm text-slate-500 mt-2' }, detail)
  );
}

function HeatmapChart({ data }) {
  const days = data?.days || [];
  const hours = data?.hours || [];
  const values = data?.values || [];
  const maxValue = data?.max_value || 0;

  const getCellStyle = (value) => {
    if (!maxValue || !value) return { backgroundColor: '#f8fafc', color: '#94a3b8' };
    const alpha = 0.2 + (value / maxValue) * 0.8;
    return {
      backgroundColor: `rgba(14, 165, 233, ${alpha.toFixed(2)})`,
      color: value / maxValue > 0.55 ? '#ffffff' : '#0f172a'
    };
  };

  return React.createElement('div', { className: 'overflow-x-auto' },
    React.createElement('div', { className: 'min-w-[820px]' },
      React.createElement('div', {
        className: 'grid gap-2 items-center',
        style: { gridTemplateColumns: `120px repeat(${hours.length}, minmax(40px, 1fr))` }
      },
        React.createElement('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-400 px-2' }, 'Day / Time'),
        hours.map(hour => React.createElement('div', { key: hour, className: 'text-[10px] text-center font-bold text-slate-400' }, hour)),
        days.flatMap((day, dayIndex) => [
          React.createElement('div', { key: `${day}-label`, className: 'text-xs font-semibold text-slate-600 px-2 py-2' }, day),
          ...hours.map((hour, hourIndex) => {
            const cellValue = values?.[dayIndex]?.[hourIndex] || 0;
            return React.createElement('div', {
              key: `${day}-${hour}`,
              className: 'h-10 rounded-lg flex items-center justify-center text-[11px] font-bold border border-white/60',
              style: getCellStyle(cellValue),
              title: `${day} ${hour}: ${cellValue} reservation slot${cellValue === 1 ? '' : 's'}`
            }, cellValue);
          })
        ])
      ),
      React.createElement('div', { className: 'flex items-center justify-end gap-3 mt-4 text-xs text-slate-500' },
        React.createElement('span', {}, 'Lower activity'),
        React.createElement('div', { className: 'w-28 h-3 rounded-full bg-gradient-to-r from-slate-100 to-sky-500' }),
        React.createElement('span', {}, 'Higher activity')
      ),
      React.createElement('p', { className: 'text-[11px] text-slate-500 mt-2 text-right' },
        'Heatmap counts include approved and concept-approved reservations only.'
      )
    )
  );
}

// Helper functions for semester management
function getCurrentSemester() {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  if (currentMonth >= 8) return 1; // Aug-Dec = 1st Sem
  if (currentMonth >= 1 && currentMonth <= 5) return 2; // Jan-May = 2nd Sem
  return 3; // Jun-Jul = Summer
}

function getSemesterForMonth(monthNumber) {
  if (monthNumber >= 8) return 1;
  if (monthNumber >= 1 && monthNumber <= 5) return 2;
  return 3;
}

function getSemesterDateRange(semester) {
  // Returns { startMonth: "MM", endMonth: "MM" }
  if (semester === 1) return { startMonth: '08', endMonth: '12' }; // 1st Sem: Aug-Dec
  if (semester === 2) return { startMonth: '01', endMonth: '05' }; // 2nd Sem: Jan-May
  return { startMonth: '06', endMonth: '07' }; // Summer: Jun-Jul
}

function formatSemesterLabel(semester) {
  if (semester === 1) return '1st Sem (Aug-Dec)';
  if (semester === 2) return '2nd Sem (Jan-May)';
  return 'Summer Sem (Jun-Jul)';
}

function getAvailableSemesters(heatmapMonthKeys) {
  // Extract unique semesters from available month keys
  // Returns object like: { '2026': [1, 2, 3], '2025': [1, 2] }
  const semesters = {};
  
  heatmapMonthKeys.forEach((key) => {
    if (key === 'all') return;
    const [year, month] = key.split('-');
    const monthNum = parseInt(month);
    
    let semester;
    if (monthNum >= 8) semester = 1;
    else if (monthNum >= 1 && monthNum <= 5) semester = 2;
    else semester = 3;
    
    if (!semesters[year]) semesters[year] = new Set();
    semesters[year].add(semester);
  });
  
  // Convert Sets to sorted arrays
  Object.keys(semesters).forEach((year) => {
    semesters[year] = Array.from(semesters[year]).sort((a, b) => a - b);
  });
  
  return semesters;
}

function getAvailableMonthsByYear(heatmapMonthKeys) {
  const monthsByYear = {};
  heatmapMonthKeys.forEach((key) => {
    if (key === 'all') return;
    const [year, month] = key.split('-');
    if (!monthsByYear[year]) monthsByYear[year] = new Set();
    monthsByYear[year].add(month);
  });

  Object.keys(monthsByYear).forEach((year) => {
    monthsByYear[year] = Array.from(monthsByYear[year]).sort((a, b) => parseInt(a) - parseInt(b));
  });

  return monthsByYear;
}

function AnalyticsView({ reservations }) {
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [forecastPayload, setForecastPayload] = useState(() => {
    try {
      const raw = localStorage.getItem('analyticsForecastCache');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [forecastError, setForecastError] = useState('');
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [retrainingForecast, setRetrainingForecast] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedSemesterYear, setSelectedSemesterYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [timeFilterMode, setTimeFilterMode] = useState('semester');
  const [selectedMonthYear, setSelectedMonthYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loadingMonthlyReport, setLoadingMonthlyReport] = useState(false);
  const [monthlyReportError, setMonthlyReportError] = useState('');
  const [generatingMonthlyReport, setGeneratingMonthlyReport] = useState(false);
  const [reportMonth, setReportMonth] = useState(String(new Date().getMonth() + 1));
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingAnalytics(true);
      setAnalyticsError('');
      try {
        let filterStartMonth;
        let filterEndMonth;
        if (timeFilterMode === 'month') {
          if (selectedMonth !== 'all' && selectedMonthYear) {
            filterStartMonth = `${selectedMonthYear}-${selectedMonth}`;
            filterEndMonth = filterStartMonth;
          }
        } else if (selectedSemester !== 'all' && selectedSemesterYear) {
          const range = getSemesterDateRange(parseInt(selectedSemester, 10));
          filterStartMonth = `${selectedSemesterYear}-${range.startMonth}`;
          filterEndMonth = `${selectedSemesterYear}-${range.endMonth}`;
        }
        
        const data = await apiService.getDataMiningAnalytics({
          department: selectedDepartment,
          filter_start_month: filterStartMonth,
          filter_end_month: filterEndMonth,
        });
        if (isMounted) {
          setAnalytics(data);
          if (!selectedSemesterYear && !selectedMonthYear) {
            const availableKeys = (data?.filters?.heatmap_months || []).filter((key) => key !== 'all');
            const initialKey = availableKeys[0];
            if (initialKey && /^\d{4}-\d{2}$/.test(initialKey)) {
              const [year, month] = initialKey.split('-');
              const monthNum = parseInt(month, 10);
              const semester = getSemesterForMonth(monthNum);
              setSelectedSemesterYear(year);
              setSelectedSemester(String(semester));
              setSelectedMonthYear(year);
              setSelectedMonth(month);
            }
          }
        }
      } catch (err) {
        if (isMounted) setAnalyticsError(err.message || 'Failed to load analytics data');
      } finally {
        if (isMounted) setLoadingAnalytics(false);
      }
    })();

    return () => { isMounted = false; };
  }, [reservations.length, selectedDepartment, selectedSemesterYear, selectedSemester, selectedMonthYear, selectedMonth, timeFilterMode]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingForecast(true);
      setForecastError('');
      try {
        const payload = await apiService.getCurrentSemesterForecast();
        if (isMounted) {
          const hasSeries = Array.isArray(payload?.data?.series) && payload.data.series.length > 0;
          setForecastPayload((prev) => {
            if (hasSeries) return payload;
            if (prev?.data?.series?.length) return prev;
            return payload;
          });
          if (hasSeries) {
            try {
              localStorage.setItem('analyticsForecastCache', JSON.stringify(payload));
            } catch {
              // Ignore localStorage errors.
            }
          } else {
            setForecastError('Latest forecast is temporarily empty. Showing last available forecast if present.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setForecastError((prevError) => prevError || err.message || 'Failed to load forecast');
        }
      } finally {
        if (isMounted) setLoadingForecast(false);
      }
    })();

    return () => { isMounted = false; };
  }, [reservations.length]);

  const refreshForecast = async () => {
    setLoadingForecast(true);
    setForecastError('');
    try {
      const payload = await apiService.getCurrentSemesterForecast();
      const hasSeries = Array.isArray(payload?.data?.series) && payload.data.series.length > 0;
      setForecastPayload((prev) => {
        if (hasSeries) return payload;
        if (prev?.data?.series?.length) return prev;
        return payload;
      });
      if (hasSeries) {
        try {
          localStorage.setItem('analyticsForecastCache', JSON.stringify(payload));
        } catch {
          // Ignore localStorage errors.
        }
      } else {
        setForecastError('Latest forecast is temporarily empty. Showing last available forecast if present.');
      }
    } catch (err) {
      setForecastError(err.message || 'Failed to load forecast');
    } finally {
      setLoadingForecast(false);
    }
  };

  const loadMonthlyReport = async (year, month) => {
    setLoadingMonthlyReport(true);
    setMonthlyReportError('');
    try {
      const payload = await apiService.getMonthlyReport(year, month);
      setMonthlyReport(payload.data);
    } catch (err) {
      setMonthlyReportError(err.message || 'Failed to fetch monthly report');
    } finally {
      setLoadingMonthlyReport(false);
    }
  };

  const handleGenerateMonthlyReport = async () => {
    setGeneratingMonthlyReport(true);
    setMonthlyReportError('');
    try {
      const payload = await apiService.generateMonthlyReport(reportYear, reportMonth);
      setMonthlyReport(payload.data);

      const file = await apiService.downloadMonthlyReportExcel(reportYear, reportMonth);
      const url = window.URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMonthlyReportError(err.message || 'Failed to generate monthly report');
    } finally {
      setGeneratingMonthlyReport(false);
    }
  };

  useEffect(() => {
    loadMonthlyReport(reportYear, reportMonth);
  }, [reportYear, reportMonth, reservations.length]);

  const handleRetrainForecast = async () => {
    const proceed = window.confirm(
      'Retrain forecast model?\n\nUse this only when reservation patterns have materially changed (e.g., major spikes, new semester cycle, or policy-driven demand changes).\n\nFrequent unnecessary retraining can reduce forecast stability.'
    );
    if (!proceed) return;

    setRetrainingForecast(true);
    setForecastError('');
    try {
      await apiService.retrainForecastModel();
      await refreshForecast();
    } catch (err) {
      setForecastError(err.message || 'Failed to retrain forecast');
    } finally {
      setRetrainingForecast(false);
    }
  };

  const fallback = {
    total_reservations: reservations.length,
    most_booked_venue: 'No Data',
    most_booked_venue_count: 0,
    peak_usage_time: 'No Data',
    peak_usage_count: 0,
    busiest_day: 'No Data',
    busiest_day_count: 0,
    top_department: 'No Data',
    top_department_count: 0,
    dominant_status: 'No Data',
    dominant_status_count: 0,
    average_lead_time_days: 0,
    lead_time_samples: 0
  };

  const kpis = analytics?.kpis || fallback;
  const charts = analytics?.charts || {
    top_venues: { labels: [], values: [] },
    peak_usage_heatmap: { days: [], hours: [], values: [], max_value: 0 },
    reservations_over_time: { labels: [], values: [] },
    events_by_day_of_week: { labels: [], values: [] },
    reservations_by_department: { labels: [], values: [] },
    booking_status_overview: { labels: [], values: [] },
    average_lead_time_histogram: { labels: [], values: [] }
  };

  // Use backend-provided activity classification breakdown for accuracy
  const classificationBreakdown = charts.activity_classification_breakdown || { labels: [], values: [] };
  const classificationChartData = {
    labels: classificationBreakdown.labels,
    datasets: [{
      data: classificationBreakdown.values,
      backgroundColor: ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderWidth: 0
    }]
  };

  const topVenuesChartData = {
    labels: charts.top_venues.labels,
    datasets: [{
      label: 'Reservations',
      data: charts.top_venues.values,
      backgroundColor: '#0ea5e9',
      borderRadius: 10
    }]
  };

  const reservationsOverTimeChartData = {
    labels: charts.reservations_over_time.labels,
    datasets: [{
      label: 'Reservations',
      data: charts.reservations_over_time.values,
      borderColor: '#0284c7',
      backgroundColor: 'rgba(2,132,199,0.15)',
      tension: 0.35,
      fill: true,
      pointRadius: 3
    }]
  };

  const dayOfWeekChartData = {
    labels: charts.events_by_day_of_week.labels,
    datasets: [{
      label: 'Events',
      data: charts.events_by_day_of_week.values,
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      borderColor: '#0369a1',
      pointBackgroundColor: '#0ea5e9',
      pointBorderColor: '#ffffff'
    }]
  };

  const departmentChartData = {
    labels: charts.reservations_by_department.labels,
    datasets: [{
      data: charts.reservations_by_department.values,
      backgroundColor: ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'],
      borderWidth: 0
    }]
  };

  const statusOverviewChartData = {
    labels: charts.booking_status_overview.labels,
    datasets: [{
      data: charts.booking_status_overview.values,
      backgroundColor: ['#facc15', '#60a5fa', '#22c55e', '#ef4444', '#94a3b8'],
      borderWidth: 0
    }]
  };

  const leadTimeChartData = {
    labels: charts.average_lead_time_histogram.labels,
    datasets: [{
      label: 'Reservations',
      data: charts.average_lead_time_histogram.values,
      backgroundColor: '#f97316',
      borderRadius: 8,
      barPercentage: 0.9,
      categoryPercentage: 0.9
    }]
  };

  if (loadingAnalytics) {
    return React.createElement('div', { className: 'bg-white border rounded-3xl p-8 text-center text-slate-500' }, 'Loading analytics...');
  }

  const filterData = analytics?.filters || { departments: ['All'], heatmap_months: ['all'] };
  const departmentOptions = filterData.departments || ['All'];
  const heatmapMonthKeys = (filterData.heatmap_months || ['all']).filter((key) => key !== 'all');
  const availableSemesters = getAvailableSemesters(heatmapMonthKeys);
  const availableMonthsByYear = getAvailableMonthsByYear(heatmapMonthKeys);
  const semesterYears = Object.keys(availableSemesters).sort((a, b) => Number(b) - Number(a));
  const monthYears = Object.keys(availableMonthsByYear).sort((a, b) => Number(b) - Number(a));
  const semestersForSelectedYear = selectedSemesterYear ? [1, 2, 3] : [];
  const monthsForSelectedYear = selectedMonthYear ? (availableMonthsByYear[selectedMonthYear] || []) : [];

  const handleSemesterYearChange = (year) => {
    if (year === 'all') {
      setSelectedSemesterYear('');
      setSelectedSemester('all');
      setSelectedMonthYear('');
      setSelectedMonth('all');
      return;
    }
    
    setSelectedSemesterYear(year);
    const semestersForYear = availableSemesters[year] || [];
    if (semestersForYear.length > 0) {
      const currentSem = getCurrentSemester();
      if (semestersForYear.includes(currentSem)) {
        setSelectedSemester(String(currentSem));
      } else {
        setSelectedSemester(String(semestersForYear[semestersForYear.length - 1]));
      }
    } else {
      setSelectedSemester('all');
    }
    if (!selectedMonthYear || selectedMonthYear !== year) {
      const monthsForYear = availableMonthsByYear[year] || [];
      if (monthsForYear.length > 0) {
        setSelectedMonthYear(year);
        setSelectedMonth(monthsForYear[0]);
      }
    }
  };

  const handleSemesterChange = (semester) => {
    if (semester === 'all') {
      setSelectedSemester('all');
      return;
    }
    setSelectedSemester(semester);
    if (selectedSemesterYear) {
      const range = getSemesterDateRange(parseInt(semester, 10));
      setSelectedMonthYear(selectedSemesterYear);
      setSelectedMonth(range.startMonth);
    }
  };

  const handleMonthYearChange = (year) => {
    if (year === 'all') {
      setSelectedMonthYear('');
      setSelectedMonth('all');
      return;
    }
    setSelectedMonthYear(year);
    const monthsForYear = availableMonthsByYear[year] || [];
    const nextMonth = monthsForYear.length > 0 ? monthsForYear[0] : 'all';
    setSelectedMonth(nextMonth);
    if (nextMonth !== 'all') {
      const semester = getSemesterForMonth(parseInt(nextMonth, 10));
      setSelectedSemesterYear(year);
      setSelectedSemester(String(semester));
    }
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    if (month === 'all' || !selectedMonthYear) return;
    const semester = getSemesterForMonth(parseInt(month, 10));
    setSelectedSemesterYear(selectedMonthYear);
    setSelectedSemester(String(semester));
  };

  const handleTimeFilterModeChange = (mode) => {
    setTimeFilterMode(mode);
    if (mode === 'month') {
      if (!selectedMonthYear && selectedSemesterYear) {
        const range = selectedSemester !== 'all'
          ? getSemesterDateRange(parseInt(selectedSemester, 10))
          : { startMonth: '01' };
        setSelectedMonthYear(selectedSemesterYear);
        setSelectedMonth(range.startMonth);
      }
    } else if (mode === 'semester') {
      if (!selectedSemesterYear && selectedMonthYear) {
        const monthNumber = selectedMonth !== 'all' ? parseInt(selectedMonth, 10) : null;
        const semester = monthNumber ? getSemesterForMonth(monthNumber) : getCurrentSemester();
        setSelectedSemesterYear(selectedMonthYear);
        setSelectedSemester(String(semester));
      }
    }
  };

  const formatMonthName = (monthNumber) => {
    const temp = new Date(`2000-${monthNumber}-01T00:00:00`);
    return temp.toLocaleDateString(undefined, { month: 'long' });
  };

  const filterLabel = timeFilterMode === 'month'
    ? (selectedMonthYear && selectedMonth !== 'all'
        ? `${formatMonthName(selectedMonth)} ${selectedMonthYear}`
        : 'All Months')
    : (selectedSemesterYear && selectedSemester !== 'all'
        ? `${formatSemesterLabel(parseInt(selectedSemester, 10))} ${selectedSemesterYear}`
        : 'All Semesters');

  const handleTopDepartmentClick = () => {
    const topDept = (kpis.top_department || '').trim();
    if (!topDept || topDept === 'No Data') return;
    // Clicking KPI applies top-department shortcut and opens full picker.
    setSelectedDepartment(topDept);
    setShowDepartmentPicker((prev) => !prev);
  };

  const forecastSeries = forecastPayload?.data?.series || [];
  const actualSeriesData = forecastSeries.map((entry) => entry.actual == null ? null : entry.actual);
  const predictedSeriesData = forecastSeries.map((entry) => entry.predicted == null ? null : entry.predicted);


  const forecastChartData = {
    labels: forecastSeries.map((entry) => {
      const d = new Date(`${entry.month}-01T00:00:00`);
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Actual (Approved)',
        data: actualSeriesData,
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2,132,199,0.15)',
        tension: 0.35,
        spanGaps: true,
        pointRadius: 3,
      },
      {
        label: 'Forecast',
        data: predictedSeriesData,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.15)',
        tension: 0.35,
        spanGaps: true,
        pointRadius: 3,
      }
    ]
  };

  return React.createElement('div', { className: 'space-y-6' },
    analyticsError && React.createElement('div', { className: 'bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-xl text-sm' },
      'Showing fallback metrics. ', analyticsError
    ),

    React.createElement('div', { className: 'bg-white border rounded-3xl p-4 md:p-5' },
      React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-3 mb-4' },
        React.createElement('div', { className: 'text-sm text-slate-600 font-semibold' }, 'Time Filter'),
        React.createElement('div', { className: 'inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1' },
          React.createElement('button', {
            type: 'button',
            onClick: () => handleTimeFilterModeChange('semester'),
            className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition ${timeFilterMode === 'semester' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`
          }, 'Semester'),
          React.createElement('button', {
            type: 'button',
            onClick: () => handleTimeFilterModeChange('month'),
            className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition ${timeFilterMode === 'month' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`
          }, 'Month')
        )
      ),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
        React.createElement('label', { className: 'text-sm text-slate-600' },
          React.createElement('span', { className: 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2' }, 'Year'),
          React.createElement('select', {
            className: 'w-full border rounded-xl px-3 py-2 bg-white',
            value: timeFilterMode === 'month' ? selectedMonthYear : selectedSemesterYear,
            onChange: (e) => {
              const nextYear = e.target.value;
              if (timeFilterMode === 'month') {
                handleMonthYearChange(nextYear || 'all');
              } else {
                handleSemesterYearChange(nextYear || 'all');
              }
            }
          },
            React.createElement('option', { value: '' }, 'All Years'),
            (timeFilterMode === 'month' ? monthYears : semesterYears).map((year) => React.createElement('option', { key: year, value: year }, year))
          )
        ),
        timeFilterMode === 'semester'
          ? React.createElement('label', { className: 'text-sm text-slate-600' },
              React.createElement('span', { className: 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2' }, 'Semester'),
              React.createElement('select', {
                className: 'w-full border rounded-xl px-3 py-2 bg-white',
                value: selectedSemester,
                disabled: !selectedSemesterYear,
                onChange: (e) => handleSemesterChange(e.target.value)
              },
                React.createElement('option', { value: 'all' }, selectedSemesterYear ? 'Select semester' : 'Select year first'),
                semestersForSelectedYear.map((sem) => React.createElement(
                  'option',
                  { key: sem, value: String(sem) },
                  formatSemesterLabel(sem)
                ))
              )
            )
          : React.createElement('label', { className: 'text-sm text-slate-600' },
              React.createElement('span', { className: 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2' }, 'Month'),
              React.createElement('select', {
                className: 'w-full border rounded-xl px-3 py-2 bg-white',
                value: selectedMonth,
                disabled: !selectedMonthYear,
                onChange: (e) => handleMonthChange(e.target.value)
              },
                React.createElement('option', { value: 'all' }, selectedMonthYear ? 'Select month' : 'Select year first'),
                monthsForSelectedYear.map((month) => React.createElement(
                  'option',
                  { key: month, value: month },
                  formatMonthName(month)
                ))
              )
            )
      )
    ),


    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' },
      React.createElement(AnalyticsKpiCard, {
        label: 'Most Booked Venue',
        value: kpis.most_booked_venue || 'No Data',
        detail: `${kpis.most_booked_venue_count || 0} reservations`
      }),
      React.createElement(AnalyticsKpiCard, {
        label: 'Peak Usage Time',
        value: kpis.peak_usage_time || 'No Data',
        detail: `${kpis.peak_usage_count || 0} occupied slots`
      }),
      React.createElement(AnalyticsKpiCard, {
        label: 'Busiest Day',
        value: kpis.busiest_day || 'No Data',
        detail: `${kpis.busiest_day_count || 0} events`
      }),
      React.createElement('div', {
        className: `bg-white border rounded-3xl p-5 shadow-sm cursor-pointer hover:border-sky-300 hover:shadow-md transition ${kpis.top_department && selectedDepartment === kpis.top_department ? 'border-sky-400 ring-2 ring-sky-100' : ''}`,
        onClick: handleTopDepartmentClick
      },
        React.createElement('p', { className: 'text-xs font-bold uppercase tracking-wider text-slate-400 mb-3' }, 'Top Department'),
        React.createElement('p', { className: 'text-2xl font-bold text-slate-800 leading-tight break-words' }, kpis.top_department || 'No Data'),
        React.createElement('p', { className: 'text-sm text-slate-500 mt-2' }, `${kpis.top_department_count || 0} reservations (click to filter)`),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' }, `Current scope: ${selectedDepartment}`),
        showDepartmentPicker && React.createElement('div', {
          className: 'mt-3 pt-3 border-t border-slate-100',
          onClick: (e) => e.stopPropagation()
        },
          React.createElement('label', { className: 'block text-sm text-slate-600' },
            React.createElement('span', { className: 'block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1' }, 'Department Filter'),
            React.createElement('select', {
              className: 'w-full border rounded-xl px-3 py-2 bg-white text-sm',
              value: selectedDepartment,
              onChange: (e) => setSelectedDepartment(e.target.value)
            },
              departmentOptions.map((dept) => React.createElement('option', { key: dept, value: dept }, dept))
            )
          )
        )
      ),
      React.createElement(AnalyticsKpiCard, {
        label: 'Booking Status Leader',
        value: kpis.dominant_status || 'No Data',
        detail: `${kpis.dominant_status_count || 0} records`
      }),
      React.createElement(AnalyticsKpiCard, {
        label: 'Average Lead Time',
        value: `${kpis.average_lead_time_days || 0} days`,
        detail: `${kpis.lead_time_samples || 0} reservations analyzed`
      })
    ),

    React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
      React.createElement('div', { className: 'flex items-center justify-between mb-4 gap-3' },
        React.createElement('h3', { className: 'font-bold text-slate-800' }, 'Current Semester Forecast'),
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('button', {
            className: 'px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed',
            disabled: retrainingForecast || loadingForecast,
            onClick: handleRetrainForecast,
          }, retrainingForecast ? 'Retraining...' : 'Retrain Forecast'),
          forecastPayload?.next_retrain_at && React.createElement('span', { className: 'text-xs text-slate-500' },
            `Next retrain: ${new Date(forecastPayload.next_retrain_at).toLocaleString()}`
          )
        )
      ),
      forecastError && React.createElement('div', { className: 'mb-3 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm' },
        `Forecast unavailable: ${forecastError}`
      ),
      forecastPayload?.data?.warning && React.createElement('div', { className: 'mb-3 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm' },
        `Forecast is using fallback mode: ${forecastPayload.data.warning}`
      ),
      loadingForecast
        ? React.createElement('div', { className: 'h-[300px] flex items-center justify-center text-slate-500' }, 'Loading forecast...')
        : forecastSeries.length === 0
          ? React.createElement('div', { className: 'h-[300px] flex items-center justify-center text-slate-500' }, 'No forecast data available.')
          : React.createElement(ChartCanvas, {
              type: 'line',
              data: forecastChartData,
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
              }
            })
    ),

    React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
      React.createElement('div', { className: 'flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4' },
        React.createElement('h3', { className: 'font-bold text-slate-800' }, 'Monthly Report'),
        React.createElement('div', { className: 'flex flex-wrap items-center gap-2' },
          React.createElement('select', {
            className: 'border rounded-lg px-2 py-1 text-sm',
            value: reportMonth,
            onChange: (e) => setReportMonth(e.target.value)
          },
            Array.from({ length: 12 }, (_, i) => i + 1).map((m) => React.createElement('option', { key: m, value: String(m) }, formatMonthName(String(m).padStart(2, '0'))))
          ),
          React.createElement('input', {
            className: 'border rounded-lg px-2 py-1 text-sm w-24',
            type: 'number',
            value: reportYear,
            onChange: (e) => setReportYear(e.target.value)
          }),
          React.createElement('button', {
            className: 'px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60',
            disabled: generatingMonthlyReport,
            onClick: handleGenerateMonthlyReport,
          }, generatingMonthlyReport ? 'Generating...' : 'Generate Report')
        )
      ),
      monthlyReportError && React.createElement('div', { className: 'mb-3 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm' }, monthlyReportError),
      loadingMonthlyReport
        ? React.createElement('p', { className: 'text-slate-500 text-sm' }, 'Loading monthly report...')
        : React.createElement('div', { className: 'space-y-3' },
            React.createElement('p', { className: 'text-sm text-slate-700' },
              `Total Approved Reservations: ${monthlyReport?.total_approved_reservations || 0}`
            ),
            React.createElement('div', { className: 'max-h-56 overflow-y-auto border rounded-xl' },
              !monthlyReport?.items?.length
                ? React.createElement('p', { className: 'p-3 text-sm text-slate-500' }, 'No approved reservations for this month.')
                : React.createElement('table', { className: 'w-full text-sm' },
                    React.createElement('thead', { className: 'sticky top-0 bg-slate-50 border-b' },
                      React.createElement('tr', {},
                        React.createElement('th', { className: 'text-left p-2 font-semibold text-slate-700' }, 'Date'),
                        React.createElement('th', { className: 'text-left p-2 font-semibold text-slate-700' }, 'Activity'),
                        React.createElement('th', { className: 'text-left p-2 font-semibold text-slate-700' }, 'Facility'),
                        React.createElement('th', { className: 'text-left p-2 font-semibold text-slate-700' }, 'Requester'),
                        React.createElement('th', { className: 'text-left p-2 font-semibold text-slate-700' }, 'Department'),
                        React.createElement('th', { className: 'text-left p-2 font-semibold text-slate-700' }, 'Number')
                      )
                    ),
                    React.createElement('tbody', {},
                      monthlyReport.items.map((item) => React.createElement('tr', { key: `${item.start_date}-${item.requester}`, className: 'border-b last:border-b-0' },
                        React.createElement('td', { className: 'p-2 text-slate-700' }, item.start_date || 'N/A'),
                        React.createElement('td', { className: 'p-2 text-slate-700' }, item.activity || 'N/A'),
                        React.createElement('td', { className: 'p-2 text-slate-700' }, item.facility || 'N/A'),
                        React.createElement('td', { className: 'p-2 text-slate-700' }, item.requester || 'N/A'),
                        React.createElement('td', { className: 'p-2 text-slate-700' }, item.department || 'N/A'),
                        React.createElement('td', { className: 'p-2 text-slate-700' }, item.contact_number || 'N/A')
                      ))
                    )
                  )
            )
          )
        ),
      React.createElement('div', { className: 'grid grid-cols-1 xl:grid-cols-2 gap-6' },
        React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
          React.createElement('h3', { className: 'font-bold text-slate-800 mb-4' }, 'Most Booked Venues'),
          React.createElement(ChartCanvas, {
            type: 'bar',
            data: topVenuesChartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
          })
        ),
        React.createElement('div', { className: 'bg-white border rounded-3xl p-6 relative' },
          loadingAnalytics && React.createElement('div', {
            className: 'absolute inset-0 bg-white/60 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10 pointer-events-none'
          },
            React.createElement('div', { className: 'flex flex-col items-center gap-2' },
              React.createElement('div', { className: 'w-8 h-8 border-3 border-sky-200 border-t-sky-500 rounded-full animate-spin' }),
              React.createElement('p', { className: 'text-sm text-slate-600' }, 'Updating heatmap...')
            )
          ),
          React.createElement('div', { className: 'flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4' },
            React.createElement('h3', { className: 'font-bold text-slate-800' }, 'Peak Usage Time Heatmap'),
            React.createElement('p', { className: 'text-sm text-slate-500' },
              `Showing ${filterLabel}`
            )
          ),
          React.createElement('div', { className: 'pointer-events-auto' },
            React.createElement(HeatmapChart, { data: charts.peak_usage_heatmap })
          )
        )
      ),
      React.createElement('div', { className: 'grid grid-cols-1 xl:grid-cols-2 gap-6' },
        React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
          React.createElement('h3', { className: 'font-bold text-slate-800 mb-4' }, 'Reservations Over Time'),
          React.createElement(ChartCanvas, {
            type: 'line',
            data: reservationsOverTimeChartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
          })
        ),
        React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
          React.createElement('h3', { className: 'font-bold text-slate-800 mb-4' }, 'Events by Day of the Week'),
          React.createElement(ChartCanvas, {
            type: 'radar',
            data: dayOfWeekChartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { r: { beginAtZero: true, ticks: { precision: 0 } } }
            }
          })
        )
      ),
      React.createElement('div', { className: 'grid grid-cols-1 xl:grid-cols-2 gap-6' },
        React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
          React.createElement('h3', { className: 'font-bold text-slate-800 mb-4' }, 'Reservations by Department'),
          React.createElement(ChartCanvas, {
            type: 'doughnut',
            data: departmentChartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } }
            }
          })
        ),
        React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
          React.createElement('h3', { className: 'font-bold text-slate-800 mb-4' }, 'Activity Classification Breakdown'),
          React.createElement(ChartCanvas, {
            type: 'doughnut',
            data: classificationChartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } }
            }
          })
        ),
        React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
          React.createElement('h3', { className: 'font-bold text-slate-800 mb-4' }, 'Booking Status Overview'),
          React.createElement(ChartCanvas, {
            type: 'pie',
            data: statusOverviewChartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } }
            }
          })
        )
      ),
      React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
        React.createElement('h3', { className: 'font-bold text-slate-800 mb-4' }, 'Average Lead Time Histogram'),
        React.createElement(ChartCanvas, {
          type: 'bar',
          data: leadTimeChartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
          }
        })
      )
  );
}

function FacilitiesView({ rooms, onBook, isAdmin, onRoomsUpdated, onNotify, showBookButton = true, enableManagement = false }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const sortedRooms = [...rooms].sort((a, b) => {
    const posA = Number.isFinite(a.position) ? a.position : Number.MAX_SAFE_INTEGER;
    const posB = Number.isFinite(b.position) ? b.position : Number.MAX_SAFE_INTEGER;
    if (posA !== posB) return posA - posB;
    return (a.name || '').localeCompare(b.name || '');
  });

  const handleEdit = (facility) => {
    setEditingFacility(facility);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingFacility(null);
    setEditorOpen(true);
  };

  const handleDelete = async (facility) => {
    if (!confirmDeleteAction(`facility "${facility.name}"`)) return;
    try {
      setBusyId(facility.id);
      await apiService.adminDeleteFacility(facility.id);
      await onRoomsUpdated();
      onNotify('Facility deleted successfully.');
    } catch (err) {
      onNotify(err.message || 'Failed to delete facility.');
    } finally {
      setBusyId(null);
    }
  };

  const submitFacility = async (payload) => {
    if (editingFacility) {
      await apiService.adminUpdateFacility(editingFacility.id, payload);
      onNotify('Facility updated successfully.');
    } else {
      await apiService.adminCreateFacility(payload);
      onNotify('Facility created successfully.');
    }
    await onRoomsUpdated();
    setEditorOpen(false);
    setEditingFacility(null);
  };

  return React.createElement('div', { className: 'space-y-4' },
    isAdmin && enableManagement && React.createElement('div', { className: 'flex justify-end' },
      React.createElement('button', {
        onClick: handleCreate,
        className: 'bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-700 transition'
      }, '+ Add Facility')
    ),

    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
      sortedRooms.map(r => React.createElement('div', { key: r.id, className: 'bg-white rounded-3xl overflow-hidden shadow-sm border hover:shadow-md transition-all' },
        React.createElement('div', { className: 'aspect-video bg-slate-100 overflow-hidden' },
          r.image_url
            ? React.createElement('img', {
                src: r.image_url,
                alt: r.name,
                className: 'w-full h-full object-cover'
              })
            : React.createElement('div', { className: 'w-full h-full flex items-center justify-center text-slate-400 text-sm font-semibold' }, 'No facility image')
        ),
        React.createElement('div', { className: 'p-6' },
          React.createElement('h3', { className: 'text-xl font-bold mb-2 text-slate-800' }, r.name),
          React.createElement('p', { className: 'text-sm text-slate-500 mb-3' }, r.description || 'No short description.'),
          r.detailed_info && React.createElement('p', { className: 'text-xs text-slate-600 mb-4 whitespace-pre-line' }, r.detailed_info),
          React.createElement('div', { className: 'flex items-center gap-4 text-sm text-slate-600 mb-4' },
            React.createElement('span', { className: 'flex items-center gap-1' }, '# ', r.capacity),
            r.usual_activity && React.createElement('span', { className: 'flex items-center gap-1 text-slate-400' }, '• ', r.usual_activity)
          ),
          React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
            showBookButton && React.createElement('button', {
              onClick: () => onBook(r.id),
              className: 'w-full bg-sky-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-sky-600 transition'
            }, 'Book This Space'),
            isAdmin && enableManagement && React.createElement(React.Fragment, {},
              React.createElement('button', {
                onClick: () => handleEdit(r),
                className: 'w-full bg-white border border-slate-300 text-slate-700 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition'
              }, 'Edit'),
              React.createElement('button', {
                onClick: () => handleDelete(r),
                disabled: busyId === r.id,
                className: 'w-full bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl font-bold hover:bg-red-100 transition disabled:opacity-50'
              }, busyId === r.id ? 'Deleting...' : 'Delete')
            )
          )
        )
      ))
    ),

    enableManagement && editorOpen && React.createElement(FacilityEditorModal, {
      initialFacility: editingFacility,
      onClose: () => {
        setEditorOpen(false);
        setEditingFacility(null);
      },
      onSubmit: submitFacility
    })
  );
}

function SettingsView({ currentUser, rooms, onRoomsUpdated, onNotify }) {
  const [activeTab, setActiveTab] = useState('facilities');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'student', department: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showSecurityPasswords, setShowSecurityPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await apiService.adminGetUsers();
      setUsers(data || []);
    } catch (err) {
      onNotify(err.message || 'Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', role: 'student', department: '' });
    setShowUserForm(true);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({ username: user.username || '', password: '', role: user.role || 'student', department: user.department || '' });
    setShowUserForm(true);
  };

  const submitUser = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingUser) {
        await apiService.adminUpdateUser(editingUser.id, userForm);
        onNotify('User updated successfully.');
      } else {
        await apiService.adminCreateUser(userForm);
        onNotify('User created successfully.');
      }
      setShowUserForm(false);
      await loadUsers();
    } catch (err) {
      onNotify(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!confirmDeleteAction(`user "${user.username}"`)) return;
    try {
      await apiService.adminDeleteUser(user.id);
      onNotify('User deleted successfully.');
      await loadUsers();
    } catch (err) {
      onNotify(err.message || 'Failed to delete user.');
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      onNotify('New password and confirmation do not match.');
      return;
    }
    try {
      setSaving(true);
      await apiService.updateMyPassword(passwordForm.current_password, passwordForm.new_password);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      onNotify('Password updated successfully.');
    } catch (err) {
      onNotify(err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const TabBtn = ({ id, label }) => React.createElement('button', {
    onClick: () => setActiveTab(id),
    className: `px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
  }, label);

  return React.createElement('div', { className: 'space-y-6' },
    React.createElement('div', { className: 'bg-white border rounded-2xl p-6' },
      React.createElement('h2', { className: 'text-2xl font-bold text-slate-800 mb-2' }, 'Settings'),
      React.createElement('p', { className: 'text-sm text-slate-500 mb-4' }, 'Manage facilities, users, and security settings.'),
      React.createElement('div', { className: 'flex flex-wrap gap-2' },
        React.createElement(TabBtn, { id: 'facilities', label: 'Facilities' }),
        React.createElement(TabBtn, { id: 'users', label: 'Users' }),
        React.createElement(TabBtn, { id: 'security', label: 'Security' })
      )
    ),

    activeTab === 'facilities' && React.createElement(FacilitiesView, {
      rooms,
      isAdmin: true,
      onBook: () => {},
      onRoomsUpdated,
      onNotify,
      showBookButton: false,
      enableManagement: true
    }),

    activeTab === 'users' && React.createElement('div', { className: 'bg-white border rounded-2xl p-6 space-y-4' },
      React.createElement('div', { className: 'flex justify-between items-center' },
        React.createElement('h3', { className: 'text-lg font-bold text-slate-800' }, 'User Accounts'),
        React.createElement('button', { onClick: openCreateUser, className: 'bg-slate-800 text-white px-3 py-2 rounded-lg font-semibold text-sm hover:bg-slate-700' }, '+ Add User')
      ),
      usersLoading
        ? React.createElement('p', { className: 'text-sm text-slate-500' }, 'Loading users...')
        : React.createElement('div', { className: 'space-y-2' },
            users.map(u => React.createElement('div', { key: u.id, className: 'border rounded-xl p-3 flex items-center justify-between gap-3' },
              React.createElement('div', {},
                React.createElement('p', { className: 'font-semibold text-slate-800 text-sm' }, u.username),
                React.createElement('p', { className: 'text-xs text-slate-500' }, `${u.role} • ${u.department || 'No department'}`)
              ),
              React.createElement('div', { className: 'flex gap-2' },
                React.createElement('button', { onClick: () => openEditUser(u), className: 'px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-slate-50' }, 'Edit'),
                React.createElement('button', { onClick: () => deleteUser(u), className: 'px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50' }, 'Delete')
              )
            ))
          )
    ),

    activeTab === 'security' && React.createElement('div', { className: 'bg-white border rounded-2xl p-6 space-y-4' },
      React.createElement('h3', { className: 'text-lg font-bold text-slate-800' }, 'Password & Security'),
      React.createElement('p', { className: 'text-sm text-slate-500' }, `Signed in as ${currentUser?.username || 'admin'}.`),
      React.createElement('form', { onSubmit: submitPassword, className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
        React.createElement('input', {
          type: showSecurityPasswords ? 'text' : 'password',
          placeholder: 'Current password',
          value: passwordForm.current_password,
          onChange: (e) => setPasswordForm({ ...passwordForm, current_password: e.target.value }),
          className: 'p-2 border rounded',
          required: true
        }),
        React.createElement('input', {
          type: showSecurityPasswords ? 'text' : 'password',
          placeholder: 'New password',
          value: passwordForm.new_password,
          onChange: (e) => setPasswordForm({ ...passwordForm, new_password: e.target.value }),
          className: 'p-2 border rounded',
          required: true
        }),
        React.createElement('input', {
          type: showSecurityPasswords ? 'text' : 'password',
          placeholder: 'Confirm new password',
          value: passwordForm.confirm_password,
          onChange: (e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value }),
          className: 'p-2 border rounded',
          required: true
        }),
        React.createElement('label', { className: 'md:col-span-3 flex items-center gap-2 text-xs text-slate-600 select-none' },
          React.createElement('input', {
            type: 'checkbox',
            checked: showSecurityPasswords,
            onChange: (e) => setShowSecurityPasswords(e.target.checked)
          }),
          'Show passwords'
        ),
        React.createElement('button', {
          type: 'submit',
          disabled: saving,
          className: 'md:col-span-3 bg-sky-500 text-white py-2 rounded-lg font-bold hover:bg-sky-600 disabled:opacity-50'
        }, saving ? 'Saving...' : 'Update Password')
      )
    ),

    showUserForm && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
      React.createElement('div', { className: 'bg-white rounded-2xl w-full max-w-md p-5' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
          React.createElement('h4', { className: 'font-bold text-slate-800' }, editingUser ? 'Edit User' : 'Create User'),
          React.createElement('button', { onClick: () => setShowUserForm(false), className: 'text-xl text-slate-500' }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' }))
        ),
        React.createElement('form', { onSubmit: submitUser, className: 'space-y-3' },
          React.createElement('input', {
            placeholder: 'Username',
            value: userForm.username,
            onChange: (e) => setUserForm({ ...userForm, username: e.target.value }),
            className: 'w-full p-2 border rounded',
            required: true
          }),
          React.createElement('input', {
            type: 'password',
            placeholder: editingUser ? 'New password (optional)' : 'Password',
            value: userForm.password,
            onChange: (e) => setUserForm({ ...userForm, password: e.target.value }),
            className: 'w-full p-2 border rounded',
            required: !editingUser
          }),
          React.createElement('select', {
            value: userForm.role,
            onChange: (e) => setUserForm({ ...userForm, role: e.target.value }),
            className: 'w-full p-2 border rounded'
          },
            React.createElement('option', { value: 'student' }, 'student'),
            React.createElement('option', { value: 'admin_phase1' }, 'admin_phase1'),
            React.createElement('option', { value: 'admin' }, 'admin')
          ),
          React.createElement('input', {
            placeholder: 'Department',
            value: userForm.department,
            onChange: (e) => setUserForm({ ...userForm, department: e.target.value }),
            className: 'w-full p-2 border rounded'
          }),
          React.createElement('div', { className: 'flex gap-2 pt-1' },
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowUserForm(false),
              className: 'flex-1 border border-slate-300 rounded-lg py-2 font-medium'
            }, 'Cancel'),
            React.createElement('button', {
              type: 'submit',
              disabled: saving,
              className: 'flex-1 bg-slate-800 text-white rounded-lg py-2 font-bold hover:bg-slate-700 disabled:opacity-50'
            }, saving ? 'Saving...' : (editingUser ? 'Save Changes' : 'Create User'))
          )
        )
      )
    )
  );
}

function FacilityEditorModal({ initialFacility, onClose, onSubmit }) {
  const [form, setForm] = useState({
    code: initialFacility?.code || '',
    name: initialFacility?.name || '',
    capacity: initialFacility?.capacity || '',
    position: Number.isFinite(initialFacility?.position) ? initialFacility.position : '',
    description: initialFacility?.description || '',
    usual_activity: initialFacility?.usual_activity || '',
    detailed_info: initialFacility?.detailed_info || '',
    image_url: initialFacility?.image_url || ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const uploadImage = async (file) => {
    try {
      setSaving(true);
      setError('');
      const imageUrl = await apiService.adminUploadFacilityImage(file, form.image_url);
      setForm((prev) => ({ ...prev, image_url: imageUrl }));
    } catch (err) {
      setError(err.message || 'Image upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await onSubmit({
        code: form.code,
        name: form.name,
        capacity: Number(form.capacity),
        position: form.position === '' ? null : Number(form.position),
        description: form.description,
        usual_activity: form.usual_activity,
        detailed_info: form.detailed_info,
        image_url: form.image_url
      });
    } catch (err) {
      setError(err.message || 'Failed to save facility.');
    } finally {
      setSaving(false);
    }
  };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6' },
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('h3', { className: 'text-xl font-bold text-slate-800' }, initialFacility ? 'Edit Facility' : 'Add Facility'),
        React.createElement('button', { onClick: onClose, className: 'text-2xl text-slate-500' }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' }))
      ),
      error && React.createElement('div', { className: 'mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200' }, error),
      React.createElement('form', { onSubmit: submit, className: 'space-y-4' },
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
          React.createElement('input', {
            value: form.code,
            onChange: (e) => setForm({ ...form, code: e.target.value }),
            placeholder: 'Facility code (e.g. PAT)',
            className: 'p-2 border rounded'
          }),
          React.createElement('input', {
            value: form.name,
            onChange: (e) => setForm({ ...form, name: e.target.value }),
            placeholder: 'Facility name',
            className: 'p-2 border rounded md:col-span-2',
            required: true
          })
        ),
        React.createElement('input', {
          type: 'number',
          min: '1',
          value: form.capacity,
          onChange: (e) => setForm({ ...form, capacity: e.target.value }),
          placeholder: 'Capacity',
          className: 'p-2 border rounded w-full',
          required: true
        }),
        React.createElement('input', {
          type: 'number',
          min: '1',
          value: form.position,
          onChange: (e) => setForm({ ...form, position: e.target.value }),
          placeholder: 'Display order (1 = first)',
          className: 'p-2 border rounded w-full'
        }),
        React.createElement('textarea', {
          value: form.description,
          onChange: (e) => setForm({ ...form, description: e.target.value }),
          placeholder: 'Short description for cards',
          className: 'p-2 border rounded w-full min-h-[70px]'
        }),
        React.createElement('input', {
          value: form.usual_activity,
          onChange: (e) => setForm({ ...form, usual_activity: e.target.value }),
          placeholder: 'Usual activity (e.g. Seminars, Conferences)',
          className: 'p-2 border rounded w-full'
        }),
        React.createElement('textarea', {
          value: form.detailed_info,
          onChange: (e) => setForm({ ...form, detailed_info: e.target.value }),
          placeholder: 'Detailed facility information (features, rules, accessibility, floor/location, etc.)',
          className: 'p-2 border rounded w-full min-h-[110px]'
        }),
        React.createElement('div', { className: 'space-y-2' },
          React.createElement('input', {
            type: 'file',
            accept: 'image/*',
            onChange: (e) => {
              const file = e.target.files && e.target.files[0];
              if (file) uploadImage(file);
            },
            className: 'block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:border file:rounded-lg file:bg-slate-50 file:text-slate-700'
          }),
          React.createElement('p', { className: 'text-xs text-slate-500' }, 'Click to upload a facility image')
        ),
        form.image_url && React.createElement('div', { className: 'rounded-xl border overflow-hidden bg-slate-50' },
          React.createElement('img', { src: form.image_url, alt: 'Facility preview', className: 'w-full h-44 object-cover' })
        ),
        React.createElement('div', { className: 'flex gap-2 pt-2' },
          React.createElement('button', {
            type: 'button',
            onClick: onClose,
            className: 'flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 font-medium'
          }, 'Cancel'),
          React.createElement('button', {
            type: 'submit',
            disabled: saving,
            className: 'flex-1 bg-sky-500 text-white rounded-lg py-2 font-bold hover:bg-sky-600 disabled:opacity-50'
          }, saving ? 'Saving...' : (initialFacility ? 'Save Changes' : 'Create Facility'))
        )
      )
    )
  );
}

function CalendarView({ events, rooms, isAdmin, onAddHoliday, onViewEvent }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterRoom, setFilterRoom] = useState('all');
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const setCalendarYear = (nextYear) => setCurrentDate(new Date(Number(nextYear), month, 1));

  const yearSet = new Set([year]);
  (events || []).forEach((e) => {
    if (!e?.start_time) return;
    const eventDate = new Date(e.start_time);
    if (!Number.isNaN(eventDate.getTime())) {
      yearSet.add(eventDate.getFullYear());
    }
  });
  // Include a small nearby range for quick switching even if no events exist yet.
  yearSet.add(year - 1);
  yearSet.add(year + 1);
  const yearOptions = Array.from(yearSet).sort((a, b) => a - b);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleMouseMove = (e) => {
    setTooltipPos({ x: e.clientX + 10, y: e.clientY + 10 });
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatCalendarDateRange = (startIso, endIso) => {
    if (!startIso) return 'No date';
    const startDate = new Date(startIso);
    const endDate = endIso ? new Date(endIso) : startDate;
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Invalid date';
    const startText = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endText = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return startText === endText ? startText : `${startText} - ${endText}`;
  };

  const eventOverlapsDay = (event, dayStart) => {
    if (!event?.start_time) return false;
    const eventStart = new Date(event.start_time);
    const eventEnd = event.end_time ? new Date(event.end_time) : new Date(event.start_time);
    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) return false;

    const dayBegin = new Date(dayStart);
    dayBegin.setHours(0, 0, 0, 0);
    const dayFinish = new Date(dayStart);
    dayFinish.setHours(23, 59, 59, 999);

    return eventStart <= dayFinish && eventEnd >= dayBegin;
  };

  const isHolidayEvent = (event) => event?.event_type === 'holiday' || event?.is_holiday;

  const getEventCategory = (event) => {
    if (isHolidayEvent(event)) return 'holiday';

    const status = String(event?.status || '').toLowerCase();
    if (status === 'deleted' || status === 'denied' || status === 'cancelled') return 'cancelled';

    // Only concept-approved (phase 1 passed, needs phase 2) show as plotting (gray)
    if (status === 'concept-approved') return 'plotting';

    // Approved events: check if in the past or future
    if (status === 'approved') {
      const now = new Date();
      const end = event.end_time ? new Date(event.end_time) : (event.start_time ? new Date(event.start_time) : null);
      if (end && end < now) return 'finished';
      return 'scheduled';
    }

    return 'plotting';
  };

  const eventCategoryStyles = {
    plotting: {
      card: 'bg-slate-500 text-white border-l-2 border-slate-700 hover:bg-slate-600',
      badge: 'bg-slate-100 text-slate-700',
      label: 'Plotting'
    },
    scheduled: {
      card: 'bg-emerald-500 text-white border-l-2 border-emerald-700 hover:bg-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'Scheduled'
    },
    finished: {
      card: 'bg-yellow-400 text-slate-900 border-l-2 border-yellow-600 hover:bg-yellow-500',
      badge: 'bg-yellow-100 text-yellow-700',
      label: 'Finished'
    },
    cancelled: {
      card: 'bg-red-500 text-white border-l-2 border-red-700 hover:bg-red-600',
      badge: 'bg-red-100 text-red-700',
      label: 'Cancelled'
    },
    holiday: {
      card: 'bg-blue-500 text-white border-l-2 border-blue-700 hover:bg-blue-600',
      badge: 'bg-blue-100 text-blue-700',
      label: 'Holiday'
    }
  };

  const monthlyEvents = (events || []).filter((e) => {
    if (!e.start_time) return false;
    const eventStart = new Date(e.start_time);
    const eventEnd = e.end_time ? new Date(e.end_time) : new Date(e.start_time);
    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) return false;

    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const matchesMonth = eventStart <= monthEnd && eventEnd >= monthStart;
    const matchesRoom = isHolidayEvent(e) || filterRoom === 'all' || e.room_id == filterRoom;
    return matchesMonth && matchesRoom;
  }).sort((a, b) => {
    const aDate = new Date(a.start_time);
    const bDate = new Date(b.start_time);
    const byDate = aDate - bDate;
    if (byDate !== 0) return byDate;

    const aHoliday = isHolidayEvent(a) ? 1 : 0;
    const bHoliday = isHolidayEvent(b) ? 1 : 0;
    return bHoliday - aHoliday;
  });

  return React.createElement('div', { className: 'bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative' },
    // Header with controls
    React.createElement('div', { className: 'flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6' },
      React.createElement('div', {},
        React.createElement('h3', { className: 'text-2xl font-bold text-slate-800' }, monthName),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold' }, 
          'Showing: ', filterRoom === 'all' ? 'All Facilities' : (rooms?.find(r => r.id == filterRoom)?.name || 'Unknown')
        )
      ),
      React.createElement('div', { className: 'flex flex-wrap items-center gap-3' },
        isAdmin && React.createElement('button', {
          onClick: onAddHoliday,
          className: 'px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold'
        }, '+ Add Holiday'),
        rooms && rooms.length > 0 && React.createElement('select', { 
          value: filterRoom, 
          onChange: (e) => setFilterRoom(e.target.value),
          className: 'p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none'
        },
          React.createElement('option', { value: 'all' }, 'All Facilities'),
          rooms.map(r => React.createElement('option', { key: r.id, value: r.id }, r.name))
        ),
        React.createElement('select', {
          value: String(year),
          onChange: (e) => setCalendarYear(e.target.value),
          className: 'p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none'
        },
          yearOptions.map((y) => React.createElement('option', { key: y, value: String(y) }, y))
        ),
        React.createElement('div', { className: 'flex gap-1' },
          React.createElement('button', { onClick: prevMonth, className: 'p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-800' }, '◀'),
          React.createElement('button', { onClick: nextMonth, className: 'p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-800' }, '▶')
        )
      )
    ),

    // Color legend
    React.createElement('div', { className: 'mb-4 p-3 rounded-xl border border-slate-200 bg-slate-50/70' },
      React.createElement('p', { className: 'text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2' }, 'Color Legend'),
      React.createElement('div', { className: 'flex flex-wrap items-center gap-2 text-[11px]' },
        React.createElement('span', { className: 'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold' },
          React.createElement('span', { className: 'inline-block w-2 h-2 rounded-full bg-slate-500' }),
          'Gray: Plotting'
        ),
        React.createElement('span', { className: 'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold' },
          React.createElement('span', { className: 'inline-block w-2 h-2 rounded-full bg-emerald-500' }),
          'Green: Scheduled'
        ),
        React.createElement('span', { className: 'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold' },
          React.createElement('span', { className: 'inline-block w-2 h-2 rounded-full bg-yellow-500' }),
          'Yellow: Finished'
        ),
        React.createElement('span', { className: 'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold' },
          React.createElement('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500' }),
          'Red: Cancelled'
        ),
        React.createElement('span', { className: 'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold' },
          React.createElement('span', { className: 'inline-block w-2 h-2 rounded-full bg-blue-500' }),
          'Blue: Holiday'
        )
      )
    ),

    // Calendar grid
    React.createElement('div', { className: 'grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden relative' },
      // Day headers
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => 
        React.createElement('div', { key: d, className: 'bg-slate-50 p-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100' }, d)
      ),
      // Day cells
      days.map((day, i) => {
        const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
        const dayDate = day ? new Date(`${dateStr}T00:00:00`) : null;
        const dayEvents = dateStr ? events.filter(e => {
          if (!dayDate) return false;
          const matchesDate = eventOverlapsDay(e, dayDate);
          const matchesRoom = isHolidayEvent(e) || filterRoom === 'all' || e.room_id == filterRoom;
          return matchesDate && matchesRoom;
        }).sort((a, b) => {
          const aHoliday = isHolidayEvent(a) ? 1 : 0;
          const bHoliday = isHolidayEvent(b) ? 1 : 0;
          return bHoliday - aHoliday;
        }) : [];

        return React.createElement('div', { 
          key: i, 
          className: `bg-white min-h-[100px] p-2 border-slate-50 ${!day && 'bg-slate-50/50'}`
        },
          React.createElement('span', { className: `text-sm font-bold p-1 ${day ? 'text-slate-400' : 'text-transparent'}` }, day || '.'),
          React.createElement('div', { className: 'mt-1 space-y-1' },
            dayEvents.slice(0, 3).map(e => {
              const category = getEventCategory(e);
              const itemClass = `text-[9px] p-1 rounded font-bold shadow-sm truncate cursor-pointer transition-colors ${eventCategoryStyles[category].card}`;

              return React.createElement('div', {
                key: e.id,
                className: itemClass,
                onMouseEnter: () => setHoveredEvent(e),
                onMouseLeave: () => setHoveredEvent(null),
                onMouseMove: handleMouseMove,
                onClick: () => onViewEvent && onViewEvent(e)
              }, `${eventCategoryStyles[category].label.toUpperCase()}: ${e.activity_purpose}`);
            }
            ),
            dayEvents.length > 3 && React.createElement('div', { className: 'text-[9px] text-slate-400 font-bold' }, `+${dayEvents.length - 3} more`)
          )
        );
      })
    ),

    // Hover tooltip
    hoveredEvent && React.createElement('div', { 
      className: 'fixed z-[100] bg-white border border-slate-200 p-4 rounded-xl shadow-2xl pointer-events-none w-64',
      style: { left: tooltipPos.x, top: tooltipPos.y }
    },
      React.createElement('div', { className: 'flex flex-col gap-2' },
        React.createElement('h4', { className: 'font-bold text-slate-800 text-sm leading-tight border-b pb-2' }, hoveredEvent.activity_purpose),
        React.createElement('div', { className: 'space-y-2 pt-1' },
          React.createElement('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
            React.createElement(SmoothieIcon, { name: 'clock', cls: 'w-4 h-4 text-slate-400 shrink-0' }),
            React.createElement('span', {}, isHolidayEvent(hoveredEvent) ? 'Whole day class suspension' : `${formatTime(hoveredEvent.start_time)} - ${formatTime(hoveredEvent.end_time)}`)
          ),
          React.createElement('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
            React.createElement(SmoothieIcon, { name: 'map-pin', cls: 'w-4 h-4 text-slate-400 shrink-0' }),
            React.createElement('span', { className: 'font-semibold' }, isHolidayEvent(hoveredEvent) ? 'University-wide' : (hoveredEvent.room_name || (rooms?.find(r => r.id == hoveredEvent.room_id)?.name) || 'Unknown'))
          ),
          React.createElement('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
            React.createElement(SmoothieIcon, { name: 'user', cls: 'w-4 h-4 text-slate-400 shrink-0' }),
            React.createElement('span', {}, isHolidayEvent(hoveredEvent) ? (hoveredEvent.holiday_name || 'Holiday') : (hoveredEvent.person_in_charge || 'N/A'))
          )
        ),
        React.createElement('div', { className: 'mt-2 text-[8px] text-sky-400 font-bold uppercase italic' }, 'Click to view full details')
      )
    ),

    // Events list below calendar
    React.createElement('div', { className: 'mt-6 pt-6 border-t' },
      React.createElement('h4', { className: 'font-bold text-slate-800 mb-4' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'reservations', cls: 'w-4 h-4 mr-1.5 inline' }), 'Upcoming Events and Holidays')),
      monthlyEvents.length === 0 
        ? React.createElement('p', { className: 'text-slate-400 py-4 text-center text-sm' }, `No events or admin-set holidays for ${monthName}.`)
        : React.createElement('div', { className: 'space-y-2 max-h-[200px] overflow-y-auto' },
            monthlyEvents.slice(0, 10).map(e => {
                const category = getEventCategory(e);
                return React.createElement('div', { 
                  key: e.id, 
                  className: 'p-3 bg-slate-50 rounded-lg flex justify-between items-center cursor-pointer hover:bg-sky-50 transition',
                  onClick: () => onViewEvent && onViewEvent(e)
                },
                  React.createElement('div', {},
                    React.createElement('p', { className: 'font-bold text-slate-800 text-sm' }, e.activity_purpose),
                    React.createElement('p', { className: 'text-xs text-slate-500' }, formatCalendarDateRange(e.start_time, e.end_time), ' • ', category === 'holiday' ? 'Whole day' : `${formatTime(e.start_time)} - ${formatTime(e.end_time)}`)
                  ),
                  React.createElement('span', { className: `px-2 py-1 rounded-full text-[10px] font-bold ${eventCategoryStyles[category].badge}` }, eventCategoryStyles[category].label)
                );
              }
            )
          )
    )
  );
}

function ArchiveView({ archive, user, isAdmin, onDelete, loading }) {
  const toTimestamp = (isoString) => {
    if (!isoString) return 0;
    const dt = new Date(isoString);
    return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
  };

  const items = (isAdmin ? archive : archive.filter(a => a.user_id === user.id)).sort((a, b) => {
    // Ascending order: oldest archived/filed first
    const aArchiveTs = toTimestamp(a.archived_at);
    const bArchiveTs = toTimestamp(b.archived_at);
    if (aArchiveTs !== bArchiveTs) return aArchiveTs - bArchiveTs;

    const aStartTs = toTimestamp(a.start_time);
    const bStartTs = toTimestamp(b.start_time);
    if (aStartTs !== bStartTs) return aStartTs - bStartTs;

    return (a.id || 0) - (b.id || 0);
  });
  
  const getArchiveLabel = (item) => {
    if (item.status === 'denied') return { text: 'Denied', color: 'bg-red-100 text-red-700' };
    if (item.status === 'cancelled' || item.status === 'deleted') return { text: 'Cancelled', color: 'bg-yellow-100 text-yellow-700' };
    if (item.status === 'approved' && item.archived_at) return { text: 'Archived (Approved)', color: 'bg-amber-100 text-amber-700' };
    return { text: item.status, color: 'bg-slate-100 text-slate-700' };
  };

  return React.createElement('div', { className: 'space-y-4' },
    React.createElement('h2', { className: 'text-2xl font-bold text-slate-800' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'archive', cls: 'w-6 h-6 mr-2 inline' }), 'Archive')),
    loading
      ? React.createElement(InlineSpinner, { label: 'Loading archive...' })
      : items.length === 0 
      ? React.createElement('div', { className: 'bg-white p-8 rounded-3xl shadow-sm border text-center' },
        React.createElement('p', { className: 'text-slate-400' }, 'No archived items.')
      )
      : items.map(a => {
        const label = getArchiveLabel(a);
        return React.createElement('div', { key: a.id, className: 'p-4 bg-white rounded-2xl border shadow-sm flex justify-between items-center' },
          React.createElement('div', {}, 
            React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
              React.createElement('p', { className: 'font-bold text-slate-800' }, a.activity_purpose),
              React.createElement('span', { className: `px-2 py-0.5 rounded-full text-[10px] font-bold ${label.color}` }, label.text)
            ),
            React.createElement('p', { className: 'text-sm text-slate-500' }, a.start_time ? new Date(a.start_time).toLocaleString() : 'Date unavailable'),
            a.denial_reason && React.createElement('p', { className: 'text-sm text-red-500 mt-1' }, 'Reason: ', a.denial_reason)
          ),
          React.createElement('button', { onClick: () => onDelete(a.id), className: 'px-4 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 font-medium transition' }, 'Delete')
        );
      })
  );
}

function NotificationModal({ message, onClose }) {
  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl p-6 max-w-sm text-center' },
      React.createElement('p', { className: 'text-lg font-bold text-green-600 mb-4' }, React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'check', cls: 'w-5 h-5 mr-1.5 inline' }), message)),
      React.createElement('button', { onClick: onClose, className: 'w-full bg-sky-500 text-white p-2 rounded' }, 'Close')
    )
  );
}

function EventDetailsModal({ event, rooms, user, isAdmin, loading, onClose, onDeleteClick }) {
  if (!event) return null;
  const isHoliday = event.event_type === 'holiday' || event.is_holiday;
  const status = String(event.status || '').toLowerCase();
  const serverCategory = String(event.calendar_category || '').toLowerCase();
  const normalizedCategory = isHoliday
    ? 'holiday'
    : (['plotting', 'ongoing', 'cancelled', 'holiday'].includes(serverCategory)
      ? serverCategory
      : ((status === 'deleted' || status === 'denied' || status === 'cancelled')
        ? 'cancelled'
        : (status === 'approved' ? 'ongoing' : 'plotting')));

  const isCancelled = normalizedCategory === 'cancelled';
  const isOngoing = normalizedCategory === 'ongoing';
  const isScheduled = status === 'approved';
  // Allow cancel for both ongoing and scheduled (approved) events, delete for cancelled events
  let eventActionType = null;
  let eventActionLabel = '';
  let eventActionIcon = '';
  if (isCancelled) {
    eventActionType = 'delete';
    eventActionLabel = 'Delete Event';
    eventActionIcon = 'trash';
  } else if (isOngoing || isScheduled) {
    eventActionType = 'cancel';
    eventActionLabel = 'Cancel Event';
    eventActionIcon = 'ban';
  } else {
    eventActionType = null;
    eventActionLabel = '';
    eventActionIcon = '';
  }
  const statusLabel = normalizedCategory === 'holiday'
    ? 'Holiday'
    : (normalizedCategory === 'cancelled'
      ? 'Cancelled'
      : (normalizedCategory === 'ongoing' ? 'Ongoing' : 'Plotting'));
  const statusColor = normalizedCategory === 'holiday'
    ? 'bg-blue-100 text-blue-700'
    : (normalizedCategory === 'cancelled'
      ? 'bg-yellow-100 text-yellow-700'
      : (normalizedCategory === 'ongoing' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'));

  const hasEndDate = Boolean(event.end_time);

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const roomName = event.room_name || (rooms?.find(r => r.id == event.room_id)?.name) || 'Unknown Facility';

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl' },
      React.createElement('div', { className: 'flex justify-between items-start mb-6' },
        React.createElement('div', {},
          React.createElement('h3', { className: 'text-2xl font-bold text-slate-800 mb-2' }, event.activity_purpose),
          React.createElement('span', { className: `px-3 py-1 rounded-full text-xs font-bold ${statusColor}` }, statusLabel)
        ),
        React.createElement('button', { onClick: onClose, className: 'p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600' }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' }))
      ),

      React.createElement('div', { className: 'space-y-4' },
        isHoliday
          ? React.createElement(React.Fragment, {},
              React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'tag', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Name'),
                  React.createElement('p', { className: 'font-semibold text-slate-800' }, event.holiday_name || event.activity_purpose || 'Holiday')
                )
              ),
              React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'calendar', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Date'),
                  React.createElement('p', { className: 'font-semibold text-slate-800' }, formatDate(event.start_time))
                )
              ),
              React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'flag', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Notes'),
                  React.createElement('p', { className: 'font-semibold text-slate-800 whitespace-pre-line' }, event.notes || 'No notes provided.')
                )
              )
            )
          : React.createElement(React.Fragment, {},
              React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'calendar', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Date'),
                  React.createElement('p', { className: 'font-semibold text-slate-800' }, formatDate(event.start_time))
                )
              ),
              hasEndDate && React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'calendar-days', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'End Date'),
                  React.createElement('p', { className: 'font-semibold text-slate-800' }, formatDate(event.end_time))
                )
              ),
              React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'clock', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Time'),
                  React.createElement('p', { className: 'font-semibold text-slate-800' }, `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`)
                )
              ),
              React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'map-pin', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Facility'),
                  React.createElement('p', { className: 'font-semibold text-slate-800' }, roomName)
                )
              ),
              React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'user', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Person in Charge'),
                  React.createElement('p', { className: 'font-semibold text-slate-800' }, event.person_in_charge || 'N/A')
                )
              ),
              event.department && React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
                React.createElement(SmoothieIcon, { name: 'building', cls: 'w-6 h-6 text-slate-400 shrink-0' }),
                React.createElement('div', {},
                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Department'),
                  React.createElement('p', { className: 'font-semibold text-slate-800' }, event.department)
                )
              )
            )
      ),

      React.createElement('div', { className: 'mt-6 flex gap-3' },
        React.createElement('button', {
          onClick: onClose,
          className: `${isAdmin ? 'flex-1' : 'w-full'} bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-colors`
        }, 'Close'),
        (isAdmin && (eventActionType || isHoliday)) && React.createElement('button', {
          onClick: () => {
             // Simply pass the click up to the parent component!
             // The parent will check if it's a holiday and handle everything.
             onDeleteClick('delete'); 
          },
          disabled: loading,
          className: 'flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
        }, 
        isHoliday 
          ? React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: 'trash', cls: 'w-4 h-4 mr-1.5 inline' }), 'Delete Holiday') 
          : React.createElement(React.Fragment, {}, React.createElement(SmoothieIcon, { name: eventActionIcon, cls: 'w-4 h-4 mr-1.5 inline' }), eventActionLabel)
        )
      )
    )
  );
}

function AIChatbotWidget({ user, rooms, calendarEvents }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${user?.username || 'there'}! I am your Facilities Booking Assistant for Stage 1 (Concept Review). I can help you file your initial reservation request.`
    }
  ]);
  const listRef = useRef(null);

  // Removed quickPrompts array as per user request

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (rawText) => {
    const text = (rawText || '').trim();
    if (!text || isTyping) return;

    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setIsTyping(true);

    try {
      const facilities = (rooms || []).map(r => r.name).filter(Boolean);
      const aiCalendarContext = (calendarEvents || []).slice(0, 300);
      const result = await apiService.askFacilitiesAssistant(nextMessages, facilities, aiCalendarContext);
      setMessages(prev => [...prev, { role: 'assistant', text: result.reply || 'No response from assistant.' }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `I cannot reach the booking assistant right now. ${err.message || 'Please try again in a moment.'}`
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return React.createElement('button', {
      onClick: () => setIsOpen(true),
      className: 'fixed bottom-5 right-5 z-[70] bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 rounded-full shadow-xl font-bold text-sm'
    }, 'AI Assistant');
  }

  return React.createElement('div', { className: 'fixed bottom-5 right-5 z-[70] w-[340px] max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden' },
    React.createElement('div', { className: 'bg-sky-500 text-white px-4 py-3 flex justify-between items-center' },
      React.createElement('div', {},
        React.createElement('p', { className: 'font-bold text-sm' }, 'VacanSee AI Assistant')
      ),
      React.createElement('button', {
        onClick: () => setIsOpen(false),
        className: 'text-white/90 hover:text-white text-lg leading-none'
      }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' }))
    ),
    React.createElement('div', { ref: listRef, className: 'h-64 overflow-y-auto p-3 bg-slate-50 space-y-2' },
      messages.map((m, idx) => React.createElement('div', {
        key: idx,
        className: `max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === 'assistant' ? 'bg-white border border-slate-200 text-slate-700' : 'ml-auto bg-sky-500 text-white'}`
      }, m.text)),
      isTyping && React.createElement('div', { className: 'max-w-[85%] px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-500' }, 'Typing...')
    ),
    React.createElement('div', { className: 'px-3 pt-2 pb-1 border-t bg-white' },
      React.createElement('div', { className: 'flex gap-2 pb-2' },
        React.createElement('input', {
          value: input,
          onChange: (e) => setInput(e.target.value),
          onKeyDown: (e) => { if (e.key === 'Enter') sendMessage(input); },
          placeholder: 'Ask about reservations...',
          className: 'flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400'
        }),
        React.createElement('button', {
          onClick: () => sendMessage(input),
          disabled: isTyping || !input.trim(),
          className: 'bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 rounded-lg disabled:opacity-50'
        }, 'Send')
      )
    )
  );
}

function NotificationsListModal({ notifications, user, isAdmin, onClose, onMarkSeen, onMarkAllSeen, onViewRequest }) {
  const getNotificationStyle = (n) => {
    if (isAdmin) return 'bg-sky-50 border-sky-100 hover:border-sky-300';
    if (n.status === 'concept-approved') return 'bg-blue-50 border-blue-100 hover:border-blue-300';
    if (n.status === 'approved') return 'bg-green-50 border-green-100 hover:border-green-300';
    if (n.status === 'cancelled' || n.status === 'deleted') return 'bg-yellow-50 border-yellow-100';
    return 'bg-red-50 border-red-100';
  };

  const getNotificationLabel = (n) => {
    if (isAdmin) {
      if (n.notification_type === 'final-submitted') return 'Final Form Submitted';
      if (n.notification_type === 'approved') return 'Reservation Approved';
      if (n.notification_type === 'denied') return 'Reservation Denied';
      return 'New Reservation Request';
    }
    if (n.status === 'concept-approved') return 'Phase 1 Approved!';
    if (n.status === 'approved') return 'Fully Approved!';
    if (n.status === 'cancelled' || n.status === 'deleted') return 'Event Cancelled by Admin';
    return 'Reservation Denied';
  };

  const getLabelColor = (n) => {
    if (isAdmin) return 'text-sky-600';
    if (n.status === 'concept-approved') return 'text-blue-600';
    if (n.status === 'approved') return 'text-green-600';
    if (n.status === 'cancelled' || n.status === 'deleted') return 'text-yellow-600';
    return 'text-red-500';
  };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col p-6 shadow-2xl overflow-hidden' },
      // Header
      React.createElement('div', { className: 'flex justify-between items-center mb-6 pb-4 border-b' },
        React.createElement('h3', { className: 'text-xl font-bold flex items-center gap-2 text-slate-800' }, 
          React.createElement(SmoothieIcon, { name: 'bell', cls: 'w-5 h-5' }), ' ', isAdmin ? 'Admin Alerts' : 'Notifications'
        ),
        React.createElement('div', { className: 'flex gap-2' },
          notifications.length > 0 && React.createElement('button', { 
            onClick: onMarkAllSeen, 
            className: 'text-xs text-sky-500 hover:text-sky-700 font-medium' 
          }, 'Mark all read'),
          React.createElement('button', { onClick: onClose, className: 'p-1 text-slate-400 hover:text-slate-600' }, React.createElement(SmoothieIcon, { name: 'close', cls: 'w-5 h-5' }))
        )
      ),
      
      // Notifications list
      React.createElement('div', { className: 'flex-1 overflow-y-auto space-y-4 pr-2' },
        notifications.length === 0 
          ? React.createElement('div', { className: 'py-12 text-center text-slate-400 flex flex-col items-center' },
              React.createElement(SmoothieIcon, { name: 'mail-open', cls: 'w-10 h-10 mb-2 text-slate-300' }),
              React.createElement('p', { className: 'text-sm' }, 'No new notifications')
            )
          : notifications.map(n => {
              return React.createElement('div', { 
                key: n.id, 
                onClick: () => { onMarkSeen(n); onViewRequest(n); },
                className: `p-4 rounded-2xl border transition-all cursor-pointer ${getNotificationStyle(n)}`
              },
                React.createElement('div', { className: 'flex justify-between items-start mb-2' },
                  React.createElement('span', { 
                    className: `text-[10px] font-bold uppercase tracking-widest ${getLabelColor(n)}` 
                  }, getNotificationLabel(n)),
                  React.createElement('button', { 
                    onClick: (e) => { e.stopPropagation(); onMarkSeen(n); },
                    className: 'text-slate-300 hover:text-green-500 transition-colors',
                    title: 'Mark as read'
                  }, React.createElement(SmoothieIcon, { name: 'check-simple', cls: 'w-4 h-4' }))
                ),
                React.createElement('p', { className: 'text-sm font-bold text-slate-800 mb-1' }, n.activity_purpose),
                React.createElement('div', { className: 'text-xs text-slate-600 leading-relaxed' },
                  isAdmin 
                    ? React.createElement('p', {}, 'Filed by ', React.createElement('strong', {}, n.user || 'Unknown'), ' • ', n.start_time?.split('T')[0] || 'No date')
                    : (n.status === 'concept-approved' 
                        ? React.createElement('p', { className: 'italic bg-white/50 p-2 rounded-lg border mt-1 border-blue-100/50 text-blue-700' }, 'Your concept paper was approved! Please submit your final form.')
                        : n.status === 'approved'
                          ? React.createElement('p', { className: 'italic bg-white/50 p-2 rounded-lg border mt-1 border-green-100/50 text-green-700' }, 'Your reservation is fully approved and visible on the calendar!')
                          : n.denial_reason && React.createElement('p', { className: `italic bg-white/50 p-2 rounded-lg border mt-1 ${(n.status === 'cancelled' || n.status === 'deleted') ? 'border-yellow-100/50 text-yellow-700' : 'border-red-100/50 text-red-700'}` }, n.denial_reason)
                      )
                ),
                React.createElement('p', { className: 'text-[10px] text-slate-400 mt-2' }, 
                  isAdmin ? (n.date_filed || 'Recently') : (n.archived_at ? new Date(n.archived_at).toLocaleDateString() : 'Recently')
                )
              );
            })
      )
    )
  );
}

// Render
ReactDOM.render(React.createElement(App), document.getElementById('root'));
