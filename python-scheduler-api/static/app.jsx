// VacanSee - Campus Space Reservation System
// This version uses CDN-only dependencies and works without a build tool

const { useState, useEffect } = React;

// ==================== API SERVICE ====================
const API_BASE = 'http://localhost:5000/api';

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
      credentials: 'include',
      body: formData
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
      credentials: 'include',
      body: formData
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
  }
};

// ==================== MAIN APP ====================
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedRes, setSelectedRes] = useState(null);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (currentUser) {
      (async () => {
        try {
          const data = await apiService.getRooms();
          setRooms(data);
          const res = await apiService.getReservations();
          setReservations(res);
        } catch (err) {
          setError(err.message);
        }
      })();
    }
  }, [currentUser]);

  const handleLogin = async (username, password) => {
    setLoading(true);
    try {
      const user = await apiService.login(username, password);
      setCurrentUser(user);
      setError('');
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
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

  if (!currentUser) {
    return React.createElement(LoginPage, { onLogin: handleLogin, loading, error });
  }

  const archive = reservations.filter(r => r.archived_at);

  return React.createElement('div', { className: 'flex h-screen bg-slate-50' },
    React.createElement(Sidebar, { currentView, setView: setCurrentView, user: currentUser, onLogout: handleLogout, isAdmin }),
    React.createElement('div', { className: 'flex-1 flex flex-col' },
      React.createElement(Header, { title: currentView, onOpenProfile: () => setActiveModal('profile'), user: currentUser }),
      error && React.createElement('div', { className: 'bg-red-100 text-red-700 px-4 py-2 m-4 rounded' },
        error, React.createElement('button', { onClick: () => setError(''), className: 'ml-2' }, '×')
      ),
      React.createElement('main', { className: 'flex-1 overflow-y-auto p-8' },
        currentView === 'dashboard' && React.createElement(Dashboard, { reservations, rooms, archive, user: currentUser, onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); }, onBook: (roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); } }),
        currentView === 'calendar' && React.createElement(CalendarView, { events: reservations.filter(r => r.status === 'approved' && !r.archived_at) }),
        currentView === 'facilities' && React.createElement(FacilitiesView, { rooms, onBook: (roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); } }),
        currentView === 'reservations' && isAdmin && React.createElement(AdminRequests, { reservations: reservations.filter(r => !r.archived_at), onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); } }),
        currentView === 'analytics' && React.createElement(AnalyticsView, { reservations }),
        currentView === 'archive' && React.createElement(ArchiveView, { archive, user: currentUser, isAdmin, onDelete: async (id) => { if (window.confirm('Delete?')) { await apiService.deleteReservation(id); setReservations(reservations.filter(r => r.id !== id)); } } })
      )
    ),
    activeModal === 'reservation' && React.createElement(ReservationModal, { initialData: selectedRes || {}, rooms, onClose: () => setActiveModal(null), onSubmit: async (fd) => { setLoading(true); try { await apiService.createReservation(fd); setNotification('Created!'); setActiveModal('notification'); const res = await apiService.getReservations(); setReservations(res); } catch (err) { setError(err.message); } finally { setLoading(false); } }, loading }),
    activeModal === 'details' && React.createElement(DetailsModal, { res: selectedRes, user: currentUser, onClose: () => setActiveModal(null), onApproveStage1: async () => { setLoading(true); try { await apiService.approveConceptStage1(selectedRes.id); const res = await apiService.getReservations(); setReservations(res); setNotification('Approved!'); setActiveModal('notification'); } catch (err) { setError(err.message); } finally { setLoading(false); } }, onDenyClick: () => setActiveModal('deny'), loading }),
    activeModal === 'deny' && React.createElement(DenyModal, { res: selectedRes, onClose: () => setActiveModal('details'), onConfirm: async (reason) => { setLoading(true); try { await apiService.denyReservation(selectedRes.id, reason); const res = await apiService.getReservations(); setReservations(res); setNotification('Denied'); setActiveModal('notification'); } catch (err) { setError(err.message); } finally { setLoading(false); } }, loading }),
    activeModal === 'profile' && React.createElement(ProfileModal, { user: currentUser, onClose: () => setActiveModal(null), onLogout: handleLogout }),
    activeModal === 'notification' && React.createElement(NotificationModal, { message: notification, onClose: () => setActiveModal(null) })
  );
}

