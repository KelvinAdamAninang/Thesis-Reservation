// VacanSee - Campus Space Reservation System
// CDN-only version with Dynamic Equipment/Services Logic

const { useState, useEffect } = React;

// ==================== CONFIGURATION ====================
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

  async approveFinal(id) {
    const response = await fetch(`${API_BASE}/reservations/${id}/approve-final`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to approve');
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
  const [checkingSession, setCheckingSession] = useState(true);
  const [seenNotifications, setSeenNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seenNotifications') || '[]'); } catch { return []; }
  });

  const isAdmin = currentUser?.role === 'admin';

  const getUnreadNotifications = () => {
    if (!currentUser) return [];
    if (isAdmin) {
      return reservations.filter(r => r.status === 'pending' && !r.archived_at && !seenNotifications.includes(`admin-${r.id}`));
    } else {
      return reservations.filter(r => r.user_id === currentUser.id && r.status === 'denied' && !seenNotifications.includes(`user-${r.id}`));
    }
  };

  const hasUnread = getUnreadNotifications().length > 0;

  const markNotificationSeen = (id) => {
    const key = isAdmin ? `admin-${id}` : `user-${id}`;
    const updated = [...seenNotifications, key];
    setSeenNotifications(updated);
    localStorage.setItem('seenNotifications', JSON.stringify(updated));
  };

  const markAllNotificationsSeen = () => {
    const notifications = getUnreadNotifications();
    const keys = notifications.map(n => isAdmin ? `admin-${n.id}` : `user-${n.id}`);
    const updated = [...seenNotifications, ...keys];
    setSeenNotifications(updated);
    localStorage.setItem('seenNotifications', JSON.stringify(updated));
  };

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
      } catch (err) {}
      setCheckingSession(false);
    })();
  }, []);

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
      const res = await apiService.login(username, password);
      if (res.status === 'success') {
        setCurrentUser({
          id: res.user_id,
          username: res.username,
          role: res.role,
          department: res.department
        });
        setCurrentView('dashboard');
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

  const archive = reservations.filter(r => r.archived_at);

  return React.createElement('div', { className: 'flex h-screen bg-slate-50 overflow-hidden' },
    React.createElement(Sidebar, { currentView, setView: setCurrentView, user: currentUser, onLogout: handleLogout, isAdmin }),
    React.createElement('div', { className: 'flex-1 flex flex-col min-w-0' },
      React.createElement(Header, { 
        title: currentView, 
        onOpenProfile: () => setActiveModal('profile'), 
        onOpenNotifications: () => setActiveModal('notifications'),
        hasUnread,
        user: currentUser 
      }),
      error && React.createElement('div', { className: 'bg-red-100 text-red-700 px-4 py-2 mx-8 mt-4 rounded flex justify-between items-center' },
        React.createElement('span', {}, error),
        React.createElement('button', { onClick: () => setError(''), className: 'text-red-700 hover:text-red-900 font-bold' }, '×')
      ),
      React.createElement('main', { className: 'flex-1 overflow-y-auto p-8' },
        currentView === 'dashboard' && React.createElement(Dashboard, { reservations, rooms, archive, user: currentUser, onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); }, onBook: (roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); } }),
        currentView === 'calendar' && React.createElement(CalendarView, { events: reservations.filter(r => r.status === 'approved' && !r.archived_at), rooms }),
        currentView === 'facilities' && React.createElement(FacilitiesView, { rooms, onBook: (roomId) => { setSelectedRes({ room_id: roomId }); setActiveModal('reservation'); } }),
        currentView === 'reservations' && isAdmin && React.createElement(AdminRequests, { reservations: reservations.filter(r => !r.archived_at), onViewDetails: (r) => { setSelectedRes(r); setActiveModal('details'); } }),
        currentView === 'analytics' && React.createElement(AnalyticsView, { reservations }),
        currentView === 'archive' && React.createElement(ArchiveView, { archive, user: currentUser, isAdmin, onDelete: async (id) => { if (window.confirm('Delete?')) { await apiService.deleteReservation(id); setReservations(reservations.filter(r => r.id !== id)); } } })
      )
    ),
    activeModal === 'reservation' && React.createElement(ReservationModal, { initialData: selectedRes || {}, rooms, onClose: () => setActiveModal(null), onSubmit: async (fd) => { setLoading(true); try { await apiService.createReservation(fd); setNotification('Created!'); setActiveModal('notification'); const res = await apiService.getReservations(); setReservations(res); } catch (err) { setError(err.message); } finally { setLoading(false); } }, loading }),
    activeModal === 'details' && React.createElement(DetailsModal, { 
      res: selectedRes, 
      user: currentUser, 
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
      onDenyClick: () => setActiveModal('deny'), 
      loading 
    }),
    activeModal === 'deny' && React.createElement(DenyModal, { res: selectedRes, onClose: () => setActiveModal('details'), onConfirm: async (reason) => { setLoading(true); try { await apiService.denyReservation(selectedRes.id, reason); const res = await apiService.getReservations(); setReservations(res); setNotification('Denied'); setActiveModal('notification'); } catch (err) { setError(err.message); } finally { setLoading(false); } }, loading }),
    activeModal === 'profile' && React.createElement(ProfileModal, { user: currentUser, onClose: () => setActiveModal(null), onLogout: handleLogout }),
    activeModal === 'notifications' && React.createElement(NotificationsListModal, {
      notifications: getUnreadNotifications(),
      user: currentUser,
      isAdmin,
      onClose: () => setActiveModal(null),
      onMarkSeen: markNotificationSeen,
      onMarkAllSeen: markAllNotificationsSeen,
      onViewRequest: (r) => { setSelectedRes(r); setActiveModal('details'); }
    }),
    activeModal === 'notification' && React.createElement(NotificationModal, { message: notification, onClose: () => setActiveModal(null) })
  );
}

