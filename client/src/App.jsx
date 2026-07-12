import React, { useState, useEffect } from 'react';

function App() {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({ title: '', status: 'Pending', priority: 3 });
  const [error, setError] = useState('');

  // 1. Fetch data from backend with an offline fallback
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/data')
      .then(res => res.json())
      .then(data => {
        setItems(data);
        localStorage.setItem('cached_items', JSON.stringify(data)); // Save locally
      })
      .catch(() => {
        // Offline backup!
        const cached = localStorage.getItem('cached_items');
        if (cached) setItems(JSON.parse(cached));
        setError('Running in offline/local mode');
      });
  }, []);

  // 2. Handle input changes cleanly
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Submit form to backend with validation checks
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.title.trim().length < 3) {
      setError('Title must be at least 3 characters long.');
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Backend validation failed');
      const result = await response.json();
      
      setItems([...items, result.data]);
      setFormData({ title: '', status: 'Pending', priority: 3 });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Odoo Hackathon Workspace</h2>
      
      {error && <p style={{ color: 'red', backgroundColor: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Task/Item Title" style={{ padding: '0.5rem' }} />
        <select name="status" value={formData.status} onChange={handleChange} style={{ padding: '0.5rem' }}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#714B67', color: 'white', border: 'none', cursor: 'pointer' }}>
          Add Record
        </button>
      </form>

      <h3>Live Database Records</h3>
      <ul>
        {items.map(item => (
          <li key={item.id} style={{ marginBottom: '0.5rem' }}>
            <strong>{item.title}</strong> - {item.status} (Priority: {item.priority})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;