// Components
function LoginPage({ onLogin, loading, error }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
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

function Sidebar({ currentView, setView, user, onLogout, isAdmin }) {
  const NavBtn = ({ id, label }) => React.createElement('button', { onClick: () => setView(id), className: `w-full p-3 rounded-xl text-left ${currentView === id ? 'bg-sky-100 text-sky-600 font-bold' : 'text-slate-600'}` }, label);
  
  return React.createElement('aside', { className: 'w-64 bg-white border-r p-6' },
    React.createElement('h1', { className: 'text-2xl font-bold text-sky-500 mb-10' }, 'VacanSee'),
    React.createElement('nav', { className: 'space-y-2' },
      React.createElement(NavBtn, { id: 'dashboard', label: '📊 Dashboard' }),
      React.createElement(NavBtn, { id: 'calendar', label: '📅 Calendar' }),
      React.createElement(NavBtn, { id: 'facilities', label: '🏢 Facilities' }),
      isAdmin && React.createElement('div', { className: 'pt-4 mt-4 border-t' }, React.createElement('p', { className: 'text-xs font-bold text-slate-400 mb-2' }, 'ADMIN'), React.createElement(NavBtn, { id: 'reservations', label: '📋 Requests' }), React.createElement(NavBtn, { id: 'analytics', label: '📈 Analytics' })),
      React.createElement(NavBtn, { id: 'archive', label: '📦 Archive' })
    ),
    React.createElement('div', { className: 'mt-auto pt-6 border-t flex items-center gap-3' },
      React.createElement('div', { className: 'w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center font-bold' }, user.username[0].toUpperCase()),
      React.createElement('div', { className: 'flex-1' },
        React.createElement('p', { className: 'font-bold text-sm' }, user.username),
        React.createElement('button', { onClick: onLogout, className: 'text-xs text-red-500 hover:text-red-700' }, 'Logout')
      )
    )
  );
}

function Header({ title, onOpenProfile, user }) {
  return React.createElement('header', { className: 'bg-white border-b px-8 py-4 flex justify-between items-center' },
    React.createElement('h2', { className: 'text-xl font-bold capitalize' }, title),
    React.createElement('button', { onClick: onOpenProfile, className: 'w-10 h-10 bg-slate-100 rounded-full' }, '👤')
  );
}

function StatCard({ label, val }) {
  return React.createElement('div', { className: 'bg-white p-4 rounded-2xl shadow-sm border text-center' },
    React.createElement('p', { className: 'text-sm text-slate-500 mb-1' }, label),
    React.createElement('p', { className: 'text-3xl font-bold text-sky-600' }, val)
  );
}

function Badge({ status }) {
  const colors = { pending: 'bg-yellow-100 text-yellow-700', 'concept-approved': 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', denied: 'bg-red-100 text-red-700' };
  return React.createElement('span', { className: `px-3 py-1 rounded-full text-xs font-bold ${colors[status]}` }, status);
}

function Dashboard({ reservations, rooms, archive, user, onViewDetails, onBook }) {
  const userRes = reservations.filter(r => r.user_id === user.id && !r.archived_at);
  const approved = reservations.filter(r => r.status === 'approved' && !r.archived_at);
  
  return React.createElement('div', { className: 'space-y-8' },
    React.createElement('div', { className: 'grid grid-cols-4 gap-4' },
      React.createElement(StatCard, { label: 'My Reservations', val: userRes.length }),
      React.createElement(StatCard, { label: 'Approved', val: approved.length }),
      React.createElement(StatCard, { label: 'Pending', val: userRes.filter(r => r.status === 'pending').length }),
      React.createElement(StatCard, { label: 'Archived', val: archive.length })
    ),
    React.createElement('div', { className: 'bg-white p-6 rounded-3xl' },
      React.createElement('h3', { className: 'font-bold mb-4' }, 'Recent'),
      userRes.slice(0, 5).map(r => React.createElement('div', { key: r.id, onClick: () => onViewDetails(r), className: 'p-4 bg-slate-50 rounded-xl mb-2 cursor-pointer hover:bg-sky-50' },
        React.createElement('div', { className: 'flex justify-between' },
          React.createElement('div', {}, React.createElement('p', { className: 'font-bold' }, r.activity_purpose), React.createElement('p', { className: 'text-sm text-slate-600' }, r.start_time)),
          React.createElement(Badge, { status: r.status })
        )
      ))
    )
  );
}

function ReservationModal({ initialData, rooms, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    room_id: initialData?.room_id || '',
    activity_purpose: '',
    person_in_charge: '',
    contact_number: '',
    attendees: 0,
    start_time: '',
    end_time: '',
    concept_paper_url: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto' },
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('h3', { className: 'font-bold' }, 'New Reservation'),
        React.createElement('button', { onClick: onClose, className: 'text-2xl' }, '✕')
      ),
      React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-3' },
        React.createElement('select', { value: form.room_id, onChange: (e) => setForm({ ...form, room_id: e.target.value }), className: 'w-full p-2 border rounded', required: true },
          React.createElement('option', { value: '' }, 'Select space'),
          rooms.map(r => React.createElement('option', { key: r.id, value: r.id }, `${r.name} (${r.capacity})`)
        )),
        React.createElement('input', { placeholder: 'Activity Purpose', value: form.activity_purpose, onChange: (e) => setForm({ ...form, activity_purpose: e.target.value }), className: 'w-full p-2 border rounded', required: true }),
        React.createElement('input', { placeholder: 'Person In Charge', value: form.person_in_charge, onChange: (e) => setForm({ ...form, person_in_charge: e.target.value }), className: 'w-full p-2 border rounded' }),
        React.createElement('input', { placeholder: 'Contact', value: form.contact_number, onChange: (e) => setForm({ ...form, contact_number: e.target.value }), className: 'w-full p-2 border rounded' }),
        React.createElement('input', { type: 'number', placeholder: 'Attendees', value: form.attendees, onChange: (e) => setForm({ ...form, attendees: e.target.value }), className: 'w-full p-2 border rounded' }),
        React.createElement('input', { type: 'datetime-local', value: form.start_time, onChange: (e) => setForm({ ...form, start_time: e.target.value }), className: 'w-full p-2 border rounded', required: true }),
        React.createElement('input', { type: 'datetime-local', value: form.end_time, onChange: (e) => setForm({ ...form, end_time: e.target.value }), className: 'w-full p-2 border rounded', required: true }),
        React.createElement('input', { type: 'url', placeholder: 'Concept Paper Google Drive Link', value: form.concept_paper_url, onChange: (e) => setForm({ ...form, concept_paper_url: e.target.value }), className: 'w-full p-2 border rounded', required: true }),
        React.createElement('button', { type: 'submit', disabled: loading, className: 'w-full bg-sky-500 text-white p-2 rounded font-bold' }, loading ? '...' : 'Create')
      )
    )
  );
}

