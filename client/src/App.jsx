import React, { useState, useEffect } from 'react';
import { api } from './api';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  
  // Auth Form states
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Core Entity states
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [audits, setAudits] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Search/Filter states
  const [assetQuery, setAssetQuery] = useState('');
  const [reportFilters, setReportFilters] = useState({ category: '', status: '', department: '' });

  // Creation/Transaction Forms states
  const [newAsset, setNewAsset] = useState({ name: '', category_id: '', is_bookable: false, serial_number: '', acquisition_date: '', acquisition_cost: '', condition: 'New', location: '' });
  const [allocationForm, setAllocationForm] = useState({ asset_id: '', employee_id: '', expected_return_date: '' });
  const [bookingForm, setBookingForm] = useState({ asset_id: '', employee_id: '', start_time: '', end_time: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ asset_id: '', description: '', priority: 'Medium' });
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '', head_id: '', parent_department_id: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', warranty_months: 24 });
  const [auditForm, setAuditForm] = useState({ department_id: '' });

  // Active / Detailed Sub-panels
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState({ allocations: [], maintenance: [] });
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [assignTechnicianId, setAssignTechnicianId] = useState(null);
  const [technicianName, setTechnicianName] = useState('');
  const [returnAssetId, setReturnAssetId] = useState(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [showTransferOffer, setShowTransferOffer] = useState(null); // holds asset data that is conflicted

  // Global Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all database registries
  const fetchAllData = async () => {
    try {
      const allAssets = await api.getAssets();
      setAssets(allAssets);

      const allDepts = await api.getDepartments();
      setDepartments(allDepts);

      const allCats = await api.getCategories();
      setCategories(allCats);

      const allEmps = await api.getEmployees();
      setEmployees(allEmps);

      const allTransfers = await api.getTransfers();
      setTransfers(allTransfers);

      const allBookings = await api.getBookings();
      setBookings(allBookings);

      const allTickets = await api.getMaintenance();
      setTickets(allTickets);

      const allAudits = await api.getAudits();
      setAudits(allAudits);

      const summary = await api.getReportsSummary();
      setAnalytics(summary);

      const listNotifs = await api.getNotifications();
      setNotifications(listNotifs);
    } catch (err) {
      setErrorMsg(err.message || 'Error connecting to AssetFlow API.');
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser]);

  // Flash Alerts
  const flashError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };
  const flashSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Auth operations
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      let res;
      if (authMode === 'login') {
        res = await api.login(authForm.email, authForm.password);
      } else {
        res = await api.signup(authForm.name, authForm.email, authForm.password);
      }
      localStorage.setItem('user', JSON.stringify(res.user));
      localStorage.setItem('token', res.token);
      setCurrentUser(res.user);
      flashSuccess('Welcome to AssetFlow ERP!');
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  // 1. Asset Registry Form
  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newAsset.name,
        category_id: parseInt(newAsset.category_id),
        is_bookable: newAsset.is_bookable,
        serial_number: newAsset.serial_number || null,
        acquisition_date: newAsset.acquisition_date || null,
        acquisition_cost: newAsset.acquisition_cost ? parseFloat(newAsset.acquisition_cost) : 0.0,
        condition: newAsset.condition || 'New',
        location: newAsset.location || null
      };
      await api.registerAsset(payload);
      flashSuccess(`Asset "${newAsset.name}" successfully registered.`);
      setNewAsset({ name: '', category_id: '', is_bookable: false, serial_number: '', acquisition_date: '', acquisition_cost: '', condition: 'New', location: '' });
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  // Open asset history panel
  const handleAssetClick = async (asset) => {
    setSelectedAsset(asset);
    try {
      const history = await api.getAssetHistory(asset.id);
      setAssetHistory(history);
    } catch (err) {
      flashError('Could not retrieve asset history.');
    }
  };

  // 2. Asset Allocation
  const handleAllocate = async (e) => {
    e.preventDefault();
    setShowTransferOffer(null);
    try {
      await api.allocateAsset({
        asset_id: parseInt(allocationForm.asset_id),
        employee_id: parseInt(allocationForm.employee_id),
        expected_return_date: allocationForm.expected_return_date
      });
      flashSuccess('Asset successfully allocated!');
      setAllocationForm({ asset_id: '', employee_id: '', expected_return_date: '' });
      fetchAllData();
    } catch (err) {
      // Check if it's a conflict to offer transfer request
      if (err.message.includes('Conflict')) {
        const assetObj = assets.find(a => a.id === parseInt(allocationForm.asset_id));
        setShowTransferOffer(assetObj);
      }
      flashError(err.message);
    }
  };

  // 3. Return Asset
  const handleReturnAsset = async (e) => {
    e.preventDefault();
    try {
      await api.returnAsset(returnAssetId, checkInNotes);
      flashSuccess('Asset successfully returned to inventory stock.');
      setReturnAssetId(null);
      setCheckInNotes('');
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  // 4. Request Transfer
  const triggerTransferRequest = async (assetId) => {
    try {
      await api.requestTransfer(assetId, currentUser?.id);
      flashSuccess('Transfer request submitted to the current asset holder.');
      setShowTransferOffer(null);
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  // 5. Action Transfer (Approve/Reject)
  const handleTransferAction = async (transferId, action) => {
    try {
      await api.actionTransfer(transferId, action);
      flashSuccess(`Transfer request ${action === 'Approve' ? 'approved' : 'rejected'}.`);
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  // 6. Booking
  const handleBooking = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking({
        asset_id: parseInt(bookingForm.asset_id),
        employee_id: parseInt(bookingForm.employee_id),
        start_time: new Date(bookingForm.start_time).toISOString(),
        end_time: new Date(bookingForm.end_time).toISOString()
      });
      flashSuccess('Workspace reservation scheduled successfully!');
      setBookingForm({ asset_id: '', employee_id: '', start_time: '', end_time: '' });
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await api.cancelBooking(bookingId);
      flashSuccess('Reservation cancelled.');
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  // 7. Maintenance
  const handleMaintenance = async (e) => {
    e.preventDefault();
    try {
      await api.raiseMaintenance({
        asset_id: parseInt(maintenanceForm.asset_id),
        description: maintenanceForm.description,
        priority: maintenanceForm.priority
      });
      flashSuccess('Maintenance ticket logged successfully.');
      setMaintenanceForm({ asset_id: '', description: '', priority: 'Medium' });
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  const handleMaintenanceAction = async (ticketId, action) => {
    try {
      await api.actionMaintenance(ticketId, action);
      flashSuccess(`Maintenance request ${action === 'Approve' ? 'approved and asset locked' : 'rejected'}.`);
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  const handleAssignTechnician = async (e) => {
    e.preventDefault();
    try {
      await api.assignMaintenance(assignTechnicianId, technicianName);
      flashSuccess('Technician assigned successfully.');
      setAssignTechnicianId(null);
      setTechnicianName('');
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  const handleResolveMaintenance = async (ticketId) => {
    try {
      await api.resolveMaintenance(ticketId);
      flashSuccess('Maintenance ticket resolved. Asset released back to Available fleet.');
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  // 8. Audits
  const handleStartAudit = async (e) => {
    e.preventDefault();
    try {
      await api.startAudit(parseInt(auditForm.department_id));
      flashSuccess('Audit compliance cycle successfully opened.');
      setAuditForm({ department_id: '' });
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  const handleVerifyAsset = async (auditId, assetId, condition) => {
    try {
      await api.verifyAuditAsset(auditId, assetId, condition);
      flashSuccess(`Asset verified as ${condition}.`);
      fetchAllData();
      // Keep audit selection updated
      const updatedAudits = await api.getAudits();
      setAudits(updatedAudits);
      const cur = updatedAudits.find(a => a.id === auditId);
      if (cur) setSelectedAudit(cur);
    } catch (err) {
      flashError(err.message);
    }
  };

  const handleCloseAudit = async (auditId) => {
    try {
      await api.closeAudit(auditId);
      flashSuccess('Audit cycle closed and locked. All missing assets flagged as Lost.');
      setSelectedAudit(null);
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  // 9. Org Settings Setup (Admin only)
  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await api.createDepartment({
        name: departmentForm.name,
        code: departmentForm.code,
        head_id: departmentForm.head_id ? parseInt(departmentForm.head_id) : null,
        parent_department_id: departmentForm.parent_department_id ? parseInt(departmentForm.parent_department_id) : null
      });
      flashSuccess(`Department "${departmentForm.name}" created successfully.`);
      setDepartmentForm({ name: '', code: '', head_id: '', parent_department_id: '' });
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api.createCategory({
        name: categoryForm.name,
        warranty_months: parseInt(categoryForm.warranty_months)
      });
      flashSuccess(`Category "${categoryForm.name}" created successfully.`);
      setCategoryForm({ name: '', warranty_months: 24 });
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  const handleRolePromotion = async (userId, role) => {
    try {
      await api.promoteEmployee(userId, role);
      flashSuccess(`Employee role updated to ${role}.`);
      fetchAllData();
    } catch (err) {
      flashError(err.message);
    }
  };

  // 10. CSV Export
  const handleExportCSV = async () => {
    try {
      const res = await api.exportReportsCSV();
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `AssetFlow_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      flashSuccess('CSV report downloaded successfully.');
    } catch {
      flashError('Failed to generate CSV export.');
    }
  };

  // Filtering helpers
  const filteredAssets = assets.filter(a =>
    a.name.toLowerCase().includes(assetQuery.toLowerCase()) ||
    a.tag.toLowerCase().includes(assetQuery.toLowerCase()) ||
    (a.serial_number && a.serial_number.toLowerCase().includes(assetQuery.toLowerCase()))
  );

  const reportFilteredAssets = assets.filter(a => {
    if (reportFilters.category && a.category !== reportFilters.category) return false;
    if (reportFilters.status && a.status !== reportFilters.status) return false;
    return true;
  });

  // Auth screen
  if (!currentUser) {
    return (
      <div className="auth-container">
        <style dangerouslySetInnerHTML={{ __html: `
          .auth-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #4c3245 0%, #1e1b29 100%);
            font-family: 'Inter', sans-serif;
            color: #fff;
          }
          .auth-card {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 3rem;
            border-radius: 24px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
          }
          .auth-logo {
            width: 50px;
            height: 50px;
            background: #a26b93;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 1.5rem;
            margin: 0 auto 1.5rem;
            color: #fff;
          }
          .auth-title {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }
          .auth-subtitle {
            color: #d2c4ce;
            font-size: 0.95rem;
            margin-bottom: 2rem;
          }
          .auth-input-group {
            text-align: left;
            margin-bottom: 1.25rem;
          }
          .auth-label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #e6d5e1;
          }
          .auth-input {
            width: 100%;
            padding: 0.85rem 1rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            color: #fff;
            font-size: 0.95rem;
            box-sizing: border-box;
          }
          .auth-input:focus {
            outline: none;
            border-color: #a26b93;
            box-shadow: 0 0 0 3px rgba(162, 107, 147, 0.2);
          }
          .auth-btn {
            width: 100%;
            padding: 1rem;
            background: #a26b93;
            border: none;
            border-radius: 12px;
            color: #fff;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 1rem;
            box-shadow: 0 4px 10px rgba(162, 107, 147, 0.3);
          }
          .auth-btn:hover {
            background: #b57fa6;
            transform: translateY(-1px);
          }
          .auth-toggle {
            margin-top: 1.5rem;
            font-size: 0.9rem;
            color: #d2c4ce;
          }
          .auth-toggle-link {
            color: #a26b93;
            cursor: pointer;
            font-weight: 600;
            text-decoration: underline;
          }
          .auth-error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid #ef4444;
            color: #fca5a5;
            padding: 0.75rem;
            border-radius: 10px;
            font-size: 0.9rem;
            margin-bottom: 1.25rem;
            text-align: left;
          }
        `}} />
        <div className="auth-card">
          <div className="auth-logo">A</div>
          <h2 className="auth-title">AssetFlow ERP</h2>
          <p className="auth-subtitle">
            {authMode === 'login' ? 'Access your organization ledger' : 'Register a new employee file'}
          </p>

          {authError && <div className="auth-error">{authError}</div>}

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <div className="auth-input-group">
                <label className="auth-label">Full Name</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Priyan Sharma"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="auth-input-group">
              <label className="auth-label">Corporate Email</label>
              <input
                type="email"
                className="auth-input"
                placeholder="e.g. employee@odoo.com"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                required
              />
            </div>
            <div className="auth-input-group">
              <label className="auth-label">Credentials Password</label>
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="auth-btn">
              {authMode === 'login' ? 'Authenticate Login' : 'Register Account'}
            </button>
          </form>

          <p className="auth-toggle">
            {authMode === 'login' ? "New here? " : "Already registered? "}
            <span
              className="auth-toggle-link"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError('');
              }}
            >
              {authMode === 'login' ? "Create an account" : "Sign In instead"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Dashboard layout
  return (
    <div className="workspace-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .workspace-container {
          display: flex;
          min-height: 100vh;
          font-family: "Inter", "Segoe UI", sans-serif;
          background-color: #f8fafc;
          color: #1e293b;
        }
        
        /* SIDEBAR */
        .sidebar {
          width: 280px;
          min-width: 280px;
          background-color: #4c3245;
          color: white;
          padding: 2.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 20px rgba(0,0,0,0.05);
          box-sizing: border-box;
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 3.5rem;
        }
        .sidebar-logo {
          width: 38px;
          height: 38px;
          background-color: #a26b93;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.3rem;
        }
        .sidebar-title {
          font-size: 1.4rem;
          margin: 0;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .sidebar-links {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          flex: 1;
        }
        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.9rem 1.25rem;
          text-align: left;
          background: none;
          color: #d2c4ce;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          font-size: 0.95rem;
          width: 100%;
        }
        .sidebar-btn.active, .sidebar-btn:hover {
          background: rgba(255,255,255,0.15);
          color: #ffffff;
        }
        
        .sidebar-user {
          margin-top: auto;
          background: rgba(0, 0, 0, 0.15);
          padding: 1rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          background: #a26b93;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #fff;
        }
        .user-info {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-size: 0.75rem;
          color: #d2c4ce;
          margin: 0;
        }
        .logout-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 0.25rem;
        }

        /* VIEWPORT */
        .viewport {
          flex: 1;
          padding: 3rem 4rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          box-sizing: border-box;
          max-height: 100vh;
        }
        
        .view-title-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .view-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.75px;
        }
        .view-subtitle {
          margin: 0;
          color: #64748b;
          font-size: 1rem;
        }

        /* METRICS GRID */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        .metric-card {
          background: white;
          padding: 1.5rem;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .metric-icon {
          font-size: 1.75rem;
        }
        .metric-label {
          color: #64748b;
          margin: 0.5rem 0 0.25rem 0;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .metric-value {
          font-size: 2rem;
          font-weight: 800;
          margin: 0;
          color: #4c3245;
        }

        /* PANELS */
        .panel {
          background: white;
          padding: 2rem;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .panel-title {
          margin: 0 0 1.25rem 0;
          color: #1e293b;
          font-size: 1.15rem;
          font-weight: 700;
        }

        /* ALERTS */
        .alert-error {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #b91c1c;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 500;
          margin-bottom: 1.5rem;
        }
        .alert-success {
          background-color: #f0fdf4;
          border-left: 4px solid #16a34a;
          color: #15803d;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 500;
          margin-bottom: 1.5rem;
        }

        /* CARDS GRID */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }
        .asset-card {
          background: white;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .asset-card:hover {
          transform: translateY(-2px);
          border-color: #a26b93;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .tag-badge {
          font-family: monospace;
          font-weight: 700;
          color: #64748b;
          background: #f1f5f9;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
        }
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-badge.available { background: #ecfdf5; color: #059669; }
        .status-badge.allocated { background: #eff6ff; color: #1d4ed8; }
        .status-badge.maintenance { background: #fffbeb; color: #b45309; }
        .status-badge.lost { background: #fef2f2; color: #dc2626; }
        .card-title {
          margin: 0 0 0.5rem 0;
          font-size: 1.15rem;
          color: #1e293b;
        }

        /* TABLES */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .data-table th {
          background: #f8fafc;
          padding: 1rem;
          color: #475569;
          font-weight: 600;
          font-size: 0.9rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.95rem;
        }
        .data-table tr:hover td {
          background: #f8fafc;
        }

        /* FORMS */
        .form-group {
          margin-bottom: 1.25rem;
          text-align: left;
        }
        .form-label {
          display: block;
          font-size: 0.88rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #334155;
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.95rem;
          box-sizing: border-box;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #4c3245;
          box-shadow: 0 0 0 3px rgba(76, 50, 69, 0.1);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        /* BUTTONS */
        .btn {
          background: #714B67;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px rgba(113, 75, 103, 0.15);
        }
        .btn:hover {
          background: #5d3d54;
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: #e2e8f0;
          color: #475569;
          box-shadow: none;
        }
        .btn-secondary:hover {
          background: #cbd5e1;
        }
        .btn-danger {
          background: #ef4444;
          box-shadow: 0 4px 6px rgba(239, 68, 68, 0.15);
        }
        .btn-danger:hover {
          background: #dc2626;
        }

        /* MODAL / OVERLAY PANELS */
        .overlay-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 440px;
          height: 100vh;
          background: white;
          box-shadow: -10px 0 30px rgba(0,0,0,0.1);
          z-index: 100;
          padding: 2.5rem;
          box-sizing: border-box;
          overflow-y: auto;
          border-left: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .overlay-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.3);
          z-index: 99;
        }
        .close-overlay {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          align-self: flex-start;
          color: #64748b;
        }

        /* SUBTABS inside views */
        .subtabs {
          display: flex;
          gap: 1rem;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 1.5rem;
        }
        .subtab-btn {
          background: none;
          border: none;
          padding: 0.75rem 1rem;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }
        .subtab-btn.active {
          color: #714B67;
          border-bottom-color: #714B67;
        }

        /* LIVE ACTIVITY */
        .activity-item {
          display: flex;
          gap: 12px;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-radius: 10px;
          border-left: 4px solid #a26b93;
          font-size: 0.9rem;
          line-height: 1.4;
        }
        .activity-time {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
          min-width: 65px;
        }
      `}} />

      {/* SIDEBAR PANEL */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">A</div>
          <h2 className="sidebar-title">AssetFlow ERP</h2>
        </div>

        <div className="sidebar-links">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'assets', label: 'Asset Registry', icon: '📦' },
            { id: 'allocations', label: 'Allocations & Transfers', icon: '🤝' },
            { id: 'bookings', label: 'Resource Bookings', icon: '📅' },
            { id: 'maintenance', label: 'Maintenance Log', icon: '🛠️' },
            { id: 'audits', label: 'Inventory Audits', icon: '🔍' },
            { id: 'reports', label: 'Reports & Analytics', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`sidebar-btn ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => setCurrentTab(tab.id)}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}

          {currentUser?.role === 'Admin' && (
            <button
              className={`sidebar-btn ${currentTab === 'orgsetup' ? 'active' : ''}`}
              onClick={() => setCurrentTab('orgsetup')}
            >
              <span>⚙️</span> Org Settings Setup
            </button>
          )}
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{(currentUser?.name || 'U').charAt(0)}</div>
          <div className="user-info">
            <h4 className="user-name">{currentUser?.name || 'User'}</h4>
            <p className="user-role">{currentUser?.role || 'Employee'} • {currentUser?.email || ''}</p>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sign Out">
            🚪
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT INTERFACE AREA */}
      <div className="viewport">
        {errorMsg && <div className="alert-error">{errorMsg}</div>}
        {successMsg && <div className="alert-success">{successMsg}</div>}

        {/* -------------------- VIEW 1: DASHBOARD -------------------- */}
        {currentTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="view-title-wrap">
              <div>
                <h1 className="view-title">Workspace Dashboard</h1>
                <p className="view-subtitle">Real-time resource utilization and inventory diagnostic metrics.</p>
              </div>
            </div>

            {analytics && (
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">📦</div>
                  <div className="metric-label">Total Assets</div>
                  <div className="metric-value">{assets.length}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">🟢</div>
                  <div className="metric-label">Available Fleet</div>
                  <div className="metric-value">{analytics.breakdown.Available}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">🛠️</div>
                  <div className="metric-label">In Maintenance</div>
                  <div className="metric-value">{analytics.breakdown["Under Maintenance"]}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">🚨</div>
                  <div className="metric-label">Flagged Lost</div>
                  <div className="metric-value">{analytics.breakdown["Lost/Missing"]}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">⚡</div>
                  <div className="metric-label">Utilization Rate</div>
                  <div className="metric-value">{analytics.utilization_rate}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem' }}>
              <div className="panel">
                <h3 className="panel-title">⚡ Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div
                    style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                    onClick={() => setCurrentTab('assets')}
                  >
                    <h4>➕ Register Asset</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Add new physical devices to the ledger database.</p>
                  </div>
                  <div
                    style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                    onClick={() => setCurrentTab('bookings')}
                  >
                    <h4>📅 Book shared workspace</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Reserve facility rooms or conference slots.</p>
                  </div>
                  <div
                    style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                    onClick={() => setCurrentTab('maintenance')}
                  >
                    <h4>🛠️ Log Defective Hardware</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>File troubleshooting diagnostics requests.</p>
                  </div>
                  <div
                    style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                    onClick={() => setCurrentTab('allocations')}
                  >
                    <h4>🤝 Allocate Assets</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Assign available items to employee files.</p>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ display: 'flex', flexDirection: 'column', maxHeight: '400px' }}>
                <h3 className="panel-title">🔔 Operational Audit Trail</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
                  {notifications.map(n => (
                    <div className="activity-item" key={n.id}>
                      <span className="activity-time">{n.timestamp.split(' ')[1] || n.timestamp}</span>
                      <span>{n.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 2: ASSET REGISTRY -------------------- */}
        {currentTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="view-title-wrap">
              <div>
                <h1 className="view-title">Enterprise Asset Registry</h1>
                <p className="view-subtitle">Centrally audit and search details, location logs, and status transitions.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Search ledger by Tag, Name, Serial Number..."
                  value={assetQuery}
                  onChange={(e) => setAssetQuery(e.target.value)}
                />
                
                <div className="cards-grid">
                  {filteredAssets.map(asset => (
                    <div className="asset-card" key={asset.id} onClick={() => handleAssetClick(asset)}>
                      <div className="card-header">
                        <span className="tag-badge">{asset.tag}</span>
                        <span className={`status-badge ${asset.status.toLowerCase().replace(' ', '')}`}>
                          {asset.status}
                        </span>
                      </div>
                      <h4 className="card-title">{asset.name}</h4>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {asset.is_bookable ? '📅 Shared Resource' : `👤 ${asset.assigned_to || 'Unassigned'}`}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                        📍 {asset.location || 'Unknown Location'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* REGISTER NEW ASSET PANEL */}
              <div className="panel">
                <h3 className="panel-title">➕ Register Asset</h3>
                <form onSubmit={handleCreateAsset}>
                  <div className="form-group">
                    <label className="form-label">Asset Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      placeholder="e.g. MacBook Pro, Conference Display"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={newAsset.category_id}
                      onChange={(e) => setNewAsset({ ...newAsset, category_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Resource Type</label>
                    <select
                      className="form-select"
                      value={newAsset.is_bookable ? "true" : "false"}
                      onChange={(e) => setNewAsset({ ...newAsset, is_bookable: e.target.value === "true" })}
                    >
                      <option value="false">Individual Assigned Asset</option>
                      <option value="true">Shared Bookable Space/Resource</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newAsset.serial_number}
                      onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                      placeholder="e.g. SN12345678"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Acquisition Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={newAsset.acquisition_cost}
                        onChange={(e) => setNewAsset({ ...newAsset, acquisition_cost: e.target.value })}
                        placeholder="2499.00"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Acquisition Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={newAsset.acquisition_date}
                        onChange={(e) => setNewAsset({ ...newAsset, acquisition_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Condition</label>
                      <select
                        className="form-select"
                        value={newAsset.condition}
                        onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
                      >
                        <option value="New">New</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Damaged">Damaged</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-input"
                        value={newAsset.location}
                        onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                        placeholder="e.g. Floor 2 Desk A"
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn" style={{ width: '100%' }}>Register Asset</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 3: ALLOCATIONS & TRANSFERS -------------------- */}
        {currentTab === 'allocations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="view-title-wrap">
              <div>
                <h1 className="view-title">Asset Assignment & Transfers</h1>
                <p className="view-subtitle">Allocate available stock, process returns, or request internal asset transfers.</p>
              </div>
            </div>

            {showTransferOffer && (
              <div className="alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <strong>Conflict Alert!</strong> The asset "{showTransferOffer.name}" is currently held by another user.
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => triggerTransferRequest(showTransferOffer.id)}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                >
                  🚀 Request Transfer
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* ACTIVE ALLOCATIONS */}
                <div className="panel">
                  <h3 className="panel-title">🤝 Active Organizational Assignments</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Asset Tag</th>
                        <th>Asset Name</th>
                        <th>Assigned User</th>
                        <th>Return Deadline</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.filter(a => a.status === 'Allocated').map(a => (
                        <tr key={a.id}>
                          <td><strong>{a.tag}</strong></td>
                          <td>{a.name}</td>
                          <td>{a.assigned_to}</td>
                          <td>Active</td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                              onClick={() => { setReturnAssetId(a.id); setCheckInNotes(''); }}
                            >
                              🔙 Return
                            </button>
                          </td>
                        </tr>
                      ))}
                      {assets.filter(a => a.status === 'Allocated').length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                            No active individual allocations.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TRANSFER QUEUE */}
                <div className="panel">
                  <h3 className="panel-title">🔄 Pending Transfer Requests</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Asset Tag</th>
                        <th>Requester</th>
                        <th>Current Holder</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map(t => (
                        <tr key={t.id}>
                          <td><strong>{t.asset_tag}</strong> - {t.asset_name}</td>
                          <td>{t.requester}</td>
                          <td>{t.holder}</td>
                          <td>
                            <span style={{
                              fontWeight: 600,
                              color: t.status === 'Approved' ? '#16a34a' : t.status === 'Rejected' ? '#dc2626' : '#d97706'
                            }}>{t.status}</span>
                          </td>
                          <td>
                            {t.status === 'Pending' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleTransferAction(t.id, 'Approve')}>Approve</button>
                                <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleTransferAction(t.id, 'Reject')}>Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {transfers.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                            No internal transfers requested.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ALLOCATION FORM */}
              <div className="panel">
                <h3 className="panel-title">🤝 Initiate Asset Allocation</h3>
                <form onSubmit={handleAllocate}>
                  <div className="form-group">
                    <label className="form-label">Select Available Asset</label>
                    <select
                      className="form-select"
                      value={allocationForm.asset_id}
                      onChange={(e) => setAllocationForm({ ...allocationForm, asset_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Asset --</option>
                      {assets.filter(a => !a.is_bookable).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.tag} - {a.name} [{a.status}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Allocate To Employee</label>
                    <select
                      className="form-select"
                      value={allocationForm.employee_id}
                      onChange={(e) => setAllocationForm({ ...allocationForm, employee_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Staff Member --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} (Role: {emp.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Return Deadline</label>
                    <input
                      type="date"
                      className="form-input"
                      value={allocationForm.expected_return_date}
                      onChange={(e) => setAllocationForm({ ...allocationForm, expected_return_date: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>Authorize Assignment</button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- VIEW 4: BOOKINGS -------------------- */}
        {currentTab === 'bookings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="view-title-wrap">
              <div>
                <h1 className="view-title">Shared Resources & Facility Bookings</h1>
                <p className="view-subtitle">Schedule and book company assets/rooms without schedule overlaps.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
              <div className="panel">
                <h3 className="panel-title">📅 Workspace Booking Schedule</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reserved Facility</th>
                      <th>Booked By</th>
                      <th>Time Frame</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td><strong>{b.asset_name}</strong></td>
                        <td>{b.employee_name}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {new Date(b.start_time).toLocaleString()} <br/>to <br/>{new Date(b.end_time).toLocaleString()}
                        </td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: b.status === 'Cancelled' ? '#fee2e2' : '#dcfce7',
                            color: b.status === 'Cancelled' ? '#ef4444' : '#16a34a'
                          }}>{b.status}</span>
                        </td>
                        <td>
                          {b.status === 'Upcoming' && (
                            <button
                              className="btn btn-danger"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                              onClick={() => handleCancelBooking(b.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                          No reservations logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <h3 className="panel-title">📅 Reserve Workspace</h3>
                <form onSubmit={handleBooking}>
                  <div className="form-group">
                    <label className="form-label">Choose Shared Resource</label>
                    <select
                      className="form-select"
                      value={bookingForm.asset_id}
                      onChange={(e) => setBookingForm({ ...bookingForm, asset_id: e.target.value })}
                      required
                    >
                      <option value="">-- Select Space --</option>
                      {assets.filter(a => a.is_bookable).map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.location})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Employee ID Reference</label>
                    <select
                      className="form-select"
                      value={bookingForm.employee_id}
                      onChange={(e) => setBookingForm({ ...bookingForm, employee_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={bookingForm.start_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={bookingForm.end_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>Schedule Slot</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 5: MAINTENANCE -------------------- */}
        {currentTab === 'maintenance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="view-title-wrap">
              <div>
                <h1 className="view-title">Maintenance Diagnostics</h1>
                <p className="view-subtitle">Request diagnostics work, allocate technicians, and log hardware triage repairs.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
              <div className="panel">
                <h3 className="panel-title">🛠️ Active Maintenance Approval Tickets</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Device Tag</th>
                      <th>Diagnostics Description</th>
                      <th>Priority</th>
                      <th>Ticket Status</th>
                      <th>Technician</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t.id}>
                        <td><strong>{t.asset_tag}</strong> <br/>{t.asset_name}</td>
                        <td>{t.description}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                            backgroundColor: t.priority === 'Urgent' ? '#fee2e2' : '#f1f5f9',
                            color: t.priority === 'Urgent' ? '#ef4444' : '#475569'
                          }}>{t.priority}</span>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: t.status === 'Resolved' ? '#16a34a' : t.status === 'Rejected' ? '#dc2626' : '#d97706'
                          }}>{t.status}</span>
                        </td>
                        <td>{t.technician_name || 'Unassigned'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column' }}>
                            {t.status === 'Pending' && (currentUser?.role === 'Admin' || currentUser?.role === 'Asset Manager') && (
                              <>
                                <button className="btn" style={{ padding: '0.35rem', fontSize: '0.8rem' }} onClick={() => handleMaintenanceAction(t.id, 'Approve')}>Approve</button>
                                <button className="btn btn-danger" style={{ padding: '0.35rem', fontSize: '0.8rem' }} onClick={() => handleMaintenanceAction(t.id, 'Reject')}>Reject</button>
                              </>
                            )}
                            {t.status === 'Approved' && (currentUser?.role === 'Admin' || currentUser?.role === 'Asset Manager') && (
                              <button className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.8rem' }} onClick={() => setAssignTechnicianId(t.id)}>Assign Tech</button>
                            )}
                            {t.status === 'In Progress' && (
                              <button className="btn" style={{ padding: '0.35rem', fontSize: '0.8rem', backgroundColor: '#3b82f6' }} onClick={() => handleResolveMaintenance(t.id)}>Complete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                          No diagnostics tickets raised.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <h3 className="panel-title">🛠️ Report Defective Hardware</h3>
                <form onSubmit={handleMaintenance}>
                  <div className="form-group">
                    <label className="form-label">Select Defective Device</label>
                    <select
                      className="form-select"
                      value={maintenanceForm.asset_id}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, asset_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Asset --</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.tag} - {a.name} [{a.status}]</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Triage Priority</label>
                    <select
                      className="form-select"
                      value={maintenanceForm.priority}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fault Description Details</label>
                    <textarea
                      rows="4"
                      className="form-textarea"
                      placeholder="Details of hardware component fault..."
                      value={maintenanceForm.description}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>File Ticket</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 6: AUDITS -------------------- */}
        {currentTab === 'audits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="view-title-wrap">
              <div>
                <h1 className="view-title">Compliance Verification Cycles</h1>
                <p className="view-subtitle">Review audits, physical check status updates, and isolate compliance discrepancies.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2.5rem', alignItems: 'start' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* TRIGGER AUDIT */}
                <div className="panel">
                  <h3 className="panel-title">🚀 Start Compliance Audit</h3>
                  <form onSubmit={handleStartAudit}>
                    <div className="form-group">
                      <label className="form-label">Target Audit Department</label>
                      <select
                        className="form-select"
                        value={auditForm.department_id}
                        onChange={(e) => setAuditForm({ ...auditForm, department_id: e.target.value })}
                        required
                      >
                        <option value="">-- Choose Department --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn" style={{ width: '100%' }}>Launch Audit Cycle</button>
                  </form>
                </div>

                {/* AUDITS CYCLES LIST */}
                <div className="panel">
                  <h3 className="panel-title">🔍 Verification Cycles</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {audits.map(a => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAudit(a)}
                        style={{
                          backgroundColor: 'white',
                          padding: '1.25rem',
                          borderRadius: '16px',
                          border: selectedAudit?.id === a.id ? '2px solid #714B67' : '1px solid #e2e8f0',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', justifycontent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong>Audit Ref #{a.id} - {a.department}</strong>
                          <span style={{
                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: a.status === 'Closed' ? '#f1f5f9' : '#dcfce7',
                            color: a.status === 'Closed' ? '#475569' : '#16a34a'
                          }}>{a.status}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Verified: {a.verified_count} | Discrepancies: <span style={{ color: '#dc2626', fontWeight: 700 }}>{a.discrepancies}</span>
                        </p>
                      </div>
                    ))}
                    {audits.length === 0 && (
                      <p style={{ fontStyle: 'italic', color: '#64748b' }}>No audit cycles opened.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* AUDIT CHECKLIST CONTROLS */}
              <div className="panel">
                {selectedAudit ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 className="panel-title" style={{ margin: 0 }}>Reviewing Cycle Audit #{selectedAudit.id}</h3>
                      {selectedAudit.status === 'Active' && (
                        <button className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => handleCloseAudit(selectedAudit.id)}>
                          🔒 Close & Lock Cycle
                        </button>
                      )}
                    </div>
                    
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                      Verify condition of all organization hardware devices manually. Closing this cycle updates any unresolved missing items to "Lost".
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {assets.map(asset => (
                        <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <span className="tag-badge" style={{ marginRight: '0.5rem' }}>{asset.tag}</span>
                            <strong>{asset.name}</strong>
                          </div>
                          {selectedAudit.status === 'Active' ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#10b981' }} onClick={() => handleVerifyAsset(selectedAudit.id, asset.id, 'Verified')}>Verify</button>
                              <button className="btn btn-danger" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#ef4444' }} onClick={() => handleVerifyAsset(selectedAudit.id, asset.id, 'Missing')}>Missing</button>
                              <button className="btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#d97706' }} onClick={() => handleVerifyAsset(selectedAudit.id, asset.id, 'Damaged')}>Damaged</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Locked (Cycle Closed)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                    Select an active or closed compliance check cycle to run auditor verification controls.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* -------------------- VIEW 7: ORG SETUP (ADMIN ONLY) -------------------- */}
        {currentTab === 'orgsetup' && currentUser?.role === 'Admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="view-title-wrap">
              <div>
                <h1 className="view-title">Corporate Master Configurations</h1>
                <p className="view-subtitle">Admin parameters for organizational hierarchies, device categories, and employee directory clearances.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2.5rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* NEW DEPT */}
                <div className="panel">
                  <h3 className="panel-title">🏢 Create Department</h3>
                  <form onSubmit={handleCreateDept}>
                    <div className="form-group">
                      <label className="form-label">Department Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Research & Dev"
                        value={departmentForm.name}
                        onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unique Code</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. RAD"
                        value={departmentForm.code}
                        onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department Head ID (Optional)</label>
                      <select
                        className="form-select"
                        value={departmentForm.head_id}
                        onChange={(e) => setDepartmentForm({ ...departmentForm, head_id: e.target.value })}
                      >
                        <option value="">-- Choose Head --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn" style={{ width: '100%' }}>Create Department</button>
                  </form>
                </div>

                {/* NEW CATEGORY */}
                <div className="panel">
                  <h3 className="panel-title">🏷️ Create Asset Category</h3>
                  <form onSubmit={handleCreateCategory}>
                    <div className="form-group">
                      <label className="form-label">Category Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Mobile Phones, Monitors"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Warranty Expiry (Months)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={categoryForm.warranty_months}
                        onChange={(e) => setCategoryForm({ ...categoryForm, warranty_months: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="btn" style={{ width: '100%' }}>Create Category</button>
                  </form>
                </div>
              </div>

              {/* EMPLOYEE DIRECTORY & ROLE ASSIGNMENTS */}
              <div className="panel">
                <h3 className="panel-title">👥 Employee Registry & Role Approvals</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Staff ID</th>
                      <th>Name</th>
                      <th>Email Address</th>
                      <th>Department Unit</th>
                      <th>Clearance Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td><strong>#{emp.id}</strong></td>
                        <td>{emp.name}</td>
                        <td>{emp.email}</td>
                        <td>{emp.dept || 'Operations'}</td>
                        <td>
                          <select
                            className="form-select"
                            style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                            value={emp.role}
                            onChange={(e) => handleRolePromotion(emp.id, e.target.value)}
                          >
                            <option value="Employee">Employee</option>
                            <option value="Department Head">Department Head</option>
                            <option value="Asset Manager">Asset Manager</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- VIEW 8: REPORTS & ANALYTICS -------------------- */}
        {currentTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div className="view-title-wrap">
              <div>
                <h1 className="view-title">Enterprise System Intelligence</h1>
                <p className="view-subtitle">Filter diagnostic registers, monitor depreciation rates, and export CSV ledger logs.</p>
              </div>
              <button className="btn" onClick={handleExportCSV}>📥 Export Complete CSV Report</button>
            </div>

            {analytics && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
                
                <div className="panel">
                  <h3 className="panel-title">📊 Structured Query Report Builder</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <select
                      className="form-select"
                      value={reportFilters.category}
                      onChange={(e) => setReportFilters({ ...reportFilters, category: e.target.value })}
                    >
                      <option value="">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <select
                      className="form-select"
                      value={reportFilters.status}
                      onChange={(e) => setReportFilters({ ...reportFilters, status: e.target.value })}
                    >
                      <option value="">All Statuses</option>
                      <option value="Available">Available</option>
                      <option value="Allocated">Allocated</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tag</th>
                        <th>Asset Name</th>
                        <th>Category</th>
                        <th>Condition</th>
                        <th>Status</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportFilteredAssets.map(a => (
                        <tr key={a.id}>
                          <td><strong>{a.tag}</strong></td>
                          <td>{a.name}</td>
                          <td>{a.category}</td>
                          <td>{a.condition}</td>
                          <td>{a.status}</td>
                          <td>{a.location || 'Unknown'}</td>
                        </tr>
                      ))}
                      {reportFilteredAssets.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                            No assets matching selection parameters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="panel">
                  <h3 className="panel-title">🛡️ Fleet Status Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {Object.entries(analytics.breakdown).map(([status, count]) => {
                      const percentage = assets.length > 0 ? (count / assets.length) * 100 : 0;
                      return (
                        <div key={status}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            <strong>{status}</strong>
                            <span>{count} items ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              background: status === 'Available' ? '#10b981' : status === 'Allocated' ? '#3b82f6' : status === 'Under Maintenance' ? '#f59e0b' : '#ef4444',
                              width: `${percentage}%`,
                              height: '100%'
                            }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* DETAILED ASSET HISTORY OVERLAY PANEL */}
      {selectedAsset && (
        <>
          <div className="overlay-bg" onClick={() => setSelectedAsset(null)}></div>
          <div className="overlay-panel">
            <button className="close-overlay" onClick={() => setSelectedAsset(null)}>✕</button>
            
            <div>
              <span className="tag-badge" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>{selectedAsset.tag}</span>
              <h2 style={{ marginTop: '1rem', fontSize: '1.6rem', color: '#0f172a' }}>{selectedAsset.name}</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Category: {selectedAsset.category || 'N/A'}</p>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#1e293b' }}>Hardware Profile Attributes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem', color: '#475569' }}>
                <div><strong>Serial Number:</strong> {selectedAsset.serial_number || 'N/A'}</div>
                <div><strong>Acquisition Cost:</strong> ${selectedAsset.acquisition_cost || '0.00'}</div>
                <div><strong>Acquisition Date:</strong> {selectedAsset.acquisition_date || 'N/A'}</div>
                <div><strong>Current Condition:</strong> {selectedAsset.condition || 'New'}</div>
                <div><strong>Location Site:</strong> {selectedAsset.location || 'N/A'}</div>
              </div>
            </div>

            <div>
              <h3 className="panel-title" style={{ fontSize: '1.1rem' }}>🤝 Allocation Logs History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {assetHistory.allocations.map((a, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <div>Assigned to <strong>{a.employee}</strong> on {a.created_at}</div>
                    {a.check_in_notes && <div style={{ color: '#64748b', marginTop: '0.25rem', fontStyle: 'italic' }}>Notes: "{a.check_in_notes}"</div>}
                  </div>
                ))}
                {assetHistory.allocations.length === 0 && <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#94a3b8' }}>No assignment history.</p>}
              </div>
            </div>

            <div>
              <h3 className="panel-title" style={{ fontSize: '1.1rem' }}>🛠️ Maintenance Logs History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {assetHistory.maintenance.map((m, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <div><strong>[{m.priority}]</strong> {m.description}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Status: {m.status} {m.technician_name && `(Tech: ${m.technician_name})`}
                    </div>
                  </div>
                ))}
                {assetHistory.maintenance.length === 0 && <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#94a3b8' }}>No diagnostics history.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ASSIGN TECHNICIAN OVERLAY PROMPT */}
      {assignTechnicianId && (
        <>
          <div className="overlay-bg" onClick={() => setAssignTechnicianId(null)}></div>
          <div className="overlay-panel" style={{ height: 'auto', top: '25%', left: '50%', transform: 'translate(-50%, -25%)', borderRadius: '24px', position: 'fixed' }}>
            <button className="close-overlay" onClick={() => setAssignTechnicianId(null)}>✕</button>
            <h3 className="panel-title">🛠️ Assign Service Technician</h3>
            <form onSubmit={handleAssignTechnician}>
              <div className="form-group">
                <label className="form-label">Technician Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn" style={{ width: '100%' }}>Assign and Start Repairs</button>
            </form>
          </div>
        </>
      )}

      {/* RETURN DIAGNOSTICS NOTES PROMPT */}
      {returnAssetId && (
        <>
          <div className="overlay-bg" onClick={() => setReturnAssetId(null)}></div>
          <div className="overlay-panel" style={{ height: 'auto', top: '25%', left: '50%', transform: 'translate(-50%, -25%)', borderRadius: '24px', position: 'fixed' }}>
            <button className="close-overlay" onClick={() => setReturnAssetId(null)}>✕</button>
            <h3 className="panel-title">🔙 Asset Return Diagnostics</h3>
            <form onSubmit={handleReturnAsset}>
              <div className="form-group">
                <label className="form-label">Check-in Condition Notes</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  placeholder="e.g. Laptop checked in, minor scratches, power cable returned."
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn" style={{ width: '100%' }}>Finalize Return</button>
            </form>
          </div>
        </>
      )}

    </div>
  );
}

export default App;