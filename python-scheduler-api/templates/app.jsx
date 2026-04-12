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
    'Tables', 'Chairs', 'Philippine Flag', 'University Flag', 'TV', 
    'Still Camera', 'Video Camera', 'Sound System', 'Microphone', 
    'Speaker', 'Lights Set-Up', 'Podium'
  ],
  'Quadrangle': [
    'Tables', 'Chairs', 'Philippine Flag', 'University Flag', 
    'Still Camera', 'Video Camera', 'Sound System', 'Microphone', 
    'Speaker', 'Lights Set-Up'
  ],
  'Radio Room': [
    'Tables', 'Chairs', 'LCD Projector', 'White Screen','Still Camera',
    'Video Camera', 'Sound System', 'Microphone', 'Speaker'
  ],
  'TV Studio': [
    'Tables', 'Chairs', 'LCD Projector', 'White Screen', 'TV', 'Still Camera',
    'Video Camera', 'Sound System', 'Microphone', 'Speaker'
  ]
};

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

  async getDataMiningAnalytics(filters = {}) {
    const params = new URLSearchParams();
    if (filters.department) params.set('department', filters.department);
    if (filters.heatmap_month) params.set('heatmap_month', filters.heatmap_month);
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

  async askFacilitiesAssistant(messages, facilities = []) {
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ messages, facilities })
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

  const isAdmin = currentUser?.role === 'admin';
  const isPhase1Admin = currentUser?.role === 'admin_phase1';
  const isAdminOrPhase1 = isAdmin || isPhase1Admin;

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
        const res = await fetch(`${API_BASE}/me`, { credentials: 'include' });
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
      (async () => {
        try {
          const data = await apiService.getRooms();
          setRooms(data);
          const res = await apiService.getReservations();
          setReservations(res);
          const events = await apiService.getCalendarEvents();
          setCalendarEvents(events);
        } catch (err) {
          setError(err.message);
        }
      })();
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
        setCurrentView('dashboard'); // Stay on main page
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

  // Show loading while checking session
  if (checkingSession) {
    return React.createElement('div', { className: 'h-screen flex items-center justify-center bg-slate-200' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-4xl font-bold text-sky-500 mb-4' }, 'VacanSee'),
        React.createElement('p', { className: 'text-slate-500' }, 'Loading...')
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
        React.createElement('button', { onClick: () => setError(''), className: 'text-red-700 hover:text-red-900 font-bold' }, '×')
      ),
      // Main content
      React.createElement('main', { className: 'flex-1 overflow-y-auto p-4 md:p-8' },
        currentView === 'dashboard' && React.createElement(Dashboard, { reservations, rooms, archive, user: currentUser, onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); }, onBook: (roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); } }),
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
        currentView === 'reservations' && isAdminOrPhase1 && React.createElement(AdminRequests, { reservations: reservations.filter(r => !r.archived_at && r.user_id !== currentUser.id), onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); } }),
        currentView === 'analytics' && isAdminOrPhase1 && React.createElement(AnalyticsView, { reservations }),
        currentView === 'archive' && React.createElement(ArchiveView, {
          archive,
          user: currentUser,
          isAdmin: isAdminOrPhase1,
          onDelete: async (id) => {
            if (!confirmDeleteAction('this reservation record')) return;
            await apiService.deleteReservation(id);
            setReservations(reservations.filter(r => r.id !== id));
          }
        })
      )
    ),
    // Modals
    activeModal === 'reservation' && React.createElement(ReservationModal, { initialData: selectedRes || {}, rooms, calendarEvents, onClose: () => setActiveModal(null), onSubmit: async (fd) => { setLoading(true); try { await apiService.createReservation(fd); setNotification('Created!'); setActiveModal('notification'); const res = await apiService.getReservations(); setReservations(res); } catch (err) { setError(err.message); } finally { setLoading(false); } }, loading }),
    activeModal === 'details' && React.createElement(DetailsModal, { 
      res: selectedRes, 
      user: currentUser, 
      rooms,
      onClose: () => setActiveModal(null), 
      onApproveStage1: async () => { 
        setLoading(true); 
        try { 
          await apiService.approveConceptStage1(selectedRes.id); 
          const res = await apiService.getReservations(); 
          setReservations(res); 
          setSelectedRes(res.find(r => r.id === selectedRes.id) || selectedRes);
          setNotification('Concept Approved! User can now submit final form.'); 
          setActiveModal('notification'); 
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); } 
      }, 
      onApproveFinal: async (id) => { 
        setLoading(true); 
        try { 
          await apiService.approveFinal(id); 
          const res = await apiService.getReservations(); 
          setReservations(res);
          const events = await apiService.getCalendarEvents();
          setCalendarEvents(events); 
          setNotification('Reservation fully approved! Now visible on calendar.'); 
          setActiveModal('notification'); 
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); } 
      },
      onUploadFinalForm: async (id, finalFormUrl) => { 
        setLoading(true); 
        try { 
          await apiService.uploadFinalForm(id, finalFormUrl); 
          const res = await apiService.getReservations(); 
          setReservations(res); 
          setSelectedRes(res.find(r => r.id === id) || selectedRes);
          setNotification('Final form submitted! Awaiting admin approval.'); 
          setActiveModal('notification'); 
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); } 
      },
      onArchive: async (id) => {
        setLoading(true);
        try {
          await apiService.archiveReservation(id);
          const res = await apiService.getReservations();
          setReservations(res);
          const events = await apiService.getCalendarEvents();
          setCalendarEvents(events);
          setNotification('Reservation archived successfully.');
          setActiveModal('notification');
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
      },
      onDenyClick: () => setActiveModal('deny'), 
      loading 
    }),
    activeModal === 'deny' && React.createElement(DenyModal, { res: selectedRes, onClose: () => setActiveModal('details'), onConfirm: async (reason) => { setLoading(true); try { await apiService.denyReservation(selectedRes.id, reason); const res = await apiService.getReservations(); setReservations(res); setNotification('Denied'); setActiveModal('notification'); } catch (err) { setError(err.message); } finally { setLoading(false); } }, loading }),
    activeModal === 'profile' && React.createElement(ProfileModal, { user: currentUser, onClose: () => setActiveModal(null), onLogout: handleLogout }),
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
          await apiService.deleteEventWithReason(selectedRes.id, reason, eventActionType);
          const events = await apiService.getCalendarEvents();
          setCalendarEvents(events);
          const res = await apiService.getReservations();
          setReservations(res);
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
          const events = await apiService.getCalendarEvents();
          setCalendarEvents(events);
          setNotification('Holiday added to calendar. Reservations are now blocked for that date.');
          setActiveModal('notification');
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
      },
      loading
    }),
    React.createElement(AIChatbotWidget, { user: currentUser, rooms })
  );
}

