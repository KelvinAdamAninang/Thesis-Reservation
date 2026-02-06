import React, { useState, useEffect } from 'react';
import { LayoutDashboard, CalendarIcon, Building2, ClipboardCheck, BarChart3, Archive, LogOut, User, Bell, Bot, X, CheckCircle, LogOut as LogOutIcon, Inbox } from 'lucide-react';
import { ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Chart as ChartJS } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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
    if (!response.ok) {
      throw new Error('Login failed');
    }
    return response.json();
  },

  async logout() {
    const response = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    return response.json();
  },

  async getRooms() {
    const response = await fetch(`${API_BASE}/rooms`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch rooms');
    return response.json();
  },

  async getReservations() {
    const response = await fetch(`${API_BASE}/reservations`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch reservations');
    return response.json();
  },

  async createReservation(data) {
    const response = await fetch(`${API_BASE}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create reservation');
    }
    return response.json();
  },

  async updateReservation(id, data) {
    const response = await fetch(`${API_BASE}/reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update reservation');
    return response.json();
  },

  async approveConceptStage1(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}/approve-concept`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to approve concept');
    return response.json();
  },

  async approveFinalStage2(id, data) {
    const response = await fetch(`${API_BASE}/reservations/${id}/upload-final-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to upload final form');
    return response.json();
  },

  async approveReservation(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}/approve-final`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to approve reservation');
    return response.json();
  },

  async denyReservation(id, reason) {
    const response = await fetch(`${API_BASE}/reservations/${id}/deny`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    if (!response.ok) throw new Error('Failed to deny reservation');
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

  async deleteReservation(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete reservation');
    return response.json();
  }
};

// ==================== MAIN APP ====================
export default function App() {
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

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      loadRooms();
      loadReservations();
    }
  }, [currentUser]);

  const loadRooms = async () => {
    try {
      const data = await apiService.getRooms();
      setRooms(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadReservations = async () => {
    try {
      const data = await apiService.getReservations();
      setReservations(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogin = async (username, password) => {
    setLoading(true);
    try {
      const user = await apiService.login(username, password);
      setCurrentUser(user);
      setError('');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setCurrentUser(null);
      setReservations([]);
      setRooms([]);
    } catch (err) {
      setError('Logout failed');
    }
  };

  const handleCreateReservation = async (data) => {
    setLoading(true);
    try {
      const result = await apiService.createReservation(data);
      setNotification('Reservation created successfully!');
      setActiveModal('notification');
      await loadReservations();
      setActiveModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStage1 = async (id) => {
    setLoading(true);
    try {
      await apiService.approveConceptStage1(id);
      setNotification('Concept approved!');
      setActiveModal('notification');
      await loadReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFinal = async (res, finalFormUrl) => {
    setLoading(true);
    try {
      await apiService.approveFinalStage2(res.id, { final_form_url: finalFormUrl });
      setNotification('Final form uploaded!');
      setActiveModal('notification');
      await loadReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFinalAdmin = async (id) => {
    setLoading(true);
    try {
      await apiService.approveReservation(id);
      setNotification('Reservation approved!');
      setActiveModal('notification');
      await loadReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async (id, reason) => {
    setLoading(true);
    try {
      await apiService.denyReservation(id, reason);
      setNotification('Reservation denied');
      setActiveModal('notification');
      await loadReservations();
      setActiveModal('details');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArchive = async (id) => {
    if (window.confirm('Are you sure you want to delete this archived item?')) {
      try {
        await apiService.deleteReservation(id);
        await loadReservations();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} loading={loading} error={error} />;
  }

  // Get approved reservations for calendar/events
  const approvedReservations = reservations.filter(r => r.status === 'approved' && !r.archived_at);

  // Get archived items
  const archive = reservations.filter(r => r.archived_at);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans text-left">
      <Sidebar
        currentView={currentView}
        setView={setCurrentView}
        user={currentUser}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={currentView}
          onOpenAI={() => setActiveModal('ai')}
          onOpenNotifications={() => setActiveModal('notifications_list')}
          onOpenProfile={() => setActiveModal('profile')}
          user={currentUser}
          hasUnread={isAdmin ? reservations.some(r => r.status === 'pending') : false}
        />

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
            {error}
            <button onClick={() => setError('')} className="float-right">×</button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-8 text-left">
          {currentView === 'dashboard' && (
            <Dashboard
              reservations={reservations}
              rooms={rooms}
              archive={archive}
              user={currentUser}
              onViewDetails={(r) => {
                setSelectedRes(r);
                setActiveModal('details');
              }}
              onBook={(roomId) => {
                setSelectedRes({ room_id: roomId });
                setActiveModal('reservation');
              }}
            />
          )}
          {currentView === 'calendar' && <CalendarView events={approvedReservations} />}
          {currentView === 'facilities' && (
            <FacilitiesView
              rooms={rooms}
              onBook={(roomId) => {
                setSelectedRes({ room_id: roomId });
                setActiveModal('reservation');
              }}
            />
          )}
          {currentView === 'reservations' && isAdmin && (
            <AdminRequests
              reservations={reservations.filter(r => !r.archived_at)}
              onViewDetails={(r) => {
                setSelectedRes(r);
                setActiveModal('details');
              }}
            />
          )}
          {currentView === 'analytics' && <AnalyticsView reservations={reservations} />}
          {currentView === 'archive' && (
            <ArchiveView
              archive={archive}
              user={currentUser}
              isAdmin={isAdmin}
              onDelete={handleDeleteArchive}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {activeModal === 'reservation' && (
        <ReservationModal
          initialData={selectedRes}
          rooms={rooms}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateReservation}
          loading={loading}
        />
      )}

      {activeModal === 'details' && (
        <DetailsModal
          res={selectedRes}
          user={currentUser}
          resources={rooms}
          onClose={() => setActiveModal(null)}
          onApproveStage1={() => handleApproveStage1(selectedRes.id)}
          onApproveFinal={(url) => handleApproveFinal(selectedRes, url)}
          onApproveFinalAdmin={() => handleApproveFinalAdmin(selectedRes.id)}
          onDenyClick={() => setActiveModal('deny')}
          onPrint={() => setActiveModal('print')}
          loading={loading}
        />
      )}

      {activeModal === 'deny' && (
        <DenyModal
          res={selectedRes}
          onClose={() => setActiveModal('details')}
          onConfirm={(reason) => handleDeny(selectedRes.id, reason)}
          loading={loading}
        />
      )}

      {activeModal === 'profile' && (
        <ProfileModal
          user={currentUser}
          onClose={() => setActiveModal(null)}
          onLogout={handleLogout}
        />
      )}

      {activeModal === 'notifications_list' && (
        <NotificationsListModal
          reservations={reservations}
          user={currentUser}
          isAdmin={isAdmin}
          onClose={() => setActiveModal(null)}
          onViewRequest={(r) => {
            setSelectedRes(r);
            setActiveModal('details');
          }}
        />
      )}

      {activeModal === 'notification' && (
        <NotificationModal
          message={notification}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'print' && (
        <PrintModal
          res={selectedRes}
          onClose={() => setActiveModal('details')}
        />
      )}
    </div>
  );
}

// ==================== COMPONENTS ====================

function LoginPage({ onLogin, loading, error }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-200">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-12 rounded-2xl shadow-xl w-full max-w-md text-left"
      >
        <h1 className="text-4xl font-bold text-center mb-2">
          Vacan<span className="text-sky-500">See</span>
        </h1>
        <p className="text-slate-500 text-center mb-8">Campus Space Reservation</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              placeholder="Username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
              placeholder="Password"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 text-white p-3 rounded-lg font-bold hover:bg-sky-600 transition shadow-lg disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium">
              Hint: Use 'admin'/'admin123' or 'ccs'/'1234'
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function Sidebar({ currentView, setView, user, onLogout, isAdmin }) {
  const NavBtn = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setView(id)}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition font-medium ${
        currentView === id
          ? 'bg-sky-100 text-sky-600'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="w-72 bg-white border-r flex flex-col p-6 h-full text-left">
      <div className="text-2xl font-bold mb-10 text-sky-500">VacanSee</div>

      <nav className="flex-1 space-y-2">
        <NavBtn id="dashboard" label="Dashboard" icon={LayoutDashboard} />
        <NavBtn id="calendar" label="Event Calendar" icon={CalendarIcon} />
        <NavBtn id="facilities" label="Facilities" icon={Building2} />

        {isAdmin && (
          <div className="pt-4 mt-4 border-t">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-3">
              Admin Panel
            </p>
            <NavBtn id="reservations" label="Requests" icon={ClipboardCheck} />
            <NavBtn id="analytics" label="Analytics" icon={BarChart3} />
          </div>
        )}

        <NavBtn id="archive" label="Archive" icon={Archive} />
      </nav>

      <div className="pt-6 border-t flex items-center gap-3">
        <div className="w-10 h-10 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold">
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1 overflow-hidden text-sm">
          <p className="font-bold truncate text-slate-800">{user.username}</p>
          <button
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1"
          >
            <LogOut size={12} /> Log out
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header({ title, onOpenAI, onOpenNotifications, onOpenProfile, user, hasUnread }) {
  return (
    <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
      <h2 className="text-xl font-bold text-slate-800 capitalize">{title}</h2>
      <div className="flex gap-2 items-center">
        <button
          onClick={onOpenAI}
          className="p-2 text-slate-400 hover:text-sky-500 transition"
          title="AI Assistant"
        >
          <Bot size={22} />
        </button>

        <button
          onClick={onOpenNotifications}
          className="p-2 text-slate-400 hover:text-sky-500 transition relative"
          title="Notifications"
        >
          <Bell size={22} />
          {hasUnread && (
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
          )}
        </button>

        <button
          onClick={onOpenProfile}
          className="ml-2 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-sky-50 hover:border-sky-300 transition-all"
          title="Profile"
        >
          <User size={20} className="text-slate-400 hover:text-sky-500" />
        </button>
      </div>
    </header>
  );
}

function ProfileModal({ user, onClose, onLogout }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold text-4xl mb-4 border-4 border-white shadow-sm">
            {user.username[0].toUpperCase()}
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{user.username}</h3>
          <p className="text-xs font-bold text-sky-500 uppercase tracking-widest">{user.role}</p>
        </div>

        <div className="space-y-6 border-t pt-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Department
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {user.department}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Status
            </span>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={14} />
              <span className="text-sm font-semibold">Active Verified</span>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full mt-10 flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 text-red-500 hover:bg-red-50 font-bold transition-all text-sm border border-slate-100"
        >
          <LogOutIcon size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}

function NotificationsListModal({
  reservations,
  user,
  isAdmin,
  onClose,
  onViewRequest
}) {
  const notifications = isAdmin
    ? reservations.filter(r => r.status === 'pending' && !r.archived_at)
    : reservations.filter(r => r.status === 'denied' && !r.archived_at && r.user_id === user.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col p-6 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Bell className="text-sky-500" size={20} />
            {isAdmin ? 'Admin Alerts' : 'Notifications'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center">
              <Inbox size={32} className="mb-2 opacity-20" />
              <p className="text-sm">No new activities</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  onViewRequest(n);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isAdmin
                    ? 'bg-sky-50 border-sky-100 hover:border-sky-300'
                    : 'bg-red-50 border-red-100'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isAdmin ? 'text-sky-600' : 'text-red-500'
                    }`}
                  >
                    {isAdmin ? 'New Request' : 'Denied'}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">
                  {n.activity_purpose}
                </p>
                <div className="text-xs text-slate-600">
                  {isAdmin ? (
                    <p>
                      Filed by <strong>{n.user}</strong>
                    </p>
                  ) : (
                    <p className="italic">{n.denial_reason}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ reservations, rooms, archive, user, onViewDetails, onBook }) {
  const userReservations = reservations.filter(
    (r) => r.user_id === user.id && !r.archived_at
  );
  const approvedReservations = reservations.filter(
    (r) => r.status === 'approved' && !r.archived_at
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="My Reservations" val={userReservations.length} />
        <StatCard label="Approved Events" val={approvedReservations.length} />
        <StatCard label="Pending" val={userReservations.filter(r => r.status === 'pending').length} />
        <StatCard label="Archived" val={archive.length} />
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border">
        <h3 className="text-lg font-bold mb-4">Recent Reservations</h3>
        <div className="space-y-3">
          {userReservations.slice(0, 5).map((r) => (
            <div
              key={r.id}
              onClick={() => onViewDetails(r)}
              className="p-4 bg-slate-50 rounded-xl hover:bg-sky-50 cursor-pointer transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-800">{r.activity_purpose}</p>
                  <p className="text-sm text-slate-600">{r.start_time}</p>
                </div>
                <Badge status={r.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, val }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border text-center">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-sky-600">{val}</p>
    </div>
  );
}

function Badge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    'concept-approved': 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    denied: 'bg-red-100 text-red-700'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-slate-100'}`}>
      {status}
    </span>
  );
}

function ReservationModal({ initialData, rooms, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    room_id: initialData?.room_id || '',
    activity_purpose: '',
    division: '',
    attendees: 0,
    participant_type: '',
    participant_details: '',
    classification: '',
    person_in_charge: '',
    contact_number: '',
    start_time: '',
    end_time: '',
    concept_paper_url: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">New Reservation</h3>
          <button onClick={onClose} className="p-1 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-sm font-bold text-slate-700">Space</label>
            <select
              value={formData.room_id}
              onChange={(e) =>
                setFormData({ ...formData, room_id: e.target.value })
              }
              className="w-full p-2 border rounded-lg"
              required
            >
              <option value="">Select a space</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Cap: {r.capacity})
                </option>
              ))}
            </select>
          </div>

          {[
            { key: 'activity_purpose', label: 'Activity Purpose' },
            { key: 'division', label: 'Division' },
            { key: 'attendees', label: 'Attendees', type: 'number' },
            { key: 'participant_type', label: 'Participant Type' },
            { key: 'participant_details', label: 'Participant Details' },
            { key: 'classification', label: 'Classification' },
            { key: 'person_in_charge', label: 'Person in Charge' },
            { key: 'contact_number', label: 'Contact Number' },
            { key: 'start_time', label: 'Start Time', type: 'datetime-local' },
            { key: 'end_time', label: 'End Time', type: 'datetime-local' }
          ].map(({ key, label, type = 'text' }) => (
            <div key={key}>
              <label className="text-sm font-bold text-slate-700">{label}</label>
              <input
                type={type}
                value={formData[key]}
                onChange={(e) =>
                  setFormData({ ...formData, [key]: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
                required={key !== 'division' && key !== 'participant_details'}
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-bold text-slate-700">Concept Paper (Google Drive Link)</label>
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              value={formData.concept_paper_url}
              onChange={(e) =>
                setFormData({ ...formData, concept_paper_url: e.target.value })
              }
              className="w-full p-2 border rounded-lg"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Share a Google Drive link to your concept paper</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 text-white p-2 rounded-lg font-bold hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Reservation'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminRequests({ reservations, onViewDetails }) {
  const pending = reservations
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(b.date_filed) - new Date(a.date_filed));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Reservation Requests</h2>
      {pending.length === 0 ? (
        <p className="text-slate-500">No pending requests</p>
      ) : (
        pending.map((r) => (
          <div
            key={r.id}
            onClick={() => onViewDetails(r)}
            className="p-4 bg-white rounded-xl border hover:border-sky-300 cursor-pointer transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800">{r.activity_purpose}</p>
                <p className="text-sm text-slate-600">
                  by {r.user} • {r.start_time}
                </p>
              </div>
              <Badge status={r.status} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function DetailsModal({
  res,
  user,
  resources,
  onClose,
  onApproveStage1,
  onApproveFinal,
  onApproveFinalAdmin,
  onDenyClick,
  onPrint,
  loading
}) {
  const [finalFormUrl, setFinalFormUrl] = useState('');
  const isAdmin = user.role === 'admin';
  const isOwner = res.user_id === user.id;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Reservation Details</h3>
          <button onClick={onClose} className="p-1 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <PrintField label="Purpose" val={res.activity_purpose} />
          <PrintField label="Person in Charge" val={res.person_in_charge} />
          <PrintField label="Contact" val={res.contact_number} />
          <PrintField label="Start Time" val={res.start_time} />
          <PrintField label="End Time" val={res.end_time} />
          <PrintField label="Attendees" val={res.attendees} />
          <PrintField label="Status" val={res.status} />
          
          {res.concept_paper_url && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Concept Paper</p>
              <a href={res.concept_paper_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                View Concept Paper
              </a>
            </div>
          )}
          
          {res.final_form_url && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Final Form</p>
              <a href={res.final_form_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                View Final Form
              </a>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && res.status === 'pending' && (
            <div className="space-y-2">
              <button
                onClick={onApproveStage1}
                disabled={loading}
                className="w-full bg-green-500 text-white p-2 rounded-lg font-bold hover:bg-green-600 disabled:opacity-50"
              >
                Approve Concept (Stage 1)
              </button>
              <button
                onClick={onDenyClick}
                disabled={loading}
                className="w-full bg-red-500 text-white p-2 rounded-lg font-bold hover:bg-red-600 disabled:opacity-50"
              >
                Deny Request
              </button>
            </div>
          )}

          {/* User Upload Final Form */}
          {isOwner && res.status === 'concept-approved' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                Final Form (Google Drive Link)
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={finalFormUrl}
                onChange={(e) => setFinalFormUrl(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
              <p className="text-xs text-slate-500">Share a Google Drive link to your final form</p>
              <button
                onClick={() => finalFormUrl && onApproveFinal(finalFormUrl)}
                disabled={!finalFormUrl || loading}
                className="w-full bg-sky-500 text-white p-2 rounded-lg font-bold hover:bg-sky-600 disabled:opacity-50"
              >
                Upload Final Form
              </button>
            </div>
          )}

          {/* Admin Final Approval */}
          {isAdmin && res.status === 'concept-approved' && res.final_form_uploaded && (
            <button
              onClick={onApproveFinalAdmin}
              disabled={loading}
              className="w-full bg-green-600 text-white p-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
            >
              Approve Reservation (Stage 2)
            </button>
          )}

          <button
            onClick={onPrint}
            className="w-full bg-slate-500 text-white p-2 rounded-lg font-bold hover:bg-slate-600"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function DenyModal({ res, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-xl font-bold mb-4">Deny Reservation?</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for denial..."
          className="w-full p-3 border rounded-lg mb-4"
          rows={4}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-300 text-slate-800 p-2 rounded-lg font-bold hover:bg-slate-400"
          >
            Cancel
          </button>
          <button
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason || loading}
            className="flex-1 bg-red-500 text-white p-2 rounded-lg font-bold hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Denying...' : 'Deny'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ reservations }) {
  const statusCounts = {
    pending: reservations.filter((r) => r.status === 'pending').length,
    approved: reservations.filter((r) => r.status === 'approved').length,
    denied: reservations.filter((r) => r.status === 'denied').length
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-6 rounded-3xl shadow-sm">
        <h3 className="text-lg font-bold mb-4">Status Distribution</h3>
        <Pie
          data={{
            labels: ['Pending', 'Approved', 'Denied'],
            datasets: [
              {
                data: [statusCounts.pending, statusCounts.approved, statusCounts.denied],
                backgroundColor: ['#EAB308', '#22C55E', '#EF4444']
              }
            ]
          }}
        />
      </div>
    </div>
  );
}

function FacilitiesView({ rooms, onBook }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {rooms.map((r) => (
        <div
          key={r.id}
          className="bg-white p-6 rounded-3xl shadow-sm border hover:border-sky-300 cursor-pointer transition"
          onClick={() => onBook(r.id)}
        >
          <h3 className="text-lg font-bold text-slate-800 mb-2">{r.name}</h3>
          <p className="text-sm text-slate-600 mb-4">{r.description}</p>
          <p className="text-2xl font-bold text-sky-600">Cap: {r.capacity}</p>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ events }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm">
      <h2 className="text-xl font-bold mb-4">Event Calendar</h2>
      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-slate-500">No approved events</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="p-4 bg-slate-50 rounded-xl">
              <p className="font-bold text-slate-800">{e.activity_purpose}</p>
              <p className="text-sm text-slate-600">
                {e.start_time} to {e.end_time}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ArchiveView({ archive, user, isAdmin, onDelete }) {
  const filtered = isAdmin
    ? archive
    : archive.filter((a) => a.user_id === user.id);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Archive</h2>
      {filtered.length === 0 ? (
        <p className="text-slate-500">No archived items</p>
      ) : (
        filtered.map((a) => (
          <div
            key={a.id}
            className="p-4 bg-white rounded-xl border flex justify-between items-center"
          >
            <div>
              <p className="font-bold text-slate-800">{a.activity_purpose}</p>
              <p className="text-sm text-slate-600">{a.start_time}</p>
            </div>
            <button
              onClick={() => onDelete(a.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function NotificationModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 shadow-2xl text-center max-w-sm">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
        <p className="text-lg font-bold mb-4">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-sky-500 text-white p-2 rounded-lg font-bold hover:bg-sky-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function PrintModal({ res, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl my-8">
        <button
          onClick={onClose}
          className="float-right p-1 text-slate-400"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">VacanSee</h1>
          <p className="text-slate-600">Reservation Form</p>
        </div>

        <div className="space-y-3 mb-6">
          <PrintField label="Purpose" val={res.activity_purpose} full />
          <PrintField label="Person in Charge" val={res.person_in_charge} />
          <PrintField label="Contact Number" val={res.contact_number} />
          <PrintField label="Attendees" val={res.attendees} />
          <PrintField label="Start Time" val={res.start_time} full />
          <PrintField label="End Time" val={res.end_time} full />
          <PrintField label="Status" val={res.status} full />
        </div>

        <button
          onClick={() => window.print()}
          className="w-full bg-sky-500 text-white p-3 rounded-lg font-bold hover:bg-sky-600"
        >
          Print
        </button>
      </div>
    </div>
  );
}

function PrintField({ label, val, full }) {
  return (
    <div className={full ? 'w-full' : ''}>
      <p className="text-xs font-bold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{val}</p>
    </div>
  );
}
