import logging
from datetime import datetime, timezone
from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase
from app.core.security import hash_password

logger = logging.getLogger("constructsafe.seed")

DEFAULT_PERMISSIONS = [
    # Users & Roles
    {"name": "users:manage", "module": "users", "description": "Create, edit, and deactivate user accounts"},
    {"name": "roles:manage", "module": "roles", "description": "Manage role assignments and permissions"},
    
    # Projects
    {"name": "projects:all", "module": "projects", "description": "View and manage all enterprise projects"},
    {"name": "projects:manage_assigned", "module": "projects", "description": "Manage assigned construction sites"},
    {"name": "projects:view_assigned", "module": "projects", "description": "View assigned project progress and safety"},
    
    # Workers
    {"name": "workers:all", "module": "workers", "description": "Manage worker directory, induction, and certifications"},
    {"name": "workers:view", "module": "workers", "description": "View assigned worker compliance status"},
    {"name": "worker:self", "module": "workers", "description": "View own profile and training induction"},
    
    # Cameras & AI
    {"name": "cameras:all", "module": "cameras", "description": "Configure camera streams and detection zones"},
    {"name": "cameras:view", "module": "cameras", "description": "View live camera feeds and status"},
    {"name": "detections:all", "module": "detections", "description": "Full access to AI PPE detection logs"},
    {"name": "detections:verify", "module": "detections", "description": "Verify or reject AI detected violations"},
    
    # Violations & Incidents
    {"name": "violations:all", "module": "violations", "description": "Manage all safety violations and status"},
    {"name": "violations:review", "module": "violations", "description": "Review and assign corrective actions"},
    {"name": "incidents:all", "module": "incidents", "description": "Full incident management and investigations"},
    {"name": "incidents:investigate", "module": "incidents", "description": "Conduct safety incident investigations"},
    {"name": "incidents:view_summary", "module": "incidents", "description": "View non-confidential incident summaries"},
    
    # Inspections
    {"name": "inspections:all", "module": "inspections", "description": "Manage all inspection checklists and audits"},
    {"name": "inspections:conduct", "module": "inspections", "description": "Conduct on-site safety audits and checklists"},
    
    # Hazards & Reports
    {"name": "hazards:report", "module": "hazards", "description": "Submit a real-time hazard observation"},
    {"name": "reports:all", "module": "reports", "description": "Generate executive safety analytics and PDF exports"},
    {"name": "reports:view", "module": "reports", "description": "View project safety reports"},
    {"name": "audit:read", "module": "audit", "description": "Read security audit and system activity logs"},
]

DEFAULT_ROLES = [
    {
        "name": "admin",
        "display_name": "System Administrator",
        "description": "Full administrative control over users, roles, projects, and system settings",
        "permission_names": [p["name"] for p in DEFAULT_PERMISSIONS],
    },
    {
        "name": "project_manager",
        "display_name": "Project Manager",
        "description": "Manages assigned jobsites, reviews violations, and oversees site safety",
        "permission_names": [
            "projects:manage_assigned",
            "workers:view",
            "cameras:view",
            "detections:verify",
            "violations:review",
            "reports:view",
            "hazards:report",
        ],
    },
    {
        "name": "safety_inspector",
        "display_name": "Safety Inspector",
        "description": "Conducts on-site inspections, verifies AI PPE alerts, and investigates incidents",
        "permission_names": [
            "cameras:view",
            "detections:verify",
            "violations:all",
            "incidents:investigate",
            "inspections:conduct",
            "hazards:report",
            "reports:view",
        ],
    },
    {
        "name": "worker",
        "display_name": "Site Worker",
        "description": "Access personal profile, view safety training induction, and report hazards",
        "permission_names": [
            "worker:self",
            "hazards:report",
        ],
    },
    {
        "name": "client",
        "display_name": "Client Representative",
        "description": "Read-only access to assigned projects, safety performance scores, and reports",
        "permission_names": [
            "projects:view_assigned",
            "reports:view",
            "incidents:view_summary",
        ],
    },
]