// ==================== COMPONENTS ====================

function ReservationModal({ initialData, rooms, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    room_id: initialData?.room_id || '',
    activity_purpose: '',
    person_in_charge: '',
    contact_number: '',
    event_date: '',
    start_time: '',
    end_time: '',
    concept_paper_url: '',
    equipment: {} 
  });

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
    const formData = {
      ...form,
      start_time: `${form.event_date}T${form.start_time}`,
      end_time: `${form.event_date}T${form.end_time}`
    };
    onSubmit(formData);
  };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto' },
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('h3', { className: 'font-bold' }, 'New Reservation'),
        React.createElement('button', { onClick: onClose, className: 'text-2xl' }, '✕')
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
        React.createElement('div', { className: 'space-y-1' },
          React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'Event Date'),
          React.createElement('input', { type: 'date', value: form.event_date, onChange: (e) => setForm({ ...form, event_date: e.target.value }), className: 'w-full p-2 border rounded', required: true })
        ),
        React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
          React.createElement('div', { className: 'space-y-1' },
            React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'Start Time'),
            React.createElement('input', { type: 'time', value: form.start_time, onChange: (e) => setForm({ ...form, start_time: e.target.value }), className: 'w-full p-2 border rounded', required: true })
          ),
          React.createElement('div', { className: 'space-y-1' },
            React.createElement('label', { className: 'text-sm font-medium text-slate-700' }, 'End Time'),
            React.createElement('input', { type: 'time', value: form.end_time, onChange: (e) => setForm({ ...form, end_time: e.target.value }), className: 'w-full p-2 border rounded', required: true })
          )
        ),
        React.createElement('input', { type: 'url', placeholder: 'Concept Paper Link', value: form.concept_paper_url, onChange: (e) => setForm({ ...form, concept_paper_url: e.target.value }), className: 'w-full p-2 border rounded', required: true }),
        
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

        React.createElement('button', { type: 'submit', disabled: loading, className: 'w-full bg-sky-500 text-white p-2 mt-4 rounded font-bold hover:bg-sky-600 transition' }, loading ? 'Creating...' : 'Create Reservation')
      )
    )
  );
}

