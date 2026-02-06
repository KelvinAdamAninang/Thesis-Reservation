import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Building2, 
  Archive, 
  ClipboardCheck, 
  BarChart3, 
  Bot,
  LogOut, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Printer,
  X,
  Send,
  Link as LinkIcon,
  Trash2,
  Bell,
  Inbox
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';


ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// --- Constants ---
const API_KEY = ""; // Managed by environment
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

const EVENT_SPACES = [
  { id: 'pat', name: 'Performing Arts Theatre', capacity: 1500, usualActivity: 'Concerts, Graduation, Large Plays', description: 'State-of-the-art facility for major university events.' },
  { id: 'tv_studio', name: 'TV Studio', capacity: 50, usualActivity: 'Filming, Broadcasts', description: 'Equipped studio for media production.' },
  { id: 'quad', name: 'Quadrangle', capacity: 3000, usualActivity: 'Fairs, Exhibitions', description: 'Central open field for massive gatherings.' },
  { id: 'radio_room', name: 'Radio Room', capacity: 15, usualActivity: 'Broadcasting, Podcasts', description: 'Soundproof booth for audio recordings.' }
];

// Time Selection Parts
const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const MINUTES_10 = ['00', '10', '20', '30', '40', '50'];
const PERIODS = ['AM', 'PM'];

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
      headers: { 'Content-Type': 'application/json' },
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
    if (!response.ok) throw new Error('Failed to approve concept');
    return response.json();
  },

  async approveFinalStage2(id, formData) {
    const response = await fetch(`${API_BASE}/reservations/${id}/upload-final-form`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!response.ok) throw new Error('Failed to upload final form');
    return response.json();
  },

  async approveFinal(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}/approve-final`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to approve final');
    return response.json();
  },

  async denyReservation(id, reason) {
    const response = await fetch(`${API_BASE}/reservations/${id}/deny`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    if (!response.ok) throw new Error('Failed to deny');
    return response.json();
  },

  async deleteReservation(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete');
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

  const notify = (msg) => {
    setNotification(msg);
    setActiveModal('notification');
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      const roomsData = await apiService.getRooms();
      setRooms(roomsData);
      const reservationsData = await apiService.getReservations();
      setReservations(reservationsData);
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
      await apiService.createReservation(data);
      setNotification('Request submitted! Awaiting Stage 1 Review.');
      setActiveModal('notification');
      setSelectedRes(null);
      await loadData();
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
      setNotification('Concept Paper Approved! Student can now provide the Facility Form link.');
      setActiveModal('notification');
      setSelectedRes(null);
      await loadData();
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
      setNotification('Form Submitted! Awaiting final approval.');
      setActiveModal('notification');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFinalAdmin = async (id) => {
    setLoading(true);
    try {
      await apiService.approveFinal(id);
      setNotification('Reservation Fully Approved!');
      setActiveModal('notification');
      setSelectedRes(null);
      await loadData();
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
      setNotification('Reservation denied and requestor notified.');
      setActiveModal('notification');
      setSelectedRes(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArchive = async (id) => {
    try {
      await apiService.deleteReservation(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} loading={loading} error={error} />;

  const approvedReservations = reservations.filter(r => r.status === 'approved');

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
              user={currentUser} 
              onViewDetails={(r) => { setSelectedRes(r); setActiveModal('details'); }}
              onBook={(roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); }}
            />
          )}
          {currentView === 'calendar' && <CalendarView events={approvedReservations} rooms={rooms} />}
          {currentView === 'facilities' && (
            <FacilitiesView 
              rooms={rooms}
              onBook={(roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); }} 
            />
          )}
          {currentView === 'reservations' && isAdmin && (
            <AdminRequests 
              reservations={reservations} 
              onViewDetails={(r) => { setSelectedRes(r); setActiveModal('details'); }} 
            />
          )}
          {currentView === 'analytics' && <AnalyticsView reservations={reservations} rooms={rooms} />}
          {currentView === 'archive' && (
            <ArchiveView 
              reservations={reservations}
              user={currentUser} 
              isAdmin={isAdmin} 
              onDelete={handleDeleteArchive}
            />
          )}
        </main>
      </div>

      {activeModal === 'reservation' && (
        <ReservationModal 
          initialData={selectedRes}
          rooms={rooms}
          onClose={() => { setActiveModal(null); setSelectedRes(null); }}
          onSubmit={handleCreateReservation}
          loading={loading}
        />
      )}

      {activeModal === 'details' && (
        <DetailsModal 
          res={selectedRes} 
          user={currentUser}
          rooms={rooms}
          onClose={() => { setActiveModal(null); setSelectedRes(null); }}
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
          onConfirm={handleDeny}
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
          onViewRequest={(r) => { setSelectedRes(r); setActiveModal('details'); }}
        />
      )}

      {activeModal === 'notification' && (
        <NotificationModal 
          message={notification} 
          onClose={() => { setActiveModal(null); setSelectedRes(null); }}
        />
      )}

      {activeModal === 'print' && (
        <PrintModal 
          res={selectedRes} 
          onClose={() => setActiveModal('details')} 
        />
      )}

      {activeModal === 'ai' && <AIModal onClose={() => setActiveModal(null)} events={reservations.filter(r => r.status === 'approved')} spaces={EVENT_SPACES} />}
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
      <form onSubmit={handleSubmit} className="bg-white p-12 rounded-2xl shadow-xl w-full max-w-md text-left">
        <h1 className="text-4xl font-bold text-center mb-2">Vacan<span className="text-sky-500">See</span></h1>
        <p className="text-slate-500 text-center mb-8">Campus Space Reservation</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" required />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-sky-500 text-white p-3 rounded-lg font-bold hover:bg-sky-600 transition shadow-lg disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="text-center mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium">Hint: Try admin/admin123 or ccs/1234</p>
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
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition font-medium ${currentView === id ? 'bg-sky-100 text-sky-600' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="w-72 bg-white border-r flex flex-col p-6 h-full">
      <div className="text-2xl font-bold mb-10 text-sky-500">VacanSee</div>
      <nav className="flex-1 space-y-2">
        <NavBtn id="dashboard" label="Dashboard" icon={LayoutDashboard} />
        <NavBtn id="calendar" label="Event Calendar" icon={CalendarIcon} />
        <NavBtn id="facilities" label="Facilities" icon={Building2} />
        {isAdmin && (
          <div className="pt-4 mt-4 border-t">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-3">Admin Panel</p>
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
          <button onClick={onLogout} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1">
            <LogOut size={12} /> Log out
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header({ title, onOpenAI, onOpenNotifications, onOpenProfile, user, hasUnread }) {
  return (
    <header className="bg-white border-b px-8 py-4 flex justify-between items-center text-left">
      <h2 className="text-xl font-bold text-slate-800 capitalize">{title}</h2>
      <div className="flex gap-2 items-center text-left">
        <button onClick={onOpenAI} className="p-2 text-slate-400 hover:text-sky-500 transition relative group" title="AI Assistant">
          <Bot size={22} />
        </button>
        
        <button onClick={onOpenNotifications} className="p-2 text-slate-400 hover:text-sky-500 transition relative group" title="Notifications">
          <Bell size={22} />
          {hasUnread && (
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
          )}
        </button>

        <button 
          onClick={onOpenProfile} 
          className="ml-2 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-sky-50 hover:border-sky-300 transition-all"
        >
          <User size={20} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}

function ProfileModal({ user, onClose, onLogout }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold text-4xl mb-4 border-4 border-white shadow-sm">
            {user.username[0].toUpperCase()}
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{user.username}</h3>
          <p className="text-xs font-bold text-sky-500 uppercase tracking-widest">{user.role}</p>
        </div>

        <div className="space-y-6 border-t pt-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Department</span>
            <span className="text-sm font-semibold text-slate-700">{user.department}</span>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full mt-10 flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 text-red-500 hover:bg-red-50 font-bold transition-all text-sm border border-slate-100"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}

function NotificationsListModal({ reservations, user, isAdmin, onClose, onViewRequest }) {
  const notifications = isAdmin 
    ? reservations.filter(r => r.status === 'pending')
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col p-6 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Bell className="text-sky-500" size={20} /> {isAdmin ? 'Admin Requests' : 'Notifications'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center">
              <Inbox size={32} className="mb-2 opacity-20" />
              <p className="text-sm">No new activities</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => { onViewRequest(n); onClose(); }}
                className="p-4 rounded-2xl border bg-sky-50 border-sky-100 hover:border-sky-300 cursor-pointer transition-all"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600 block">New Reservation Request</span>
                <p className="text-sm font-bold text-slate-800 mb-1">{n.activity_purpose}</p>
                <p className="text-xs text-slate-600">{n.start_time}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


function Dashboard({ reservations, rooms, user, onViewDetails, onBook }) {
  const allRes = reservations;

  return (
    <div className="space-y-8 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <StatCard label="Available Spaces" val={rooms.length} />
        <StatCard label="Total Requests" val={allRes.length} />
        <StatCard label="Approved Events" val={allRes.filter(r => r.status === 'approved').length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
        <div className="bg-white p-6 rounded-2xl border shadow-sm text-left">
          <h3 className="text-lg font-bold mb-4 text-slate-800 text-left">Space Availability</h3>
          <div className="grid grid-cols-2 gap-4 text-left">
            {rooms.map(s => (
              <button 
                key={s.id} 
                onClick={() => onBook(s.id)} 
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-sky-50 hover:border-sky-300 transition-all group text-left"
              >
                <span className="font-semibold text-sm text-slate-700 group-hover:text-sky-600 truncate text-left">{s.name}</span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-sky-500" />
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm text-left">
          <h3 className="text-lg font-bold mb-4 text-slate-800 text-left">Reservation Status</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 text-left">
            {allRes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-left">
                <Clock className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm text-left">No reservations found</p>
              </div>
            ) : (
              allRes.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).map(r => (
                <div key={r.id} onClick={() => onViewDetails(r)} className="p-3 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors text-left">
                  <div className="text-sm text-left">
                    <p className="font-bold text-slate-700 text-left">{r.activity_purpose}</p>
                    <p className="text-xs text-slate-500 text-left">{r.date_needed} | {r.start_time}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 text-left">By: {r.username || 'User'}</p>
                  </div>
                  <Badge status={r.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, val }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-4xl font-bold text-slate-800">{val}</p>
    </div>
  );
}

function Badge({ status }) {
  const configs = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    'concept-approved': { bg: 'bg-sky-100', text: 'text-sky-700' },
    approved: { bg: 'bg-green-100', text: 'text-green-700' },
    denied: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  const conf = configs[status] || configs.pending;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${conf.bg} ${conf.text}`}>{status}</span>;
}