DEMO_USERS = [
    {
        "email": "admin@constructsafe.com",
        "password": "Admin@123456",
        "first_name": "John",
        "last_name": "Matthews",
        "role_name": "admin",
        "phone": "+1-555-0101",
    },
    {
        "email": "pm@constructsafe.com",
        "password": "Manager@123456",
        "first_name": "Sarah",
        "last_name": "Jenkins",
        "role_name": "project_manager",
        "phone": "+1-555-0102",
    },
    {
        "email": "inspector@constructsafe.com",
        "password": "Inspector@123456",
        "first_name": "Marcus",
        "last_name": "Vance",
        "role_name": "safety_inspector",
        "phone": "+1-555-0103",
    },
    {
        "email": "worker@constructsafe.com",
        "password": "Worker@123456",
        "first_name": "David",
        "last_name": "Miller",
        "role_name": "worker",
        "phone": "+1-555-0104",
    },
    {
        "email": "client@constructsafe.com",
        "password": "Client@123456",
        "first_name": "Elena",
        "last_name": "Rostova",
        "role_name": "client",
        "phone": "+1-555-0105",
    },
]

async def seed_database(db: AsyncDatabase) -> None:
    """Idempotently seed default permissions, roles, and demo users in MongoDB."""
    now = datetime.now(timezone.utc)

    # 1. Seed Permissions
    for perm in DEFAULT_PERMISSIONS:
        await db.permissions.update_one(
            {"name": perm["name"]},
            {"$setOnInsert": {**perm, "created_at": now}},
            upsert=True
        )

    # 2. Seed Roles
    role_map = {}
    for role in DEFAULT_ROLES:
        result = await db.roles.find_one_and_update(
            {"name": role["name"]},
            {"$set": {
                "display_name": role["display_name"],
                "description": role["description"],
                "permission_names": role["permission_names"],
                "updated_at": now
            }, "$setOnInsert": {"created_at": now}},
            upsert=True,
            return_document=True
        )
        if result:
            role_map[role["name"]] = result["_id"]

    # 3. Seed Demo Users
    for user_info in DEMO_USERS:
        existing = await db.users.find_one({"email": user_info["email"]})
        role_id = role_map.get(user_info["role_name"])
        
        if not existing and role_id:
            await db.users.insert_one({
                "_id": ObjectId(),
                "email": user_info["email"],
                "hashed_password": hash_password(user_info["password"]),
                "first_name": user_info["first_name"],
                "last_name": user_info["last_name"],
                "phone": user_info["phone"],
                "role_id": role_id,
                "role_name": user_info["role_name"],
                "assigned_project_ids": [],
                "is_active": True,
                "last_login_at": None,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            })
            logger.info(f"Seeded demo user: {user_info['email']} [{user_info['role_name']}]")

    # 4. Seed Demo Projects & Assignments
    pm_user = await db.users.find_one({"email": "pm@constructsafe.com"})
    inspector_user = await db.users.find_one({"email": "inspector@constructsafe.com"})
    client_user = await db.users.find_one({"email": "client@constructsafe.com"})
    worker_user = await db.users.find_one({"email": "worker@constructsafe.com"})
    admin_user = await db.users.find_one({"email": "admin@constructsafe.com"})

    pm_id = pm_user["_id"] if pm_user else None
    inspector_id = inspector_user["_id"] if inspector_user else None
    client_id = client_user["_id"] if client_user else None
    admin_id = admin_user["_id"] if admin_user else None

    project_count = await db.projects.count_documents({"deleted_at": None})
    if project_count == 0:
        p1_id = ObjectId()
        p2_id = ObjectId()
        p3_id = ObjectId()

        projects = [
            {
                "_id": p1_id,
                "code": "PRJ-HUDSON-01",
                "name": "Hudson Yards Phase 2",
                "client_name": "Hudson Development Group",
                "client_id": client_id,
                "description": "High-rise commercial construction including structural steel framing, glass curtain walls, and subterranean transit linkages.",
                "location": {
                    "address": "500 West 33rd St",
                    "city": "New York",
                    "state": "NY",
                    "country": "US",
                    "latitude": 40.7538,
                    "longitude": -74.0022
                },
                "status": "active",
                "start_date": datetime(2025, 3, 1, 8, 0, tzinfo=timezone.utc),
                "expected_completion_date": datetime(2027, 8, 30, 17, 0, tzinfo=timezone.utc),
                "estimated_end_date": datetime(2027, 8, 30, 17, 0, tzinfo=timezone.utc),
                "manager_ids": [pm_id] if pm_id else [],
                "inspector_ids": [inspector_id] if inspector_id else [],
                "safety_target_rate": 96.5,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "_id": p2_id,
                "code": "PRJ-METRO-02",
                "name": "Metropolitan Transit Center",
                "client_name": "Metro Transit Authority",
                "client_id": None,
                "description": "Multi-modal transit hub modernizing commuter rail access, escalators, and reinforced concrete underground tunnels.",
                "location": {
                    "address": "100 Journal Square",
                    "city": "Jersey City",
                    "state": "NJ",
                    "country": "US",
                    "latitude": 40.7323,
                    "longitude": -74.0628
                },
                "status": "active",
                "start_date": datetime(2025, 6, 15, 7, 0, tzinfo=timezone.utc),
                "expected_completion_date": datetime(2026, 12, 1, 18, 0, tzinfo=timezone.utc),
                "estimated_end_date": datetime(2026, 12, 1, 18, 0, tzinfo=timezone.utc),
                "manager_ids": [pm_id] if pm_id else [],
                "inspector_ids": [],
                "safety_target_rate": 98.0,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "_id": p3_id,
                "code": "PRJ-HARBOR-03",
                "name": "Harbor View Towers",
                "client_name": "Harbor Real Estate LLC",
                "client_id": None,
                "description": "Twin residential waterfront towers requiring deep foundation pile driving, precast concrete structures, and exterior cranes.",
                "location": {
                    "address": "25 Commercial St",
                    "city": "Brooklyn",
                    "state": "NY",
                    "country": "US",
                    "latitude": 40.7352,
                    "longitude": -73.9575
                },
                "status": "planning",
                "start_date": datetime(2026, 1, 10, 8, 0, tzinfo=timezone.utc),
                "expected_completion_date": datetime(2028, 4, 15, 17, 0, tzinfo=timezone.utc),
                "estimated_end_date": datetime(2028, 4, 15, 17, 0, tzinfo=timezone.utc),
                "manager_ids": [],
                "inspector_ids": [],
                "safety_target_rate": 95.0,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ]
        await db.projects.insert_many(projects)
        logger.info("Seeded 3 demo construction projects.")
    else:
        p1 = await db.projects.find_one({"code": "PRJ-HUDSON-01", "deleted_at": None})
        p2 = await db.projects.find_one({"code": "PRJ-METRO-02", "deleted_at": None})
        p1_id = p1["_id"] if p1 else None
        p2_id = p2["_id"] if p2 else None

    # Always ensure assigned projects are synchronized on users
    if p1_id:
        if pm_id:
            to_assign = [p1_id] + ([p2_id] if p2_id else [])
            await db.users.update_one({"_id": pm_id}, {"$addToSet": {"assigned_project_ids": {"$each": to_assign}}})
        if inspector_id:
            await db.users.update_one({"_id": inspector_id}, {"$addToSet": {"assigned_project_ids": p1_id}})
        if client_id:
            await db.users.update_one({"_id": client_id}, {"$addToSet": {"assigned_project_ids": p1_id}})
        if worker_user:
            await db.users.update_one({"_id": worker_user["_id"]}, {"$addToSet": {"assigned_project_ids": p1_id}})

    # 5. Seed workers
    worker_count = await db.workers.count_documents({"deleted_at": None})
    worker_id_david = ObjectId()
    if worker_count == 0 and p1_id:
        workers = [
            {
                "_id": worker_id_david,
                "employee_id": "W-1001",
                "user_id": worker_user["_id"] if worker_user else None,
                "first_name": "David",
                "last_name": "Miller",
                "email": "worker@constructsafe.com",
                "phone": "+1-555-0104",
                "profile_photo": None,
                "designation": "Scaffolding Specialist",
                "trade": "Scaffolder",
                "contractor_company": "Skyline Rigging Co.",
                "current_project_id": p1_id,
                "assigned_project_ids": [p1_id],
                "joining_date": datetime(2024, 5, 10, tzinfo=timezone.utc),
                "emergency_contact": {
                    "name": "Jane Miller",
                    "relation": "Spouse",
                    "phone": "+1-555-0199"
                },
                "status": "active",
                "training_status": "certified",
                "training_records": [
                    {"module_title": "OSHA 30-Hour Construction Safety", "completion_date": "2024-06-01", "passed": True},
                    {"module_title": "Fall Protection & Harness Inspection", "completion_date": "2024-07-15", "passed": True}
                ],
                "safety_induction_completed": True,
                "induction_date": datetime(2024, 5, 12, tzinfo=timezone.utc),
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "_id": ObjectId(),
                "employee_id": "W-1002",
                "user_id": None,
                "first_name": "Carlos",
                "last_name": "Rodriguez",
                "email": "carlos.r@skylinerigging.com",
                "phone": "+1-555-0211",
                "profile_photo": None,
                "designation": "Journeyman Ironworker",
                "trade": "Steelworker",
                "contractor_company": "Apex Steel Erection",
                "current_project_id": p1_id,
                "assigned_project_ids": [p1_id],
                "joining_date": datetime(2024, 6, 1, tzinfo=timezone.utc),
                "emergency_contact": {
                    "name": "Maria Rodriguez",
                    "relation": "Spouse",
                    "phone": "+1-555-0219"
                },
                "status": "active",
                "training_status": "certified",
                "training_records": [
                    {"module_title": "OSHA 10-Hour Construction", "completion_date": "2024-06-05", "passed": True},
                    {"module_title": "Hot Work & Welding Safety", "completion_date": "2024-08-20", "passed": True}
                ],
                "safety_induction_completed": True,
                "induction_date": datetime(2024, 6, 2, tzinfo=timezone.utc),
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "_id": ObjectId(),
                "employee_id": "W-1003",
                "user_id": None,
                "first_name": "Anthony",
                "last_name": "Chen",
                "email": "a.chen@voltamp.com",
                "phone": "+1-555-0322",
                "profile_photo": None,
                "designation": "Master Electrician",
                "trade": "Electrician",
                "contractor_company": "VoltAmp Electrical Systems",
                "current_project_id": p2_id if p2_id else p1_id,
                "assigned_project_ids": [p2_id] if p2_id else [p1_id],
                "joining_date": datetime(2024, 8, 15, tzinfo=timezone.utc),
                "emergency_contact": {
                    "name": "Grace Chen",
                    "relation": "Sister",
                    "phone": "+1-555-0329"
                },
                "status": "active",
                "training_status": "certified",
                "training_records": [
                    {"module_title": "NFPA 70E Arc Flash Safety", "completion_date": "2024-09-01", "passed": True}
                ],
                "safety_induction_completed": True,
                "induction_date": datetime(2024, 8, 16, tzinfo=timezone.utc),
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            },
            {
                "_id": ObjectId(),
                "employee_id": "W-1004",
                "user_id": None,
                "first_name": "Tyrone",
                "last_name": "Washington",
                "email": "t.washington@heavygear.com",
                "phone": "+1-555-0433",
                "profile_photo": None,
                "designation": "Tower Crane Operator",
                "trade": "Equipment Operator",
                "contractor_company": "HeavyGear Machinery Inc.",
                "current_project_id": p1_id,
                "assigned_project_ids": [p1_id],
                "joining_date": datetime(2024, 9, 1, tzinfo=timezone.utc),
                "emergency_contact": {
                    "name": "Keisha Washington",
                    "relation": "Spouse",
                    "phone": "+1-555-0439"
                },
                "status": "active",
                "training_status": "certified",
                "training_records": [
                    {"module_title": "Crane & Hoist Rigging Certification", "completion_date": "2024-09-05", "passed": True}
                ],
                "safety_induction_completed": True,
                "induction_date": datetime(2024, 9, 2, tzinfo=timezone.utc),
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ]
        await db.workers.insert_many(workers)
        logger.info("Seeded 4 demo workers.")

    # 6. Seed assignments
    assign_count = await db.project_assignments.count_documents({})
    if assign_count == 0 and p1_id:
        assignments = [
            {"_id": ObjectId(), "project_id": p1_id, "user_id": pm_id, "worker_id": None, "role_in_project": "project_manager", "assigned_at": now, "assigned_by": admin_id, "is_active": True},
            {"_id": ObjectId(), "project_id": p1_id, "user_id": inspector_id, "worker_id": None, "role_in_project": "safety_inspector", "assigned_at": now, "assigned_by": admin_id, "is_active": True},
            {"_id": ObjectId(), "project_id": p1_id, "user_id": client_id, "worker_id": None, "role_in_project": "client", "assigned_at": now, "assigned_by": admin_id, "is_active": True},
            {"_id": ObjectId(), "project_id": p1_id, "user_id": None, "worker_id": worker_id_david, "role_in_project": "worker", "assigned_at": now, "assigned_by": pm_id, "is_active": True},
        ]
        if p2_id:
            assignments.append(
                {"_id": ObjectId(), "project_id": p2_id, "user_id": pm_id, "worker_id": None, "role_in_project": "project_manager", "assigned_at": now, "assigned_by": admin_id, "is_active": True}
            )
        await db.project_assignments.insert_many(assignments)
        logger.info("Seeded demo project assignments.")

    # 7. Seed demo inspections
    insp_count = await db.inspections.count_documents({"deleted_at": None})
    demo_insp_id = ObjectId()
    if insp_count == 0 and p1_id and inspector_id:
        inspections = [
            {
                "_id": demo_insp_id,
                "inspection_number": "INS-2026-0001",
                "project_id": p1_id,
                "inspector_id": inspector_id,
                "title": "Comprehensive Structural & Fall Protection Audit",
                "scheduled_date": datetime(2026, 11, 10, 9, 0, tzinfo=timezone.utc),
                "completed_at": datetime(2026, 11, 10, 12, 30, tzinfo=timezone.utc),
                "status": "completed",
                "checklist_items": [
                    {"item_id": "CHK-01", "category": "PPE Compliance", "description": "All personnel on framing deck equipped with Type II hardhats and high-visibility vests", "status": "pass", "passed": True, "notes": "100% compliance observed", "photos": []},
                    {"item_id": "CHK-02", "category": "Work at Heights", "description": "100% tie-off enforced; self-retracting lifelines inspected and tagged", "status": "pass", "passed": True, "notes": "Harness inspection tags current", "photos": []},
                    {"item_id": "CHK-03", "category": "Edge Protection", "description": "Perimeter cable railings tight with intermediate wire rope and toe-boards installed", "status": "fail", "passed": False, "notes": "Loose wire rope section on west corner Deck 14", "photos": []},
                    {"item_id": "CHK-04", "category": "Electrical & Utilities", "description": "GFCI breakers tested on all temporary distribution panels", "status": "pass", "passed": True, "notes": "GFCI test tripped cleanly", "photos": []},
                    {"item_id": "CHK-05", "category": "Housekeeping", "description": "Walkways, stairwells, and egress paths clear of debris and trip hazards", "status": "pass", "passed": True, "notes": "Trash chutes functioning properly", "photos": []},
                    {"item_id": "CHK-06", "category": "Fire Safety", "description": "Multi-purpose 20lb dry chemical extinguishers present and within inspection tags", "status": "pass", "passed": True, "notes": "Extinguishers fully charged", "photos": []}
                ],
                "overall_score": 83.3,
                "notes": "Solid overall site safety. Remediation required for west corner perimeter cable railing on Deck 14.",
                "photographs": [],
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ]
        if p2_id:
            inspections.append({
                "_id": ObjectId(),
                "inspection_number": "INS-2026-0002",
                "project_id": p2_id,
                "inspector_id": inspector_id,
                "title": "Subterranean Tunnel Ventilation & Electrical Review",
                "scheduled_date": datetime(2026, 11, 20, 10, 0, tzinfo=timezone.utc),
                "completed_at": None,
                "status": "scheduled",
                "checklist_items": [
                    {"item_id": "CHK-01", "category": "Confined Space & Air Quality", "description": "Continuous four-gas monitor testing (O2, LEL, CO, H2S)", "status": "pass", "passed": True, "notes": None, "photos": []},
                    {"item_id": "CHK-02", "category": "Emergency Egress", "description": "Illuminated exit signage and backup battery systems operational", "status": "pass", "passed": True, "notes": None, "photos": []}
                ],
                "overall_score": 100.0,
                "notes": "Upcoming scheduled routine weekly audit.",
                "photographs": [],
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            })
        await db.inspections.insert_many(inspections)
        logger.info("Seeded demo inspections.")

    # 8. Seed demo incidents
    demo_inc = await db.incidents.find_one({"title": "Unsecured 2x4 Lumber Dropped from Level 16 Scaffold"})
    demo_inc_id = ObjectId()
    if not demo_inc and p1_id:
        incidents = [
            {
                "_id": demo_inc_id,
                "incident_number": "INC-2026-0001",
                "project_id": p1_id,
                "reported_by": worker_user["_id"] if worker_user else admin_id,
                "occurred_at": datetime(2026, 11, 12, 14, 15, tzinfo=timezone.utc),
                "incident_category": "near_miss",
                "severity": "near_miss",
                "title": "Unsecured 2x4 Lumber Dropped from Level 16 Scaffold",
                "description": "During scaffold repositioning, an unstrapped 2x4 lumber piece fell 2 floors onto secondary debris netting. No injuries occurred, netting contained the object.",
                "location_details": "Tower Core B - Scaffold Bay 3",
                "evidence_photos": [],
                "witness_details": [
                    {"name": "Carlos Rodriguez", "statement": "I heard the wood drop and called out. Netting caught it immediately.", "recorded_at": now}
                ],
                "assigned_investigator_id": inspector_id,
                "status": "under_investigation",
                "investigation": {
                    "lead_investigator_id": inspector_id,
                    "root_cause": "Failure to tie off staging materials prior to deck hoisting",
                    "findings": "Crew needs refresher on staging tie-offs and tool lanyards when working at height.",
                    "witness_statements": [
                        {"name": "Carlos Rodriguez", "contact": "+1-555-0211", "statement": "Debris netting held without damage.", "recorded_at": now}
                    ],
                    "completed_at": None
                },
                "resolved_at": None,
                "resolution_notes": None,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ]
        if p2_id:
            incidents.append({
                "_id": ObjectId(),
                "incident_number": "INC-2026-0002",
                "project_id": p2_id,
                "reported_by": pm_id or admin_id,
                "occurred_at": datetime(2026, 11, 14, 11, 0, tzinfo=timezone.utc),
                "incident_category": "electrical_hazard",
                "severity": "minor_injury",
                "title": "Temporary Sub-Panel Arc Discharge during Cable Pull",
                "description": "A sub-contractor apprentice nicked an energized 120V line while pulling feed conductors, causing a brief spark and tripping the breaker. Worker experienced mild shock without burn.",
                "location_details": "North Mezzanine Utility Vault",
                "evidence_photos": [],
                "witness_details": [],
                "assigned_investigator_id": inspector_id,
                "status": "corrective_action_assigned",
                "investigation": None,
                "resolved_at": None,
                "resolution_notes": None,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            })
        await db.incidents.insert_many(incidents)
        logger.info("Seeded demo incidents.")

    # 9. Seed demo corrective action
    action_count = await db.corrective_actions.count_documents({"deleted_at": None})
    demo_act_id = ObjectId()
    if action_count == 0 and p1_id and pm_id:
        actions = [
            {
                "_id": demo_act_id,
                "action_number": "ACT-2026-0001",
                "project_id": p1_id,
                "source_type": "inspection",
                "source_id": demo_insp_id,
                "title": "Reinforce Cable Guardrail & Install Toe-boards on West Corner",
                "description": "Tension the intermediate wire rope and bolt down steel toe-boards along the edge framing on Deck 14 per OSHA 1926.502(b).",
                "priority": "high",
                "assigned_to": pm_id,
                "due_date": datetime(2026, 11, 22, 17, 0, tzinfo=timezone.utc),
                "completed_at": None,
                "status": "open",
                "resolution_notes": None,
                "completion_evidence": [],
                "verified_by": None,
                "verified_at": None,
                "verification_notes": None,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ]
        await db.corrective_actions.insert_many(actions)
        logger.info("Seeded demo corrective actions.")

    # 10. Seed demo notifications
    notif_count = await db.notifications.count_documents({})
    if notif_count == 0 and pm_id and inspector_id and p1_id:
        notifications = [
            {
                "_id": ObjectId(),
                "recipient_id": pm_id,
                "project_id": p1_id,
                "title": "High Priority Action Assigned",
                "message": "Corrective action ACT-2026-0001 requires perimeter cable guardrail reinforcement by Nov 22.",
                "type": "assignment",
                "severity": "warning",
                "is_read": False,
                "read_at": None,
                "link_url": "/corrective-actions",
                "created_at": now
            },
            {
                "_id": ObjectId(),
                "recipient_id": inspector_id,
                "project_id": p1_id,
                "title": "Near Miss Incident Reported",
                "message": "Incident INC-2026-0001 (Lumber dropped from scaffold) assigned to you for investigation.",
                "type": "incident",
                "severity": "info",
                "is_read": False,
                "read_at": None,
                "link_url": "/incidents",
                "created_at": now
            }
        ]
        await db.notifications.insert_many(notifications)
        logger.info("Seeded demo notifications.")