function DetailsModal({ res, user, onClose, onApproveStage1, onApproveFinal, onDenyClick, onUploadFinalForm, loading }) {
  const [finalFormLink, setFinalFormLink] = useState('');
  const isAdmin = user.role === 'admin';
  const isOwner = res.user_id === user.id;

  const requestedEquip = res.equipment ? Object.entries(res.equipment).filter(([_, qty]) => qty > 0) : [];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Reservation Form</title>
      <style>
        body { font-family: sans-serif; padding: 40px; }
        .box { border: 1px solid #333; padding: 20px; }
        h1 { text-align: center; }
        .row { display: flex; margin-bottom: 10px; }
        .label { font-weight: bold; width: 180px; }
      </style></head><body>
      <div class="box">
        <h1>FACILITY RESERVATION FORM</h1>
        <div class="row"><div class="label">Activity:</div><div>${res.activity_purpose}</div></div>
        <div class="row"><div class="label">Person In Charge:</div><div>${res.person_in_charge}</div></div>
        <div class="row"><div class="label">Contact:</div><div>${res.contact_number}</div></div>
        <div class="row"><div class="label">Schedule:</div><div>${res.start_time} - ${res.end_time}</div></div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl' },
      React.createElement('div', { className: 'flex justify-between items-start mb-6' },
        React.createElement('div', {},
          React.createElement('h3', { className: 'text-2xl font-bold text-slate-800' }, res.activity_purpose),
          React.createElement(Badge, { status: res.status })
        ),
        React.createElement('button', { onClick: onClose, className: 'p-1 hover:bg-slate-100 rounded-full text-slate-600 text-xl' }, '✕')
      ),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-8 text-sm' },
        React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, '👤 Identification'),
            React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
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
          
          // ADMIN EQUIPMENT VIEW
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, '🛠️ Equipment Requested'),
            requestedEquip.length > 0 
              ? React.createElement('div', { className: 'grid gap-2' },
                  requestedEquip.map(([item, qty]) => 
                    React.createElement('div', { key: item, className: 'flex justify-between bg-slate-50 px-3 py-2 rounded border border-slate-100' },
                      React.createElement('span', { className: 'text-slate-600 font-medium' }, item),
                      React.createElement('span', { className: 'font-bold text-sky-600' }, `x${qty}`)
                    )
                  )
                )
              : React.createElement('p', { className: 'text-slate-400 italic text-xs' }, 'No equipment requested.')
          )
        ),

        React.createElement('div', { className: 'space-y-4' },
          React.createElement('h4', { className: 'font-bold border-b pb-2 text-slate-800 uppercase text-xs tracking-wider' }, '📋 Documents & Info'),
          React.createElement('div', { className: 'bg-slate-50 p-4 rounded-xl border border-slate-200' },
            React.createElement('p', { className: 'text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider' }, 'Stage 1: Concept Paper'),
            res.concept_paper_url 
              ? React.createElement('a', { href: res.concept_paper_url, target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-600 underline font-medium text-xs break-all' }, res.concept_paper_url)
              : React.createElement('p', { className: 'text-slate-400 text-xs' }, 'No concept submitted')
          ),
          React.createElement('div', { className: `p-4 rounded-xl border ${res.status === 'concept-approved' ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-slate-200'}` },
            React.createElement('p', { className: 'text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider' }, 'Stage 2: Facility Form'),
            res.final_form_url
              ? React.createElement('a', { href: res.final_form_url, target: '_blank', className: 'text-sky-600 underline text-xs' }, 'View Submitted Form')
              : res.status === 'concept-approved' && isOwner
                ? React.createElement('div', { className: 'space-y-2' },
                    React.createElement('button', { onClick: handlePrint, className: 'text-xs text-indigo-600 font-bold' }, '🖨️ Print Form'),
                    React.createElement('input', { 
                      value: finalFormLink, 
                      onChange: (e) => setFinalFormLink(e.target.value), 
                      placeholder: 'Paste Form Link...', 
                      className: 'w-full p-2 text-xs border rounded bg-white' 
                    }),
                    React.createElement('button', { 
                      onClick: () => onUploadFinalForm(res.id, finalFormLink), 
                      className: 'w-full bg-sky-500 text-white py-2 rounded font-bold text-xs' 
                    }, 'Submit Final Link')
                  )
                : React.createElement('p', { className: 'text-slate-400 text-xs' }, 'Pending Stage 1 Approval')
          )
        )
      ),

      isAdmin && React.createElement('div', { className: 'mt-8 pt-6 border-t flex gap-4' },
        res.status === 'pending' && React.createElement(React.Fragment, {},
          React.createElement('button', { onClick: onApproveStage1, className: 'flex-1 bg-sky-500 text-white py-3 rounded-lg font-bold' }, 'Approve Concept'),
          React.createElement('button', { onClick: onDenyClick, className: 'flex-1 bg-red-500 text-white py-3 rounded-lg font-bold' }, 'Deny')
        ),
        res.status === 'concept-approved' && res.final_form_url && React.createElement(React.Fragment, {},
          React.createElement('button', { onClick: () => onApproveFinal(res.id), className: 'flex-1 bg-green-500 text-white py-3 rounded-lg font-bold' }, 'Final Approve'),
          React.createElement('button', { onClick: onDenyClick, className: 'flex-1 bg-red-500 text-white py-3 rounded-lg font-bold' }, 'Deny Final')
        )
      )
    )
  );
}

