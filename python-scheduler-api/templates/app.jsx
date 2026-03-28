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

  async deleteEventWithReason(id, reason) {
    const response = await fetch(`${API_BASE}/reservations/${id}/delete-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
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

  async getDataMiningAnalytics(filters = {}) {
    const params = new URLSearchParams();
    if (filters.department && filters.department !== 'All') params.set('department', filters.department);
    if (filters.heatmapMonth && filters.heatmapMonth !== 'all') params.set('heatmap_month', filters.heatmapMonth);
    const queryString = params.toString();
    const endpoint = queryString ? `${API_BASE}/data-mining/analytics?${queryString}` : `${API_BASE}/data-mining/analytics`;

    const response = await fetch(endpoint, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch analytics');
    const payload = await response.json();
    if (payload.status !== 'success') throw new Error(payload.message || 'Analytics fetch failed');
    return payload.data;
  }
};

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
    // Users see their own reservations: denied, deleted, concept-approved, or fully approved
    return reservations
      .filter(r => r.user_id === currentUser.id && !r.archived_at)
      .filter(r => {
        if (r.status === 'denied' && !seenNotifications.includes(`user-${r.id}`)) return true;
        if (r.status === 'deleted' && !seenNotifications.includes(`user-${r.id}`)) return true;
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

  const archive = reservations.filter(r => r.archived_at || r.status === 'denied' || r.status === 'deleted');

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
        currentView === 'calendar' && React.createElement(CalendarView, { events: calendarEvents, rooms, onViewEvent: (e) => { setSelectedRes(e); setActiveModal('eventDetails'); } }),
        currentView === 'facilities' && React.createElement(FacilitiesView, { rooms, onBook: (roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); } }),
        currentView === 'reservations' && isAdminOrPhase1 && React.createElement(AdminRequests, { reservations: reservations.filter(r => !r.archived_at && r.user_id !== currentUser.id), onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); } }),
        currentView === 'analytics' && isAdminOrPhase1 && React.createElement(AnalyticsView, { reservations }),
        currentView === 'archive' && React.createElement(ArchiveView, { archive, user: currentUser, isAdmin: isAdminOrPhase1, onDelete: async (id) => { if (window.confirm('Delete?')) { await apiService.deleteReservation(id); setReservations(reservations.filter(r => r.id !== id)); } } })
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
      onDeleteClick: () => setActiveModal('deleteEvent')
    }),
    activeModal === 'deleteEvent' && React.createElement(DeleteEventModal, {
      event: selectedRes,
      onClose: () => setActiveModal('eventDetails'),
      onConfirm: async (reason) => {
        setLoading(true);
        try {
          await apiService.deleteEventWithReason(selectedRes.id, reason);
          const events = await apiService.getCalendarEvents();
          setCalendarEvents(events);
          const res = await apiService.getReservations();
          setReservations(res);
          setNotification('Event deleted and user notified');
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
        React.createElement(NavBtn, { id: 'analytics', label: '📈 Analytics' })
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
  const colors = { pending: 'bg-yellow-100 text-yellow-700', 'concept-approved': 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', denied: 'bg-red-100 text-red-700', archived: 'bg-amber-100 text-amber-700', deleted: 'bg-slate-100 text-slate-700' };
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
    contact_number: '',
    event_date: '',
    start_hour: '',
    start_minute: '',
    start_period: '',
    end_hour: '',
    end_minute: '',
    end_period: '',
    concept_paper_url: '',
    division: '',
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
  const [localError, setLocalError] = useState('');

  // Get available equipment based on selected room
  const selectedRoomObj = rooms.find(r => r.id == form.room_id);
  const availableEquip = selectedRoomObj ? EQUIPMENT_DATA[selectedRoomObj.name] : [];

  const handleEquipChange = (item, qty) => {
    setForm({
      ...form,
      equipment: {
        ...form.equipment,
        [item]: parseInt(qty) || 0
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
    if (!form.event_date) missingFields.push('Event Date');
    if (!form.concept_paper_url?.trim()) missingFields.push('Concept Paper Link');
    if (!form.division?.trim()) missingFields.push('Division');
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
    const newStart = startTime;
    const newEnd = endTime;
    const newDate = form.event_date;
    const newRoomId = parseInt(form.room_id);

    const conflict = (calendarEvents || []).find(e => {
      if (e.room_id != newRoomId) return false;
      const eventDate = e.start_time?.split('T')[0];
      if (eventDate !== newDate) return false;
      const eventStart = e.start_time?.split('T')[1]?.substring(0, 5) || '';
      const eventEnd = e.end_time?.split('T')[1]?.substring(0, 5) || '';
      // Check time overlap: newStart < eventEnd AND newEnd > eventStart
      return (newStart < eventEnd) && (newEnd > eventStart);
    });

    if (conflict) {
      const roomName = rooms?.find(r => r.id == newRoomId)?.name || 'This space';
      const conflictStart = conflict.start_time?.split('T')[1]?.substring(0, 5) || '';
      const conflictEnd = conflict.end_time?.split('T')[1]?.substring(0, 5) || '';
      setLocalError(`Double Booking Detected: ${roomName} is already reserved for "${conflict.activity_purpose}" during this time (${conflictStart}-${conflictEnd}).`);
      return;
    }

    // Combine date with times for the API
    const servicesData = {
      housekeeping: {
        needed: !!form.housekeeping_needed,
        count: form.housekeeping_needed ? Number(form.housekeeping_count || 0) : 0
      },
      security_guard: !!form.security_guard_needed,
      engineering: {
        aircon: !!form.engineering_aircon,
        elevator: !!form.engineering_elevator,
        electrical_setup: !!form.engineering_electrical_setup,
        others: (form.engineering_others || '').trim()
      }
    };

    const formData = {
      ...form,
      start_time: `${form.event_date}T${startTime}`,
      end_time: `${form.event_date}T${endTime}`,
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
    React.createElement('div', { className: 'bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto' },
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('h3', { className: 'font-bold' }, 'New Reservation'),
        React.createElement('button', { onClick: onClose, className: 'text-2xl' }, '✕')
      ),
      // Error banner
      localError && React.createElement('div', { className: 'mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-start gap-2' },
        React.createElement('span', {}, '⚠️'),
        React.createElement('p', {}, localError)
      ),
      React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-3' },
        React.createElement('select', { 
          value: form.room_id, 
          onChange: (e) => setForm({ ...form, room_id: e.target.value, equipment: {} }), 
          className: 'w-full p-2 border rounded', 
          required: true 
        },
          React.createElement('option', { value: '' }, 'Select space'),
          rooms.map(r => React.createElement('option', { key: r.id, value: r.id }, `${r.name} (${r.capacity})`)
        )),
        React.createElement('input', { placeholder: 'Activity Purpose', value: form.activity_purpose, onChange: (e) => setForm({ ...form, activity_purpose: e.target.value }), className: 'w-full p-2 border rounded', required: true }),
        React.createElement('input', { placeholder: 'Person In Charge', value: form.person_in_charge, onChange: (e) => setForm({ ...form, person_in_charge: e.target.value }), className: 'w-full p-2 border rounded' }),
        React.createElement('input', { placeholder: 'Contact', value: form.contact_number, onChange: (e) => setForm({ ...form, contact_number: e.target.value }), className: 'w-full p-2 border rounded' }),
        React.createElement('input', { placeholder: 'Division', value: form.division, onChange: (e) => setForm({ ...form, division: e.target.value }), className: 'w-full p-2 border rounded' }),
        React.createElement('input', { type: 'number', placeholder: 'Number of Attendees', min: '1', value: form.num_attendees, onChange: (e) => setForm({ ...form, num_attendees: e.target.value }), className: 'w-full p-2 border rounded' }),
        // Activity Classification dropdown
        React.createElement('select', {
          value: form.activity_classification,
          onChange: (e) => setForm({ ...form, activity_classification: e.target.value }),
          className: 'w-full p-2 border rounded'
        },
          React.createElement('option', { value: '' }, 'Activity Classification'),
          ['Institutional', 'Curricular', 'Outside Group', 'Co-Curricular', 'Extra-Curricular'].map(c =>
            React.createElement('option', { key: c, value: c }, c)
          )
        ),
        // Event date (single day)
        React.createElement('div', { className: 'space-y-1' },
          React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'Event Date'),
          React.createElement('input', { type: 'date', value: form.event_date, onChange: (e) => setForm({ ...form, event_date: e.target.value }), className: 'w-full p-2 border rounded', required: true })
        ),
        // Start Time - separate hour, minute, and AM/PM dropdowns
        React.createElement('div', { className: 'space-y-1' },
          React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'Start Time'),
          React.createElement('div', { className: 'flex gap-2 items-center' },
            React.createElement('select', { 
              value: form.start_hour, 
              onChange: (e) => setForm({ ...form, start_hour: e.target.value }), 
              className: 'w-1/3 p-2 border rounded', 
              required: true 
            },
              React.createElement('option', { value: '' }, 'Hour'),
              HOUR_OPTIONS.map(h => React.createElement('option', { key: h, value: h }, h))
            ),
            React.createElement('span', { className: 'text-slate-500 font-bold' }, ':'),
            React.createElement('select', { 
              value: form.start_minute, 
              onChange: (e) => setForm({ ...form, start_minute: e.target.value }), 
              className: 'w-1/3 p-2 border rounded', 
              required: true 
            },
              React.createElement('option', { value: '' }, 'Min'),
              MINUTE_OPTIONS.map(m => React.createElement('option', { key: m, value: m }, m))
            ),
            React.createElement('select', {
              value: form.start_period,
              onChange: (e) => setForm({ ...form, start_period: e.target.value }),
              className: 'w-1/3 p-2 border rounded',
              required: true
            },
              React.createElement('option', { value: '' }, 'AM/PM'),
              AM_PM_OPTIONS.map(period => React.createElement('option', { key: period, value: period }, period))
            )
          )
        ),
        // End Time - separate hour, minute, and AM/PM dropdowns
        React.createElement('div', { className: 'space-y-1' },
          React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'End Time'),
          React.createElement('div', { className: 'flex gap-2 items-center' },
            React.createElement('select', { 
              value: form.end_hour, 
              onChange: (e) => setForm({ ...form, end_hour: e.target.value }), 
              className: 'w-1/3 p-2 border rounded', 
              required: true 
            },
              React.createElement('option', { value: '' }, 'Hour'),
              HOUR_OPTIONS.map(h => React.createElement('option', { key: h, value: h }, h))
            ),
            React.createElement('span', { className: 'text-slate-500 font-bold' }, ':'),
            React.createElement('select', { 
              value: form.end_minute, 
              onChange: (e) => setForm({ ...form, end_minute: e.target.value }), 
              className: 'w-1/3 p-2 border rounded', 
              required: true 
            },
              React.createElement('option', { value: '' }, 'Min'),
              MINUTE_OPTIONS.map(m => React.createElement('option', { key: m, value: m }, m))
            ),
            React.createElement('select', {
              value: form.end_period,
              onChange: (e) => setForm({ ...form, end_period: e.target.value }),
              className: 'w-1/3 p-2 border rounded',
              required: true
            },
              React.createElement('option', { value: '' }, 'AM/PM'),
              AM_PM_OPTIONS.map(period => React.createElement('option', { key: period, value: period }, period))
            )
          )
        ),
        React.createElement('input', { type: 'url', placeholder: 'Concept Paper Google Drive Link', value: form.concept_paper_url, onChange: (e) => setForm({ ...form, concept_paper_url: e.target.value }), className: 'w-full p-2 border rounded', required: true }),

        // SERVICES SECTION
        React.createElement('div', { className: 'mt-4 border-t pt-4 space-y-3' },
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
                  value: form.equipment[item] || 0,
                  onChange: (e) => handleEquipChange(item, e.target.value),
                  className: 'w-12 p-1 text-xs border rounded text-center bg-white'
                })
              )
            )
          )
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

    const start = res.start_time ? new Date(res.start_time) : null;
    const end = res.end_time ? new Date(res.end_time) : null;
    const dateNeeded = start ? start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const startTime = start ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
    const endTime = end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
    const dateFiled = res.date_filed ? new Date(res.date_filed).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const roomName = rooms?.find(r => Number(r.id) === Number(res.room_id))?.name || '';

    const equipRows = requestedEquip.length > 0
      ? requestedEquip.map(([item, qty]) => `
          <div class="line-row"><span class="line-label">${escapeHtml(item)}</span><span class="line-value">${escapeHtml(qty)}</span></div>
        `).join('')
      : '<div class="muted">No equipment requested.</div>';

    const engineeringText = [
      requestedServices.engineering?.aircon ? 'Aircon' : null,
      requestedServices.engineering?.elevator ? 'Elevator' : null,
      requestedServices.engineering?.electrical_setup ? 'Electrical Set-up' : null,
      requestedServices.engineering?.others ? `Others: ${requestedServices.engineering.others}` : null
    ].filter(Boolean).join(', ') || 'None';

    const htmlContent = `
      <html>
      <head>
        <title>Common Facility Request Form</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 18px; color: #111; }
          .page { max-width: 920px; margin: 0 auto; border: 2px solid #111; }
          .top { background: #f3f4f6; border-bottom: 2px solid #111; padding: 10px 16px; text-align: center; }
          .top h1 { margin: 0; font-size: 22px; letter-spacing: .2px; }
          .top p { margin: 3px 0 0; font-size: 12px; }
          .title-wrap { display: grid; grid-template-columns: 1fr 170px; border-bottom: 2px solid #111; }
          .title { padding: 10px 14px; font-size: 32px; font-weight: 800; text-align: center; }
          .code { border-left: 2px solid #111; padding: 8px; font-size: 11px; text-align: center; }
          .section { padding: 10px 14px; border-bottom: 1px solid #111; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
          .field { margin: 6px 0; font-size: 13px; display: flex; gap: 6px; align-items: baseline; }
          .field b { min-width: 145px; }
          .answer { display: inline-block; min-width: 160px; border-bottom: 1px solid #666; padding: 0 4px 1px; font-weight: 600; }
          .subhead { text-align: center; font-weight: 800; font-size: 18px; margin: 4px 0 8px; }
          .box { border: 1px solid #111; padding: 8px; }
          .line-row { display: grid; grid-template-columns: 1fr 80px; border-bottom: 1px solid #ddd; padding: 4px 0; font-size: 12px; }
          .line-label { font-weight: 600; }
          .line-value { text-align: right; font-weight: 700; }
          .muted { color: #666; font-style: italic; font-size: 12px; }
          .service-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 8px; }
          .service-col { border: 1px solid #111; min-height: 86px; padding: 8px; }
          .service-col h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; }
          .service-col p { margin: 3px 0; font-size: 12px; }
          .approval { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px solid #111; }
          .approval .col { padding: 8px; border-left: 1px solid #111; min-height: 90px; }
          .approval .col:first-child { border-left: 0; }
          .line { border-bottom: 1px solid #666; height: 18px; margin-top: 8px; }
          .small { font-size: 11px; }
          @media print { body { padding: 0; } .page { border-width: 1px; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="top">
            <h1>University of Perpetual Help System Laguna</h1>
            <p>City of Binan, Laguna, Philippines</p>
          </div>

          <div class="title-wrap">
            <div class="title">COMMON FACILITY REQUEST FORM</div>
            <div class="code">
              <div><b>UPHS/JH-CFRF-01</b></div>
              <div>Clean Template</div>
            </div>
          </div>

          <div class="section grid-2">
            <div>
              <div class="field"><b>Activity/Purpose:</b><span class="answer">${escapeHtml(res.activity_purpose)}</span></div>
              <div class="field"><b>Division:</b><span class="answer">${escapeHtml(res.division)}</span></div>
              <div class="field"><b>No. of Attendees:</b><span class="answer">${escapeHtml(res.attendees)}</span></div>
              <div class="field"><b>Date Filed:</b><span class="answer">${escapeHtml(dateFiled)}</span></div>
            </div>
            <div>
              <div class="field"><b>Department:</b><span class="answer">${escapeHtml(res.department)}</span></div>
              <div class="field"><b>Classification:</b><span class="answer">${escapeHtml(res.classification)}</span></div>
              <div class="field"><b>Date Needed:</b><span class="answer">${escapeHtml(dateNeeded)}</span></div>
              <div class="field"><b>Time Needed:</b><span class="answer">${escapeHtml(startTime)} to ${escapeHtml(endTime)}</span></div>
            </div>
          </div>

          <div class="section grid-2">
            <div class="field"><b>Person in Charge:</b><span class="answer">${escapeHtml(res.person_in_charge)}</span></div>
            <div class="field"><b>Contact Number:</b><span class="answer">${escapeHtml(res.contact_number)}</span></div>
          </div>

          <div class="section">
            <div class="subhead">FACILITY REQUEST</div>
            <div class="field"><b>Requested Facility:</b><span class="answer" style="min-width: 380px;">${escapeHtml(roomName)}</span></div>
          </div>

          <div class="section">
            <div class="subhead">EQUIPMENT / SERVICES TO BE PROVIDED</div>
            <div class="box">
              ${equipRows}
            </div>

            <div class="service-grid">
              <div class="service-col">
                <h4>Housekeeping</h4>
                <p>Need HK Staff: <b>${requestedServices.housekeeping?.needed ? 'Yes' : 'No'}</b></p>
                <p>How Many: <b>${escapeHtml(requestedServices.housekeeping?.count || '')}</b></p>
              </div>
              <div class="service-col">
                <h4>Security</h4>
                <p>Need Security Guard: <b>${requestedServices.security_guard ? 'Yes' : 'No'}</b></p>
              </div>
              <div class="service-col">
                <h4>Engineering Services</h4>
                <p><b>${escapeHtml(engineeringText)}</b></p>
              </div>
            </div>
          </div>

          <div class="section small">
            NOTE: This clean print form intentionally excludes pre-filled checks/signatures so it can be signed manually.
          </div>

          <div class="approval">
            <div class="col">
              <b>Noted by:</b>
              <div class="line"></div>
              <div class="small">Dean / Department Head</div>
            </div>
            <div class="col">
              <b>Recommending Approval:</b>
              <div class="line"></div>
              <div class="small">Head, Facilities Office</div>
            </div>
            <div class="col">
              <b>Approved by:</b>
              <div class="line"></div>
              <div class="small">Authorized Signatory</div>
            </div>
          </div>
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

function DeleteEventModal({ event, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-3xl p-6 max-w-sm shadow-2xl' },
      React.createElement('h3', { className: 'font-bold text-lg mb-2 text-slate-800' }, '🗑️ Delete Event'),
      React.createElement('p', { className: 'text-sm text-slate-600 mb-4' }, 
        'Are you sure you want to delete "', React.createElement('strong', {}, event?.activity_purpose), '"? The user will be notified.'
      ),
      React.createElement('textarea', { 
        value: reason, 
        onChange: (e) => setReason(e.target.value), 
        placeholder: 'Reason for deletion (required)...', 
        className: 'w-full p-3 border rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-300', 
        rows: 3 
      }),
      React.createElement('div', { className: 'flex gap-2' },
        React.createElement('button', { onClick: onClose, className: 'flex-1 bg-slate-200 hover:bg-slate-300 p-3 rounded-xl font-semibold transition-colors' }, 'Cancel'),
        React.createElement('button', { 
          onClick: () => reason && onConfirm(reason), 
          disabled: !reason || loading, 
          className: 'flex-1 bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl font-semibold disabled:opacity-50 transition-colors' 
        }, loading ? 'Deleting...' : 'Delete')
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

function AnalyticsKpiCard({ label, value, detail, onClick, children }) {
  return React.createElement('div', {
    className: `bg-white border rounded-3xl p-5 shadow-sm ${onClick ? 'cursor-pointer hover:border-sky-300 transition' : ''}`,
    onClick
  },
    React.createElement('p', { className: 'text-xs font-bold uppercase tracking-wider text-slate-400 mb-3' }, label),
    React.createElement('p', { className: 'text-2xl font-bold text-slate-800 leading-tight break-words' }, value),
    React.createElement('p', { className: 'text-sm text-slate-500 mt-2' }, detail),
    children
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
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedHeatmapMonth, setSelectedHeatmapMonth] = useState('all');
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  const formatMonthOption = (monthKey) => {
    if (!monthKey || monthKey === 'all') return 'All Months';
    const [year, month] = monthKey.split('-');
    const parsed = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(parsed.getTime())) return monthKey;
    return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingAnalytics(true);
      setAnalyticsError('');
      try {
        const data = await apiService.getDataMiningAnalytics({
          department: selectedDepartment,
          heatmapMonth: selectedHeatmapMonth
        });
        if (isMounted) {
          setAnalytics(data);

          const serverDepartment = data?.filters?.selected_department || 'All';
          const serverHeatmapMonth = data?.filters?.selected_heatmap_month || 'all';
          setSelectedDepartment(prev => prev === serverDepartment ? prev : serverDepartment);
          setSelectedHeatmapMonth(prev => prev === serverHeatmapMonth ? prev : serverHeatmapMonth);
        }
      } catch (err) {
        if (isMounted) setAnalyticsError(err.message || 'Failed to load analytics data');
      } finally {
        if (isMounted) setLoadingAnalytics(false);
      }
    })();

    return () => { isMounted = false; };
  }, [reservations.length, selectedDepartment, selectedHeatmapMonth]);

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
  const filters = analytics?.filters || {
    departments: ['All'],
    selected_department: selectedDepartment,
    heatmap_months: ['all'],
    selected_heatmap_month: selectedHeatmapMonth,
    selected_heatmap_month_label: formatMonthOption(selectedHeatmapMonth)
  };
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

  return React.createElement('div', { className: 'space-y-6' },
    analyticsError && React.createElement('div', { className: 'bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-xl text-sm' },
      'Showing fallback metrics. ', analyticsError
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
      React.createElement(AnalyticsKpiCard, {
        label: 'Top Department',
        value: selectedDepartment === 'All' ? (kpis.top_department || 'No Data') : selectedDepartment,
        detail: selectedDepartment === 'All'
          ? `${kpis.top_department_count || 0} reservations • Click to filter`
          : `${kpis.top_department_count || 0} reservations • Filter active`,
        onClick: () => setShowDepartmentPicker((prev) => !prev)
      },
        showDepartmentPicker && React.createElement('div', {
          className: 'mt-4 border-t pt-3 space-y-2',
          onClick: (e) => e.stopPropagation()
        },
          React.createElement('button', {
            type: 'button',
            onClick: () => {
              setSelectedDepartment('All');
              setShowDepartmentPicker(false);
            },
            className: `w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${selectedDepartment === 'All' ? 'bg-sky-100 text-sky-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`
          }, 'Back to Top Department'),
          (filters.departments || []).filter(dep => dep !== 'All').map(dep => React.createElement('button', {
            key: dep,
            type: 'button',
            onClick: () => {
              setSelectedDepartment(dep);
              setShowDepartmentPicker(false);
            },
            className: `w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${selectedDepartment === dep ? 'bg-sky-100 text-sky-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`
          }, dep))
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
        React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4' },
          React.createElement('h3', { className: 'font-bold text-slate-800' }, `Peak Usage Time Heatmap (${filters.selected_heatmap_month_label || 'All Months'})`),
          React.createElement('select', {
            value: selectedHeatmapMonth,
            onChange: (e) => setSelectedHeatmapMonth(e.target.value),
            className: 'border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white min-w-[170px]'
          },
            (filters.heatmap_months || ['all']).map(monthKey => React.createElement(
              'option',
              { key: monthKey, value: monthKey },
              formatMonthOption(monthKey)
            ))
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

function FacilitiesView({ rooms, onBook }) {
  return React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
    rooms.map(r => React.createElement('div', { key: r.id, className: 'bg-white rounded-3xl overflow-hidden shadow-sm border hover:shadow-md transition-all' },
      React.createElement('div', { className: 'p-6' },
        React.createElement('h3', { className: 'text-xl font-bold mb-2 text-slate-800' }, r.name),
        React.createElement('p', { className: 'text-sm text-slate-500 mb-4' }, r.description),
        React.createElement('div', { className: 'flex items-center gap-4 text-sm text-slate-600 mb-4' },
          React.createElement('span', { className: 'flex items-center gap-1' }, '👥 ', r.capacity),
          r.usual_activity && React.createElement('span', { className: 'flex items-center gap-1 text-slate-400' }, '🎯 ', r.usual_activity)
        ),
        React.createElement('button', { 
          onClick: () => onBook(r.id), 
          className: 'w-full bg-sky-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-sky-600 transition' 
        }, 'Book This Space')
      )
    ))
  );
}

function CalendarView({ events, rooms, onViewEvent }) {
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

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleMouseMove = (e) => {
    setTooltipPos({ x: e.clientX + 10, y: e.clientY + 10 });
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

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
        rooms && rooms.length > 0 && React.createElement('select', { 
          value: filterRoom, 
          onChange: (e) => setFilterRoom(e.target.value),
          className: 'p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none'
        },
          React.createElement('option', { value: 'all' }, 'All Facilities'),
          rooms.map(r => React.createElement('option', { key: r.id, value: r.id }, r.name))
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
          const matchesRoom = filterRoom === 'all' || e.room_id == filterRoom;
          return matchesDate && matchesRoom;
        }) : [];

        return React.createElement('div', { 
          key: i, 
          className: `bg-white min-h-[100px] p-2 border-slate-50 ${!day && 'bg-slate-50/50'}`
        },
          React.createElement('span', { className: `text-sm font-bold p-1 ${day ? 'text-slate-400' : 'text-transparent'}` }, day || '.'),
          React.createElement('div', { className: 'mt-1 space-y-1' },
            dayEvents.slice(0, 3).map(e => 
              React.createElement('div', { 
                key: e.id, 
                className: 'bg-sky-500 text-white text-[9px] p-1 rounded font-bold shadow-sm border-l-2 border-sky-700 truncate cursor-pointer hover:bg-sky-600 transition-colors',
                onMouseEnter: () => setHoveredEvent(e),
                onMouseLeave: () => setHoveredEvent(null),
                onMouseMove: handleMouseMove,
                onClick: () => onViewEvent && onViewEvent(e)
              }, e.activity_purpose)
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
            React.createElement('span', {}, formatTime(hoveredEvent.start_time), ' - ', formatTime(hoveredEvent.end_time))
          ),
          React.createElement('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
            React.createElement('span', {}, '📍'),
            React.createElement('span', { className: 'font-semibold' }, hoveredEvent.room_name || (rooms?.find(r => r.id == hoveredEvent.room_id)?.name) || 'Unknown')
          ),
          React.createElement('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
            React.createElement('span', {}, '👤'),
            React.createElement('span', {}, hoveredEvent.person_in_charge || 'N/A')
          )
        ),
        React.createElement('div', { className: 'mt-2 text-[8px] text-sky-400 font-bold uppercase italic' }, 'Click to view full details')
      )
    ),

    // Events list below calendar
    React.createElement('div', { className: 'mt-6 pt-6 border-t' },
      React.createElement('h4', { className: 'font-bold text-slate-800 mb-4' }, '📋 Upcoming Approved Events'),
      events.length === 0 
        ? React.createElement('p', { className: 'text-slate-400 py-4 text-center text-sm' }, 'No approved events yet.')
        : React.createElement('div', { className: 'space-y-2 max-h-[200px] overflow-y-auto' },
            events.slice(0, 10).map(e =>
              React.createElement('div', { 
                key: e.id, 
                className: 'p-3 bg-slate-50 rounded-lg flex justify-between items-center cursor-pointer hover:bg-sky-50 transition',
                onClick: () => onViewEvent && onViewEvent(e)
              },
                React.createElement('div', {},
                  React.createElement('p', { className: 'font-bold text-slate-800 text-sm' }, e.activity_purpose),
                  React.createElement('p', { className: 'text-xs text-slate-500' }, e.start_time?.split('T')[0], ' • ', formatTime(e.start_time), ' - ', formatTime(e.end_time))
                ),
                React.createElement('span', { className: 'px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold' }, 'Approved')
              )
            )
          )
    )
  );
}

function ArchiveView({ archive, user, isAdmin, onDelete }) {
  const items = isAdmin ? archive : archive.filter(a => a.user_id === user.id);
  
  const getArchiveLabel = (item) => {
    if (item.status === 'denied') return { text: 'Denied', color: 'bg-red-100 text-red-700' };
    if (item.status === 'deleted') return { text: 'Deleted', color: 'bg-slate-100 text-slate-700' };
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
          React.createElement('span', { className: 'px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold' }, 'Approved Event')
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
            React.createElement('p', { className: 'font-semibold text-slate-800' }, formatTime(event.start_time), ' - ', formatTime(event.end_time))
          )
        ),

        // Location
        React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
          React.createElement('span', { className: 'text-2xl' }, '📍'),
          React.createElement('div', {},
            React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Facility'),
            React.createElement('p', { className: 'font-semibold text-slate-800' }, roomName)
          )
        ),

        // Person in charge
        React.createElement('div', { className: 'flex items-start gap-3 p-4 bg-slate-50 rounded-2xl' },
          React.createElement('span', { className: 'text-2xl' }, '👤'),
          React.createElement('div', {},
            React.createElement('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1' }, 'Person in Charge'),
            React.createElement('p', { className: 'font-semibold text-slate-800' }, event.person_in_charge || 'N/A')
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
          className: `${isAdmin ? 'flex-1' : 'w-full'} bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-colors` 
        }, 'Close'),
        // Delete button (admin only)
        isAdmin && React.createElement('button', { 
          onClick: onDeleteClick,
          disabled: loading,
          className: 'flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2' 
        }, '🗑️ Delete Event')
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
      text: `Hi ${user?.username || 'there'}! I can help with booking spaces, approvals, and calendar questions.`
    }
  ]);
  const listRef = useRef(null);

  const quickPrompts = [
    'How do I book a room?',
    'What are available facilities?',
    'How does approval work?'
  ];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const buildReply = (question) => {
    const text = (question || '').toLowerCase();
    const roomNames = (rooms || []).slice(0, 4).map(r => r.name);

    if (!text.trim()) {
      return 'Ask me anything about reservations, forms, and facility usage.';
    }
    if (text.includes('book') || text.includes('reserve') || text.includes('reservation')) {
      return 'To book a space, open Facilities or Dashboard, click Book This Space, complete the reservation form, then submit your concept paper link.';
    }
    if (text.includes('facility') || text.includes('room') || text.includes('space')) {
      return roomNames.length > 0
        ? `Current facilities include: ${roomNames.join(', ')}. You can open Facilities to view details and capacity.`
        : 'You can view all spaces from the Facilities tab and book directly from there.';
    }
    if (text.includes('approve') || text.includes('approval') || text.includes('status')) {
      return 'Approval has two steps: Stage 1 approves the concept paper, then Stage 2 reviews your signed facility form before final approval.';
    }
    if (text.includes('calendar') || text.includes('event')) {
      return 'Approved reservations appear in the Event Calendar view, where you can filter by facility and open event details.';
    }
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      return 'Hello! Need help with booking, forms, or reservation tracking?';
    }
    return 'I can help with booking steps, available facilities, approval flow, and calendar events. Try one of the quick prompts below.';
  };

  const sendMessage = (rawText) => {
    const text = (rawText || '').trim();
    if (!text || isTyping) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: buildReply(text) }]);
      setIsTyping(false);
    }, 500);
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
        React.createElement('p', { className: 'text-[10px] text-sky-100' }, 'Frontend demo chatbot')
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
    if (n.status === 'deleted') return 'bg-orange-50 border-orange-100';
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
    if (n.status === 'deleted') return 'Event Deleted by Admin';
    return 'Reservation Denied';
  };

  const getLabelColor = (n) => {
    if (isAdmin) return 'text-sky-600';
    if (n.status === 'concept-approved') return 'text-blue-600';
    if (n.status === 'approved') return 'text-green-600';
    if (n.status === 'deleted') return 'text-orange-600';
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
                          : n.denial_reason && React.createElement('p', { className: `italic bg-white/50 p-2 rounded-lg border mt-1 ${n.status === 'deleted' ? 'border-orange-100/50 text-orange-700' : 'border-red-100/50 text-red-700'}` }, n.denial_reason)
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