// Components
function LoginPage({ onLogin, loading, error }) {
  const [username, setUsername] = useState();
  const [password, setPassword] = useState();
  const handleSubmit = (e) => { e.preventDefault(); onLogin(username, password); };
  
  return React.createElement('div', { className: 'h-screen flex items-center justify-center bg-slate-200' },
    React.createElement('form', { onSubmit: handleSubmit, className: 'bg-white p-12 rounded-2xl shadow-xl w-full max-w-md' },
      React.createElement('h1', { className: 'text-4xl font-bold text-center mb-2' }, 'VacanSee'),
      React.createElement('p', { className: 'text-slate-500 text-center mb-8' }, 'Reservation System'),
      React.createElement('input', { value: username, onChange: (e) => setUsername(e.target.value), className: 'w-full p-3 border rounded-lg mb-4', placeholder: 'Username', required: true }),
      React.createElement('input', { type: 'password', value: password, onChange: (e) => setPassword(e.target.value), className: 'w-full p-3 border rounded-lg mb-4', placeholder: 'Password', required: true }),
      error && React.createElement('p', { className: 'text-red-500 text-center mb-4' }, error),
      React.createElement('button', { type: 'submit', disabled: loading, className: 'w-full bg-sky-500 text-white p-3 rounded-lg font-bold' }, loading ? 'Signing in...' : 'Sign In'),
      React.createElement('p', { className: 'text-xs text-slate-400 text-center mt-6' }, "Try: admin/admin123 or ccs/1234")
    )
  );
}

function Sidebar({ currentView, setView, user, onLogout, isAdmin, mobileMenuOpen, onClose }) {
  const NavBtn = ({ id, label }) => React.createElement('button', { 
    onClick: () => setView(id), 
    className: `flex items-center gap-3 w-full p-3 rounded-xl transition font-medium ${currentView === id ? 'bg-sky-100 text-sky-600' : 'text-slate-500 hover:bg-slate-100'}` 
  }, label);
  
  return React.createElement('aside', { className: `fixed md:relative z-50 w-72 bg-white border-r flex flex-col p-6 h-full transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}` },
    // Close button for mobile
    React.createElement('button', { 
      onClick: onClose, 
      className: 'absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 md:hidden' 
    }, '✕'),
    React.createElement('div', { className: 'text-2xl font-bold mb-10 text-sky-500' }, 'VacanSee'),
    React.createElement('nav', { className: 'flex-1 space-y-2' },
      React.createElement(NavBtn, { id: 'dashboard', label: '📊 Dashboard' }),
      React.createElement(NavBtn, { id: 'calendar', label: '📅 Event Calendar' }),
      React.createElement(NavBtn, { id: 'facilities', label: '🏢 Facilities' }),
      isAdmin && React.createElement('div', { className: 'pt-4 mt-4 border-t' }, 
        React.createElement('p', { className: 'text-xs font-bold text-slate-400 uppercase mb-2 px-3' }, 'Admin Panel'), 
        React.createElement(NavBtn, { id: 'reservations', label: '📋 Requests' }), 
        React.createElement(NavBtn, { id: 'analytics', label: '📈 Analytics' }),
        React.createElement(NavBtn, { id: 'settings', label: '⚙️ Settings' })
      ),
      React.createElement(NavBtn, { id: 'archive', label: '📦 Archive' })
    ),
    React.createElement('div', { className: 'pt-6 border-t flex items-center gap-3' },
      React.createElement('div', { className: 'w-10 h-10 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold' }, user.username[0].toUpperCase()),
      React.createElement('div', { className: 'flex-1 overflow-hidden text-sm' },
        React.createElement('p', { className: 'font-bold truncate text-slate-800' }, user.username),
        React.createElement('button', { onClick: onLogout, className: 'text-xs text-slate-500 hover:text-red-500 flex items-center gap-1' }, 'Log out')
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
      }, '☰'),
      React.createElement('h2', { className: 'text-lg md:text-xl font-bold text-slate-800 capitalize' }, title)
    ),
    React.createElement('div', { className: 'flex gap-2 items-center' },
      // Notification bell
      React.createElement('button', { 
        onClick: onOpenNotifications, 
        className: 'p-2 text-slate-400 hover:text-sky-500 transition relative',
        title: 'Notifications'
      }, 
        '🔔',
        hasUnread && React.createElement('span', { className: 'absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse' })
      ),
      // Profile button
      React.createElement('button', { 
        onClick: onOpenProfile, 
        className: 'ml-2 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-sky-50 hover:border-sky-300 transition-all overflow-hidden',
        title: 'Profile'
      }, '👤')
    )
  );
}

