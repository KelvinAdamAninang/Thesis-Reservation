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

const INITIAL_RESERVATIONS = [
  { 
    id: 101, spaceId: 'pat', activityPurpose: 'Medicine Symposium', dateNeeded: '2025-10-15', startTime: '14:00', endTime: '17:00', 
    status: 'concept-approved', user: 'admin', department: 'Medical Dept', conceptPaperUrl: 'https://docs.google.com/example1', 
    finalFormUrl: '', personInCharge: 'Dr. Cruz', contactNumber: '09170001111', equipment: {}, dateFiled: '2025-09-01',
    isNewForAdmin: false
  }
];

// Time Selection Parts
const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const MINUTES_10 = ['00', '10', '20', '30', '40', '50'];
const PERIODS = ['AM', 'PM'];

// --- Main App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);
  const [eventSchedule, setEventSchedule] = useState([]);
  const [archive, setArchive] = useState([]);
  const [activeModal, setActiveModal] = useState(null); 
  const [selectedRes, setSelectedRes] = useState(null);
  const [notification, setNotification] = useState('');
  
  const isAdmin = currentUser?.role === 'admin';

  const notify = (msg) => {
    setNotification(msg);
    setActiveModal('notification');
  };

  const handleLogin = (user, pass) => {
    if (user === 'admin' && pass === 'admin123') setCurrentUser({ username: 'admin', role: 'admin', department: 'Admin' });
    else if (user === 'user' && pass === 'user123') setCurrentUser({ username: 'user', role: 'user', department: 'Computer Studies' });
    else return false;
    return true;
  };

  const handleDeny = (id, reason) => {
    const resToDeny = reservations.find(r => r.id === id);
    if (resToDeny) {
      const deniedEntry = { 
        ...resToDeny, 
        status: 'denied', 
        denialReason: reason, 
        archivedAt: new Date().toISOString(),
        isNewNotification: true, // Flag for the reserver
        deletedByAdmin: false,
        deletedByUser: false
      };
      setArchive(prev => [deniedEntry, ...prev]);
    }
    setReservations(reservations.filter(r => r.id !== id));
    setActiveModal(null);
    notify(`Reservation denied. The reserver will be notified of the reason.`);
  };

  const handleApproveFinal = (res) => {
    // 1. Identify conflicting pending/concept-approved reservations
    // Overlap logic: (StartA < EndB) && (EndA > StartB)
    const conflictingRes = reservations.filter(r => 
      r.id !== res.id && 
      r.spaceId === res.spaceId && 
      r.dateNeeded === res.dateNeeded &&
      ((r.startTime < res.endTime) && (r.endTime > res.startTime))
    );

    // 2. Create denied entries for conflicting ones
    const autoDeniedEntries = conflictingRes.map(r => ({
      ...r,
      status: 'denied',
      denialReason: 'Facility is unavailable due to a scheduling conflict (Another event was approved for this time slot).',
      archivedAt: new Date().toISOString(),
      isNewNotification: true,
      deletedByAdmin: false,
      deletedByUser: false
    }));

    // 3. Create entry for the approved one in archive
    const approvedArchiveEntry = {
      ...res,
      status: 'approved',
      archivedAt: new Date().toISOString(),
      deletedByAdmin: false,
      deletedByUser: false
    };

    // 4. Update states
    const conflictingIds = conflictingRes.map(c => c.id);
    
    // Remove the approved one AND all conflicting ones from active reservations
    setReservations(prev => prev.filter(r => r.id !== res.id && !conflictingIds.includes(r.id)));
    
    // Add to schedule
    setEventSchedule(prev => [...prev, { ...res, status: 'approved' }]);
    
    // Update archive with both the newly approved and the auto-denied conflicts
    setArchive(prev => [approvedArchiveEntry, ...autoDeniedEntries, ...prev]);

    setActiveModal(null);
    
    if (conflictingRes.length > 0) {
      notify(`Reservation Approved! ${conflictingRes.length} conflicting request(s) were automatically denied and notified.`);
    } else {
      notify("Reservation Fully Approved!");
    }
  };

  const handleDeleteArchive = (id) => {
    setArchive(prev => prev.map(item => {
      if (item.id === id) {
        if (isAdmin) return { ...item, deletedByAdmin: true };
        return { ...item, deletedByUser: true };
      }
      return item;
    }));
  };

  // Logic to clear user notification (denials)
  const clearUserNotification = (archiveId) => {
    setArchive(archive.map(a => a.id === archiveId ? { ...a, isNewNotification: false } : a));
  };

  // Logic to clear admin notification (new requests)
  const clearAdminNotification = (resId) => {
    setReservations(reservations.map(r => r.id === resId ? { ...r, isNewForAdmin: false } : r));
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} />;

  // Calculate unread flag based on role
  const hasUnread = isAdmin 
    ? reservations.some(r => r.isNewForAdmin) 
    : archive.some(a => a.user === currentUser.username && a.isNewNotification);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans text-left">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        user={currentUser} 
        onLogout={() => setCurrentUser(null)} 
        isAdmin={isAdmin} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={currentView} 
          onOpenAI={() => setActiveModal('ai')} 
          onOpenNotifications={() => setActiveModal('notifications_list')}
          onOpenProfile={() => setActiveModal('profile')}
          user={currentUser} 
          hasUnread={hasUnread}
        />
        
        <main className="flex-1 overflow-y-auto p-8 text-left">
          {currentView === 'dashboard' && (
            <Dashboard 
              reservations={reservations} 
              events={eventSchedule} 
              archive={archive}
              user={currentUser} 
              onViewDetails={(r) => { setSelectedRes(r); setActiveModal('details'); }}
              onBook={(id) => { setSelectedRes({ spaceId: id }); setActiveModal('reservation'); }}
              onClearDenial={clearUserNotification}
            />
          )}
          {currentView === 'calendar' && <CalendarView events={eventSchedule} />}
          {currentView === 'facilities' && (
            <FacilitiesView 
              onBook={(id) => { setSelectedRes({ spaceId: id }); setActiveModal('reservation'); }} 
            />
          )}
          {currentView === 'reservations' && (
            <AdminRequests 
              reservations={reservations} 
              onViewDetails={(r) => { setSelectedRes(r); setActiveModal('details'); }} 
            />
          )}
          {currentView === 'analytics' && <AnalyticsView reservations={reservations} events={eventSchedule} />}
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

      {/* Modals */}
      {activeModal === 'reservation' && (
        <ReservationModal 
          initialData={selectedRes}
          onClose={() => setActiveModal(null)} 
          onSubmit={(data) => {
            const newRes = { 
              ...data, 
              id: Date.now(), 
              user: currentUser.username, 
              department: currentUser.department, 
              status: 'pending', 
              dateFiled: new Date().toISOString().split('T')[0], 
              finalFormUrl: '',
              isNewForAdmin: true // Notify Admin
            };
            setReservations([...reservations, newRes]);
            setActiveModal(null);
            notify("Request submitted! Awaiting Stage 1 Review.");
          }}
        />
      )}

      {activeModal === 'details' && (
        <DetailsModal 
          res={selectedRes} 
          user={currentUser}
          onClose={() => setActiveModal(null)}
          onUpdate={(updated) => {
            setReservations(reservations.map(r => r.id === updated.id ? updated : r));
            setSelectedRes(updated);
          }}
          onApproveStage1={(id) => {
             setReservations(reservations.map(r => r.id === id ? {...r, status: 'concept-approved', isNewForAdmin: false} : r));
             setActiveModal(null);
             notify("Concept Paper Approved! Student can now provide the Facility Form link.");
          }}
          onApproveFinal={handleApproveFinal}
          onDenyClick={() => setActiveModal('deny')}
          onPrint={() => setActiveModal('print')}
        />
      )}

      {activeModal === 'deny' && (
        <DenyModal 
          res={selectedRes}
          onClose={() => setActiveModal('details')}
          onConfirm={handleDeny}
        />
      )}

      {activeModal === 'profile' && (
        <ProfileModal 
          user={currentUser} 
          onClose={() => setActiveModal(null)} 
          onLogout={() => setCurrentUser(null)} 
        />
      )}

      {activeModal === 'notifications_list' && (
        <NotificationsListModal 
          archive={archive} 
          reservations={reservations}
          user={currentUser} 
          isAdmin={isAdmin}
          onClose={() => setActiveModal(null)} 
          onClearUser={clearUserNotification}
          onClearAdmin={clearAdminNotification}
          onViewRequest={(r) => { setSelectedRes(r); setActiveModal('details'); }}
        />
      )}

      {activeModal === 'notification' && (
        <NotificationModal message={notification} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'ai' && <AIModal onClose={() => setActiveModal(null)} events={eventSchedule} spaces={EVENT_SPACES} />}
      
      {activeModal === 'print' && (
        <PrintModal 
          res={selectedRes} 
          onClose={() => setActiveModal('details')} 
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

function LoginPage({ onLogin }) {
  const [u, setU] = useState('admin');
  const [p, setP] = useState('admin123');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!onLogin(u, p)) setErr('Invalid credentials');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-200">
      <form onSubmit={submit} className="bg-white p-12 rounded-2xl shadow-xl w-full max-w-md text-left">
        <h1 className="text-4xl font-bold text-center mb-2">Vacan<span className="text-sky-500">See</span></h1>
        <p className="text-slate-500 text-center mb-8">Campus Space Reservation</p>
        <div className="space-y-4">
          <div className="text-left text-left">
            <label className="block text-sm font-bold text-slate-700 mb-1 text-left text-left">Username</label>
            <input value={u} onChange={e => setU(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-left" placeholder="Username" required />
          </div>
          <div className="text-left text-left">
            <label className="block text-sm font-bold text-slate-700 mb-1 text-left text-left">Password</label>
            <input type="password" value={p} onChange={e => setP(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-left" placeholder="Password" required />
          </div>
          {err && <p className="text-red-500 text-sm text-center">{err}</p>}
          <button type="submit" className="w-full bg-sky-500 text-white p-3 rounded-lg font-bold hover:bg-sky-600 transition shadow-lg text-center text-center">Sign In</button>
          
          <div className="text-center mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium text-center">Hint: Use 'admin'/'admin123' or 'user'/'user123'</p>
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
    <aside className="w-72 bg-white border-r flex flex-col p-6 h-full text-left">
      <div className="text-2xl font-bold mb-10 text-sky-500 text-left">VacanSee</div>
      <nav className="flex-1 space-y-2 text-left">
        <NavBtn id="dashboard" label="Dashboard" icon={LayoutDashboard} />
        <NavBtn id="calendar" label="Event Calendar" icon={CalendarIcon} />
        <NavBtn id="facilities" label="Facilities" icon={Building2} />
        {isAdmin && (
          <div className="pt-4 mt-4 border-t text-left">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-3 text-left">Admin Panel</p>
            <NavBtn id="reservations" label="Requests" icon={ClipboardCheck} />
            <NavBtn id="analytics" label="Analytics" icon={BarChart3} />
          </div>
        )}
        <NavBtn id="archive" label="Archive" icon={Archive} />
      </nav>
      <div className="pt-6 border-t flex items-center gap-3 text-left">
        <div className="w-10 h-10 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold">
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1 overflow-hidden text-left text-sm">
          <p className="font-bold truncate text-slate-800">{user.username}</p>
          <button onClick={onLogout} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 text-left">
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
          className="ml-2 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-sky-50 hover:border-sky-300 transition-all group overflow-hidden"
          title="Profile"
        >
          <User size={20} className="text-slate-400 group-hover:text-sky-500" />
        </button>
      </div>
    </header>
  );
}

function ProfileModal({ user, onClose, onLogout }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-left">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-200 text-left">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 bg-sky-100 text-sky-600 flex items-center justify-center rounded-full font-bold text-4xl mb-4 border-4 border-white shadow-sm">
            {user.username[0].toUpperCase()}
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{user.username}</h3>
          <p className="text-xs font-bold text-sky-500 uppercase tracking-widest">{user.role}</p>
        </div>

        <div className="space-y-6 border-t pt-6 text-left">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-left text-left">Department</span>
            <span className="text-sm font-semibold text-slate-700 text-left">{user.department}</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-left text-left text-left text-left">Status</span>
            <div className="flex items-center gap-2 text-green-600 text-left text-left">
              <CheckCircle size={14} />
              <span className="text-sm font-semibold">Active Verified</span>
            </div>
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

function NotificationsListModal({ archive, reservations, user, isAdmin, onClose, onClearUser, onClearAdmin, onViewRequest }) {
  const notifications = isAdmin 
    ? reservations.filter(r => r.isNewForAdmin)
    : archive.filter(a => a.user === user.username && a.status === 'denied' && a.isNewNotification);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-left">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col p-6 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 text-left text-left">
        <div className="flex justify-between items-center mb-6 pb-4 border-b text-left text-left">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 text-left text-left">
            <Bell className="text-sky-500 text-left" size={20} /> {isAdmin ? 'Admin Alerts' : 'Notifications'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 text-left text-left"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar text-left text-left text-left text-left text-left">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center text-left text-left">
              <Inbox size={32} className="mb-2 opacity-20 text-left text-left" />
              <p className="text-sm text-left text-left">No new activities</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => isAdmin && onViewRequest(n)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left text-left ${isAdmin ? 'bg-sky-50 border-sky-100 hover:border-sky-300' : 'bg-red-50 border-red-100'}`}
              >
                <div className="flex justify-between items-start mb-2 text-left text-left">
                  <span className={`text-[10px] font-bold uppercase tracking-widest text-left text-left ${isAdmin ? 'text-sky-600' : 'text-red-500'}`}>
                    {isAdmin ? 'New Reservation Request' : 'Reservation Denied'}
                  </span>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      isAdmin ? onClearAdmin(n.id) : onClearUser(n.id); 
                    }} 
                    className="text-slate-300 hover:text-slate-500 text-left text-left"
                  >
                    <CheckCircle size={14} />
                  </button>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1 text-left text-left">{n.activityPurpose}</p>
                <div className="text-xs text-slate-600 leading-relaxed text-left text-left text-left text-left">
                  {isAdmin ? (
                    <p className="text-left text-left">Filed by <strong>{n.user}</strong> for {n.dateNeeded}.</p>
                  ) : (
                    <p className="italic bg-white/50 p-2 rounded-lg border border-red-100/50 mt-1 text-left text-left">{n.denialReason}</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-left text-left">{isAdmin ? n.dateFiled : new Date(n.archivedAt).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ reservations, events, archive, user, onViewDetails, onBook, onClearDenial }) {
  const allRes = reservations;
  const allEvents = events;
  const newDenials = archive.filter(a => a.user === user.username && a.status === 'denied' && a.isNewNotification);

  return (
    <div className="space-y-8 text-left text-left text-left text-left">
      {newDenials.length > 0 && (
        <div className="space-y-3 text-left text-left">
          {newDenials.map(denial => (
            <div key={denial.id} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in slide-in-from-top-4 duration-300 text-left text-left text-left">
              <div className="bg-red-100 p-2 rounded-xl text-red-600 text-left text-left text-left">
                <Bell size={20} />
              </div>
              <div className="flex-1 text-sm text-left text-left">
                <div className="flex justify-between items-start text-left text-left">
                  <h4 className="font-bold text-red-800 uppercase text-[10px] tracking-widest mb-1 text-left text-left">Reservation Denied</h4>
                  <button onClick={() => onClearDenial(denial.id)} className="text-red-400 hover:text-red-600 text-left text-left"><X size={14} /></button>
                </div>
                <p className="text-red-900 font-semibold mb-1 text-left text-left">Your request for "{denial.activityPurpose}" was denied.</p>
                <p className="text-red-700 bg-red-100/50 p-2 rounded-lg text-xs italic border border-red-200/50 text-left text-left">
                  <strong>Reason:</strong> {denial.denialReason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-left">
        <StatCard label="Available Spaces Today" val={EVENT_SPACES.length} />
        <StatCard label="Total Active Requests" val={allRes.length} />
        <StatCard label="Total Approved Events" val={allEvents.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left text-left text-left text-left text-left">
        <div className="bg-white p-6 rounded-2xl border shadow-sm text-left text-left text-left">
          <h3 className="text-lg font-bold mb-4 text-slate-800 text-left text-left text-left">Space Availability</h3>
          <div className="grid grid-cols-2 gap-4 text-left text-left">
            {EVENT_SPACES.map(s => (
              <button 
                key={s.id} 
                onClick={() => onBook(s.id)} 
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-sky-50 hover:border-sky-300 transition-all text-left group text-left text-left"
              >
                <span className="font-semibold text-sm text-slate-700 group-hover:text-sky-600 text-left text-left">{s.name}</span>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-sky-500 transition-colors text-left text-left" />
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm text-left text-left text-left">
          <h3 className="text-lg font-bold mb-4 text-slate-800 text-left text-left text-left">Reservation Status</h3>
          <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar text-left text-left text-left text-left">
            {[...allRes, ...allEvents].length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-left text-left">
                <Clock className="mx-auto mb-2 opacity-50 text-left text-left text-left" size={32} />
                <p className="text-sm text-left text-left text-left">No reservations found</p>
              </div>
            ) : (
              [...allRes, ...allEvents].sort((a,b) => new Date(b.dateFiled || 0) - new Date(a.dateFiled || 0)).map(r => (
                <div key={r.id} onClick={() => onViewDetails(r)} className="p-3 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors text-left text-left text-left text-left text-left">
                  <div className="text-left text-sm text-left text-left text-left text-left text-left text-left">
                    <p className="font-bold text-slate-700 text-left text-left text-left text-left">{r.activityPurpose}</p>
                    <p className="text-xs text-slate-500 text-left text-left text-left text-left">{r.dateNeeded} | {r.startTime}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 text-left text-left text-left text-left text-left">By: {r.user}</p>
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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left text-left">
      <div className="flex justify-between items-start mb-2 text-left text-left text-left">
        <span className="text-slate-500 font-medium text-xs uppercase tracking-wider text-left text-left">{label}</span>
      </div>
      <p className="text-4xl font-bold text-slate-800 text-left text-left text-left">{val}</p>
    </div>
  );
}

function Badge({ status }) {
  const configs = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    'concept-approved': { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Under Review' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
    denied: { bg: 'bg-red-100', text: 'text-red-700', label: 'Denied' },
  };
  const conf = configs[status] || configs.pending;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-left text-left ${conf.bg} ${conf.text}`}>{conf.label}</span>;
}

function ReservationModal({ onClose, onSubmit, initialData }) {
  const [startH, setStartH] = useState('8');
  const [startM, setStartM] = useState('00');
  const [startP, setStartP] = useState('AM');
  
  const [endH, setEndH] = useState('9');
  const [endM, setEndM] = useState('00');
  const [endP, setEndP] = useState('AM');

  const [formData, setFormData] = useState({
    activityPurpose: '',
    spaceId: initialData?.spaceId || 'pat',
    dateNeeded: '',
    conceptPaperUrl: ''
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
      startTime: convertTo24h(startH, startM, startP),
      endTime: convertTo24h(endH, endM, endP)
    };
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-left">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl text-left text-left text-left text-left">
        <div className="flex justify-between items-center mb-6 text-slate-800 text-left text-left text-left text-left text-left">
          <h3 className="text-2xl font-bold text-left text-left text-left">New Reservation Request</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-left text-left"><X /></button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6 text-left text-left text-left text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-left text-left text-left">
            <div className="md:col-span-2 text-left text-left text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1 text-left text-left text-left">Activity Name</label>
              <input value={formData.activityPurpose} onChange={e => setFormData({...formData, activityPurpose: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-left text-left text-left" required />
            </div>
            <div className="text-left text-left text-left text-left text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1 text-left text-left text-left text-left text-left">Facility</label>
              <select value={formData.spaceId} onChange={e => setFormData({...formData, spaceId: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-left text-left text-left">
                {EVENT_SPACES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="text-left text-left text-left text-left text-left text-left text-left text-left text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left">Date</label>
              <input type="date" value={formData.dateNeeded} onChange={e => setFormData({...formData, dateNeeded: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-left text-left text-left text-left text-left" required />
            </div>
            <div className="text-left text-left text-left text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1 text-left text-left text-left text-left">Start Time</label>
              <div className="flex gap-1 text-left text-left text-left text-left">
                <select value={startH} onChange={e => setStartH(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none text-left text-left text-left">
                  {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={startM} onChange={e => setStartM(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none text-left text-left text-left">
                  {MINUTES_10.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={startP} onChange={e => setStartP(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none text-left text-left text-left">
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="text-left text-left text-left text-left text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1 text-left text-left text-left text-left text-left">End Time</label>
              <div className="flex gap-1 text-left text-left text-left text-left text-left">
                <select value={endH} onChange={e => setEndH(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none text-left text-left text-left text-left">
                  {HOURS_12.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={endM} onChange={e => setEndM(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none text-left text-left text-left text-left">
                  {MINUTES_10.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={endP} onChange={e => setEndP(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none text-left text-left text-left text-left">
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 text-left text-left text-left text-left text-left text-left">
            <label className="block text-sm font-bold text-sky-800 mb-1 text-left text-left text-left text-left text-left text-left text-left">Concept Paper Link</label>
            <p className="text-xs text-sky-600 mb-2 leading-relaxed text-left text-left text-left text-left text-left text-left text-left">Paste the link to your shared document (Google Drive/OneDrive) for initial review.</p>
            <input 
              type="url" 
              value={formData.conceptPaperUrl} 
              onChange={e => setFormData({...formData, conceptPaperUrl: e.target.value})}
              placeholder="https://docs.google.com/..." 
              className="w-full border border-sky-300 p-2 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white text-sm text-left text-left text-left text-left text-left" 
              required 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 text-left text-left text-left text-left text-left">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium text-center text-center text-center text-center text-center">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold shadow-md transition-colors text-center text-center text-center text-center text-center">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminRequests({ reservations, onViewDetails }) {
  const pending = reservations.filter(r => r.status === 'pending');
  const stage2 = reservations.filter(r => r.status === 'concept-approved' && r.finalFormUrl);

  return (
    <div className="space-y-8 text-left text-left text-left text-left text-left text-left text-left">
      <section className="text-left text-left text-left text-left text-left text-left">
        <h3 className="text-xl font-bold text-sky-600 mb-4 flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <AlertCircle size={20} /> Stage 1: Concept Approvals
        </h3>
        <div className="space-y-4 text-left text-left text-left text-left">
          {pending.length === 0 ? (
            <div className="bg-white p-8 border border-slate-100 rounded-2xl text-center text-slate-400 text-left text-left text-left text-left text-left">
              <p className="text-left text-left text-left">No pending concepts.</p>
            </div>
          ) : pending.map(r => (
            <div key={r.id} onClick={() => onViewDetails(r)} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center cursor-pointer hover:shadow-md transition text-left text-left text-left text-left text-left text-left text-left">
              <div className="text-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                <p className="font-bold text-slate-700 text-left text-left text-left text-left text-left">{r.activityPurpose}</p>
                <p className="text-xs text-slate-500 text-left text-left text-left text-left text-left text-left">{r.user} | {r.dateNeeded}</p>
              </div>
              <button className="bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-bold text-center text-center text-center text-center text-center text-center text-center">Review</button>
            </div>
          ))}
        </div>
      </section>

      <section className="text-left text-left text-left text-left text-left text-left text-left">
        <h3 className="text-xl font-bold text-indigo-600 mb-4 flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left">
          <ClipboardCheck size={20} /> Stage 2: Final Form Approvals
        </h3>
        <div className="space-y-4 text-left text-left text-left text-left">
          {stage2.length === 0 ? (
            <div className="bg-white p-8 border border-slate-100 rounded-2xl text-center text-slate-400 text-left text-left text-left text-left text-left text-left text-left">
              <p className="text-left text-left text-left">No forms awaiting review.</p>
            </div>
          ) : stage2.map(r => (
            <div key={r.id} onClick={() => onViewDetails(r)} className="bg-white p-4 rounded-xl border border-indigo-100 flex justify-between items-center cursor-pointer hover:shadow-md transition text-left text-left text-left text-left text-left text-left text-left">
              <div className="text-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                <p className="font-bold text-slate-700 text-left text-left text-left text-left text-left">{r.activityPurpose}</p>
                <p className="text-xs text-slate-500 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{r.user} | {r.dateNeeded}</p>
              </div>
              <button className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold text-center text-center text-center text-center text-center text-center text-center text-center text-center">Final Review</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DetailsModal({ res, user, onClose, onUpdate, onApproveStage1, onApproveFinal, onDenyClick, onPrint }) {
  const isAdmin = user.role === 'admin';
  const isOwner = res.user === user.username;
  const space = EVENT_SPACES.find(s => s.id === res.spaceId);
  const [formLink, setFormLink] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-left">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl text-left text-left text-left text-left text-left text-left text-left text-left">
        <div className="flex justify-between items-start mb-6 text-left text-left text-left text-left">
          <div className="text-left text-left text-left text-left text-left">
            <h3 className="text-2xl font-bold text-slate-800 text-left text-left text-left text-left text-left text-left text-left">{res.activityPurpose}</h3>
            <Badge status={res.status} />
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left"><X /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <div className="space-y-4 text-left text-left text-left text-left text-left">
            <h4 className="font-bold border-b border-slate-100 pb-2 text-slate-800 uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left text-left">Event Information</h4>
            <div className="grid grid-cols-2 gap-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
              <div className="text-left text-left text-left text-left text-left text-left"><p className="text-slate-400 uppercase text-[10px] font-bold text-left text-left text-left text-left text-left text-left">Venue</p><p className="font-medium text-slate-700 text-left text-left text-left text-left text-left text-left">{space?.name}</p></div>
              <div className="text-left text-left text-left text-left text-left text-left text-left"><p className="text-slate-400 uppercase text-[10px] font-bold text-left text-left text-left text-left text-left text-left text-left">Date</p><p className="font-medium text-slate-700 text-left text-left text-left text-left text-left text-left text-left">{res.dateNeeded}</p></div>
              <div className="text-left text-left text-left text-left text-left text-left text-left text-left"><p className="text-slate-400 uppercase text-[10px] font-bold text-left text-left text-left text-left text-left text-left text-left text-left">Time</p><p className="font-medium text-slate-700 text-left text-left text-left text-left text-left text-left text-left text-left">{res.startTime} - {res.endTime}</p></div>
              <div className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><p className="text-slate-400 uppercase text-[10px] font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Requestor</p><p className="font-medium text-slate-700 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{res.user}</p></div>
            </div>
          </div>

          <div className="space-y-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            <h4 className="font-bold border-b border-slate-100 pb-2 text-slate-800 uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Process Documents</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-left text-left text-left text-left text-left text-left">
              <p className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider text-left text-left text-left text-left text-left text-left text-left">Stage 1: Concept Paper</p>
              <a href={res.conceptPaperUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline font-medium block truncate hover:text-sky-700 text-left text-left text-left text-left text-left text-left text-left text-left">{res.conceptPaperUrl}</a>
            </div>

            <div className={`p-4 rounded-xl border text-left text-left text-left text-left text-left text-left ${res.status === 'concept-approved' ? 'bg-sky-50 border-sky-200 text-left text-left text-left text-left' : 'bg-slate-50 border-slate-200 text-left text-left text-left text-left'}`}>
              <p className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider text-left text-left text-left text-left text-left text-left text-left">Stage 2: Facility Form</p>
              {res.finalFormUrl ? (
                <div className="text-left text-left text-left text-left text-left">
                  <p className="text-green-600 font-bold flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left"><CheckCircle size={16} /> Link Submitted</p>
                  <a href={res.finalFormUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline text-xs break-all block mt-1 text-left text-left text-left text-left text-left text-left text-left text-left">{res.finalFormUrl}</a>
                </div>
              ) : res.status === 'concept-approved' ? (
                <div className="space-y-3 text-left text-left text-left text-left text-left text-left">
                  <p className="text-xs text-slate-700 leading-relaxed font-bold text-left text-left text-left text-left text-left text-left">Concept approved! Please input the link to your signed Facility Form document.</p>
                  <button onClick={onPrint} className="flex items-center gap-2 text-indigo-600 font-bold text-xs text-left text-left text-left text-left text-left text-left text-left text-left"><Printer size={16} /> Print Template</button>
                  {isOwner && (
                    <div className="space-y-2 mt-2 text-left text-left text-left text-left text-left text-left">
                       <input 
                        type="url" 
                        value={formLink} 
                        onChange={(e) => setFormLink(e.target.value)}
                        placeholder="Paste Form Link here..." 
                        className="w-full border border-slate-300 p-2 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500 outline-none text-left text-left text-left text-left text-left text-left text-left text-left text-left" 
                       />
                       <button 
                        onClick={() => { if(formLink) onUpdate({...res, finalFormUrl: formLink}); }} 
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-bold text-xs shadow-md transition-colors text-center text-center text-center text-center text-center text-center text-center text-center"
                       >
                        Submit Form Link
                       </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-xs flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left text-left"><Clock size={14} /> Awaiting Stage 1 Approval</p>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4 text-left text-left text-left text-left text-left text-left">
            {res.status === 'pending' && (
              <>
                <button onClick={() => onApproveStage1(res.id)} className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors text-center text-center text-center text-center text-center text-center text-center">Approve Concept</button>
                <button onClick={onDenyClick} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors text-center text-center text-center text-center text-center text-center text-center">Deny Request</button>
              </>
            )}
            {res.status === 'concept-approved' && res.finalFormUrl && (
              <>
                <button onClick={() => onApproveFinal(res)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors text-center text-center text-center text-center text-center text-center text-center">Final Approve</button>
                <button onClick={onDenyClick} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold shadow-md transition-colors text-center text-center text-center text-center text-center text-center text-center text-center">Deny Final</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DenyModal({ res, onClose, onConfirm }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 text-left text-left text-left text-left text-left text-left text-left">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200 text-left text-left text-left text-left text-left text-left text-left">
        <div className="flex items-center gap-3 text-red-600 mb-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <Trash2 size={24} />
          <h3 className="text-xl font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Deny Reservation</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6 text-left text-left text-left text-left text-left text-left text-left text-left">
          You are about to deny <strong>{res.activityPurpose}</strong>. This will remove the reservation from the system.
        </p>
        <div className="space-y-4 text-left text-left text-left text-left text-left text-left">
          <div className="text-left text-left text-left text-left text-left text-left">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Reason for Denial</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Facility maintenance, Scheduling conflict..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-red-500 outline-none transition-all text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"
            />
          </div>
          <div className="flex flex-col gap-2 text-left text-left text-left text-left text-left text-left text-left text-left">
            <button 
              disabled={!reason.trim()}
              onClick={() => onConfirm(res.id, reason)}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-100 text-center text-center text-center text-center text-center text-center text-center text-center"
            >
              Confirm Denial
            </button>
            <button 
              onClick={onClose}
              className="w-full text-slate-400 hover:text-slate-600 text-sm font-medium py-2 transition-colors text-center text-center text-center text-center text-center text-center text-center text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ reservations, events }) {
  const chartDataSpaces = {
    labels: EVENT_SPACES.map(s => s.name),
    datasets: [{
      label: 'Requests',
      data: EVENT_SPACES.map(s => reservations.filter(r => r.spaceId === s.id).length + events.filter(e => e.spaceId === s.id).length),
      backgroundColor: '#0ea5e9',
      borderRadius: 8
    }]
  };

  const chartDataStatus = {
    labels: ['Approved', 'Pending', 'Under Review'],
    datasets: [{
      data: [
        events.length, 
        reservations.filter(r => r.status === 'pending').length,
        reservations.filter(r => r.status === 'concept-approved').length
      ],
      backgroundColor: ['#22c55e', '#f59e0b', '#0ea5e9'],
      borderWidth: 0
    }]
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-left text-left text-left text-left text-left">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left">
        <h3 className="font-bold mb-6 text-slate-800 flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><BarChart3 size={18} className="text-sky-500 text-left text-left text-left text-left text-left text-left text-left text-left text-left" /> Popularity by Space</h3>
        <Bar data={chartDataSpaces} options={{ plugins: { legend: { display: false } } }} />
      </div>
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
        <h3 className="font-bold mb-6 text-slate-800 w-full text-left flex items-center gap-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><Bot size={18} className="text-sky-500 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" /> Request Distribution</h3>
        <div className="w-64 py-4 text-left text-left text-left text-left text-left text-left">
          <Doughnut data={chartDataStatus} />
        </div>
      </div>
    </div>
  );
}

function FacilitiesView({ onBook }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
      {EVENT_SPACES.map(s => (
        <div key={s.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl transition-all group flex flex-col text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <div className="h-40 bg-slate-200 flex items-center justify-center font-bold text-slate-400 text-2xl group-hover:bg-slate-300 transition-colors uppercase text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            {s.name[0]}
          </div>
          <div className="p-6 flex flex-col flex-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            <h3 className="text-xl font-bold mb-2 text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{s.name}</h3>
            <p className="text-xs text-slate-500 mb-4 flex-1 leading-relaxed text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{s.description}</p>
            <div className="pt-4 border-t border-slate-100 mt-auto text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
              <p className="text-xs font-bold text-sky-600 mb-4 uppercase tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Capacity: {s.capacity} pax</p>
              <button onClick={() => onBook(s.id)} className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-xl font-bold transition-all transform active:scale-95 shadow-md text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center">Reserve Now</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ events }) {
  const [curr, setCurr] = useState(new Date());
  const [filterSpace, setFilterSpace] = useState('all');
  const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-left text-left text-left text-left text-left text-left text-left text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
        <div className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <h3 className="text-2xl font-bold text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{curr.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            Showing: {filterSpace === 'all' ? 'All Facilities' : EVENT_SPACES.find(s => s.id === filterSpace)?.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-left text-left text-left text-left text-left text-left text-left text-left">
          <select 
            value={filterSpace} 
            onChange={(e) => setFilterSpace(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all text-left text-left text-left text-left text-left text-left text-left text-left"
          >
            <option value="all">All Facilities</option>
            {EVENT_SPACES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-1 text-left text-left text-left text-left text-left text-left text-left text-left">
            <button onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() - 1)))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() + 1)))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-slate-50 p-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{d}</div>
        ))}
        {days.map((d, i) => {
          const dateStr = d ? `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
          const dayEvents = dateStr ? events.filter(e => e.dateNeeded === dateStr && (filterSpace === 'all' || e.spaceId === filterSpace)) : [];
          return (
            <div key={i} className={`bg-white min-h-[120px] p-2 border-slate-50 text-left text-left text-left text-left text-left text-left text-left text-left ${!d && 'bg-slate-50/50'}`}>
              <span className={`text-sm font-bold p-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left ${d ? 'text-slate-400' : 'text-transparent'}`}>{d || '.'}</span>
              <div className="mt-1 space-y-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                {dayEvents.map(e => (
                  <div key={e.id} className="bg-sky-500 text-white text-[9px] p-1 rounded font-bold shadow-sm shadow-sky-100 border-l-2 border-sky-700 truncate text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" title={e.activityPurpose}>
                    {e.activityPurpose}
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

function ArchiveView({ archive, user, isAdmin, onDelete }) {
  // Logic to show only what hasn't been deleted by the viewer
  const display = isAdmin 
    ? archive.filter(a => !a.deletedByAdmin) 
    : archive.filter(a => a.user === user.username && !a.deletedByUser);

  return (
    <div className="space-y-4 text-left text-left text-left text-left text-left text-left">
      {display.length === 0 ? (
        <div className="bg-white p-20 border border-slate-200 rounded-2xl text-center text-slate-400 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
           <Archive className="mx-auto mb-4 opacity-50 text-left text-left text-left text-left text-left text-left text-left" size={48} />
           <p className="font-medium text-left text-left text-left text-left text-left text-left text-left text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center">No archived items found.</p>
        </div>
      ) : display.map(a => (
        <div key={a.id} className={`bg-white p-4 border rounded-xl flex flex-col transition-all text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left ${a.status === 'denied' ? 'border-red-100 bg-red-50/10' : 'border-green-100 bg-green-50/10'} hover:shadow-md`}>
          <div className="flex justify-between items-center mb-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            <div className="text-left text-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
              <p className="font-bold text-slate-700 text-left text-left text-left text-left text-left text-left text-left text-left text-left">{a.activityPurpose}</p>
              <p className="text-xs text-slate-500 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{a.dateNeeded} | {a.user}</p>
            </div>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left ${a.status === 'denied' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {a.status === 'denied' ? 'Denied' : 'Approved'}
            </span>
          </div>
          
          <div className="flex justify-between items-end gap-4 mt-2">
            <div className="flex-1 text-left text-left text-left text-left text-left">
              {a.status === 'denied' && a.denialReason ? (
                <div className="p-3 bg-red-50 rounded-lg border-l-2 border-red-400 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter mb-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Reason for Denial:</p>
                  <p className="text-xs text-red-700 italic text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{a.denialReason}</p>
                </div>
              ) : a.status === 'approved' ? (
                <p className="text-[10px] text-green-500 font-bold uppercase italic px-1 text-left">Reservation successfully processed and completed.</p>
              ) : null}
            </div>
            <button 
              onClick={() => onDelete(a.id)}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all group flex-shrink-0 text-left text-left"
              title="Delete from archive"
            >
              <Trash2 size={16} className="group-active:scale-90 text-left text-left" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
      <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-200 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-left text-left text-left text-left text-left text-left text-left text-left">
          <CheckCircle size={32} />
        </div>
        <p className="text-lg font-bold mb-6 text-slate-800 text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center">{message}</p>
        <button onClick={onClose} className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-sky-200 transition-colors text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center">OK</button>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-left text-slate-900 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
      <div className="bg-white rounded-3xl w-full max-w-lg h-[70vh] flex flex-col p-6 shadow-2xl overflow-hidden text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><Bot className="text-sky-500 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" /> AI Assistant</h3>
          <button onClick={onClose} className="p-1 text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2 no-scrollbar text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end text-left text-left text-left text-left text-left' : 'justify-start text-left text-left text-left text-left text-left text-left text-left text-left'} text-left text-left text-left text-left text-left text-left text-left text-left text-left`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm text-left text-left text-left text-left text-left text-left ${m.sender === 'user' ? 'bg-sky-500 text-white rounded-tr-none text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left' : 'bg-slate-100 text-slate-800 rounded-tl-none text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-sky-500 text-xs italic animate-pulse text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Thinking...</div>}
        </div>
        <div className="flex gap-2 pt-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 p-3 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:outline-none bg-slate-50 transition-all text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" 
            placeholder="Ask about availability..." 
          />
          <button onClick={sendMessage} className="bg-sky-500 text-white p-3 rounded-2xl transition-colors hover:bg-sky-600 shadow-lg text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
}

function PrintModal({ res, onClose }) {
  const printRef = useRef();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-12 shadow-2xl text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
        <div className="flex justify-between mb-8 no-print text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <h3 className="text-2xl font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Print Request Form</h3>
          <button onClick={onClose} className="p-1 text-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><X /></button>
        </div>

        <div ref={printRef} className="border-2 border-slate-800 p-8 text-slate-800 font-serif bg-white text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <div className="text-center mb-8 pb-4 border-b-2 border-slate-800 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">COMMON FACILITY REQUEST FORM</h2>
            <p className="text-sm mt-1 uppercase opacity-60 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">University of Perpetual Help System Laguna</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            <PrintField label="Activity Purpose" val={res.activityPurpose} full />
            <PrintField label="Facility" val={EVENT_SPACES.find(s => s.id === res.spaceId)?.name} />
            <PrintField label="Date Requested" val={res.dateNeeded} />
            <PrintField label="Time Slot" val={`${res.startTime} - ${res.endTime}`} />
            <PrintField label="Requestor" val={res.user} />
          </div>
          <div className="mt-20 pt-10 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-[10px] uppercase font-bold text-slate-400 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            <p className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Signature Over Printed Name</p>
            <p className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Department Head Approval</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 no-print text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
          <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm transition-colors hover:bg-slate-200 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center">Close</button>
          <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-md transition-colors hover:bg-indigo-600 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center">Print Now</button>
        </div>
      </div>
    </div>
  );
}

function PrintField({ label, val, full }) {
  return (
    <div className={`${full ? 'col-span-2' : ''} text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left`}>
      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{label}</label>
      <div className="border-b border-slate-300 pb-1 font-medium text-slate-800 italic text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{val || '___________________'}</div>
    </div>
  );
}