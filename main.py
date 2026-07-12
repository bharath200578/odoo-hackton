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
# 1. IN-MEMORY DATABASE STORAGE (Resets on reload - Perfect for Hackathon MVP)
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
        "status": "Available", # Available, Allocated, Under Maintenance, Lost
        "is_bookable": False
    },
    {
        "id": 2, 
        "tag": "AF-0002", 
        "name": "Conference Room B2", 
        "category_id": 1, 
        "status": "Available", 
        "is_bookable": True
    }
]

ALLOCATIONS_DB = []
BOOKINGS_DB = []
MAINTENANCE_DB = []

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
    priority: str # Low, Medium, High

# =====================================================================
# 3. CORE ERP BUSINESS RULES ENGINE (API Endpoints)
# =====================================================================

# --- RULE 1: ROLE MANAGEMENT ---
@app.post("/api/admin/promote")
def promote_user(user_id: int, new_role: str):
    """Admin controls roles directly. Employees cannot self-elevate."""
    if new_role not in ["Admin", "Asset Manager", "Department Head", "Employee"]:
        raise HTTPException(status_code=400, detail="Invalid role type")
    for u in USERS_DB:
        if u["id"] == user_id:
            u["role"] = new_role
            return {"message": f"User promoted to {new_role}", "user": u}
    raise HTTPException(status_code=404, detail="User not found")

# --- RULE 2: CONFLICT PREVENTION (ASSET ALLOCATION) ---
@app.post("/api/allocations")
def allocate_asset(req: AllocateRequest):
    """Prevents double allocation of physical assets."""
    # Find the asset
    target_asset = next((a for a in ASSETS_DB if a["id"] == req.asset_id), None)
    if not target_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Check if asset is already allocated or under maintenance
    if target_asset["status"] != "Available":
        # Find current holder for the conflict message
        current_alloc = next((al for al in ALLOCATIONS_DB if al["asset_id"] == req.asset_id and al["active"]), None)
        holder_name = "Another user"
        if current_alloc:
            holder = next((u for u in USERS_DB if u["id"] == current_alloc["employee_id"]), None)
            if holder: holder_name = holder["name"]
            
        raise HTTPException(
            status_code=400, 
            detail=f"Conflict! This asset is currently held by {holder_name}. Please initiate a Transfer Request instead."
        )

    # Perform allocation
    target_asset["status"] = "Allocated"
    new_allocation = {
        "id": len(ALLOCATIONS_DB) + 1,
        "asset_id": req.asset_id,
        "employee_id": req.employee_id,
        "expected_return_date": req.expected_return_date.isoformat(),
        "active": True
    }
    ALLOCATIONS_DB.append(new_allocation)
    return {"status": "Success", "allocation": new_allocation}

# --- RULE 3: OVERLAP VALIDATION (RESOURCE BOOKING) ---
@app.post("/api/bookings")
def book_resource(req: BookingRequest):
    """Ensures two people cannot book the same shared resource at overlapping times."""
    target_asset = next((a for a in ASSETS_DB if a["id"] == req.asset_id), None)
    if not target_asset or not target_asset["is_bookable"]:
        raise HTTPException(status_code=400, detail="Asset is not bookable or does not exist")

    # Time Overlap Check Formula: (StartA < EndB) AND (EndA > StartB)
    for b in BOOKINGS_DB:
        if b["asset_id"] == req.asset_id and b["status"] != "Cancelled":
            b_start = datetime.fromisoformat(b["start_time"])
            b_end = datetime.fromisoformat(b["end_time"])
            if req.start_time < b_end and req.end_time > b_start:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Time slot overlap detected! This resource is already booked from {b['start_time']} to {b['end_time']}."
                )

    new_booking = {
        "id": len(BOOKINGS_DB) + 1,
        "asset_id": req.asset_id,
        "employee_id": req.employee_id,
        "start_time": req.start_time.isoformat(),
        "end_time": req.end_time.isoformat(),
        "status": "Upcoming"
    }
    BOOKINGS_DB.append(new_booking)
    return {"status": "Success", "booking": new_booking}

# --- GET ALL ASSETS ---
@app.get("/api/assets")
def get_assets():
    return ASSETS_DB