function StatCard({ label, val }) {
  return React.createElement('div', { className: 'bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border text-center' },
    React.createElement('p', { className: 'text-xs md:text-sm text-slate-500 mb-1' }, label),
    React.createElement('p', { className: 'text-2xl md:text-3xl font-bold text-sky-600' }, val)
  );
}

function Badge({ status }) {
  const colors = { pending: 'bg-yellow-100 text-yellow-700', 'concept-approved': 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', denied: 'bg-red-100 text-red-700', archived: 'bg-amber-100 text-amber-700', cancelled: 'bg-yellow-100 text-yellow-700', deleted: 'bg-yellow-100 text-yellow-700' };
  return React.createElement('span', { className: `px-3 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-slate-100 text-slate-700'}` }, status);
}

function Dashboard({ reservations, rooms, archive, user, onViewDetails, onBook }) {
  const userRes = reservations.filter(r => r.user_id === user.id && !r.archived_at);
  const approved = reservations.filter(r => r.status === 'approved' && !r.archived_at);
  
  return React.createElement('div', { className: 'space-y-6 md:space-y-8' },
    // Stats row
    React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4' },
      React.createElement(StatCard, { label: 'My Reservations', val: userRes.length }),
      React.createElement(StatCard, { label: 'Approved', val: approved.length }),
      React.createElement(StatCard, { label: 'Pending', val: userRes.filter(r => r.status === 'pending').length }),
      React.createElement(StatCard, { label: 'Archived', val: archive.length })
    ),
    // Two-column layout
    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6' },
      // Recent reservations (2 cols)
      React.createElement('div', { className: 'lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border' },
        React.createElement('h3', { className: 'font-bold text-lg mb-4 text-slate-800' }, 'My Reservations'),
        userRes.length === 0 
          ? React.createElement('p', { className: 'text-slate-400 py-8 text-center' }, 'No reservations yet. Book a space to get started!')
          : React.createElement('div', { className: 'max-h-72 overflow-y-auto space-y-2 pr-1' },
              userRes.map(r => React.createElement('div', { key: r.id, onClick: () => onViewDetails(r), className: 'p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-sky-50 transition' },
                React.createElement('div', { className: 'flex justify-between items-center' },
                  React.createElement('div', {}, 
                    React.createElement('p', { className: 'font-bold text-slate-800' }, r.activity_purpose), 
                    React.createElement('p', { className: 'text-sm text-slate-500' }, r.start_time)
                  ),
                  React.createElement(Badge, { status: r.status })
                )
              ))
            )
      ),
      // Quick book (1 col)
      React.createElement('div', { className: 'bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border' },
        React.createElement('h3', { className: 'font-bold text-lg mb-4 text-slate-800' }, 'Quick Book'),
        rooms.slice(0, 3).map(r => React.createElement('button', { 
          key: r.id, 
          onClick: () => onBook(r.id), 
          className: 'w-full p-3 bg-slate-50 rounded-xl mb-2 text-left hover:bg-sky-50 transition flex justify-between items-center' 
        },
          React.createElement('span', { className: 'font-medium text-slate-700' }, r.name),
          React.createElement('span', { className: 'text-sky-500' }, '→')
        ))
      )
    )
  );
}

function ReservationModal({ initialData, rooms, calendarEvents, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    room_id: initialData?.room_id || '',
    activity_purpose: '',
    person_in_charge: '',
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
  const availableEquip = selectedRoomObj ? EQUIPMENT_DATA[selectedRoomObj.name] : [];

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
    if (!form.room_id) missingFields.push('Space');
    if (!form.activity_purpose?.trim()) missingFields.push('Activity Purpose');
    if (!form.person_in_charge?.trim()) missingFields.push('Person In Charge');
    if (!form.contact_number?.trim()) missingFields.push('Contact');
    if (!form.event_start_date) missingFields.push('Start Date');
    if (hasEndDate && !form.event_end_date) missingFields.push('End Date');
    if (!form.concept_paper_url?.trim()) missingFields.push('Concept Paper Link');
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
      security_guard: !!form.security_guard_needed,
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
        React.createElement('button', { onClick: onClose, className: 'text-2xl' }, '✕')
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
              rooms.map(r => React.createElement('option', { key: r.id, value: r.id }, `${r.name} (${r.capacity})`)
            )),
            React.createElement('input', { placeholder: 'Activity Purpose', value: form.activity_purpose, onChange: (e) => setForm({ ...form, activity_purpose: e.target.value }), className: 'w-full p-2 border rounded bg-white', required: true }),
            React.createElement('input', { placeholder: 'Person In Charge', value: form.person_in_charge, onChange: (e) => setForm({ ...form, person_in_charge: e.target.value }), className: 'w-full p-2 border rounded bg-white' }),
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

          React.createElement('div', { className: 'bg-slate-50 border rounded p-3' },
            React.createElement('label', { className: 'flex items-center gap-2 text-sm font-medium text-slate-700' },
              React.createElement('input', {
                type: 'checkbox',
                checked: form.security_guard_needed,
                onChange: (e) => setForm({ ...form, security_guard_needed: e.target.checked })
              }),
              'Security Guard Needed'
            )
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
          React.createElement('input', { type: 'url', placeholder: 'Concept Paper Google Drive Link', value: form.concept_paper_url, onChange: (e) => setForm({ ...form, concept_paper_url: e.target.value }), className: 'w-full p-2 border rounded bg-white', required: true })
        ),
        
        React.createElement('button', { type: 'submit', disabled: loading, className: 'w-full bg-sky-500 text-white p-2 rounded font-bold mt-4' }, loading ? '...' : 'Create')
      )
    )
  );
}