// ... Rest of components (LoginPage, Sidebar, Dashboard, etc.) remain as in previous versions

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
  const NavBtn = ({ id, label }) => React.createElement('button', { 
    onClick: () => setView(id), 
    className: `flex items-center gap-3 w-full p-3 rounded-xl transition font-medium ${currentView === id ? 'bg-sky-100 text-sky-600' : 'text-slate-500 hover:bg-slate-100'}` 
  }, label);
  
  return React.createElement('aside', { className: 'w-72 bg-white border-r flex flex-col p-6 h-full' },
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
        React.createElement('button', { onClick: onLogout, className: 'text-xs text-slate-500 hover:text-red-500 flex items-center gap-1' }, '🚪 Log out')
      )
    )
  );
}

function Header({ title, onOpenProfile, onOpenNotifications, hasUnread, user }) {
  return React.createElement('header', { className: 'bg-white border-b px-8 py-4 flex justify-between items-center' },
    React.createElement('h2', { className: 'text-xl font-bold text-slate-800 capitalize' }, title),
    React.createElement('div', { className: 'flex gap-2 items-center' },
      React.createElement('button', { 
        onClick: onOpenNotifications, 
        className: 'p-2 text-slate-400 hover:text-sky-500 transition relative',
        title: 'Notifications'
      }, 
        '🔔',
        hasUnread && React.createElement('span', { className: 'absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse' })
      ),
      React.createElement('button', { 
        onClick: onOpenProfile, 
        className: 'ml-2 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-sky-50 hover:border-sky-300 transition-all overflow-hidden',
        title: 'Profile'
      }, '👤')
    )
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
    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
      React.createElement('div', { className: 'lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border' },
        React.createElement('h3', { className: 'font-bold text-lg mb-4 text-slate-800' }, '📋 My Reservations'),
        userRes.length === 0 
          ? React.createElement('p', { className: 'text-slate-400 py-8 text-center' }, 'No reservations yet. Book a space to get started!')
          : userRes.slice(0, 5).map(r => React.createElement('div', { key: r.id, onClick: () => onViewDetails(r), className: 'p-4 bg-slate-50 rounded-xl mb-2 cursor-pointer hover:bg-sky-50 transition' },
            React.createElement('div', { className: 'flex justify-between items-center' },
              React.createElement('div', {}, 
                React.createElement('p', { className: 'font-bold text-slate-800' }, r.activity_purpose), 
                React.createElement('p', { className: 'text-sm text-slate-500' }, r.start_time)
              ),
              React.createElement(Badge, { status: r.status })
            )
          ))
      ),
      React.createElement('div', { className: 'bg-white p-6 rounded-3xl shadow-sm border' },
        React.createElement('h3', { className: 'font-bold text-lg mb-4 text-slate-800' }, '⚡ Quick Book'),
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
        )
      ),
      React.createElement('button', { onClick: onLogout, className: 'w-full mt-10 flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 text-red-500 hover:bg-red-50 font-bold transition-all text-sm border border-slate-100' }, '🚪 Sign Out')
    )
  );
}

function AnalyticsView({ reservations }) {
  const pending = reservations.filter(r => r.status === 'pending').length;
  const approved = reservations.filter(r => r.status === 'approved').length;
  const denied = reservations.filter(r => r.status === 'denied').length;
  const total = reservations.length;
  
  return React.createElement('div', { className: 'space-y-8' },
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-6' },
      React.createElement('div', { className: 'bg-white p-6 rounded-3xl shadow-sm border text-center' },
        React.createElement('p', { className: 'text-4xl font-bold text-slate-800' }, total),
        React.createElement('p', { className: 'text-sm text-slate-500 mt-2' }, 'Total Reservations')
      ),
      React.createElement('div', { className: 'bg-yellow-50 p-6 rounded-3xl shadow-sm border border-yellow-100 text-center' },
        React.createElement('p', { className: 'text-4xl font-bold text-yellow-600' }, pending),
        React.createElement('p', { className: 'text-sm text-yellow-700 mt-2' }, 'Pending')
      ),
      React.createElement('div', { className: 'bg-green-50 p-6 rounded-3xl shadow-sm border border-green-100 text-center' },
        React.createElement('p', { className: 'text-4xl font-bold text-green-600' }, approved),
        React.createElement('p', { className: 'text-sm text-green-700 mt-2' }, 'Approved')
      ),
      React.createElement('div', { className: 'bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100 text-center' },
        React.createElement('p', { className: 'text-4xl font-bold text-red-600' }, denied),
        React.createElement('p', { className: 'text-sm text-red-700 mt-2' }, 'Denied')
      )
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
          React.createElement('span', { className: 'flex items-center gap-1' }, '👥 ', r.capacity)
        ),
        React.createElement('button', { onClick: () => onBook(r.id), className: 'w-full bg-sky-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-sky-600 transition' }, 'Book This Space')
      )
    ))
  );
}