function AdminRequests({ reservations, onViewDetails }) {
  const pending = reservations.filter(r => r.status === 'pending');
  return React.createElement('div',
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Requests'),
    pending.length === 0 ? React.createElement('p', { className: 'text-slate-500' }, 'None') : pending.map(r =>
      React.createElement('div', { key: r.id, onClick: () => onViewDetails(r), className: 'p-4 bg-white rounded-lg border mb-2 cursor-pointer' },
        React.createElement('div', { className: 'flex justify-between' },
          React.createElement('div', {}, React.createElement('p', { className: 'font-bold' }, r.activity_purpose), React.createElement('p', { className: 'text-sm' }, r.user)),
          React.createElement(Badge, { status: r.status })
        )
      )
    )
  );
}

function DetailsModal({ res, user, onClose, onApproveStage1, onDenyClick, loading }) {
  const isAdmin = user.role === 'admin';
  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl p-6 max-w-md max-h-[90vh] overflow-y-auto' },
      React.createElement('button', { onClick: onClose, className: 'float-right text-2xl' }, '✕'),
      React.createElement('h3', { className: 'font-bold mb-4' }, 'Details'),
      React.createElement('p', { className: 'mb-2' }, React.createElement('strong', {}, 'Purpose: '), res.activity_purpose),
      React.createElement('p', { className: 'mb-2' }, React.createElement('strong', {}, 'Contact: '), res.contact_number),
      React.createElement('p', { className: 'mb-2' }, React.createElement('strong', {}, 'Time: '), res.start_time),
      React.createElement('p', { className: 'mb-4' }, React.createElement('strong', {}, 'Status: '), res.status),
      isAdmin && res.status === 'pending' && React.createElement('div', { className: 'space-y-2' },
        React.createElement('button', { onClick: onApproveStage1, disabled: loading, className: 'w-full bg-green-500 text-white p-2 rounded' }, 'Approve'),
        React.createElement('button', { onClick: onDenyClick, className: 'w-full bg-red-500 text-white p-2 rounded' }, 'Deny')
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

function ProfileModal({ user, onClose, onLogout }) {
  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl p-6 max-w-sm' },
      React.createElement('button', { onClick: onClose, className: 'float-right text-2xl' }, '✕'),
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4' }, user.username[0].toUpperCase()),
        React.createElement('h3', { className: 'font-bold text-lg mb-1' }, user.username),
        React.createElement('p', { className: 'text-sm text-slate-600 mb-4' }, user.role),
        React.createElement('p', { className: 'text-sm mb-6' }, user.department),
        React.createElement('button', { onClick: onLogout, className: 'w-full bg-red-500 text-white p-2 rounded' }, 'Logout')
      )
    )
  );
}

