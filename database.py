import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "assetflow.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        head_id INTEGER,
        parent_department_id INTEGER,
        status TEXT DEFAULT 'Active'
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Employee',
        department_id INTEGER,
        status TEXT DEFAULT 'Active',
        FOREIGN KEY (department_id) REFERENCES departments(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        warranty_months INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Active'
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category_id INTEGER,
        status TEXT DEFAULT 'Available',
        is_bookable BOOLEAN DEFAULT 0,
        serial_number TEXT,
        acquisition_date TEXT,
        acquisition_cost REAL DEFAULT 0.0,
        condition TEXT DEFAULT 'New',
        location TEXT,
        assigned_to_id INTEGER,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (assigned_to_id) REFERENCES users(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        expected_return_date TEXT,
        check_in_notes TEXT,
        active BOOLEAN DEFAULT 1,
        created_at TEXT,
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (employee_id) REFERENCES users(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        requested_by_id INTEGER NOT NULL,
        current_holder_id INTEGER,
        status TEXT DEFAULT 'Pending',
        created_at TEXT,
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (requested_by_id) REFERENCES users(id),
        FOREIGN KEY (current_holder_id) REFERENCES users(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'Upcoming',
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (employee_id) REFERENCES users(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        technician_name TEXT,
        created_at TEXT,
        FOREIGN KEY (asset_id) REFERENCES assets(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER NOT NULL,
        created_at TEXT,
        status TEXT DEFAULT 'Active',
        discrepancies INTEGER DEFAULT 0,
        verified_count INTEGER DEFAULT 0,
        FOREIGN KEY (department_id) REFERENCES departments(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id INTEGER NOT NULL,
        asset_id INTEGER NOT NULL,
        condition TEXT NOT NULL,
        verified_at TEXT,
        FOREIGN KEY (audit_id) REFERENCES audits(id),
        FOREIGN KEY (asset_id) REFERENCES assets(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        user_id INTEGER
    )""")

    conn.commit()

    # Seed initial data if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        # Seed departments
        cursor.execute("INSERT INTO departments (name, code, status) VALUES ('Engineering', 'ENG', 'Active')")
        cursor.execute("INSERT INTO departments (name, code, status) VALUES ('Operations', 'OPS', 'Active')")
        cursor.execute("INSERT INTO departments (name, code, status) VALUES ('Marketing', 'MKT', 'Active')")
        
        # Seed users
        cursor.execute("INSERT INTO users (name, email, password, role, department_id) VALUES ('Admin User', 'admin@odoo.com', 'admin123', 'Admin', 2)")
        cursor.execute("INSERT INTO users (name, email, password, role, department_id) VALUES ('Priya Sharma', 'priya@odoo.com', 'employee123', 'Employee', 1)")
        cursor.execute("INSERT INTO users (name, email, password, role, department_id) VALUES ('Raj Patel', 'raj@odoo.com', 'employee123', 'Employee', 3)")
        
        # Set head of ENG dept
        cursor.execute("UPDATE departments SET head_id = 1 WHERE id = 1")
        
        # Seed categories
        cursor.execute("INSERT INTO categories (name, warranty_months) VALUES ('Electronics', 24)")
        cursor.execute("INSERT INTO categories (name, warranty_months) VALUES ('Furniture', 12)")
        cursor.execute("INSERT INTO categories (name, warranty_months) VALUES ('Facilities', 0)")

        # Seed assets
        cursor.execute("""
        INSERT INTO assets (tag, name, category_id, status, is_bookable, serial_number, acquisition_date, acquisition_cost, condition, location)
        VALUES ('AF-0001', 'MacBook Pro 16', 1, 'Available', 0, 'C02F2345Q6W7', '2026-01-10', 2499.0, 'New', 'Eng Lab B')
        """)
        cursor.execute("""
        INSERT INTO assets (tag, name, category_id, status, is_bookable, serial_number, acquisition_date, acquisition_cost, condition, location)
        VALUES ('AF-0002', 'Conference Room B2', 3, 'Available', 1, 'FAC-ROOM-B2', '2025-06-01', 0.0, 'Good', 'Floor 2')
        """)
        cursor.execute("""
        INSERT INTO assets (tag, name, category_id, status, is_bookable, serial_number, acquisition_date, acquisition_cost, condition, location)
        VALUES ('AF-0003', 'Dell UltraSharp 34 Monitor', 1, 'Available', 0, 'CN-0D5432-12345', '2026-02-15', 599.0, 'New', 'Operations Desk 4')
        """)

        # Seed initial notification
        cursor.execute("""
        INSERT INTO notifications (message, timestamp)
        VALUES ('System Boot: AssetFlow ERP sqlite core initialized.', 'Just now')
        """)
        
        conn.commit()

    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