function CalendarView({ events, rooms }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterRoom, setFilterRoom] = useState('all');

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

  return React.createElement('div', { className: 'bg-white rounded-2xl border border-slate-200 p-8 shadow-sm' },
    React.createElement('div', { className: 'flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6' },
      React.createElement('div', {},
        React.createElement('h3', { className: 'text-2xl font-bold text-slate-800' }, monthName)
      ),
      React.createElement('div', { className: 'flex flex-wrap items-center gap-3' },
        rooms && rooms.length > 0 && React.createElement('select', { value: filterRoom, onChange: (e) => setFilterRoom(e.target.value), className: 'p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none' },
          React.createElement('option', { value: 'all' }, 'All Facilities'),
          rooms.map(r => React.createElement('option', { key: r.id, value: r.id }, r.name))
        ),
        React.createElement('div', { className: 'flex gap-1' },
          React.createElement('button', { onClick: prevMonth, className: 'p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-800' }, '◀'),
          React.createElement('button', { onClick: nextMonth, className: 'p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-800' }, '▶')
        )
      )
    ),
    React.createElement('div', { className: 'grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden' },
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => React.createElement('div', { key: d, className: 'bg-slate-50 p-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100' }, d)),
      days.map((day, i) => {
        const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
        const dayEvents = dateStr ? events.filter(e => {
          if (!e.start_time) return false;
          const eventDate = e.start_time.split('T')[0];
          return eventDate === dateStr && (filterRoom === 'all' || e.room_id == filterRoom);
        }) : [];

        return React.createElement('div', { key: i, className: `bg-white min-h-[100px] p-2 border-slate-50 ${!day && 'bg-slate-50/50'}` },
          React.createElement('span', { className: `text-sm font-bold p-1 ${day ? 'text-slate-400' : 'text-transparent'}` }, day || '.'),
          React.createElement('div', { className: 'mt-1 space-y-1' },
            dayEvents.slice(0, 3).map(e => React.createElement('div', { key: e.id, className: 'bg-sky-500 text-white text-[9px] p-1 rounded font-bold shadow-sm border-l-2 border-sky-700 truncate', title: e.activity_purpose }, e.activity_purpose))
          )
        );
      })
    )
  );
}

function ArchiveView({ archive, user, isAdmin, onDelete }) {
  const items = isAdmin ? archive : archive.filter(a => a.user_id === user.id);
  return React.createElement('div', { className: 'space-y-4' },
    React.createElement('h2', { className: 'text-2xl font-bold text-slate-800' }, '📦 Archive'),
    items.length === 0 
      ? React.createElement('div', { className: 'bg-white p-8 rounded-3xl shadow-sm border text-center' }, React.createElement('p', { className: 'text-slate-400' }, 'No archived items.'))
      : items.map(a => React.createElement('div', { key: a.id, className: 'p-4 bg-white rounded-2xl border shadow-sm flex justify-between items-center' },
          React.createElement('div', {}, React.createElement('p', { className: 'font-bold text-slate-800' }, a.activity_purpose), React.createElement('p', { className: 'text-sm text-slate-500' }, a.start_time)),
          React.createElement('button', { onClick: () => onDelete(a.id), className: 'px-4 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 font-medium transition' }, '🗑️ Delete')
        ))
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

function NotificationsListModal({ notifications, user, isAdmin, onClose, onMarkSeen, onMarkAllSeen, onViewRequest }) {
  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
    React.createElement('div', { className: 'bg-white rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col p-6 shadow-2xl overflow-hidden' },
      React.createElement('div', { className: 'flex justify-between items-center mb-6 pb-4 border-b' },
        React.createElement('h3', { className: 'text-xl font-bold flex items-center gap-2 text-slate-800' }, '🔔 Notifications'),
        React.createElement('button', { onClick: onClose, className: 'p-1 text-slate-400 hover:text-slate-600' }, '✕')
      ),
      React.createElement('div', { className: 'flex-1 overflow-y-auto space-y-4' },
        notifications.length === 0 
          ? React.createElement('p', { className: 'text-center text-slate-400 py-8' }, 'No new notifications')
          : notifications.map(n => React.createElement('div', { key: n.id, onClick: () => { onMarkSeen(n.id); onViewRequest(n); }, className: 'p-4 rounded-2xl border bg-sky-50 cursor-pointer hover:border-sky-300 transition-all' },
              React.createElement('p', { className: 'text-sm font-bold text-slate-800' }, n.activity_purpose),
              React.createElement('p', { className: 'text-xs text-slate-500' }, n.start_time)
            ))
      )
    )
  );
}

// Render
ReactDOM.render(React.createElement(App), document.getElementById('root'));