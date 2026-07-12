from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, date

app = FastAPI(title="AssetFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# 1. IN-MEMORY DATABASE STORAGE
# =====================================================================
USERS_DB = [
    {"id": 1, "name": "Admin User", "email": "admin@odoo.com", "role": "Admin", "department_id": 1},
    {"id": 2, "name": "Priya Sharma", "email": "priya@odoo.com", "role": "Employee", "department_id": 1},
    {"id": 3, "name": "Raj Patel", "email": "raj@odoo.com", "role": "Employee", "department_id": 1}
]

DEPARTMENTS_DB = [
    {"id": 1, "name": "Engineering", "code": "ENG", "head_id": 1, "status": "Active"}
]

CATEGORIES_DB = [
    {"id": 1, "name": "Electronics", "warranty_months": 24}
]

ASSETS_DB = [
    {
        "id": 1, 
        "tag": "AF-0001", 
        "name": "MacBook Pro", 
        "category_id": 1, 
        "status": "Available", 
        "is_bookable": False,
        "assigned_to_id": None  
    },
    {
        "id": 2, 
        "tag": "AF-0002", 
        "name": "Conference Room B2", 
        "category_id": 1, 
        "status": "Available", 
        "is_bookable": True,
        "assigned_to_id": None
    }
]

ALLOCATIONS_DB = []
BOOKINGS_DB = []
MAINTENANCE_DB = []
AUDITS_DB = []
NOTIFICATIONS_DB = [
    {"id": 1, "message": "System Boot: AssetFlow ERP core engine initialized successfully.", "timestamp": "Just now"}
]

# =====================================================================
# 2. DATA VALIDATION SCHEMAS (Pydantic models)
# =====================================================================
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

class AssetCreate(BaseModel):
    name: str
    category_id: int
    is_bookable: bool = False

class AllocateRequest(BaseModel):
    asset_id: int
    employee_id: int
    expected_return_date: date

class BookingRequest(BaseModel):
    asset_id: int
    employee_id: int
    start_time: datetime
    end_time: datetime

class MaintenanceRequest(BaseModel):
    asset_id: int
    description: str
    priority: str

# =====================================================================
# 3. CORE ERP BUSINESS RULES ENGINE (API Endpoints)
# =====================================================================

def log_activity(message: str):
    NOTIFICATIONS_DB.insert(0, {
        "id": len(NOTIFICATIONS_DB) + 1,
        "message": message,
        "timestamp": "Just now"
    })

@app.post("/api/admin/promote")
def promote_user(user_id: int, new_role: str):
    if new_role not in ["Admin", "Asset Manager", "Department Head", "Employee"]:
        raise HTTPException(status_code=400, detail="Invalid role type")
    for u in USERS_DB:
        if u["id"] == user_id:
            u["role"] = new_role
            return {"message": f"User promoted to {new_role}", "user": u}
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/api/allocations")
def allocate_asset(req: AllocateRequest):
    target_asset = next((a for a in ASSETS_DB if a["id"] == req.asset_id), None)
    if not target_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    if target_asset["status"] != "Available":
        current_alloc = next((al for al in ALLOCATIONS_DB if al["asset_id"] == req.asset_id and al["active"]), None)
        holder_name = "Another user"
        if current_alloc:
            holder = next((u for u in USERS_DB if u["id"] == current_alloc["employee_id"]), None)
            if holder: holder_name = holder["name"]
            
        raise HTTPException(status_code=400, detail=f"Conflict! Held by {holder_name}.")

    target_asset["status"] = "Allocated"
    target_asset["assigned_to_id"] = req.employee_id  
    
    new_allocation = {
        "id": len(ALLOCATIONS_DB) + 1,
        "asset_id": req.asset_id,
        "employee_id": req.employee_id,
        "expected_return_date": req.expected_return_date.isoformat(),
        "active": True
    }
    ALLOCATIONS_DB.append(new_allocation)
    log_activity(f"Asset {target_asset['tag']} ({target_asset['name']}) successfully provisioned to Employee ID {req.employee_id}.")
    return {"status": "Success", "allocation": new_allocation}

@app.post("/api/bookings")
def book_resource(req: BookingRequest):
    target_asset = next((a for a in ASSETS_DB if a["id"] == req.asset_id), None)
    if not target_asset or not target_asset["is_bookable"]:
        raise HTTPException(status_code=400, detail="Asset is not bookable or does not exist")

    for b in BOOKINGS_DB:
        if b["asset_id"] == req.asset_id and b["status"] != "Cancelled":
            b_start = datetime.fromisoformat(b["start_time"])
            b_end = datetime.fromisoformat(b["end_time"])
            if req.start_time < b_end and req.end_time > b_start:
                raise HTTPException(status_code=400, detail=f"Time slot overlap detected!")

    new_booking = {
        "id": len(BOOKINGS_DB) + 1,
        "asset_id": req.asset_id,
        "employee_id": req.employee_id,
        "start_time": req.start_time.isoformat(),
        "end_time": req.end_time.isoformat(),
        "status": "Upcoming"
    }
    BOOKINGS_DB.append(new_booking)
    log_activity(f"Shared Space '{target_asset['name']}' reserved for Employee ID {req.employee_id}.")
    return {"status": "Success", "booking": new_booking}

@app.get("/api/assets")
def get_assets():
    return ASSETS_DB

@app.post("/api/maintenance/request")
def raise_maintenance(req: MaintenanceRequest):
    target_asset = next((a for a in ASSETS_DB if a["id"] == req.asset_id), None)
    if not target_asset:
        raise HTTPException(status_code=404, detail="Asset target not found")
        
    new_request = {
        "id": len(MAINTENANCE_DB) + 1,
        "asset_id": req.asset_id,
        "asset_tag": target_asset["tag"],
        "asset_name": target_asset["name"],
        "description": req.description,
        "priority": req.priority,
        "status": "Pending"
    }
    MAINTENANCE_DB.append(new_request)
    log_activity(f"Alert raised: Maintenance ticket filled on {target_asset['tag']}.")
    return {"status": "Success", "maintenance": new_request}

@app.post("/api/maintenance/{ticket_id}/approve")
def approve_maintenance(ticket_id: int):
    ticket = next((m for m in MAINTENANCE_DB if m["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket["status"] = "Approved"
    for asset in ASSETS_DB:
        if asset["id"] == ticket["asset_id"]:
            asset["status"] = "Under Maintenance"
            asset["assigned_to_id"] = None 
            log_activity(f"Asset {asset['tag']} locked under physical maintenance diagnostics.")
            
    return {"status": "Success", "ticket": ticket}

@app.post("/api/maintenance/{ticket_id}/resolve")
def resolve_maintenance(ticket_id: int):
    ticket = next((m for m in MAINTENANCE_DB if m["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket["status"] = "Resolved"
    for asset in ASSETS_DB:
        if asset["id"] == ticket["asset_id"]:
            asset["status"] = "Available"
            log_activity(f"Asset {asset['tag']} completely resolved and returned to stock.")
            
    return {"status": "Success", "ticket": ticket}

@app.get("/api/maintenance")
def get_maintenance_tickets():
    return MAINTENANCE_DB

@app.post("/api/audits/start")
def start_audit_cycle(department_id: int):
    new_audit = {
        "id": len(AUDITS_DB) + 1,
        "department_id": department_id,
        "status": "Active",
        "discrepancies": 0,
        "verified_count": 0
    }
    AUDITS_DB.append(new_audit)
    log_activity(f"Compliance Check initiated: Verification Cycle Ref #{new_audit['id']} opened.")
    return {"status": "Success", "audit": new_audit}

@app.post("/api/audits/{audit_id}/verify")
def verify_asset_status(audit_id: int, asset_id: int, asset_condition: str):
    audit = next((a for a in AUDITS_DB if a["id"] == audit_id), None)
    asset = next((asst for asst in ASSETS_DB if asst["id"] == asset_id), None)
    
    if not audit or not asset:
        raise HTTPException(status_code=404, detail="Audit scope or Asset target not found")
        
    audit["verified_count"] += 1
    if asset_condition in ["Missing", "Damaged"]:
        audit["discrepancies"] += 1
        asset["status"] = "Lost" if asset_condition == "Missing" else "Under Maintenance"
        asset["assigned_to_id"] = None
        log_activity(f"CRITICAL DISCREPANCY: Asset {asset['tag']} flagged as {asset_condition} during cycle.")
    else:
        log_activity(f"Audit verified: {asset['tag']} confirmed at physical site location.")
        
    return {"status": "Success", "asset_new_status": asset["status"]}

@app.get("/api/audits")
def get_audits():
    return AUDITS_DB

@app.get("/api/reports/summary")
def get_analytics_summary():
    total_assets = len(ASSETS_DB)
    allocated_count = len([a for a in ASSETS_DB if a["status"] == "Allocated"])
    maintenance_count = len([a for a in ASSETS_DB if a["status"] == "Under Maintenance"])
    utilization_rate = round((allocated_count / total_assets * 100), 1) if total_assets > 0 else 0.0
    
    return {
        "utilization_rate": f"{utilization_rate}%",
        "breakdown": {
            "Allocated": allocated_count,
            "Under Maintenance": maintenance_count,
            "Available": len([a for a in ASSETS_DB if a["status"] == "Available"]),
            "Lost/Missing": len([a for a in ASSETS_DB if a["status"] == "Lost"])
        },
        "system_health": "Optimal" if maintenance_count < (total_assets * 0.2) else "Attention Needed"
    }

@app.get("/api/notifications")
def get_notifications():
    return NOTIFICATIONS_DB

@app.post("/api/assets/register")
def register_new_asset(req: AssetCreate):
    new_id = len(ASSETS_DB) + 1
    new_tag = f"AF-000{new_id}" if new_id < 10 else f"AF-00{new_id}"
    
    new_asset = {
        "id": new_id,
        "tag": new_tag,
        "name": req.name,
        "category_id": req.category_id,
        "status": "Available",
        "is_bookable": req.is_bookable,
        "assigned_to_id": None
    }
    ASSETS_DB.append(new_asset)
    log_activity(f"Inventory Registry Update: New device {new_tag} ({req.name}) saved.")
    return {"status": "Success", "asset": new_asset}