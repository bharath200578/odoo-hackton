const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.detail || 'API request failed');
  }

  return data;
}

export const api = {
  login: (email, password) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  
  signup: (name, email, password) => request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  }),
  
  getEmployees: () => request('/api/employees'),
  
  promoteEmployee: (userId, newRole) => request('/api/admin/promote', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, new_role: newRole })
  }),

  getDepartments: () => request('/api/departments'),
  createDepartment: (dept) => request('/api/departments', {
    method: 'POST',
    body: JSON.stringify(dept)
  }),

  getCategories: () => request('/api/categories'),
  createCategory: (cat) => request('/api/categories', {
    method: 'POST',
    body: JSON.stringify(cat)
  }),

  getAssets: (search = '') => request(`/api/assets${search ? `?q=${encodeURIComponent(search)}` : ''}`),
  registerAsset: (asset) => request('/api/assets/register', {
    method: 'POST',
    body: JSON.stringify(asset)
  }),
  getAssetHistory: (assetId) => request(`/api/assets/${assetId}/history`),

  allocateAsset: (alloc) => request('/api/allocations', {
    method: 'POST',
    body: JSON.stringify(alloc)
  }),
  returnAsset: (assetId, checkInNotes) => request(`/api/allocations/${assetId}/return`, {
    method: 'POST',
    body: JSON.stringify({ check_in_notes: checkInNotes })
  }),

  requestTransfer: (assetId, requestedById) => request('/api/transfers/request', {
    method: 'POST',
    body: JSON.stringify({ asset_id: assetId, requested_by_id: requestedById })
  }),
  getTransfers: () => request('/api/transfers'),
  actionTransfer: (transferId, action) => request(`/api/transfers/${transferId}/action?action=${action}`, {
    method: 'POST'
  }),

  getBookings: () => request('/api/bookings'),
  createBooking: (booking) => request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking)
  }),
  cancelBooking: (bookingId) => request(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST'
  }),

  getMaintenance: () => request('/api/maintenance'),
  raiseMaintenance: (maint) => request('/api/maintenance/request', {
    method: 'POST',
    body: JSON.stringify(maint)
  }),
  actionMaintenance: (ticketId, action) => request(`/api/maintenance/${ticketId}/action?action=${action}`, {
    method: 'POST'
  }),
  assignMaintenance: (ticketId, technicianName) => request(`/api/maintenance/${ticketId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ technician_name: technicianName })
  }),
  resolveMaintenance: (ticketId) => request(`/api/maintenance/${ticketId}/resolve`, {
    method: 'POST'
  }),

  getAudits: () => request('/api/audits'),
  startAudit: (departmentId) => request('/api/audits/start', {
    method: 'POST',
    body: JSON.stringify({ department_id: departmentId })
  }),
  verifyAuditAsset: (auditId, assetId, condition) => request(`/api/audits/${auditId}/verify?asset_id=${assetId}&asset_condition=${condition}`, {
    method: 'POST'
  }),
  closeAudit: (auditId) => request(`/api/audits/${auditId}/close`, {
    method: 'POST'
  }),

  getReportsSummary: () => request('/api/reports/summary'),
  exportReportsCSV: () => request('/api/reports/export'),
  getNotifications: () => request('/api/notifications')
};