function AnalyticsView({ reservations }) {
  return React.createElement('div', { className: 'grid grid-cols-3 gap-4' },
    React.createElement('div', { className: 'bg-white p-6 rounded-lg' }, React.createElement('p', { className: 'text-4xl font-bold text-yellow-600' }, reservations.filter(r => r.status === 'pending').length), React.createElement('p', { className: 'text-slate-600' }, 'Pending')),
    React.createElement('div', { className: 'bg-white p-6 rounded-lg' }, React.createElement('p', { className: 'text-4xl font-bold text-green-600' }, reservations.filter(r => r.status === 'approved').length), React.createElement('p', { className: 'text-slate-600' }, 'Approved')),
    React.createElement('div', { className: 'bg-white p-6 rounded-lg' }, React.createElement('p', { className: 'text-4xl font-bold text-red-600' }, reservations.filter(r => r.status === 'denied').length), React.createElement('p', { className: 'text-slate-600' }, 'Denied'))
  );
}

function FacilitiesView({ rooms, onBook }) {
  return React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
    rooms.map(r => React.createElement('div', { key: r.id, onClick: () => onBook(r.id), className: 'bg-white p-6 rounded-lg border cursor-pointer' },
      React.createElement('h3', { className: 'font-bold mb-2' }, r.name),
      React.createElement('p', { className: 'text-sm text-slate-600 mb-2' }, r.description),
      React.createElement('p', { className: 'font-bold text-sky-600' }, `Cap: ${r.capacity}`)
    ))
  );
}

function CalendarView({ events }) {
  return React.createElement('div', { className: 'bg-white p-6 rounded-lg' },
    React.createElement('h2', { className: 'font-bold mb-4' }, 'Approved Events'),
    events.length === 0 ? React.createElement('p', { className: 'text-slate-500' }, 'None') : events.map(e =>
      React.createElement('div', { key: e.id, className: 'p-4 bg-slate-50 rounded-lg mb-2' },
        React.createElement('p', { className: 'font-bold' }, e.activity_purpose),
        React.createElement('p', { className: 'text-sm' }, e.start_time)
      )
    )
  );
}

function ArchiveView({ archive, user, isAdmin, onDelete }) {
  const items = isAdmin ? archive : archive.filter(a => a.user_id === user.id);
  return React.createElement('div',
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Archive'),
    items.length === 0 ? React.createElement('p', {}, 'None') : items.map(a =>
      React.createElement('div', { key: a.id, className: 'p-4 bg-white rounded-lg border mb-2 flex justify-between' },
        React.createElement('div', {}, React.createElement('p', { className: 'font-bold' }, a.activity_purpose), React.createElement('p', { className: 'text-sm' }, a.start_time)),
        React.createElement('button', { onClick: () => onDelete(a.id), className: 'text-red-500 hover:text-red-700' }, 'Delete')
      )
    )
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

// Render
ReactDOM.render(React.createElement(App), document.getElementById('root'));
