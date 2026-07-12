import React, { useState, useEffect } from 'react';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');

  const [allocationForm, setAllocationForm] = useState({ asset_id: '', employee_id: '', expected_return_date: '' });
  const [bookingForm, setBookingForm] = useState({ asset_id: '', employee_id: '', start_time: '', end_time: '' });

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/assets')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load server data');
        return res.json();
      })
      .then((data) => setAssets(data))
      .catch((err) => {
        setError('Running in offline/local storage backup mode.');
        const cached = localStorage.getItem('cached_assets');
        if (cached) setAssets(JSON.parse(cached));
      });
  }, []);

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
      window.location.reload();
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
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", sans-serif', backgroundColor: '#f8fafc' }}>

      {/* MODERN BRANDED SIDEBAR */}
      <div style={{ width: '280px', backgroundColor: '#4c3245', color: 'white', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <div style={{ width: '36px', height: '36px', backgroundColor: '#a26b93', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>A</div>
          <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>AssetFlow <span style={{ fontSize: '0.8rem', color: '#a26b93', fontWeight: '400' }}>ERP</span></h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'assets', label: 'Asset Registry', icon: '📦' },
            { id: 'allocations', label: 'Allocations', icon: '🤝' },
            { id: 'bookings', label: 'Bookings', icon: '📅' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0.85rem 1rem',
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
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, padding: '2.5rem 3.5rem', overflowY: 'auto' }}>
        {error && (
          <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', fontWeight: '500' }}>
            {error}
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.5px' }}>Workspace Overview</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Real-time resource allocation and health analytics metrics.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem', marginBottom: '3rem' }}>
              <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '1.5rem' }}>📦</span>
                <h3 style={{ color: '#64748b', margin: '0.75rem 0 0.25rem 0', fontSize: '0.9rem', fontWeight: '500' }}>Total Managed Assets</h3>
                <p style={{ fontSize: '2.25rem', fontWeight: '800', margin: 0, color: '#4c3245' }}>{assets.length}</p>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '1.5rem' }}>🟢</span>
                <h3 style={{ color: '#64748b', margin: '0.75rem 0 0.25rem 0', fontSize: '0.9rem', fontWeight: '500' }}>Available Assets</h3>
                <p style={{ fontSize: '2.25rem', fontWeight: '800', margin: 0, color: '#10b981' }}>
                  {assets.filter(a => a.status === 'Available').length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSET REGISTRY CARDS */}
        {currentTab === 'assets' && (
          <div>
            <div style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.5px' }}>Enterprise Asset Registry</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Detailed tracking ledger of all company property hardware.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {assets.map((asset) => (
                <div key={asset.id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'between', transition: 'transform 0.2s', cursor: 'pointer' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '1rem', width: '100%' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' }}>{asset.tag}</span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: asset.status === 'Available' ? '#ecfdf5' : '#fef2f2',
                        color: asset.status === 'Available' ? '#059669' : '#dc2626',
                        marginLeft: 'auto'
                      }}>{asset.status}</span>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: '600', color: '#1e293b' }}>{asset.name}</h3>
                  </div>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1rem', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🛡️</span> {asset.is_bookable ? 'Shared Workspace Resource' : 'Assigned Individual Asset'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ALLOCATIONS FORM */}
        {currentTab === 'allocations' && (
          <div style={{ maxWidth: '580px', backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02), 0 4px 6px -4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>Asset Assignment Protocol</h1>
            <p style={{ margin: '0 0 2rem 0', color: '#64748b', fontSize: '0.9rem' }}>Provision physical inventory hardware securely with automated double-allocation block guards.</p>

            <form onSubmit={handleAllocate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: '#334155' }}>Select Targeted Asset</label>
                <select onChange={(e) => setAllocationForm({ ...allocationForm, asset_id: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem' }} required>
                  <option value="">-- Click to choose hardware --</option>
                  {assets.filter(a => !a.is_bookable).map(a => (
                    <option key={a.id} value={a.id}>{a.tag} - {a.name} ({a.status})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: '#334155' }}>Employee System ID</label>
                  <input type="number" placeholder="Ex: 2" onChange={(e) => setAllocationForm({ ...allocationForm, employee_id: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: '#334155' }}>Return Cutoff Date</label>
                  <input type="date" onChange={(e) => setAllocationForm({ ...allocationForm, expected_return_date: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                </div>
              </div>
              <button type="submit" style={{ backgroundColor: '#714B67', color: 'white', padding: '1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', marginTop: '1rem', boxShadow: '0 4px 6px rgba(113, 75, 103, 0.2)' }}>Authorize Allocation</button>
            </form>
          </div>
        )}

        {/* TAB 4: BOOKINGS FORM */}
        {currentTab === 'bookings' && (
          <div style={{ maxWidth: '580px', backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02), 0 4px 6px -4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>Shared Resource Time-Slot Booking</h1>
            <p style={{ margin: '0 0 2rem 0', color: '#64748b', fontSize: '0.9rem' }}>Schedule shared workspace zones without timeline overlaps.</p>

            <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: '#334155' }}>Select Shared Workspace Space</label>
                <select onChange={(e) => setBookingForm({ ...bookingForm, asset_id: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem' }} required>
                  <option value="">-- Choose target location --</option>
                  {assets.filter(a => a.is_bookable).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: '#334155' }}>Employee System ID</label>
                <input type="number" placeholder="Ex: 3" onChange={(e) => setBookingForm({ ...bookingForm, employee_id: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: '#334155' }}>Reservation Start Time</label>
                  <input type="datetime-local" onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.88rem', color: '#334155' }}>Reservation End Time</label>
                  <input type="datetime-local" onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} required />
                </div>
              </div>
              <button type="submit" style={{ backgroundColor: '#714B67', color: 'white', padding: '1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', marginTop: '1rem', boxShadow: '0 4px 6px rgba(113, 75, 103, 0.2)' }}>Reserve Secure Time Window</button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;