function ReservationModal({ onClose, onSubmit, initialData, rooms, loading }) {
  const [startH, setStartH] = useState('8');
  const [startM, setStartM] = useState('00');
  const [startP, setStartP] = useState('AM');
  
  const [endH, setEndH] = useState('9');
  const [endM, setEndM] = useState('00');
  const [endP, setEndP] = useState('AM');

  const [formData, setFormData] = useState({
    activity_purpose: '',
    room_id: initialData?.room_id || (rooms[0]?.id || ''),
    attendees: '',
    person_in_charge: '',
    contact_number: '',
    start_time: '',
    end_time: '',
    concept_paper_url: '',
    division: '',
    participant_type: '',
    participant_details: '',
    classification: ''
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const convertTo24h = (h, m, p) => {
      let hour = parseInt(h);
      if (p === 'PM' && hour < 12) hour += 12;
      if (p === 'AM' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${m}`;
    };
    const payload = {
      ...formData,
      start_time: `${formData.start_time}T${convertTo24h(startH, startM, startP)}:00`,
      end_time: `${formData.start_time}T${convertTo24h(endH, endM, endP)}:00`,
      room_id: parseInt(formData.room_id),
      attendees: parseInt(formData.attendees) || 0
    };
    onSubmit(payload);
    onClose();
  };

  const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const MINUTES_10 = ['00', '10', '20', '30', '40', '50'];
  const PERIODS = ['AM', 'PM'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6 text-slate-800">
          <h3 className="text-2xl font-bold">New Reservation Request</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X /></button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Activity Name</label>
              <input value={formData.activity_purpose} onChange={e => setFormData({...formData, activity_purpose: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Facility</label>
              <select value={formData.room_id} onChange={e => setFormData({...formData, room_id: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
                {rooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
              <input type="date" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Start Time</label>
              <div className="flex gap-1">
                <select value={startH} onChange={e => setStartH(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none">
                  {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={startM} onChange={e => setStartM(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none">
                  {MINUTES_10.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={startP} onChange={e => setStartP(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none">
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">End Time</label>
              <div className="flex gap-1">
                <select value={endH} onChange={e => setEndH(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none">
                  {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={endM} onChange={e => setEndM(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none">
                  {MINUTES_10.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={endP} onChange={e => setEndP(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none">
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-sky-800 mb-1">Concept Paper Google Drive Link</label>
              <p className="text-xs text-sky-600 mb-2">Paste the link to your shared document for initial review.</p>
              <input 
                type="url" 
                value={formData.concept_paper_url} 
                onChange={e => setFormData({...formData, concept_paper_url: e.target.value})}
                placeholder="https://drive.google.com/..." 
                className="w-full border border-sky-300 p-2 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm" 
                required 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminRequests({ reservations, onViewDetails }) {
  const pending = reservations.filter(r => r.status === 'pending');
  const stage2 = reservations.filter(r => r.status === 'concept-approved');

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xl font-bold text-sky-600 mb-4 flex items-center gap-2">
          <AlertCircle size={20} /> Stage 1: Concept Approvals
        </h3>
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="bg-white p-8 border border-slate-100 rounded-2xl text-center text-slate-400">
              <p>No pending concepts.</p>
            </div>
          ) : pending.map(r => (
            <div key={r.id} onClick={() => onViewDetails(r)} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center cursor-pointer hover:shadow-md transition">
              <div className="text-sm">
                <p className="font-bold text-slate-700">{r.activity_purpose}</p>
                <p className="text-xs text-slate-500">{r.start_time}</p>
              </div>
              <button className="bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Review</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-indigo-600 mb-4 flex items-center gap-2">
          <ClipboardCheck size={20} /> Stage 2: Final Form Approvals
        </h3>
        <div className="space-y-4">
          {stage2.length === 0 ? (
            <div className="bg-white p-8 border border-slate-100 rounded-2xl text-center text-slate-400">
              <p>No forms awaiting review.</p>
            </div>
          ) : stage2.map(r => (
            <div key={r.id} onClick={() => onViewDetails(r)} className="bg-white p-4 rounded-xl border border-indigo-100 flex justify-between items-center cursor-pointer hover:shadow-md transition">
              <div className="text-sm">
                <p className="font-bold text-slate-700">{r.activity_purpose}</p>
                <p className="text-xs text-slate-500">{r.start_time}</p>
              </div>
              <button className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Final Review</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


function DetailsModal({ res, user, rooms, onClose, onApproveStage1, onApproveFinal, onApproveFinalAdmin, onDenyClick, onPrint, loading }) {
  const isAdmin = user.role === 'admin';
  const room = rooms.find(r => r.id === res.room_id);
  const [formLink, setFormLink] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">{res.activity_purpose}</h3>
            <Badge status={res.status} />
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-4">
            <h4 className="font-bold border-b border-slate-100 pb-2 text-slate-800 uppercase tracking-tight">Event Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-slate-400 uppercase text-[10px] font-bold">Venue</p><p className="font-medium text-slate-700">{room?.name}</p></div>
              <div><p className="text-slate-400 uppercase text-[10px] font-bold">Date</p><p className="font-medium text-slate-700">{res.start_time?.split('T')[0]}</p></div>
              <div><p className="text-slate-400 uppercase text-[10px] font-bold">Time</p><p className="font-medium text-slate-700">{res.start_time} - {res.end_time}</p></div>
              <div><p className="text-slate-400 uppercase text-[10px] font-bold">Requestor</p><p className="font-medium text-slate-700">{res.user}</p></div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold border-b border-slate-100 pb-2 text-slate-800 uppercase tracking-tight">Documents</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Stage 1: Concept Paper</p>
              <a href={res.concept_paper_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline font-medium block truncate hover:text-sky-700">{res.concept_paper_url}</a>
            </div>

            <div className={`p-4 rounded-xl border ${res.status === 'concept-approved' ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Stage 2: Final Form</p>
              {res.final_form_url ? (
                <div>
                  <p className="text-green-600 font-bold flex items-center gap-2"><CheckCircle size={16} /> Link Submitted</p>
                  <a href={res.final_form_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline text-xs break-all block mt-1">{res.final_form_url}</a>
                </div>
              ) : res.status === 'concept-approved' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-700 leading-relaxed font-bold">Concept approved! Please input your signed Facility Form link.</p>
                  <button onClick={onPrint} className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                    <Printer size={16} /> Print Template
                  </button>
                  <div className="space-y-2">
                    <input 
                      type="url" 
                      value={formLink} 
                      onChange={(e) => setFormLink(e.target.value)}
                      placeholder="Paste Form Link here..." 
                      className="w-full border border-slate-300 p-2 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none" 
                    />
                    <button 
                      onClick={() => { if(formLink) onApproveFinal(res, formLink); }} 
                      disabled={loading || !formLink}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit Form Link'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-xs flex items-center gap-2"><Clock size={14} /> Awaiting Stage 1 Approval</p>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
            {res.status === 'pending' && (
              <>
                <button onClick={() => { onApproveStage1(); onClose(); }} disabled={loading} className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors disabled:opacity-50">
                  {loading ? 'Processing...' : 'Approve Concept'}
                </button>
                <button onClick={onDenyClick} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors">Deny Request</button>
              </>
            )}
            {res.status === 'concept-approved' && res.final_form_url && (
              <>
                <button onClick={() => { onApproveFinalAdmin(); onClose(); }} disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors disabled:opacity-50">
                  {loading ? 'Processing...' : 'Final Approve'}
                </button>
                <button onClick={onDenyClick} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors">Deny Final</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DenyModal({ res, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <Trash2 size={24} />
          <h3 className="text-xl font-bold">Deny Reservation</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          You are about to deny <strong>{res.activity_purpose}</strong>.
        </p>
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Reason for Denial</label>
          <textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Facility maintenance, Scheduling conflict..."
            className="w-full border border-slate-200 rounded-xl p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-red-500 outline-none transition-all"
          />
          <div className="flex flex-col gap-2">
            <button 
              disabled={!reason.trim() || loading}
              onClick={() => onConfirm(res.id, reason)}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-lg"
            >
              {loading ? 'Processing...' : 'Confirm Denial'}
            </button>
            <button 
              onClick={onClose}
              className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function AnalyticsView({ reservations, rooms }) {
  const chartDataSpaces = {
    labels: rooms.map(r => r.name),
    datasets: [{
      label: 'Requests',
      data: rooms.map(r => reservations.filter(res => res.room_id === r.id).length),
      backgroundColor: '#0ea5e9',
      borderRadius: 8
    }]
  };

  const chartDataStatus = {
    labels: ['Approved', 'Pending', 'Under Review'],
    datasets: [{
      data: [
        reservations.filter(r => r.status === 'approved').length, 
        reservations.filter(r => r.status === 'pending').length,
        reservations.filter(r => r.status === 'concept-approved').length
      ],
      backgroundColor: ['#22c55e', '#f59e0b', '#0ea5e9'],
      borderWidth: 0
    }]
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold mb-6 text-slate-800 flex items-center gap-2"><BarChart3 size={18} className="text-sky-500" /> Requests by Facility</h3>
        <Bar data={chartDataSpaces} options={{ plugins: { legend: { display: false } } }} />
      </div>
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
        <h3 className="font-bold mb-6 text-slate-800 w-full flex items-center gap-2">Request Distribution</h3>
        <div className="w-64 py-4">
          <Doughnut data={chartDataStatus} />
        </div>
      </div>
    </div>
  );
}

function FacilitiesView({ rooms, onBook }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {rooms.map(s => (
        <div key={s.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl transition-all group flex flex-col">
          <div className="h-40 bg-slate-200 flex items-center justify-center font-bold text-slate-400 text-2xl group-hover:bg-slate-300 transition-colors uppercase">
            {s.name[0]}
          </div>
          <div className="p-6 flex flex-col flex-1">
            <h3 className="text-xl font-bold mb-2 text-slate-800">{s.name}</h3>
            <p className="text-xs text-slate-500 mb-4 flex-1 leading-relaxed">{s.description}</p>
            <div className="pt-4 border-t border-slate-100 mt-auto">
              <p className="text-xs font-bold text-sky-600 mb-4 uppercase tracking-widest">Capacity: {s.capacity} pax</p>
              <button onClick={() => onBook(s.id)} className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-xl font-bold transition-all shadow-md">Reserve Now</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ events, rooms }) {
  const [curr, setCurr] = useState(new Date());
  const [filterRoom, setFilterRoom] = useState('all');
  const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">{curr.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
            Showing: {filterRoom === 'all' ? 'All Facilities' : rooms.find(r => r.id === parseInt(filterRoom))?.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={filterRoom} 
            onChange={(e) => setFilterRoom(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option value="all">All Facilities</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="flex gap-1">
            <button onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() - 1)))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() + 1)))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{d}</div>
        ))}
        {days.map((d, i) => {
          const dateStr = d ? `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
          const dayEvents = dateStr ? events.filter(e => e.start_time?.startsWith(dateStr) && (filterRoom === 'all' || e.room_id === parseInt(filterRoom))) : [];
          return (
            <div key={i} className={`bg-white min-h-[120px] p-2 border-slate-50 ${!d && 'bg-slate-50/50'}`}>
              <span className={`text-sm font-bold p-1 ${d ? 'text-slate-400' : 'text-transparent'}`}>{d || '.'}</span>
              <div className="mt-1 space-y-1">
                {dayEvents.map(e => (
                  <div key={e.id} className="bg-sky-500 text-white text-[9px] p-1 rounded font-bold shadow-sm shadow-sky-100 border-l-2 border-sky-700 truncate">
                    {e.activity_purpose}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArchiveView({ reservations, user, isAdmin, onDelete }) {
  const archived = reservations.filter(r => r.archived_at);
  const display = isAdmin ? archived : archived.filter(a => a.user_id === user.id);

  return (
    <div className="space-y-4">
      {display.length === 0 ? (
        <div className="bg-white p-20 border border-slate-200 rounded-2xl text-center text-slate-400">
          <Archive className="mx-auto mb-4 opacity-50" size={48} />
          <p className="font-medium">No archived items.</p>
        </div>
      ) : display.map(a => (
        <div key={a.id} className={`bg-white p-4 border rounded-xl flex justify-between items-center transition-all ${a.status === 'denied' ? 'border-red-100 bg-red-50/10' : 'border-green-100 bg-green-50/10'}`}>
          <div className="text-sm">
            <p className="font-bold text-slate-700">{a.activity_purpose}</p>
            <p className="text-xs text-slate-500">{a.start_time}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${a.status === 'denied' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {a.status}
            </span>
            <button 
              onClick={() => onDelete(a.id)}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} />
        </div>
        <p className="text-lg font-bold mb-6 text-slate-800">{message}</p>
        <button onClick={onClose} className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-2xl font-bold shadow-lg transition-colors">OK</button>
      </div>
    </div>
  );
}

function PrintModal({ res, onClose }) {
  const printRef = useRef();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-12 shadow-2xl">
        <div className="flex justify-between mb-8 no-print">
          <h3 className="text-2xl font-bold">Print Request Form</h3>
          <button onClick={onClose} className="p-1"><X /></button>
        </div>

        <div ref={printRef} className="border-2 border-slate-800 p-8 bg-white">
          <div className="text-center mb-8 pb-4 border-b-2 border-slate-800">
            <h2 className="text-2xl font-bold uppercase tracking-widest">COMMON FACILITY REQUEST FORM</h2>
            <p className="text-sm mt-1 uppercase opacity-60">University Facility Management</p>
          </div>
          <div className="space-y-4">
            <PrintField label="Activity" val={res.activity_purpose} />
            <PrintField label="Date" val={res.start_time?.split('T')[0]} />
            <PrintField label="Time" val={`${res.start_time} - ${res.end_time}`} />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 no-print">
          <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">Close</button>
          <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm hover:bg-indigo-600">Print</button>
        </div>
      </div>
    </div>
  );
}

function AIModal({ onClose, events, spaces }) {
  const [messages, setMessages] = useState([{ text: "Hello! I'm the VacanSee AI Assistant. How can I help you with your campus facility reservations?", sender: 'ai' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setLoading(true);

    const context = `Spaces: ${JSON.stringify(spaces)} Upcoming Approved Events: ${JSON.stringify(events)}`;

    try {
      const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Context: ${context}\nUser: ${userMsg}` }] }]
        })
      });
      const data = await res.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
      setMessages(prev => [...prev, { text: aiText, sender: 'ai' }]);
    } catch (err) {
      setMessages(prev => [...prev, { text: "Error.", sender: 'ai' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-left">
      <div className="bg-white rounded-3xl w-full max-w-lg h-[70vh] flex flex-col p-6 shadow-2xl overflow-hidden text-left">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 text-left">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 text-left">
            <Bot className="text-sky-500" /> AI Assistant
          </h3>
          <button onClick={onClose} className="p-1 text-slate-800"><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2 no-scrollbar text-left">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} text-left`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm text-left ${m.sender === 'user' ? 'bg-sky-500 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-sky-500 text-xs italic animate-pulse text-left">Thinking...</div>}
        </div>
        <div className="flex gap-2 pt-2 text-left">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 p-3 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:outline-none bg-slate-50 transition-all text-left" 
            placeholder="Ask about availability..." 
          />
          <button onClick={sendMessage} className="bg-sky-500 text-white p-3 rounded-2xl transition-colors hover:bg-sky-600 shadow-lg"><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
}

function PrintField({ label, val }) {
  return (
    <div>
      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">{label}</label>
      <div className="border-b border-slate-300 pb-1 font-medium text-slate-800 italic">{val}</div>
    </div>
  );
}
