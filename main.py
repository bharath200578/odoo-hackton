from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, date, timedelta
import sqlite3
import os
from database import get_db_connection, init_db

# Initialize database tables and seed data
init_db()

app = FastAPI(title="AssetFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# DATA VALIDATION SCHEMAS (Pydantic models)
# =====================================================================
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PromoteRequest(BaseModel):
    user_id: int
    new_role: str

class DepartmentCreate(BaseModel):
    name: str
    code: str
    head_id: Optional[int] = None
    parent_department_id: Optional[int] = None

class CategoryCreate(BaseModel):
    name: str
    warranty_months: Optional[int] = 0

class AssetCreate(BaseModel):
    name: str
    category_id: int
    is_bookable: bool = False
    serial_number: Optional[str] = None
    acquisition_date: Optional[str] = None
    acquisition_cost: Optional[float] = 0.0
    condition: Optional[str] = "New"
    location: Optional[str] = None

class AllocateRequest(BaseModel):
    asset_id: int
    employee_id: int
    expected_return_date: date

class ReturnRequest(BaseModel):
    check_in_notes: str

class TransferReq(BaseModel):
    asset_id: int
    requested_by_id: int

class BookingRequest(BaseModel):
    asset_id: int
    employee_id: int
    start_time: datetime
    end_time: datetime

class MaintenanceRequest(BaseModel):
    asset_id: int
    description: str
    priority: str

class MaintenanceAssign(BaseModel):
    technician_name: str

class AuditStartRequest(BaseModel):
    department_id: int

# =====================================================================
# CORE OPERATIONS HELPERS
# =====================================================================
def log_activity(message: str, user_id: Optional[int] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO notifications (message, timestamp, user_id) VALUES (?, ?, ?)",
        (message, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), user_id)
    )
    conn.commit()
    conn.close()

