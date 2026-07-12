# AssetFlow 🚀

AssetFlow is a modern, full-stack Enterprise Asset Management (EAM) system built for the **Odoo Hackathon 2026**. It helps organizations streamline IT operations, track physical asset lifecycles, handle bookings for shared resources, assign maintenance tickets, and coordinate department-wide physical inventory audits.

---

## 🌟 Key Features

*   **📊 Interactive Dashboard & Analytics:** Real-time metrics on total assets, active allocations, open maintenance tickets, and system activity.
*   **💻 Asset Inventory & Lifecycle Management:** Comprehensive asset registry (serial numbers, purchase costs, current conditions, locations, and category warranty tracking).
*   **👥 Employee Allocation & Transfers:** Check-out and check-in assets with detailed condition logs. Supports department transfers of active assets.
*   **📅 Resource & Room Booking:** Reserve shared bookable assets (e.g., conference rooms, lab equipment) with specified start and end times.
*   **🔧 Maintenance Ticketing System:** Create maintenance tickets with priority levels (Low, Medium, High) and assign them to technicians.
*   **📋 Physical Audits:** Initiate department-wide audits, verify asset existence/condition, and track discrepancies.
*   **🔔 Activity Feed & Notifications:** Real-time log of all administrative actions, check-ins, and requests.

---

## 🛠️ Tech Stack

### Backend
*   **FastAPI:** High-performance, asynchronous Python web framework.
*   **SQLite:** Relational database for zero-config, portable data storage.
*   **Pydantic:** Robust request/response schema validation.

### Frontend
*   **React + Vite:** Lightning-fast, modern development setup.
*   **CSS:** Vanilla CSS with custom animations and variables for high visual fidelity.

---

## ⚙️ Installation & Setup

### Prerequisites
*   Python 3.8+
*   Node.js (v18+) & npm

---

### 1. Backend Setup
1. Open a terminal in the root directory.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn pydantic email-validator
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   *The interactive API documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

---

### 2. Frontend Setup
1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The UI will be accessible at [http://localhost:5173/](http://localhost:5173/).*

---

## 🔑 Seed Accounts for Testing
The database is pre-seeded with initial data and test accounts. Use these credentials to sign in and test different roles:

### 1. Admin User (Full Access)
*   **Email:** `admin@odoo.com`
*   **Password:** `admin123`

### 2. Employee User (Limited Access)
*   **Email:** `priya@odoo.com`
*   **Password:** `employee123`

---

## 🏷️ Hackathon Hashtags
*   `#odoohackathon`
*   `#odoohackathon2026`