function AdminRequests({ reservations, onViewDetails }) {
  // Show all non-archived requests for admin and admin_phase1 (from all users)
  return React.createElement('div',
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Requests'),
    reservations.length === 0
      ? React.createElement('p', { className: 'text-slate-500' }, 'None')
      : reservations.map(r =>
          React.createElement('div', { key:r.id, onClick: () => onViewDetails(r), className: `p-4 rounded-lg border mb-2 cursor-pointer ${r.status === 'pending' ? 'bg-white' : r.status === 'concept-approved' ? 'bg-blue-50' : r.status === 'approved' ? 'bg-green-50' : r.status === 'denied' ? 'bg-red-50' : 'bg-slate-50'}` },
            React.createElement('div', { className: 'flex justify-between' },
              React.createElement('div', {}, React.createElement('p', { className: 'font-bold' }, r.activity_purpose), React.createElement('p', { className: 'text-sm' }, r.user)),
              React.createElement(Badge, { status: r.status })
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
    const isAchieversPark = matchesFacility('achievers park');
    const isTvStudio = matchesFacility('tv studio');
    const isRadioRoom = matchesFacility('radio room');
    const isStudioRoom = matchesFacility('studio room');
    const isOthersFacility = Boolean(roomName) && ![
      isPAT,
      isCollegeLobby,
      isQuadrangle,
      isAchieversPark,
      isTvStudio,
      isRadioRoom,
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
    const headerImageUrl = `${window.location.origin}/header2.png`;

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
            min-height: 13in;
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
            body { background: white; padding: 0; }
            .page { box-shadow: none; }
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
                <div class="chk">${checkbox(isCollegeLobby)} COLLEGE LOBBY</div>
                <div class="chk">${checkbox(isQuadrangle)} QUADRANGLE</div>
              </td>
              <td class="facility-col">
                <div class="chk">${checkbox(isAchieversPark)} ACHIEVERS PARK</div>
                <div class="chk">${checkbox(isTvStudio)} TV STUDIO</div>
                <div class="chk">${checkbox(isRadioRoom)} RADIO ROOM</div>
              </td>
              <td class="facility-col">
                <div class="chk">${checkbox(isStudioRoom)} STUDIO ROOM</div>
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
                <div class="chk">${checkbox(hasMatch('podium'))} Podium <span class="uline" style="width:20px;">${escapeHtml(qtyByNeedle('podium'))}</span> &nbsp; ${checkbox(hasMatch('laptop'))} Laptop <span class="uline" style="width:20px;">${escapeHtml(qtyByNeedle('laptop'))}</span></div>
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
                <div class="sig-line">GARRY A. SANTOS</div>
                <div class="sig-role">Executive Housekeeper</div>
              </td>
              <td style="vertical-align:bottom; padding-bottom:6px; width:28%;">
                <div class="chk">${checkbox(requestedServices.security_guard)} Security Guard</div>
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
        React.createElement('button', { onClick: onClose, className: 'p-1 hover:bg-slate-100 rounded-full text-slate-600 text-xl' }, '✕')
      ),

      // Details grid
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 text-sm' },
        // Left column - basic info
        React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, '👤 Identification'),
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
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'Division'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, res.division || 'N/A')
              )
            )
          ),
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, '📅 Event Info'),
            React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
              React.createElement('div', {},
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'Start Time'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, formatDateTime(res.start_time))
              ),
              React.createElement('div', {},
                React.createElement('p', { className: 'text-slate-400 uppercase text-[10px] font-bold' }, 'End Time'),
                React.createElement('p', { className: 'font-medium text-slate-700' }, formatDateTime(res.end_time))
              )
            )
          ),
          
          // Equipment and Services Requested Section
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, '🛠️ Equipment / Services Requested'),
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
                React.createElement('span', { className: 'font-bold text-slate-700 text-xs' }, requestedServices.security_guard ? 'Yes' : 'No')
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
          React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, '📋 Process Documents'),
          
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
                  React.createElement('p', { className: 'text-green-600 font-bold flex items-center gap-2 text-sm' }, '✓ Link Submitted'),
                  React.createElement('a', { href: res.final_form_url, target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-600 underline text-xs break-all block mt-1' }, res.final_form_url)
                )
              : res.status === 'concept-approved'
                ? React.createElement('div', { className: 'space-y-3' },
                    React.createElement('p', { className: 'text-xs text-slate-700 leading-relaxed font-bold' }, 'Concept approved! Please submit your signed Facility Form.'),
                    React.createElement('button', { onClick: handlePrint, className: 'flex items-center gap-2 text-indigo-600 font-bold text-xs hover:text-indigo-700' }, '🖨️ Print Form Template'),
                    isOwner && React.createElement('div', { className: 'space-y-2 mt-2' },
                      React.createElement('input', { 
                        type: 'url', 
                        value: finalFormLink, 
                        onChange: (e) => setFinalFormLink(e.target.value),
                        placeholder: 'Paste signed form link here...', 
                        className: 'w-full border border-slate-300 p-2 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none' 
                      }),
                      React.createElement('button', { 
                        onClick: () => { if(finalFormLink) onUploadFinalForm(res.id, finalFormLink); }, 
                        disabled: !finalFormLink || loading,
                        className: 'w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-bold text-xs shadow-md transition-colors disabled:opacity-50'
                      }, loading ? 'Submitting...' : 'Submit Form Link')
                    )
                  )
                : React.createElement('p', { className: 'text-slate-400 text-xs flex items-center gap-2' }, '⏳ Awaiting Stage 1 Approval')
          )
        )
      ),

      // Admin action buttons
      (isAdmin || isPhase1Admin) && React.createElement('div', { className: 'mt-8 pt-6 border-t border-slate-100 flex gap-4' },
        // Stage 1 approval - both admin and admin_phase1 can approve/deny
        res.status === 'pending' && React.createElement(React.Fragment, {},
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
        // Archive button for approved reservations - both admin and admin_phase1
        res.status === 'approved' && React.createElement('button', { 
          onClick: () => onArchive(res.id), 
          disabled: loading, 
          className: 'flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors disabled:opacity-50' 
        }, loading ? 'Processing...' : '📦 Move to Archive')
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
  const title = isCancelAction ? '⛔ Cancel Event' : '🗑️ Delete Event Permanently';
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

function ProfileModal({ user, onClose, onLogout }) {
  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative' },
      React.createElement('button', { onClick: onClose, className: 'absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors' }, '✕'),
      
      React.createElement('div', { className: 'flex flex-col items-center text-center mb-8' },
        React.createElement('div', { className: 'w-24 h-24 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold text-4xl mb-4 border-4 border-white shadow-sm' }, user.username[0].toUpperCase()),
        React.createElement('h3', { className: 'text-2xl font-bold text-slate-800 mb-1' }, user.username),
        React.createElement('p', { className: 'text-xs font-bold text-sky-500 uppercase tracking-widest' }, user.role)
      ),

      React.createElement('div', { className: 'space-y-6 border-t pt-6' },
        React.createElement('div', { className: 'flex flex-col' },
          React.createElement('span', { className: 'text-xs font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Department'),
          React.createElement('span', { className: 'text-sm font-semibold text-slate-700' }, user.department)
        ),
        React.createElement('div', { className: 'flex flex-col' },
          React.createElement('span', { className: 'text-xs font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Status'),
          React.createElement('div', { className: 'flex items-center gap-2 text-green-600' },
            React.createElement('span', {}, '✓'),
            React.createElement('span', { className: 'text-sm font-semibold' }, 'Active Verified')
          )
        )
      ),

      React.createElement('button', { 
        onClick: onLogout,
        className: 'w-full mt-10 flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 text-red-500 hover:bg-red-50 font-bold transition-all text-sm border border-slate-100'
      }, '🚪 Sign Out')
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
      )
    )
  );
}

function AnalyticsView({ reservations }) {
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [forecastPayload, setForecastPayload] = useState(null);
  const [forecastError, setForecastError] = useState('');
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [retrainingForecast, setRetrainingForecast] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedHeatmapMonth, setSelectedHeatmapMonth] = useState('');
  const [selectedHeatmapYear, setSelectedHeatmapYear] = useState('all');
  const [selectedHeatmapMonthNumber, setSelectedHeatmapMonthNumber] = useState('all');
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingAnalytics(true);
      setAnalyticsError('');
      try {
        const data = await apiService.getDataMiningAnalytics({
          department: selectedDepartment,
          heatmap_month: selectedHeatmapMonth || undefined,
        });
        if (isMounted) {
          setAnalytics(data);
          if (!selectedHeatmapMonth && data?.filters?.selected_heatmap_month) {
            const initialKey = data.filters.selected_heatmap_month;
            setSelectedHeatmapMonth(initialKey);
            if (initialKey !== 'all' && /^\d{4}-\d{2}$/.test(initialKey)) {
              const [year, month] = initialKey.split('-');
              setSelectedHeatmapYear(year);
              setSelectedHeatmapMonthNumber(month);
            } else {
              setSelectedHeatmapYear('all');
              setSelectedHeatmapMonthNumber('all');
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
  }, [reservations.length, selectedDepartment, selectedHeatmapMonth]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingForecast(true);
      setForecastError('');
      try {
        const payload = await apiService.getCurrentSemesterForecast();
        if (isMounted) setForecastPayload(payload);
      } catch (err) {
        if (isMounted) setForecastError(err.message || 'Failed to load forecast');
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
      setForecastPayload(payload);
    } catch (err) {
      setForecastError(err.message || 'Failed to load forecast');
    } finally {
      setLoadingForecast(false);
    }
  };

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
      backgroundColor: 'rgba(14,165,233,0.18)',
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
  const heatmapYears = Array.from(new Set(heatmapMonthKeys.map((key) => key.split('-')[0]))).sort((a, b) => Number(b) - Number(a));
  const monthsForSelectedYear = selectedHeatmapYear === 'all'
    ? []
    : heatmapMonthKeys
        .filter((key) => key.startsWith(`${selectedHeatmapYear}-`))
        .map((key) => key.split('-')[1])
        .sort((a, b) => Number(a) - Number(b));

  const handleHeatmapYearChange = (year) => {
    setSelectedHeatmapYear(year);

    if (year === 'all') {
      setSelectedHeatmapMonthNumber('all');
      setSelectedHeatmapMonth('all');
      return;
    }

    const keysForYear = heatmapMonthKeys
      .filter((key) => key.startsWith(`${year}-`))
      .sort((a, b) => b.localeCompare(a));

    if (!keysForYear.length) {
      setSelectedHeatmapMonthNumber('all');
      setSelectedHeatmapMonth('all');
      return;
    }

    const latestForYear = keysForYear[0];
    setSelectedHeatmapMonth(latestForYear);
    setSelectedHeatmapMonthNumber(latestForYear.split('-')[1]);
  };

  const handleHeatmapMonthChange = (monthNumber) => {
    setSelectedHeatmapMonthNumber(monthNumber);

    if (selectedHeatmapYear === 'all' || monthNumber === 'all') {
      setSelectedHeatmapMonth('all');
      return;
    }

    const monthKey = `${selectedHeatmapYear}-${monthNumber}`;
    setSelectedHeatmapMonth(heatmapMonthKeys.includes(monthKey) ? monthKey : 'all');
  };

  const formatMonthName = (monthNumber) => {
    const temp = new Date(`2000-${monthNumber}-01T00:00:00`);
    return temp.toLocaleDateString(undefined, { month: 'long' });
  };

  const handleTopDepartmentClick = () => {
    const topDept = (kpis.top_department || '').trim();
    if (!topDept || topDept === 'No Data') return;
    // Clicking KPI applies top-department shortcut and opens full picker.
    setSelectedDepartment(topDept);
    setShowDepartmentPicker((prev) => !prev);
  };

  const forecastSeries = forecastPayload?.data?.series || [];
  const forecastChartData = {
    labels: forecastSeries.map((entry) => {
      const d = new Date(`${entry.month}-01T00:00:00`);
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Actual (Approved)',
        data: forecastSeries.map((entry) => entry.actual == null ? null : entry.actual),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2,132,199,0.15)',
        tension: 0.35,
        spanGaps: true,
        pointRadius: 3,
      },
      {
        label: 'Forecast',
        data: forecastSeries.map((entry) => entry.predicted == null ? null : entry.predicted),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.15)',
        borderDash: [6, 4],
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

    React.createElement('div', { className: 'bg-white border rounded-3xl p-4 md:p-5 grid grid-cols-1 gap-4' },
      React.createElement('label', { className: 'text-sm text-slate-600' },
        React.createElement('span', { className: 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2' }, 'Year'),
        React.createElement('select', {
          className: 'w-full border rounded-xl px-3 py-2 bg-white',
          value: selectedHeatmapYear,
          onChange: (e) => handleHeatmapYearChange(e.target.value)
        },
          React.createElement('option', { value: 'all' }, 'All Years'),
          heatmapYears.map((year) => React.createElement('option', { key: year, value: year }, year))
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
      React.createElement('div', { className: 'bg-white border rounded-3xl p-6' },
        React.createElement('div', { className: 'flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4' },
          React.createElement('h3', { className: 'font-bold text-slate-800' }, 'Peak Usage Time Heatmap'),
          React.createElement('label', { className: 'text-sm text-slate-600 md:min-w-[220px]' },
            React.createElement('span', { className: 'sr-only' }, 'Heatmap Month'),
            React.createElement('select', {
              className: 'w-full border rounded-xl px-3 py-2 bg-white',
              value: selectedHeatmapMonthNumber,
              disabled: selectedHeatmapYear === 'all',
              onChange: (e) => handleHeatmapMonthChange(e.target.value)
            },
              React.createElement('option', { value: 'all' }, selectedHeatmapYear === 'all' ? 'Select year first' : 'All Months'),
              monthsForSelectedYear.map((monthNumber) => React.createElement(
                'option',
                { key: monthNumber, value: monthNumber },
                formatMonthName(monthNumber)
              ))
            )
          )
        ),
        React.createElement(HeatmapChart, { data: charts.peak_usage_heatmap })
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
      rooms.map(r => React.createElement('div', { key: r.id, className: 'bg-white rounded-3xl overflow-hidden shadow-sm border hover:shadow-md transition-all' },
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
            React.createElement('span', { className: 'flex items-center gap-1' }, '👥 ', r.capacity),
            r.usual_activity && React.createElement('span', { className: 'flex items-center gap-1 text-slate-400' }, '🎯 ', r.usual_activity)
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
          type: 'password',
          placeholder: 'Current password',
          value: passwordForm.current_password,
          onChange: (e) => setPasswordForm({ ...passwordForm, current_password: e.target.value }),
          className: 'p-2 border rounded',
          required: true
        }),
        React.createElement('input', {
          type: 'password',
          placeholder: 'New password',
          value: passwordForm.new_password,
          onChange: (e) => setPasswordForm({ ...passwordForm, new_password: e.target.value }),
          className: 'p-2 border rounded',
          required: true
        }),
        React.createElement('input', {
          type: 'password',
          placeholder: 'Confirm new password',
          value: passwordForm.confirm_password,
          onChange: (e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value }),
          className: 'p-2 border rounded',
          required: true
        }),
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
          React.createElement('button', { onClick: () => setShowUserForm(false), className: 'text-xl text-slate-500' }, '✕')
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
    description: initialFacility?.description || '',
    usual_activity: initialFacility?.usual_activity || '',
    detailed_info: initialFacility?.detailed_info || '',
    image_url: initialFacility?.image_url || ''
  });
  const [imageUrlInput, setImageUrlInput] = useState(
    initialFacility?.image_url && /^https?:\/\//i.test(initialFacility.image_url)
      ? initialFacility.image_url
      : ''
  );
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
        description: form.description,
        usual_activity: form.usual_activity,
        detailed_info: form.detailed_info,
        image_url: (imageUrlInput || '').trim() || form.image_url
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
        React.createElement('button', { onClick: onClose, className: 'text-2xl text-slate-500' }, '✕')
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
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 items-start' },
          React.createElement('input', {
            value: imageUrlInput,
            onChange: (e) => {
              const val = e.target.value;
              setImageUrlInput(val);
              setForm({ ...form, image_url: val });
            },
            placeholder: 'External Image URL (optional)',
            className: 'p-2 border rounded w-full'
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
            React.createElement('p', { className: 'text-xs text-slate-500' }, 'You can paste an external URL or upload a file. Uploaded file URLs are hidden from this box.')
          )
        ),
        form.image_url && React.createElement('div', { className: 'rounded-xl border overflow-hidden bg-slate-50' },
          React.createElement('img', { src: form.image_url, alt: 'Facility preview', className: 'w-full h-44 object-cover' })
        ),
        React.createElement('div', { className: 'flex gap-2 pt-2' },
          React.createElement('button', {
            type: 'button',
            onClick: onClose,
            className: 'flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 font-medium hover:bg-slate-50'
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

  const isHolidayEvent = (event) => event?.event_type === 'holiday' || event?.is_holiday;

  const getEventCategory = (event) => {
    if (isHolidayEvent(event)) return 'holiday';

    const status = String(event?.status || '').toLowerCase();
    if (status === 'deleted' || status === 'denied' || status === 'cancelled') return 'cancelled';
    if (status === 'concept-approved') return 'plotting';

    const now = new Date();
    const start = event?.start_time ? new Date(event.start_time) : null;
    const end = event?.end_time ? new Date(event.end_time) : null;
    if (status === 'approved' && start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && now >= start && now <= end) {
      return 'ongoing';
    }

    return 'plotting';
  };

  const eventCategoryStyles = {
    plotting: {
      card: 'bg-slate-500 text-white border-l-2 border-slate-700 hover:bg-slate-600',
      badge: 'bg-slate-100 text-slate-700',
      label: 'Plotting'
    },
    ongoing: {
      card: 'bg-emerald-500 text-white border-l-2 border-emerald-700 hover:bg-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'Ongoing'
    },
    cancelled: {
      card: 'bg-yellow-400 text-slate-900 border-l-2 border-yellow-600 hover:bg-yellow-500',
      badge: 'bg-yellow-100 text-yellow-700',
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
    const eventDate = new Date(e.start_time);
    if (Number.isNaN(eventDate.getTime())) return false;

    const matchesMonth = eventDate.getFullYear() === year && eventDate.getMonth() === month;
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

    // Calendar grid
    React.createElement('div', { className: 'grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden relative' },
      // Day headers
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => 
        React.createElement('div', { key: d, className: 'bg-slate-50 p-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100' }, d)
      ),
      // Day cells
      days.map((day, i) => {
        const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
        const dayEvents = dateStr ? events.filter(e => {
          if (!e.start_time) return false;
          const eventDate = e.start_time.split('T')[0];
          const matchesDate = eventDate === dateStr;
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
            React.createElement('span', {}, '🕐'),
            React.createElement('span', {}, isHolidayEvent(hoveredEvent) ? 'Whole day class suspension' : `${formatTime(hoveredEvent.start_time)} - ${formatTime(hoveredEvent.end_time)}`)
          ),
          React.createElement('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
            React.createElement('span', {}, '📍'),
            React.createElement('span', { className: 'font-semibold' }, isHolidayEvent(hoveredEvent) ? 'University-wide' : (hoveredEvent.room_name || (rooms?.find(r => r.id == hoveredEvent.room_id)?.name) || 'Unknown'))
          ),
          React.createElement('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
            React.createElement('span', {}, '👤'),
            React.createElement('span', {}, isHolidayEvent(hoveredEvent) ? (hoveredEvent.holiday_name || 'Holiday') : (hoveredEvent.person_in_charge || 'N/A'))
          )
        ),
        React.createElement('div', { className: 'mt-2 text-[8px] text-sky-400 font-bold uppercase italic' }, 'Click to view full details')
      )
    ),

    // Events list below calendar
    React.createElement('div', { className: 'mt-6 pt-6 border-t' },
      React.createElement('h4', { className: 'font-bold text-slate-800 mb-4' }, '📋 Upcoming Events and Holidays'),
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
                    React.createElement('p', { className: 'text-xs text-slate-500' }, e.start_time?.split('T')[0], ' • ', category === 'holiday' ? 'Whole day' : `${formatTime(e.start_time)} - ${formatTime(e.end_time)}`)
                  ),
                  React.createElement('span', { className: `px-2 py-1 rounded-full text-[10px] font-bold ${eventCategoryStyles[category].badge}` }, eventCategoryStyles[category].label)
                );
              }
            )
          )
    )
  );
}

function ArchiveView({ archive, user, isAdmin, onDelete }) {
  const items = isAdmin ? archive : archive.filter(a => a.user_id === user.id);
  
  const getArchiveLabel = (item) => {
    if (item.status === 'denied') return { text: 'Denied', color: 'bg-red-100 text-red-700' };
    if (item.status === 'cancelled' || item.status === 'deleted') return { text: 'Cancelled', color: 'bg-yellow-100 text-yellow-700' };
    if (item.status === 'approved' && item.archived_at) return { text: 'Archived (Approved)', color: 'bg-amber-100 text-amber-700' };
    return { text: item.status, color: 'bg-slate-100 text-slate-700' };
  };

  return React.createElement('div', { className: 'space-y-4' },
    React.createElement('h2', { className: 'text-2xl font-bold text-slate-800' }, '📦 Archive'),
    items.length === 0 
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
            React.createElement('p', { className: 'text-sm text-slate-500' }, a.start_time),
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
      React.createElement('p', { className: 'text-lg font-bold text-green-600 mb-4' }, '✓ ' + message),
      React.createElement('button', { onClick: onClose, className: 'w-full bg-sky-500 text-white p-2 rounded' }, 'Close')
    )
  );
}

function EventDetailsModal({ event, rooms, user, isAdmin, loading, onClose, onDeleteClick }) {
  if (!event) return null;
  const isHoliday = event.event_type === 'holiday' || event.is_holiday;
  const status = String(event.status || '').toLowerCase();
  const isCancelled = status === 'deleted' || status === 'denied' || status === 'cancelled';
  const isConceptApproved = status === 'concept-approved';
  const now = new Date();
  const start = event.start_time ? new Date(event.start_time) : null;
  const end = event.end_time ? new Date(event.end_time) : null;
  const isOngoing = !isHoliday && !isCancelled && !isConceptApproved && status === 'approved' && start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && now >= start && now <= end;
  const eventActionType = isCancelled ? 'delete' : (isOngoing ? 'cancel' : 'delete');
  const eventActionLabel = eventActionType === 'cancel' ? 'Cancel Event' : 'Delete Event';
  const eventActionIcon = eventActionType === 'cancel' ? '⛔' : '🗑️';
  const statusLabel = isHoliday ? 'Holiday' : (isCancelled ? 'Cancelled' : (isOngoing ? 'Ongoing' : 'Plotting'));
  const statusColor = isHoliday
    ? 'bg-blue-100 text-blue-700'
    : (isCancelled ? 'bg-yellow-100 text-yellow-700' : (isOngoing ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'));

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
      // Header
      React.createElement('div', { className: 'flex justify-between items-start mb-6' },
        React.createElement('div', {},
          React.createElement('h3', { className: 'text-2xl font-bold text-slate-800 mb-2' }, event.activity_purpose),
          React.createElement('span', { className: `px-3 py-1 rounded-full text-xs font-bold ${statusColor}` }, statusLabel)
        ),
        React.createElement('button', { onClick: onClose, className: 'p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600' }, '✕')
      ),

      // Event details
      React.createElement('div', { className: 'space-y-4' },
        // Date
        React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
          React.createElement('span', { className: 'text-2xl' }, '📅'),
          React.createElement('div', {},
            React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Date'),
            React.createElement('p', { className: 'font-semibold text-slate-800' }, formatDate(event.start_time))
          )
        ),

        // Time
        React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
          React.createElement('span', { className: 'text-2xl' }, '🕐'),
          React.createElement('div', {},
            React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Time'),
            React.createElement('p', { className: 'font-semibold text-slate-800' }, isHoliday ? 'Whole day reservation suspension' : `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`)
          )
        ),

        // Location
        React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
          React.createElement('span', { className: 'text-2xl' }, '📍'),
          React.createElement('div', {},
            React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Facility'),
            React.createElement('p', { className: 'font-semibold text-slate-800' }, isHoliday ? 'University-wide' : roomName)
          )
        ),

        // Person in charge
        React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
          React.createElement('span', { className: 'text-2xl' }, '👤'),
          React.createElement('div', {},
            React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, isHoliday ? 'Holiday' : 'Person in Charge'),
            React.createElement('p', { className: 'font-semibold text-slate-800' }, isHoliday ? (event.holiday_name || 'Holiday') : (event.person_in_charge || 'N/A'))
          )
        ),

        // Department
        event.department && React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
          React.createElement('span', { className: 'text-2xl' }, '🏛️'),
          React.createElement('div', {},
            React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Department'),
            React.createElement('p', { className: 'font-semibold text-slate-800' }, event.department)
          )
        )
      ),

      // Action buttons
      React.createElement('div', { className: 'mt-6 flex gap-3' },
        // Close button
        React.createElement('button', { 
          onClick: onClose,
          className: `${isAdmin && !isHoliday ? 'flex-1' : 'w-full'} bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-colors` 
        }, 'Close'),
        // Delete button (admin only)
        isAdmin && !isHoliday && React.createElement('button', { 
          onClick: () => onDeleteClick(eventActionType),
          disabled: loading,
          className: 'flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2' 
        }, `${eventActionIcon} ${eventActionLabel}`)
      )
    )
  );
}

