import React, { useState, useEffect } from 'react';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [audits, setAudits] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);

  const employees = [
    { id: 1, name: "Admin System User", email: "admin@odoo.com", role: "Admin", dept: "Operations" },
    { id: 2, name: "Priya Sharma", email: "priya@odoo.com", role: "Employee", dept: "Engineering" },
    { id: 3, name: "Raj Patel", email: "raj@odoo.com", role: "Employee", dept: "Marketing" }
  ];

  const [allocationForm, setAllocationForm] = useState({ asset_id: '', employee_id: '', expected_return_date: '' });
  const [bookingForm, setBookingForm] = useState({ asset_id: '', employee_id: '', start_time: '', end_time: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ asset_id: '', description: '', priority: 'Medium' });
  const [newAssetForm, setNewAssetForm] = useState({ name: '', category_id: 1, is_bookable: false });

  const fetchBaseData = () => {
    fetch('http://127.0.0.1:8000/api/assets')
      .then((res) => res.json())
      .then((data) => setAssets(data))
      .catch(() => {
        setError('Running in offline fallback mode.');
        const cached = localStorage.getItem('cached_assets');
        if (cached) setAssets(JSON.parse(cached));
      });

    fetch('http://127.0.0.1:8000/api/maintenance')
      .then((res) => res.json())
      .then((data) => setTickets(data));

    fetch('http://127.0.0.1:8000/api/reports/summary')
      .then((res) => res.json())
      .then((data) => setAnalytics(data));

    fetch('http://127.0.0.1:8000/api/notifications')
      .then((res) => res.json())
      .then((data) => setNotifications(data));

    fetch('http://127.0.0.1:8000/api/audits')
      .then((res) => res.json())
      .then((data) => setAudits(data));
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/api/assets/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssetForm)
      });
      if (res.ok) {
        alert("Asset added successfully!");
        setNewAssetForm({ name: '', category_id: 1, is_bookable: false });
        fetchBaseData();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Allocation failed');
      alert('Asset successfully allocated!');
      setError('');
      setAssetSearchQuery('');
      setAllocationForm({ asset_id: '', employee_id: '', expected_return_date: '' });
      fetchBaseData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Booking overlap conflict');
      alert('Resource booked successfully!');
      setError('');
      fetchBaseData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getBorrowedAssetTag = (employeeId) => {
    const matchedAsset = assets.find(a => a.assigned_to_id === Number(employeeId) && a.status === "Allocated");
    return matchedAsset ? `${matchedAsset.tag} (${matchedAsset.name})` : "None Assigned";
  };

  const filteredAssetsForAllocation = assets.filter(a =>
    !a.is_bookable &&
    a.name.toLowerCase().includes(assetSearchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", sans-serif', backgroundColor: '#f8fafc' }}>

      {/* BRANDED SIDEBAR PANEL */}
      <div style={{ width: '280px', minWidth: '280px', backgroundColor: '#4c3245', color: 'white', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3.5rem' }}>
          <div style={{ width: '38px', height: '38px', backgroundColor: '#a26b93', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.3rem' }}>A</div>
          <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>AssetFlow ERP</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'assets', label: 'Asset Registry', icon: '📦' },
            { id: 'allocations', label: 'Allocations', icon: '🤝' },
            { id: 'bookings', label: 'Bookings', icon: '📅' },
            { id: 'maintenance', label: 'Maintenance', icon: '🛠️' },
            { id: 'audits', label: 'Asset Audits', icon: '🔍' },
            { id: 'directory', label: 'Employee Directory', icon: '👥' },
            { id: 'reports', label: 'Reports & Analytics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.9rem 1.25rem',
                textAlign: 'left',
                background: currentTab === tab.id ? 'rgba(255,255,255,0.15)' : 'none',
                color: currentTab === tab.id ? '#ffffff' : '#d2c4ce',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: currentTab === tab.id ? '600' : '500',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN VIEWPORT INTERFACE AREA */}
      <div style={{ flex: 1, padding: '3rem 4rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {error && (
          <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '1.25rem 1.5rem', borderRadius: '12px', fontWeight: '500', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            {error}
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.75px', lineHeight: '1.2' }}>Workspace Overview</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Real-time resource allocation and health analytics metrics.</p>
            </div>

            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', color: '#1e293b', fontSize: '1.15rem', fontWeight: '700' }}>🔔 Live Audit Trail & Activity Logs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notifications.length === 0 ? (
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem', fontStyle: 'italic' }}>System listening for operational network activities...</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', fontSize: '0.95rem', color: '#334155', borderLeft: '4px solid #a26b93' }}>
                      <span style={{ fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>{n.timestamp}</span>
                      <span style={{ fontWeight: '500' }}>{n.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '1.75rem' }}>📦</span>
                <h3 style={{ color: '#64748b', margin: '0.75rem 0 0.25rem 0', fontSize: '0.95rem', fontWeight: '500' }}>Total Managed Assets</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, color: '#4c3245' }}>{assets.length}</p>
              </div>
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '1.75rem' }}>🟢</span>
                <h3 style={{ color: '#64748b', margin: '0.75rem 0 0.25rem 0', fontSize: '0.95rem', fontWeight: '500' }}>Available Fleet Inventory</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, color: '#10b981' }}>{assets.filter(a => a.status === 'Available').length}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSET REGISTRY */}
        {currentTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.75px', lineHeight: '1.2' }}>Enterprise Asset Registry</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Detailed tracking ledger of all company property hardware.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {assets.map((asset) => (
                  <div key={asset.id} style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>{asset.tag}</span>
                      <span style={{ padding: '0.35rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: asset.status === 'Available' ? '#ecfdf5' : asset.status === 'Under Maintenance' ? '#fffbeb' : '#fef2f2', color: asset.status === 'Available' ? '#059669' : asset.status === 'Under Maintenance' ? '#d97706' : '#dc2626' }}>{asset.status}</span>
                    </div>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', color: '#1e293b', fontWeight: '600' }}>{asset.name}</h3>
                    <div style={{ fontSize: '0.88rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1rem' }}>🛡️ {asset.is_bookable ? 'Shared Workspace Resource' : 'Assigned Individual Asset'}</div>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1.5rem', color: '#0f172a' }}>Register New Asset</h2>
                <form onSubmit={handleCreateAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.88rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem', color: '#334155' }}>Asset Name</label>
                    <input type="text" value={newAssetForm.name} placeholder="e.g. Test iPhone, Lab Server" onChange={(e) => setNewAssetForm({ ...newAssetForm, name: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.88rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem', color: '#334155' }}>Resource Type</label>
                    <select value={newAssetForm.is_bookable ? "true" : "false"} onChange={(e) => setNewAssetForm({ ...newAssetForm, is_bookable: e.target.value === "true" })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem' }}>
                      <option value="false">Physical Assigned Inventory</option>
                      <option value="true">Shared/Bookable Resource Space</option>
                    </select>
                  </div>
                  <button type="submit" style={{ backgroundColor: '#714B67', color: 'white', padding: '1rem', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem', fontSize: '0.95rem', boxShadow: '0 4px 6px rgba(113, 75, 103, 0.2)' }}>Save to Database</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ALLOCATIONS */}
        {currentTab === 'allocations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.75px', lineHeight: '1.2' }}>Asset Assignment Protocol</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Provision physical hardware inventory to active employee files cleanly.</p>
            </div>

            <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
              <form onSubmit={handleAllocate} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Search & Select Asset</label>
                  <input
                    type="text"
                    value={assetSearchQuery}
                    placeholder="🔍 Type to filter hardware items..."
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '0.75rem', fontSize: '0.95rem' }}
                  />
                  <select
                    value={allocationForm.asset_id}
                    onChange={(e) => setAllocationForm({ ...allocationForm, asset_id: e.target.value })}
                    style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem' }}
                    required
                  >
                    <option value="">-- Match Results ({filteredAssetsForAllocation.length}) --</option>
                    {filteredAssetsForAllocation.map(a => (
                      <option key={a.id} value={a.id}>{a.tag} - {a.name} [{a.status}]</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Employee ID Reference</label>
                    <input type="number" placeholder="Refer to Directory tab" onChange={(e) => setAllocationForm({ ...allocationForm, employee_id: e.target.value })} style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Return Cutoff Date</label>
                    <input type="date" onChange={(e) => setAllocationForm({ ...allocationForm, expected_return_date: e.target.value })} style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                  </div>
                </div>
                <button type="submit" style={{ backgroundColor: '#714B67', color: 'white', padding: '1.1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', marginTop: '0.5rem', boxShadow: '0 4px 6px rgba(113, 75, 103, 0.2)' }}>Authorize Assignment</button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: BOOKINGS */}
        {currentTab === 'bookings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.75px', lineHeight: '1.2' }}>Shared Resource Time-Slot Booking</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Schedule company workspaces without timeline overlaps.</p>
            </div>

            <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
              <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Select Shared Space</label>
                  <select onChange={(e) => setBookingForm({ ...bookingForm, asset_id: e.target.value })} style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem' }} required>
                    <option value="">-- Choose facility --</option>
                    {assets.filter(a => a.is_bookable).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Employee ID Reference</label>
                  <input type="number" placeholder="Refer to Directory tab" onChange={(e) => setBookingForm({ ...bookingForm, employee_id: e.target.value })} style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>Start Time</label>
                    <input type="datetime-local" onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })} style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>End Time</label>
                    <input type="datetime-local" onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })} style={{ width: '100%', padding: '0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                  </div>
                </div>
                <button type="submit" style={{ backgroundColor: '#714B67', color: 'white', padding: '1.1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', marginTop: '0.5rem', boxShadow: '0 4px 6px rgba(113, 75, 103, 0.2)' }}>Lock Reservation</button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: MAINTENANCE */}
        {currentTab === 'maintenance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.75px', lineHeight: '1.2' }}>Log Defective Hardware</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Route items through structural triage workflows.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2.5rem', alignItems: 'start' }}>
              <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('http://127.0.0.1:8000/api/maintenance/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(maintenanceForm)
                  });
                  if (res.ok) { alert('Ticket logged successfully'); window.location.reload(); }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.88rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem', color: '#334155' }}>Target Hardware</label>
                    <select onChange={(e) => setMaintenanceForm({ ...maintenanceForm, asset_id: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#f8fafc' }} required>
                      <option value="">-- Choose hardware target --</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.tag} - {a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.88rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem', color: '#334155' }}>Fault Disruption Details</label>
                    <textarea rows="4" placeholder="Describe the hardware fault component details..." onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                  </div>
                  <button type="submit" style={{ backgroundColor: '#714B67', color: 'white', padding: '1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', boxShadow: '0 4px 6px rgba(113, 75, 103, 0.2)' }}>File Maintenance Ticket</button>
                </form>
              </div>

              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.5rem', letterSpacing: '-0.3px', lineHeight: '1.2' }}>Active Approvals Queue</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {tickets.length === 0 ? <p style={{ color: '#64748b', fontStyle: 'italic' }}>No active requests currently queued.</p> : tickets.map(ticket => (
                    <div key={ticket.id} style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.05rem' }}>{ticket.asset_tag} : {ticket.asset_name}</span>
                        <span style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: '#fef3c7', color: '#d97706' }}>{ticket.status}</span>
                      </div>
                      <p style={{ color: '#475569', fontSize: '0.95rem', margin: '0 0 1.25rem 0', lineHeight: '1.5' }}>{ticket.description}</p>
                      {ticket.status === 'Pending' && <button onClick={async () => { await fetch(`http://127.0.0.1:8000/api/maintenance/${ticket.id}/approve`, { method: 'POST' }); window.location.reload(); }} style={{ backgroundColor: '#10b981', color: 'white', padding: '0.6rem 1.25rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>Approve Service</button>}
                      {ticket.status === 'Approved' && <button onClick={async () => { await fetch(`http://127.0.0.1:8000/api/maintenance/${ticket.id}/resolve`, { method: 'POST' }); window.location.reload(); }} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.6rem 1.25rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '#0.88rem' }}>Complete Repairs</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUDITS */}
        {currentTab === 'audits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0', letterSpacing: '-0.75px', lineHeight: '1.2' }}>Asset Verification Cycles</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Schedule physical checks and isolate system discrepancies.</p>
              </div>
              <button onClick={async () => { const res = await fetch('http://127.0.0.1:8000/api/audits/start?department_id=1', { method: 'POST' }); if (res.ok) window.location.reload(); }} style={{ backgroundColor: '#714B67', color: 'white', padding: '0.85rem 1.5rem', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 6px rgba(113, 75, 103, 0.2)' }}>🚀 Trigger Verification Cycle</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {audits.map(a => (
                  <div key={a.id} onClick={() => setSelectedAudit(a)} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', border: selectedAudit?.id === a.id ? '2px solid #714B67' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                    <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '0.35rem' }}>Cycle Ref #{a.id}</div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Discrepancies: <span style={{ color: '#dc2626', fontWeight: '700' }}>{a.discrepancies}</span></div>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' }}>
                {selectedAudit ? (
                  <div>
                    <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Processing Cycle #{selectedAudit.id}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {assets.map(asset => (
                        <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '0.95rem' }}><strong style={{ fontFamily: 'monospace', color: '#4c3245' }}>{asset.tag}</strong> - {asset.name}</div>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={async () => { await fetch(`http://127.0.0.1:8000/api/audits/${selectedAudit.id}/verify?asset_id=${asset.id}&asset_condition=Verified`, { method: 'POST' }); alert('Verified!'); window.location.reload(); }} style={{ backgroundColor: '#dcfce7', color: '#16a34a', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>Verify</button>
                            <button onClick={async () => { await fetch(`http://127.0.0.1:8000/api/audits/${selectedAudit.id}/verify?asset_id=${asset.id}&asset_condition=Missing`, { method: 'POST' }); alert('Flagged Missing!'); window.location.reload(); }} style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>Flag Missing</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '4rem 0', fontStyle: 'italic', fontSize: '1rem' }}>Select an inventory check cycle to monitor auditor controls.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: EMPLOYEE DIRECTORY */}
        {currentTab === 'directory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.75px', lineHeight: '1.2' }}>Organization Employee Directory</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Master ledger of certified company staff parameters and clearance permissions.</p>
              </div>

              <button
                onClick={() => setIsAdminAuthorized(!isAdminAuthorized)}
                style={{
                  backgroundColor: isAdminAuthorized ? '#ef4444' : '#714B67',
                  color: 'white',
                  padding: '0.85rem 1.5rem',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}
              >
                {isAdminAuthorized ? "🔒 Lock Secure Data" : "🔑 Request Admin Access"}
              </button>
            </div>

            <table style={{ width: '100%', backgroundColor: 'white', borderCollapse: 'collapse', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '0.9rem' }}>
                  <th style={{ padding: '1.5rem' }}>Employee ID</th>
                  <th style={{ padding: '1.5rem' }}>Full Name</th>
                  <th style={{ padding: '1.5rem' }}>Company Email</th>
                  <th style={{ padding: '1.5rem' }}>Department Unit</th>
                  <th style={{ padding: '1.5rem', color: '#714B67', fontWeight: '700' }}>🔒 Currently Held Asset File</th>
                </tr>
              </thead>
              <tbody style={{ color: '#334155', fontSize: '0.95rem' }}>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1.5rem', fontWeight: '700', fontFamily: 'monospace', color: '#64748b' }}>#{emp.id}</td>
                    <td style={{ padding: '1.5rem', fontWeight: '600' }}>{emp.name}</td>
                    <td style={{ padding: '1.5rem', color: '#475569' }}>{emp.email}</td>
                    <td style={{ padding: '1.5rem' }}>
                      <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '500' }}>{emp.dept}</span>
                    </td>
                    <td style={{ padding: '1.5rem' }}>
                      {isAdminAuthorized ? (
                        <span style={{ fontWeight: '600', color: getBorrowedAssetTag(emp.id) !== "None Assigned" ? '#b45309' : '#64748b' }}>
                          {getBorrowedAssetTag(emp.id)}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.88rem' }}>Access Restricted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 8: REPORTS */}
        {currentTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.75px', lineHeight: '1.2' }}>System Intelligence Reports</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Automated summary metrics data and asset trends optimization metrics.</p>
            </div>

            {analytics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                  <div style={{ backgroundColor: 'white', padding: '2.25rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ color: '#475569', fontWeight: '600', fontSize: '0.95rem' }}>Asset Utilization Rate</span>
                      <span style={{ fontSize: '1.25rem' }}>⚡</span>
                    </div>
                    <div style={{ fontSize: '2.75rem', fontWeight: '800', color: '#714B67', marginBottom: '0.5rem', letterSpacing: '-1px' }}>{analytics.utilization_rate}</div>
                    <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '8px', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: analytics.utilization_rate, backgroundColor: '#714B67', height: '100%' }}></div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'white', padding: '2.25rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ color: '#475569', fontWeight: '600', fontSize: '0.95rem' }}>Infrastructure Triage State</span>
                      <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                    </div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: analytics.system_health === 'Optimal' ? '#10b981' : '#d97706', marginBottom: '0.75rem' }}>
                      {analytics.system_health}
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: '1.4' }}>Health monitoring rating parameters.</p>
                  </div>

                  <div style={{ backgroundColor: 'white', padding: '2.25rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ color: '#475569', fontWeight: '600', fontSize: '0.95rem' }}>Asset Lifecycle Risk</span>
                      <span style={{ fontSize: '1.25rem' }}>📉</span>
                    </div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem' }}>Low Risk</div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: '1.4' }}>Automated depreciation metrics algorithm parameters.</p>
                  </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '700' }}>Current Inventory Allocation Signatures</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {Object.entries(analytics.breakdown).map(([status, count]) => (
                      <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                          <span style={{ fontWeight: '600', color: '#475569' }}>{status}</span>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>{count} pieces ({round((count / (assets.length || 1)) * 100, 1)}%)</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${(count / (assets.length || 1)) * 100}%`,
                            backgroundColor: status === 'Available' ? '#10b981' : status === 'Allocated' ? '#714B67' : status === 'Under Maintenance' ? '#d97706' : '#ef4444',
                            height: '100%'
                          }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '2rem 0' }}>Loading advanced operational summary metrics...</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

export default App;