# =====================================================================
# 1. AUTHENTICATION & USERS
# =====================================================================
@app.post("/api/auth/signup")
def auth_signup(req: UserSignup):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'Employee')",
            (req.name, req.email, req.password)
        )
        conn.commit()
        # Retrieve user details
        cursor.execute("SELECT id, name, email, role, department_id FROM users WHERE email = ?", (req.email,))
        user = dict(cursor.fetchone())
        log_activity(f"New user registered: {req.name} ({req.email}).")
        return {"status": "Success", "user": user, "token": f"mock-token-{user['id']}"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()

@app.post("/api/auth/login")
def auth_login(req: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, password, role, department_id FROM users WHERE email = ?",
        (req.email,)
    )
    user_row = cursor.fetchone()
    conn.close()

    if not user_row or user_row["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = dict(user_row)
    del user["password"]
    log_activity(f"User login successful: {user['name']}.")
    return {"status": "Success", "user": user, "token": f"mock-token-{user['id']}"}

@app.post("/api/admin/promote")
def promote_user(req: PromoteRequest):
    if req.new_role not in ["Admin", "Asset Manager", "Department Head", "Employee"]:
        raise HTTPException(status_code=400, detail="Invalid role type")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (req.new_role, req.user_id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    cursor.execute("SELECT name FROM users WHERE id = ?", (req.user_id,))
    user_name = cursor.fetchone()["name"]
    conn.commit()
    conn.close()

    log_activity(f"User {user_name} promoted to {req.new_role}.")
    return {"status": "Success", "message": f"User promoted to {req.new_role}"}

@app.get("/api/employees")
def get_employees():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.role, u.status, d.name as dept
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
    """)
    employees = [dict(row) for row in cursor.fetchall()]
    
    # Attach currently held assets
    for emp in employees:
        cursor.execute("SELECT tag, name FROM assets WHERE assigned_to_id = ? AND status = 'Allocated'", (emp["id"],))
        asset = cursor.fetchone()
        emp["allocated_asset"] = f"{asset['tag']} ({asset['name']})" if asset else "None Assigned"

    conn.close()
    return employees

# =====================================================================
# 2. DEPARTMENTS & CATEGORIES
# =====================================================================
@app.get("/api/departments")
def get_departments():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.id, d.name, d.code, d.status, d.parent_department_id, u.name as head_name 
        FROM departments d
        LEFT JOIN users u ON d.head_id = u.id
    """)
    depts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return depts

@app.post("/api/departments")
def create_department(req: DepartmentCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO departments (name, code, head_id, parent_department_id) VALUES (?, ?, ?, ?)",
            (req.name, req.code, req.head_id, req.parent_department_id)
        )
        conn.commit()
        log_activity(f"Department created: {req.name} ({req.code}).")
        return {"status": "Success"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Department code already exists")
    finally:
        conn.close()

@app.get("/api/categories")
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, warranty_months, status FROM categories")
    cats = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return cats

@app.post("/api/categories")
def create_category(req: CategoryCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO categories (name, warranty_months) VALUES (?, ?)",
            (req.name, req.warranty_months)
        )
        conn.commit()
        log_activity(f"Asset Category created: {req.name}.")
        return {"status": "Success"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Category already exists")
    finally:
        conn.close()

# =====================================================================
# 3. ASSET REGISTRY
# =====================================================================
@app.get("/api/assets")
def get_assets(q: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT a.id, a.tag, a.name, a.status, a.is_bookable, a.serial_number,
               a.acquisition_date, a.acquisition_cost, a.condition, a.location,
               c.name as category, u.name as assigned_to
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.assigned_to_id = u.id
    """
    
    if q:
        cursor.execute(query + " WHERE a.name LIKE ? OR a.tag LIKE ? OR a.serial_number LIKE ?", (f"%{q}%", f"%{q}%", f"%{q}%"))
    else:
        cursor.execute(query)
        
    assets = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return assets

@app.post("/api/assets/register")
def register_new_asset(req: AssetCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Auto-generate asset tag
    cursor.execute("SELECT MAX(id) FROM assets")
    max_id = cursor.fetchone()[0] or 0
    new_id = max_id + 1
    new_tag = f"AF-000{new_id}" if new_id < 10 else f"AF-00{new_id}"
    
    cursor.execute("""
        INSERT INTO assets (tag, name, category_id, status, is_bookable, serial_number, 
                            acquisition_date, acquisition_cost, condition, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_tag, req.name, req.category_id, 'Available', req.is_bookable, req.serial_number,
        req.acquisition_date, req.acquisition_cost, req.condition, req.location
    ))
    conn.commit()
    conn.close()
    
    log_activity(f"Registered new asset: {new_tag} - {req.name}.")
    return {"status": "Success", "tag": new_tag}

@app.get("/api/assets/{asset_id}/history")
def get_asset_history(asset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Allocation History
    cursor.execute("""
        SELECT al.expected_return_date, al.check_in_notes, al.active, al.created_at, u.name as employee
        FROM allocations al
        JOIN users u ON al.employee_id = u.id
        WHERE al.asset_id = ?
        ORDER BY al.id DESC
    """, (asset_id,))
    allocs = [dict(row) for row in cursor.fetchall()]
    
    # Maintenance History
    cursor.execute("""
        SELECT description, priority, status, technician_name, created_at
        FROM maintenance
        WHERE asset_id = ?
        ORDER BY id DESC
    """, (asset_id,))
    maint = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {"allocations": allocs, "maintenance": maint}

# =====================================================================
# 4. ALLOCATIONS & TRANSFERS
# =====================================================================
@app.post("/api/allocations")
def allocate_asset(req: AllocateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, tag, status, is_bookable, assigned_to_id FROM assets WHERE id = ?", (req.asset_id,))
    asset = cursor.fetchone()
    
    if not asset:
        conn.close()
        raise HTTPException(status_code=404, detail="Asset not found")
        
    if asset["is_bookable"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot allocate shared workspace resource")

    if asset["status"] != "Available":
        # Get details of current holder for Transfer options
        cursor.execute("SELECT name FROM users WHERE id = ?", (asset["assigned_to_id"],))
        holder = cursor.fetchone()
        holder_name = holder["name"] if holder else "Another employee"
        conn.close()
        raise HTTPException(
            status_code=400, 
            detail=f"Conflict! Held by {holder_name}.",
            headers={"current_holder_id": str(asset["assigned_to_id"] or 0)}
        )

    # Proceed with allocation
    cursor.execute("UPDATE assets SET status = 'Allocated', assigned_to_id = ? WHERE id = ?", (req.employee_id, req.asset_id))
    cursor.execute("""
        INSERT INTO allocations (asset_id, employee_id, expected_return_date, active, created_at)
        VALUES (?, ?, ?, 1, ?)
    """, (req.asset_id, req.employee_id, req.expected_return_date.isoformat(), datetime.now().strftime("%Y-%m-%d")))
    
    conn.commit()
    conn.close()
    
    log_activity(f"Asset {asset['tag']} successfully provisioned to Employee ID {req.employee_id}.")
    return {"status": "Success"}

@app.post("/api/allocations/{asset_id}/return")
def return_asset(asset_id: int, req: ReturnRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT tag, status, assigned_to_id FROM assets WHERE id = ?", (asset_id,))
    asset = cursor.fetchone()
    
    if not asset or asset["status"] != "Allocated":
        conn.close()
        raise HTTPException(status_code=400, detail="Asset is not currently allocated")
        
    # Mark allocation as inactive, capture notes
    cursor.execute("""
        UPDATE allocations 
        SET active = 0, check_in_notes = ? 
        WHERE asset_id = ? AND active = 1
    """, (req.check_in_notes, asset_id))
    
    # Return asset to stock
    cursor.execute("UPDATE assets SET status = 'Available', assigned_to_id = NULL WHERE id = ?", (asset_id,))
    
    conn.commit()
    conn.close()
    
    log_activity(f"Returned asset {asset['tag']}. Condition check-in notes: '{req.check_in_notes}'")
    return {"status": "Success"}

@app.post("/api/transfers/request")
def request_transfer(req: TransferReq):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT assigned_to_id, status, tag FROM assets WHERE id = ?", (req.asset_id,))
    asset = cursor.fetchone()
    
    if not asset or asset["status"] != "Allocated":
        conn.close()
        raise HTTPException(status_code=400, detail="Asset must be Allocated to request a transfer")
        
    if asset["assigned_to_id"] == req.requested_by_id:
        conn.close()
        raise HTTPException(status_code=400, detail="You already hold this asset")

    cursor.execute("""
        INSERT INTO transfers (asset_id, requested_by_id, current_holder_id, status, created_at)
        VALUES (?, ?, ?, 'Pending', ?)
    """, (req.asset_id, req.requested_by_id, asset["assigned_to_id"], datetime.now().strftime("%Y-%m-%d")))
    
    conn.commit()
    conn.close()
    
    log_activity(f"Transfer request raised for asset {asset['tag']} to Employee ID {req.requested_by_id}.")
    return {"status": "Success"}

@app.get("/api/transfers")
def get_transfers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.id, t.status, t.created_at,
               a.tag as asset_tag, a.name as asset_name,
               u1.name as requester, u2.name as holder
        FROM transfers t
        JOIN assets a ON t.asset_id = a.id
        JOIN users u1 ON t.requested_by_id = u1.id
        LEFT JOIN users u2 ON t.current_holder_id = u2.id
    """)
    trans = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return trans

@app.post("/api/transfers/{transfer_id}/action")
def action_transfer(transfer_id: int, action: str):
    if action not in ["Approve", "Reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT asset_id, requested_by_id, current_holder_id, status FROM transfers WHERE id = ?", (transfer_id,))
    trans = cursor.fetchone()
    
    if not trans or trans["status"] != "Pending":
        conn.close()
        raise HTTPException(status_code=400, detail="Transfer request not found or already completed")
        
    if action == "Approve":
        # 1. Close current allocation
        cursor.execute("UPDATE allocations SET active = 0, check_in_notes = 'Transferred' WHERE asset_id = ? AND active = 1", (trans["asset_id"],))
        # 2. Open new allocation
        cursor.execute("""
            INSERT INTO allocations (asset_id, employee_id, expected_return_date, active, created_at)
            VALUES (?, ?, ?, 1, ?)
        """, (trans["asset_id"], trans["requested_by_id"], (date.today() + timedelta(days=14)).isoformat(), datetime.now().strftime("%Y-%m-%d")))
        # 3. Update asset ownership
        cursor.execute("UPDATE assets SET assigned_to_id = ? WHERE id = ?", (trans["requested_by_id"], trans["asset_id"]))
        
        cursor.execute("UPDATE transfers SET status = 'Approved' WHERE id = ?", (transfer_id,))
        log_activity(f"Approved transfer: asset ID {trans['asset_id']} moved to Employee ID {trans['requested_by_id']}.")
    else:
        cursor.execute("UPDATE transfers SET status = 'Rejected' WHERE id = ?", (transfer_id,))
        log_activity(f"Rejected transfer request #{transfer_id}.")
        
    conn.commit()
    conn.close()
    return {"status": "Success"}

# =====================================================================
# 5. BOOKINGS
# =====================================================================
@app.get("/api/bookings")
def get_bookings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT b.id, b.start_time, b.end_time, b.status, a.name as asset_name, u.name as employee_name
        FROM bookings b
        JOIN assets a ON b.asset_id = a.id
        JOIN users u ON b.employee_id = u.id
    """)
    books = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return books

@app.post("/api/bookings")
def book_resource(req: BookingRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT is_bookable, name FROM assets WHERE id = ?", (req.asset_id,))
    asset = cursor.fetchone()
    
    if not asset or not asset["is_bookable"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Asset is not bookable or does not exist")

    # Time slot overlap validation
    cursor.execute("""
        SELECT start_time, end_time FROM bookings 
        WHERE asset_id = ? AND status = 'Upcoming'
    """, (req.asset_id,))
    
    req_start = req.start_time.isoformat()
    req_end = req.end_time.isoformat()
    
    for row in cursor.fetchall():
        if req_start < row["end_time"] and req_end > row["start_time"]:
            conn.close()
            raise HTTPException(status_code=400, detail="Time slot overlap detected!")

    cursor.execute("""
        INSERT INTO bookings (asset_id, employee_id, start_time, end_time, status)
        VALUES (?, ?, ?, ?, 'Upcoming')
    """, (req.asset_id, req.employee_id, req_start, req_end))
    
    conn.commit()
    conn.close()
    
    log_activity(f"Facility '{asset['name']}' booked for Employee ID {req.employee_id}.")
    return {"status": "Success"}

@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", (booking_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found")
    conn.commit()
    conn.close()
    log_activity(f"Booking #{booking_id} cancelled.")
    return {"status": "Success"}

# =====================================================================
# 6. MAINTENANCE
# =====================================================================
@app.get("/api/maintenance")
def get_maintenance_tickets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.id, m.description, m.priority, m.status, m.technician_name, m.created_at,
               a.tag as asset_tag, a.name as asset_name
        FROM maintenance m
        JOIN assets a ON m.asset_id = a.id
    """)
    tickets = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tickets

@app.post("/api/maintenance/request")
def raise_maintenance(req: MaintenanceRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT tag, name FROM assets WHERE id = ?", (req.asset_id,))
    asset = cursor.fetchone()
    
    if not asset:
        conn.close()
        raise HTTPException(status_code=404, detail="Asset not found")
        
    cursor.execute("""
        INSERT INTO maintenance (asset_id, description, priority, status, created_at)
        VALUES (?, ?, ?, 'Pending', ?)
    """, (req.asset_id, req.description, req.priority, datetime.now().strftime("%Y-%m-%d")))
    
    conn.commit()
    conn.close()
    
    log_activity(f"Alert raised: Maintenance ticket filled on {asset['tag']}.")
    return {"status": "Success"}

@app.post("/api/maintenance/{ticket_id}/action")
def action_maintenance(ticket_id: int, action: str):
    if action not in ["Approve", "Reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT asset_id FROM maintenance WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if action == "Approve":
        cursor.execute("UPDATE maintenance SET status = 'Approved' WHERE id = ?", (ticket_id,))
        cursor.execute("UPDATE assets SET status = 'Under Maintenance', assigned_to_id = NULL WHERE id = ?", (ticket["asset_id"],))
        log_activity(f"Approved maintenance for Ticket #{ticket_id}. Asset status locked under maintenance.")
    else:
        cursor.execute("UPDATE maintenance SET status = 'Rejected' WHERE id = ?", (ticket_id,))
        log_activity(f"Rejected maintenance for Ticket #{ticket_id}.")
        
    conn.commit()
    conn.close()
    return {"status": "Success"}

@app.post("/api/maintenance/{ticket_id}/assign")
def assign_maintenance(ticket_id: int, req: MaintenanceAssign):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE maintenance SET status = 'In Progress', technician_name = ? WHERE id = ?", (req.technician_name, ticket_id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")
    conn.commit()
    conn.close()
    
    log_activity(f"Assigned technician {req.technician_name} to Maintenance ticket #{ticket_id}.")
    return {"status": "Success"}

@app.post("/api/maintenance/{ticket_id}/resolve")
def resolve_maintenance(ticket_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT asset_id FROM maintenance WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    cursor.execute("UPDATE maintenance SET status = 'Resolved' WHERE id = ?", (ticket_id,))
    cursor.execute("UPDATE assets SET status = 'Available' WHERE id = ?", (ticket["asset_id"],))
    
    conn.commit()
    conn.close()
    
    log_activity(f"Resolved maintenance Ticket #{ticket_id}. Asset released back to available fleet.")
    return {"status": "Success"}

# =====================================================================
# 7. AUDITS
# =====================================================================
@app.get("/api/audits")
def get_audits():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.created_at, a.status, a.discrepancies, a.verified_count, d.name as department
        FROM audits a
        JOIN departments d ON a.department_id = d.id
    """)
    auds = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return auds

@app.post("/api/audits/start")
def start_audit(req: AuditStartRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO audits (department_id, created_at, status, discrepancies, verified_count)
        VALUES (?, ?, 'Active', 0, 0)
    """, (req.department_id, datetime.now().strftime("%Y-%m-%d")))
    audit_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    log_activity(f"Compliance audit cycle #{audit_id} triggered for Department ID {req.department_id}.")
    return {"status": "Success", "audit_id": audit_id}

@app.post("/api/audits/{audit_id}/verify")
def verify_audit_asset(audit_id: int, asset_id: int, asset_condition: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, status FROM audits WHERE id = ? AND status = 'Active'", (audit_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Active audit cycle not found")

    cursor.execute("INSERT INTO audit_verifications (audit_id, asset_id, condition, verified_at) VALUES (?, ?, ?, ?)",
                   (audit_id, asset_id, asset_condition, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    
    # Update audit aggregations
    is_discrepancy = 1 if asset_condition in ["Missing", "Damaged"] else 0
    cursor.execute("""
        UPDATE audits 
        SET verified_count = verified_count + 1,
            discrepancies = discrepancies + ?
        WHERE id = ?
    """, (is_discrepancy, audit_id))
    
    # Apply intermediate changes (e.g. status changes if damaged)
    if asset_condition == "Damaged":
        cursor.execute("UPDATE assets SET status = 'Under Maintenance', assigned_to_id = NULL WHERE id = ?", (asset_id,))
    
    conn.commit()
    conn.close()
    
    log_activity(f"Audit verify: Asset ID {asset_id} verified as '{asset_condition}'.")
    return {"status": "Success"}

@app.post("/api/audits/{audit_id}/close")
def close_audit(audit_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, department_id FROM audits WHERE id = ? AND status = 'Active'", (audit_id,))
    audit = cursor.fetchone()
    if not audit:
        conn.close()
        raise HTTPException(status_code=400, detail="Active audit cycle not found")
        
    # Lock/Close audit
    cursor.execute("UPDATE audits SET status = 'Closed' WHERE id = ?", (audit_id,))
    
    # Find all "Missing" assets verified in this audit and mark them permanently "Lost"
    cursor.execute("SELECT asset_id FROM audit_verifications WHERE audit_id = ? AND condition = 'Missing'", (audit_id,))
    missing_assets = cursor.fetchall()
    
    for row in missing_assets:
        cursor.execute("UPDATE assets SET status = 'Lost', assigned_to_id = NULL WHERE id = ?", (row["asset_id"],))
        cursor.execute("SELECT tag FROM assets WHERE id = ?", (row["asset_id"],))
        tag = cursor.fetchone()["tag"]
        log_activity(f"CRITICAL DISCREPANCY: Asset {tag} officially verified as LOST.")

    conn.commit()
    conn.close()
    log_activity(f"Audit cycle #{audit_id} locked and finalized.")
    return {"status": "Success"}

# =====================================================================
# 8. REPORTS
# =====================================================================
@app.get("/api/reports/summary")
def get_analytics_summary():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM assets")
    total_assets = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Allocated'")
    allocated_count = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Under Maintenance'")
    maintenance_count = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Available'")
    available_count = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM assets WHERE status = 'Lost'")
    lost_count = cursor.fetchone()[0] or 0

    utilization_rate = round((allocated_count / total_assets * 100), 1) if total_assets > 0 else 0.0
    
    # Get maintenance count trends
    cursor.execute("SELECT COUNT(*) FROM maintenance WHERE status = 'Resolved'")
    resolved_tickets = cursor.fetchone()[0] or 0
    
    conn.close()
    return {
        "utilization_rate": f"{utilization_rate}%",
        "breakdown": {
            "Allocated": allocated_count,
            "Under Maintenance": maintenance_count,
            "Available": available_count,
            "Lost/Missing": lost_count
        },
        "system_health": "Optimal" if maintenance_count < (total_assets * 0.2) else "Attention Needed",
        "resolved_tickets": resolved_tickets
    }

@app.get("/api/reports/export")
def export_reports():
    # Return raw text CSV to the frontend
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.tag, a.name, a.status, a.condition, a.location, c.name as category 
        FROM assets a 
        LEFT JOIN categories c ON a.category_id = c.id
    """)
    rows = cursor.fetchall()
    conn.close()
    
    csv_content = "Asset Tag,Asset Name,Status,Condition,Location,Category\n"
    for r in rows:
        csv_content += f"{r['tag']},{r['name']},{r['status']},{r['condition']},{r['location']},{r['category']}\n"
        
    return {"csv": csv_content}

# =====================================================================
# 9. NOTIFICATIONS
# =====================================================================
@app.get("/api/notifications")
def get_notifications():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, message, timestamp FROM notifications ORDER BY id DESC LIMIT 50")
    notifs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return notifs