function AIChatbotWidget({ user, rooms }) {
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

  const quickPrompts = [
    'I want to file a reservation request',
    'What details do you need from me?',
    'What is the Stage 1 and 5-day rule?'
  ];

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
      const result = await apiService.askFacilitiesAssistant(nextMessages, facilities);
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
        React.createElement('p', { className: 'font-bold text-sm' }, 'VacanSee AI Assistant'),
        React.createElement('p', { className: 'text-[10px] text-sky-100' }, 'Gemini-powered booking assistant')
      ),
      React.createElement('button', {
        onClick: () => setIsOpen(false),
        className: 'text-white/90 hover:text-white text-lg leading-none'
      }, '✕')
    ),
    React.createElement('div', { ref: listRef, className: 'h-64 overflow-y-auto p-3 bg-slate-50 space-y-2' },
      messages.map((m, idx) => React.createElement('div', {
        key: idx,
        className: `max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === 'assistant' ? 'bg-white border border-slate-200 text-slate-700' : 'ml-auto bg-sky-500 text-white'}`
      }, m.text)),
      isTyping && React.createElement('div', { className: 'max-w-[85%] px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-500' }, 'Typing...')
    ),
    React.createElement('div', { className: 'px-3 pt-2 pb-1 border-t bg-white' },
      React.createElement('div', { className: 'flex flex-wrap gap-1 mb-2' },
        quickPrompts.map(prompt => React.createElement('button', {
          key: prompt,
          onClick: () => sendMessage(prompt),
          className: 'text-[10px] px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
        }, prompt))
      ),
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
          '🔔 ', isAdmin ? 'Admin Alerts' : 'Notifications'
        ),
        React.createElement('div', { className: 'flex gap-2' },
          notifications.length > 0 && React.createElement('button', { 
            onClick: onMarkAllSeen, 
            className: 'text-xs text-sky-500 hover:text-sky-700 font-medium' 
          }, 'Mark all read'),
          React.createElement('button', { onClick: onClose, className: 'p-1 text-slate-400 hover:text-slate-600' }, '✕')
        )
      ),
      
      // Notifications list
      React.createElement('div', { className: 'flex-1 overflow-y-auto space-y-4 pr-2' },
        notifications.length === 0 
          ? React.createElement('div', { className: 'py-12 text-center text-slate-400 flex flex-col items-center' },
              React.createElement('span', { className: 'text-4xl mb-2 opacity-20' }, '📭'),
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
                  }, '✓')
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
