# ConstructSafe AI — API Documentation

**Version:** 1.0.0  
**Base URL:** `https://<host>/api/v1`  
**Protocol:** HTTPS (HTTP in local dev)  
**Format:** JSON  

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Standard Response Envelope](#2-standard-response-envelope)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Rate Limiting](#4-rate-limiting)
5. [Pagination](#5-pagination)
6. [Error Codes](#6-error-codes)
7. [Auth Endpoints](#7-auth-endpoints)
8. [User Management Endpoints](#8-user-management-endpoints)
9. [Project Endpoints](#9-project-endpoints)
10. [Worker Endpoints](#10-worker-endpoints)
11. [Camera Endpoints](#11-camera-endpoints)
12. [PPE Detection Endpoints](#12-ppe-detection-endpoints)
13. [Safety Violation Endpoints](#13-safety-violation-endpoints)
14. [Incident Endpoints](#14-incident-endpoints)
15. [Inspection Endpoints](#15-inspection-endpoints)
16. [Notification Endpoints](#16-notification-endpoints)
17. [Report Endpoints](#17-report-endpoints)
18. [Analytics Endpoints](#18-analytics-endpoints)
19. [WebSocket Events](#19-websocket-events)

---

## 1. Design Principles

| Principle | Detail |
|---|---|
| **REST** | Resource-oriented URLs, standard HTTP verbs (GET, POST, PUT, PATCH, DELETE) |
| **Versioning** | All endpoints prefixed with `/api/v1/`. Breaking changes increment to `/api/v2/` |
| **JSON Only** | `Content-Type: application/json` for all request and response bodies |
| **Stateless** | No server-side session state; auth via JWT bearer tokens |
| **HTTPS** | All production traffic over TLS 1.2+ |
| **Idempotency** | PUT/DELETE operations are idempotent; POST operations are not |
| **Soft Delete** | Resources are logically deleted (`deleted_at` timestamp), never physically removed |
| **Consistent Naming** | snake_case for JSON fields; kebab-case for URL paths |
| **UTC Timestamps** | All timestamps in ISO 8601 UTC format: `2024-01-15T10:30:00Z` |
| **Filtering** | Query params for filtering: `?status=active&project_id=1` |
| **Sorting** | `?sort=created_at&order=desc` |

### HTTP Verb Usage

| Verb | Usage |
|---|---|
| `GET` | Retrieve resource(s), never modifies state |
| `POST` | Create a new resource or trigger an action |
| `PUT` | Full replacement update of an existing resource |
| `PATCH` | Partial update of a resource |
| `DELETE` | Soft-delete a resource |

---

## 2. Standard Response Envelope

Every API response (success or error) is wrapped in a standard envelope:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully.",
  "errors": [],
  "pagination": null
}
```

### Envelope Fields

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | `true` on 2xx, `false` on 4xx/5xx |
| `data` | `object \| array \| null` | The resource or list of resources |
| `message` | `string` | Human-readable status message |
| `errors` | `array` | Array of error objects (empty on success) |
| `pagination` | `object \| null` | Present only on paginated list responses |

### Pagination Object

```json
{
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 342,
    "total_pages": 18,
    "has_next": true,
    "has_prev": false
  }
}
```

### Error Object

```json
{
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "field": "email",
      "message": "Must be a valid email address."
    }
  ]
}
```

---

## 3. Authentication & Authorization

### JWT Bearer Token

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Lifetimes

| Token | Lifetime | Storage |
|---|---|---|
| Access Token | 60 minutes | Memory (JS) / `httpOnly` cookie |
| Refresh Token | 7 days | `httpOnly` cookie |

### Role Hierarchy

| Role | Level | Description |
|---|---|---|
| `admin` | 5 | Full system access |
| `project_manager` | 4 | Manage assigned projects |
| `safety_inspector` | 3 | Inspections, violations, incidents |
| `worker` | 2 | View own data, training records |
| `client` | 1 | Read-only dashboard for their project |

---

## 4. Rate Limiting

Rate limits are applied per authenticated user (by JWT subject) or per IP for unauthenticated routes.

| Endpoint Group | Limit | Window |
|---|---|---|
| Auth (`/auth/*`) | 10 requests | 1 minute |
| General API | 300 requests | 1 minute |
| File Upload (`/detections/upload-video`) | 5 requests | 1 minute |
| Webcam Frame (`/detections/webcam-frame`) | 60 requests | 1 minute |
| Reports/Analytics | 30 requests | 1 minute |

**Rate Limit Response Headers:**

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 275
X-RateLimit-Reset: 1705316400
```

**429 Too Many Requests Response:**

```json
{
  "success": false,
  "data": null,
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "errors": [{"code": "RATE_LIMIT_EXCEEDED", "field": null, "message": "Too many requests."}],
  "pagination": null
}
```

---

## 5. Pagination

All list endpoints support cursor-based or page-based pagination via query parameters.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-indexed) |
| `per_page` | integer | 20 | Items per page (max 100) |
| `sort` | string | `created_at` | Field to sort by |
| `order` | string | `desc` | `asc` or `desc` |
| `search` | string | — | Full-text search query |
| `filter[field]` | string | — | Field-level filter, e.g. `filter[status]=active` |

---

## 6. Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/params failed validation |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Authenticated but insufficient role |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource or state conflict |
| 422 | `UNPROCESSABLE_ENTITY` | Semantic errors in request |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `SERVICE_UNAVAILABLE` | AI engine or external dependency offline |

---

## 7. Auth Endpoints

### POST /auth/login

Authenticate a user with email and password, returns access and refresh tokens.

- **Auth Required:** No  
- **Roles:** Public  

**Request Body:**

```json
{
  "email": "admin@constructsafe.ai",
  "password": "SecurePass123!"
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "email": "admin@constructsafe.ai",
      "full_name": "John Admin",
      "role": "admin",
      "avatar_url": null
    }
  },
  "message": "Login successful.",
  "errors": [],
  "pagination": null
}
```

**Error Codes:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED` (invalid credentials), `429 RATE_LIMIT_EXCEEDED`

---

### POST /auth/logout

Invalidate the current refresh token.

- **Auth Required:** Yes  
- **Roles:** All authenticated  

**Request Body:** _(empty)_

**Response `200 OK`:**

```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully.",
  "errors": [],
  "pagination": null
}
```

---

### POST /auth/refresh

Exchange a valid refresh token for a new access token.

- **Auth Required:** No (refresh token in `httpOnly` cookie or body)  

**Request Body:**

```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  },
  "message": "Token refreshed.",
  "errors": [],
  "pagination": null
}
```

**Error Codes:** `401 UNAUTHORIZED` (expired/invalid refresh token)

---

### GET /auth/me

Return the authenticated user's profile.

- **Auth Required:** Yes  
- **Roles:** All authenticated  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@constructsafe.ai",
    "full_name": "John Admin",
    "role": "admin",
    "phone": "+1-555-0100",
    "avatar_url": "/media/avatars/1.jpg",
    "is_active": true,
    "last_login": "2024-01-15T09:00:00Z",
    "created_at": "2023-06-01T12:00:00Z"
  },
  "message": "Profile retrieved.",
  "errors": [],
  "pagination": null
}
```

---

## 8. User Management Endpoints

### GET /users

List all users. Supports pagination, search, and role filter.

- **Auth Required:** Yes  
- **Roles:** `admin`, `project_manager`  
- **Query Params:** `page`, `per_page`, `search`, `filter[role]`, `filter[is_active]`  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "admin@constructsafe.ai",
      "full_name": "John Admin",
      "role": "admin",
      "is_active": true,
      "created_at": "2023-06-01T12:00:00Z"
    }
  ],
  "message": "Users retrieved.",
  "errors": [],
  "pagination": { "page": 1, "per_page": 20, "total_items": 45, "total_pages": 3, "has_next": true, "has_prev": false }
}
```

---

### POST /users

Create a new user account.

- **Auth Required:** Yes | **Roles:** `admin`  

**Request Body:**

```json
{
  "email": "sarah.inspector@constructsafe.ai",
  "full_name": "Sarah Inspector",
  "password": "TempPass123!",
  "role": "safety_inspector",
  "phone": "+1-555-0101",
  "project_ids": [1, 2]
}
```

**Response `201 Created`:**

```json
{
  "success": true,
  "data": { "id": 12, "email": "sarah.inspector@constructsafe.ai", "full_name": "Sarah Inspector", "role": "safety_inspector", "is_active": true, "created_at": "2024-01-15T10:00:00Z" },
  "message": "User created successfully.",
  "errors": [],
  "pagination": null
}
```

**Error Codes:** `400 VALIDATION_ERROR`, `409 CONFLICT` (email already exists)

---

### GET /users/{id}

Retrieve a specific user by ID.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager` (own project users), or self  

**Response `200 OK`:** Full user profile including project assignments.

---

### PUT /users/{id}

Full update of a user record.

- **Auth Required:** Yes | **Roles:** `admin` (any user), authenticated user (own profile only, cannot change role)  

**Request Body:** Same as POST /users (all fields required).

---

### DELETE /users/{id}

Soft-delete a user (sets `is_active=false`, `deleted_at=now()`).

- **Auth Required:** Yes | **Roles:** `admin`  
- **Error Codes:** `403 FORBIDDEN` (cannot delete self), `404 NOT_FOUND`

---

### POST /users/{id}/role

Assign or change a user's role.

- **Auth Required:** Yes | **Roles:** `admin`  

**Request Body:**

```json
{
  "role": "project_manager",
  "project_ids": [3, 5]
}
```

**Response `200 OK`:** Updated user object.

---

## 9. Project Endpoints

### GET /projects

List projects accessible to the authenticated user.

- **Auth Required:** Yes | **Roles:** All  
- **Query Params:** `page`, `per_page`, `search`, `filter[status]`  

**Response `200 OK`:** Paginated list of project summaries.

---

### POST /projects

Create a new construction project.

- **Auth Required:** Yes | **Roles:** `admin`  

**Request Body:**

```json
{
  "name": "Tower Block A — Phase 1",
  "description": "High-rise residential construction, 24 floors.",
  "location": "123 Main St, New York, NY 10001",
  "start_date": "2024-02-01",
  "end_date": "2025-08-31",
  "manager_id": 5,
  "status": "active",
  "site_area_sqm": 4500
}
```

**Response `201 Created`:** Full project object with `id`.

---

### GET /projects/{id}

Get full project detail.

- **Auth Required:** Yes | **Roles:** All (scoped to their projects)  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tower Block A — Phase 1",
    "status": "active",
    "location": "123 Main St, New York, NY 10001",
    "start_date": "2024-02-01",
    "end_date": "2025-08-31",
    "manager": { "id": 5, "full_name": "Mike Manager" },
    "worker_count": 142,
    "camera_count": 8,
    "open_violations": 3,
    "created_at": "2024-01-10T08:00:00Z"
  },
  "message": "Project retrieved.",
  "errors": [],
  "pagination": null
}
```

---

### PUT /projects/{id}

Update a project.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager` (assigned)  

---

### DELETE /projects/{id}

Soft-delete a project.

- **Auth Required:** Yes | **Roles:** `admin`  

---

### GET /projects/{id}/dashboard

Get aggregated KPIs and recent events for a project dashboard.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `client`  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "ppe_compliance_rate": 94.7,
    "open_violations": 3,
    "incidents_this_month": 1,
    "active_workers_today": 118,
    "cameras_online": 7,
    "cameras_total": 8,
    "recent_alerts": [...],
    "compliance_trend_7d": [...]
  },
  "message": "Dashboard data retrieved.",
  "errors": [],
  "pagination": null
}
```

---

### GET /projects/{id}/workers

List workers assigned to a project.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  
- **Query Params:** `page`, `per_page`, `filter[status]`  

**Response `200 OK`:** Paginated list of worker summaries.

---

## 10. Worker Endpoints

### GET /workers

List all workers.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  
- **Query Params:** `page`, `per_page`, `search`, `filter[project_id]`, `filter[status]`

---

### POST /workers

Register a new worker.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`  

**Request Body:**

```json
{
  "user_id": 15,
  "project_id": 1,
  "employee_id": "EMP-2024-0042",
  "trade": "Electrician",
  "company": "ABC Electrical Co.",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+1-555-0199",
  "certifications": ["OSHA-10", "Fall Protection"],
  "hire_date": "2024-01-20"
}
```

**Response `201 Created`:** Full worker object.

---

### GET /workers/{id}

Get a specific worker's full profile.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`, or self  

---

### PUT /workers/{id}

Update a worker's record.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`  

---

### DELETE /workers/{id}

Soft-delete a worker record.

- **Auth Required:** Yes | **Roles:** `admin`  

---

### GET /workers/{id}/training

Retrieve training records and certification history for a worker.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`, or self  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "worker_id": 15,
    "certifications": [
      { "name": "OSHA-10", "issued": "2023-03-15", "expires": "2026-03-15", "status": "valid" },
      { "name": "Fall Protection", "issued": "2023-11-01", "expires": "2024-11-01", "status": "expiring_soon" }
    ],
    "training_sessions": [
      { "id": 7, "title": "PPE Proper Use", "completed_at": "2024-01-10T14:00:00Z", "score": 92 }
    ]
  },
  "message": "Training records retrieved.",
  "errors": [],
  "pagination": null
}
```

---

### GET /workers/{id}/violations

List PPE and safety violations attributed to a worker.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`, or self  
- **Query Params:** `page`, `per_page`, `filter[status]`, `filter[severity]`  

**Response `200 OK`:** Paginated list of violation summaries.

---

## 11. AI Hazard Analysis & Hazard Reports Endpoints

### POST /api/v1/ai/analyze-hazard-photo

Submit an on-site hazard photograph for automated AI computer vision analysis. Returns suggested hazard categories, confidence scores, and bounding box coordinates for inspector confirmation.

- **Auth Required:** Yes | **Roles:** `admin`, `safety_inspector`, `project_manager`
- **Content-Type:** `multipart/form-data`
- **Body:** `file` (Image file: JPEG, PNG, WEBP, max 10MB)

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "photo_url": "/api/v1/storage/files/a9b8c7d6e5.jpg",
    "image_metadata": {
      "filename": "scaffold_hazard.jpg",
      "size_bytes": 1420580,
      "content_type": "image/jpeg",
      "width": 1920,
      "height": 1080
    },
    "ai_analysis": {
      "model_version": "yolov8-construction-v1.0",
      "analyzed_at": "2026-11-17T12:00:00Z",
      "overall_confidence": 0.892,
      "suggested_hazards": [
        {
          "category": "edge_protection_defect",
          "label": "Missing Toe-board & Loose Guardrail",
          "confidence": 0.912,
          "bbox": [120, 340, 480, 560]
        },
        {
          "category": "falling_object",
          "label": "Unsecured Lumber on Deck Edge",
          "confidence": 0.872,
          "bbox": [210, 410, 390, 490]
        }
      ]
    }
  },
  "message": "AI analysis completed. Findings ready for human inspector review.",
  "errors": [],
  "pagination": null
}
```

---

### POST /api/v1/hazards

Safety Inspector submits a confirmed hazard report to Admin for review. Emits an in-app notification to Administrators.

- **Auth Required:** Yes | **Roles:** `admin`, `safety_inspector`

**Request Body:**

```json
{
  "project_id": "6afc3f692527fffffb098a61",
  "location_details": "Floor 14 - West Perimeter Deck",
  "photo_url": "/api/v1/storage/files/a9b8c7d6e5.jpg",
  "category": "falling_object",
  "severity": "high",
  "description": "Unsecured framing lumber resting directly on the slab edge without toe-boards.",
  "notes": "Spoke to the framing subcontractor foreman on site.",
  "ai_analysis": {
    "model_version": "yolov8-construction-v1.0",
    "suggested_hazards": [
      {
        "category": "edge_protection_defect",
        "confidence": 0.912,
        "bbox": [120, 340, 480, 560]
      }
    ]
  },
  "confirmed_categories": ["edge_protection_defect", "falling_object"],
  "inspector_comments": "Confirmed on site; immediate fall hazard for lower deck workers."
}
```

**Response `201 Created`:**

```json
{
  "success": true,
  "data": {
    "id": "6afc51203b8e7fa9128091bc",
    "report_number": "HAZ-2026-0001",
    "status": "pending_admin_review",
    "project_id": "6afc3f692527fffffb098a61",
    "submitted_by": "6afc3571cd965bcd7da9abfc",
    "created_at": "2026-11-17T12:05:00Z"
  },
  "message": "Hazard report submitted and dispatched to Admin review queue.",
  "errors": [],
  "pagination": null
}
```

---

### GET /api/v1/hazards

List hazard reports accessible within the authenticated user's authorized project scope.

- **Auth Required:** Yes | **Roles:** All authenticated roles
- **Query Params:** `page`, `size`, `status` (`pending_admin_review`, `approved`, `rejected`, `action_assigned`), `project_id`, `category`, `severity`

**Response `200 OK`:** Paginated list of hazard report objects.

---

### GET /api/v1/hazards/{id}

Get complete details of a hazard report, including photo evidence, AI suggestions, inspector confirmation, admin review state, and audit trail.

- **Auth Required:** Yes | **Roles:** All authenticated roles (scoped by project)

---

### PATCH /api/v1/hazards/{id}/review

Admin review endpoint to Approve, Reject, or trigger a Corrective Action.

- **Auth Required:** Yes | **Roles:** `admin`

**Request Body (Approve):**
```json
{
  "action": "approve",
  "admin_notes": "Confirmed non-conformance. Project Manager alerted."
}
```

**Request Body (Reject):**
```json
{
  "action": "reject",
  "admin_notes": "Per inspection log, toe-boards were reinstalled prior to concrete pour.",
  "rejection_reason": "Condition already resolved prior to report receipt."
}
```

**Request Body (Assign Corrective Action):**
```json
{
  "action": "assign_corrective_action",
  "admin_notes": "Immediate remediation required per OSHA 1926.502.",
  "corrective_action": {
    "title": "Install toe-boards and perimeter cable railing on Floor 14",
    "priority": "high",
    "assigned_to": "6afc3570cd965bcd7da9abfb",
    "due_date": "2026-11-20T17:00:00Z"
  }
}
```

**Response `200 OK`:** Returns updated hazard report with status `action_assigned`, populated `corrective_action_id`, and appended `audit_trail` record.

---

## 13. Safety Violation Endpoints

### GET /violations

List safety violations.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  
- **Query Params:** `page`, `per_page`, `filter[project_id]`, `filter[worker_id]`, `filter[status]`, `filter[severity]`, `date_from`, `date_to`

---

### POST /violations

Manually create a safety violation record.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

**Request Body:**

```json
{
  "project_id": 1,
  "worker_id": 15,
  "detection_id": "det_001abc",
  "violation_type": "missing_ppe",
  "ppe_items_missing": ["helmet"],
  "severity": "high",
  "location_description": "Zone B, 3rd floor scaffolding",
  "description": "Worker observed without helmet near active lifting zone.",
  "evidence_urls": ["/media/violations/v001_evidence.jpg"]
}
```

**Response `201 Created`:** Full violation object.

---

### GET /violations/{id}

Get a specific violation record.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`, `worker` (own only)  

---

### PUT /violations/{id}

Update a violation record.

- **Auth Required:** Yes | **Roles:** `admin`, `safety_inspector`  

---

### DELETE /violations/{id}

Soft-delete a violation record.

- **Auth Required:** Yes | **Roles:** `admin`  

---

### PUT /violations/{id}/status

Update the status of a violation.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

**Request Body:**

```json
{
  "status": "resolved",
  "resolution_note": "Worker re-briefed and provided helmet on site."
}
```

**Valid Status Values:** `open`, `under_review`, `resolved`, `dismissed`

---

### POST /violations/{id}/corrective-action

Log a corrective action taken for a violation.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

**Request Body:**

```json
{
  "action_type": "verbal_warning",
  "description": "Issued formal verbal warning and issued replacement helmet.",
  "assigned_to_id": 5,
  "due_date": "2024-01-20",
  "evidence_urls": []
}
```

**Response `201 Created`:** Corrective action object.

---

## 14. Incident Endpoints

### GET /incidents

List safety incidents.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  
- **Query Params:** `page`, `per_page`, `filter[project_id]`, `filter[status]`, `filter[severity]`, `date_from`, `date_to`

---

### POST /incidents

Report a new safety incident.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

**Request Body:**

```json
{
  "project_id": 1,
  "title": "Worker fall from scaffolding — Zone C",
  "description": "Worker slipped on wet scaffolding plank. No PPE anchor point attached.",
  "incident_type": "near_miss",
  "severity": "critical",
  "occurred_at": "2024-01-15T09:15:00Z",
  "location_description": "Zone C, 5th floor scaffolding",
  "involved_worker_ids": [15, 22],
  "witness_ids": [18],
  "evidence_urls": ["/media/incidents/inc001_photo1.jpg"]
}
```

**Response `201 Created`:** Full incident object with assigned `id`.

---

### GET /incidents/{id}

Get full incident detail.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

---

### PUT /incidents/{id}

Update an incident record.

- **Auth Required:** Yes | **Roles:** `admin`, `safety_inspector`  

---

### DELETE /incidents/{id}

Soft-delete an incident (rarely used; prefer status update to `archived`).

- **Auth Required:** Yes | **Roles:** `admin`  

---

### PUT /incidents/{id}/status

Update incident workflow status.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

**Request Body:**

```json
{
  "status": "under_investigation",
  "note": "OSHA notification filed. Investigation team assigned."
}
```

**Valid Status Values:** `reported`, `under_investigation`, `resolved`, `closed`, `archived`

---

### GET /incidents/{id}/investigation

Get the investigation report linked to an incident.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "incident_id": 7,
    "investigator_id": 3,
    "root_cause": "Inadequate PPE anchor point inspection before shift.",
    "contributing_factors": ["wet conditions", "time pressure", "missing pre-work inspection"],
    "recommendations": ["Mandatory pre-shift scaffold inspection checklist", "Anchor point audit by Friday"],
    "findings_date": "2024-01-17T14:00:00Z",
    "report_url": "/media/incidents/inc007_investigation.pdf"
  },
  "message": "Investigation report retrieved.",
  "errors": [],
  "pagination": null
}
```

---

## 15. Inspection Endpoints

### GET /inspections

List safety inspections.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  
- **Query Params:** `page`, `per_page`, `filter[project_id]`, `filter[status]`, `filter[inspector_id]`, `date_from`, `date_to`

---

### POST /inspections

Schedule or initiate a safety inspection.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

**Request Body:**

```json
{
  "project_id": 1,
  "inspector_id": 3,
  "inspection_type": "routine",
  "scheduled_date": "2024-01-20",
  "area": "Zone B — Scaffolding and Electrical",
  "description": "Monthly routine site safety inspection."
}
```

**Response `201 Created`:** Inspection object.

---

### GET /inspections/{id}

Get a full inspection record including all checklist items.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  

---

### PUT /inspections/{id}

Update inspection details (description, scheduled date, area).

- **Auth Required:** Yes | **Roles:** `admin`, `safety_inspector`  

---

### DELETE /inspections/{id}

Soft-delete an inspection record.

- **Auth Required:** Yes | **Roles:** `admin`  

---

### POST /inspections/{id}/items

Add checklist items to an inspection.

- **Auth Required:** Yes | **Roles:** `admin`, `safety_inspector`  

**Request Body:**

```json
{
  "items": [
    {
      "category": "PPE",
      "description": "All workers wearing helmets",
      "result": "pass",
      "notes": "",
      "photo_urls": []
    },
    {
      "category": "Scaffolding",
      "description": "Guardrails present and secure on all open sides",
      "result": "fail",
      "notes": "East face guardrail loose at 4th floor junction.",
      "photo_urls": ["/media/inspections/insp3_item2_photo.jpg"]
    }
  ]
}
```

**Response `201 Created`:** Array of created inspection item objects.

---

### PUT /inspections/{id}/complete

Mark an inspection as complete and generate a summary.

- **Auth Required:** Yes | **Roles:** `admin`, `safety_inspector`  

**Request Body:**

```json
{
  "summary": "Overall site safety satisfactory. One critical scaffold finding requires immediate repair.",
  "overall_result": "fail",
  "follow_up_required": true,
  "follow_up_date": "2024-01-22"
}
```

**Response `200 OK`:** Updated inspection with `status: completed`, `completed_at`, and summary statistics.

---

## 16. Notification Endpoints

### GET /notifications

Retrieve notifications for the authenticated user.

- **Auth Required:** Yes | **Roles:** All  
- **Query Params:** `page`, `per_page`, `filter[is_read]`, `filter[type]`  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "type": "ppe_violation",
      "title": "PPE Violation Detected",
      "body": "Missing helmet detected at Gate A camera — Project Tower Block A.",
      "is_read": false,
      "severity": "high",
      "action_url": "/violations/55",
      "created_at": "2024-01-15T10:30:08Z"
    }
  ],
  "message": "Notifications retrieved.",
  "errors": [],
  "pagination": { "page": 1, "per_page": 20, "total_items": 8, "total_pages": 1, "has_next": false, "has_prev": false }
}
```

---

### PUT /notifications/{id}/read

Mark a single notification as read.

- **Auth Required:** Yes | **Roles:** All (own notifications only)  

**Response `200 OK`:** Updated notification object with `is_read: true`, `read_at: "..."`.

---

### POST /notifications/mark-all-read

Mark all of the authenticated user's unread notifications as read.

- **Auth Required:** Yes | **Roles:** All  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": { "marked_read_count": 7 },
  "message": "All notifications marked as read.",
  "errors": [],
  "pagination": null
}
```

---

## 17. Report Endpoints

All report endpoints return pre-computed or on-demand aggregated data. Clients should request these at low frequency (once per session or on explicit user action); heavy caching is applied server-side.

### GET /reports/safety-summary

Overall safety summary report across all accessible projects.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `client`  
- **Query Params:** `date_from`, `date_to`, `project_id` (optional)  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "period": { "from": "2024-01-01", "to": "2024-01-31" },
    "ppe_compliance_rate": 93.2,
    "total_detections": 15420,
    "total_violations": 1047,
    "total_incidents": 3,
    "near_misses": 7,
    "inspections_completed": 12,
    "inspection_pass_rate": 83.3,
    "top_violation_types": [
      { "type": "missing_helmet", "count": 612 },
      { "type": "missing_vest", "count": 310 }
    ]
  },
  "message": "Safety summary report generated.",
  "errors": [],
  "pagination": null
}
```

---

### GET /reports/ppe-compliance

Detailed PPE compliance breakdown by item type, project, and time period.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`, `client`  
- **Query Params:** `date_from`, `date_to`, `project_id`, `group_by` (`day|week|month`)  

**Response `200 OK`:** `data` contains `compliance_by_ppe_type` and `compliance_over_time` arrays.

---

### GET /reports/incidents

Incident report with trend analysis and root-cause breakdown.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  
- **Query Params:** `date_from`, `date_to`, `project_id`, `filter[severity]`  

---

### GET /reports/project/{id}

Full safety report for a specific project.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`, `client`  
- **Query Params:** `date_from`, `date_to`  

**Response `200 OK`:** Comprehensive JSON report including all KPIs, trends, top violations, inspection results, and incident log for the project.

---

## 18. Analytics Endpoints

### GET /analytics/dashboard

Top-level analytics KPIs for the main dashboard.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`  
- **Query Params:** `project_id` (optional), `period` (`7d|30d|90d|1y`)  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "period": "30d",
    "ppe_compliance": { "current": 94.7, "previous": 91.3, "change": 3.4 },
    "violations": { "current": 48, "previous": 72, "change": -24 },
    "incidents": { "current": 1, "previous": 3, "change": -2 },
    "active_workers": { "today": 118, "avg_30d": 124 },
    "cameras_online": { "count": 7, "total": 8 },
    "daily_detection_volume": [
      { "date": "2024-01-01", "detections": 480, "violations": 12 },
      "..."
    ]
  },
  "message": "Dashboard analytics retrieved.",
  "errors": [],
  "pagination": null
}
```

---

### GET /analytics/trends

Time-series trend data for charting compliance, violations, and incidents.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  
- **Query Params:** `project_id`, `metric` (`compliance|violations|incidents|detections`), `period` (`7d|30d|90d`), `group_by` (`day|week`)  

**Response `200 OK`:** Array of `{ date, value }` objects suitable for Recharts.

---

### GET /analytics/heatmap

Spatial heatmap data: violation frequency by site zone or camera location.

- **Auth Required:** Yes | **Roles:** `admin`, `project_manager`, `safety_inspector`  
- **Query Params:** `project_id` (required), `date_from`, `date_to`, `metric` (`violations|detections`)  

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "project_id": 1,
    "zones": [
      { "zone_id": "A", "label": "Main Entrance", "violations": 12, "detections": 540, "risk_level": "low" },
      { "zone_id": "C", "label": "5th Floor Scaffold", "violations": 87, "detections": 310, "risk_level": "critical" }
    ]
  },
  "message": "Heatmap data retrieved.",
  "errors": [],
  "pagination": null
}
```

---

## 19. WebSocket Events

The WebSocket server is available at:

```
ws://<host>/ws?token=<access_token>
```

The JWT access token is validated on connection. The server pushes events to connected clients; clients send acknowledgements.

### Connection Handshake

**Client → Server on connect:**

```json
{
  "type": "subscribe",
  "project_ids": [1, 2],
  "channels": ["ppe_alerts", "violations", "incidents", "camera_status", "notifications"]
}
```

**Server → Client (acknowledgement):**

```json
{
  "type": "connected",
  "user_id": 1,
  "subscribed_projects": [1, 2],
  "subscribed_channels": ["ppe_alerts", "violations", "incidents", "camera_status", "notifications"],
  "server_time": "2024-01-15T10:00:00Z"
}
```

---

### Event: `ppe_alert`

Fired immediately when the AI engine detects a PPE violation.

```json
{
  "type": "ppe_alert",
  "event_id": "evt_abc001",
  "project_id": 1,
  "camera_id": 3,
  "detection_id": "det_001abc",
  "timestamp": "2024-01-15T10:30:05Z",
  "severity": "high",
  "violations": [
    {
      "person_id": 1,
      "missing_ppe": ["helmet"],
      "confidence": 0.91,
      "bbox": [120, 45, 280, 490]
    }
  ],
  "annotated_frame_url": "/media/detections/det_001abc_annotated.jpg"
}
```

---

### Event: `violation_created`

Fired when a violation record is created (by AI or manually).

```json
{
  "type": "violation_created",
  "violation_id": 55,
  "project_id": 1,
  "worker_id": 15,
  "severity": "high",
  "violation_type": "missing_ppe",
  "created_at": "2024-01-15T10:30:08Z"
}
```

---

### Event: `incident_updated`

Fired when an incident's status changes.

```json
{
  "type": "incident_updated",
  "incident_id": 7,
  "project_id": 1,
  "new_status": "under_investigation",
  "updated_by": "Sarah Inspector",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

### Event: `camera_status`

Periodic heartbeat from each active camera (every 30 seconds).

```json
{
  "type": "camera_status",
  "camera_id": 3,
  "project_id": 1,
  "is_online": true,
  "stream_status": "streaming",
  "last_frame_at": "2024-01-15T10:44:58Z",
  "fps_actual": 23.8
}
```

---

### Event: `notification`

Personal notification pushed to a specific user.

```json
{
  "type": "notification",
  "notification_id": 101,
  "user_id": 3,
  "title": "PPE Violation Detected",
  "body": "Missing helmet at Gate A — Tower Block A.",
  "severity": "high",
  "action_url": "/violations/55",
  "created_at": "2024-01-15T10:30:08Z"
}
```

---

### Client Heartbeat (Ping/Pong)

Clients must send a ping every 30 seconds to maintain the connection. The server responds with pong. Connections idle for >60 seconds without a ping are closed.

```json
{ "type": "ping", "timestamp": "2024-01-15T10:45:00Z" }
```

```json
{ "type": "pong", "timestamp": "2024-01-15T10:45:00Z" }
```

---

*End of API Documentation — ConstructSafe AI v1.0*

---

## 8. AI Hazard Analysis & Hazard Reports API

### 8.1 Analyze Hazard Photo (AI Decision Support)
- **Endpoint:** `POST /api/v1/ai/analyze-hazard-photo`
- **Auth:** Bearer Token (Roles: `admin`, `safety_inspector`, `project_manager`)
- **Content-Type:** `multipart/form-data`
- **Request:** Form field `file` (Image file: JPG, PNG, WEBP, max 10MB)
- **Response (200 OK):**
```json
{
  "photo_url": "/api/v1/storage/files/9f8e7d6c5b4a.jpg",
  "image_metadata": {
    "filename": "deck_scaffold.jpg",
    "size_bytes": 1845120,
    "content_type": "image/jpeg"
  },
  "ai_analysis": {
    "model_version": "yolov8-construction-v1.0",
    "analyzed_at": "2026-11-17T12:30:00Z",
    "suggested_hazards": [
      {
        "category": "falling_object",
        "label": "Unsecured Lumber on Deck Edge",
        "confidence": 0.915,
        "bbox": [140, 280, 460, 510]
      },
      {
        "category": "missing_ppe",
        "label": "Worker missing high-visibility vest",
        "confidence": 0.865,
        "bbox": [520, 190, 710, 680]
      }
    ]
  }
}
```

### 8.2 Submit Confirmed Hazard Report to Admin
- **Endpoint:** `POST /api/v1/hazards`
- **Auth:** Bearer Token (Roles: `admin`, `safety_inspector`)
- **Request Body (JSON):**
```json
{
  "project_id": "6afc3f692527fffffb098a61",
  "location_details": "Floor 14 - West Scaffold Bay",
  "photo_url": "/api/v1/storage/files/9f8e7d6c5b4a.jpg",
  "category": "falling_object",
  "severity": "high",
  "description": "Loose lumber and tools on scaffold ledge without tethering or debris nets.",
  "notes": "Spoke to framing subcontractor foreman.",
  "ai_analysis": { ... },
  "confirmed_categories": ["falling_object", "missing_ppe"],
  "inspector_comments": "Confirmed on site; requires toe-board reinforcement."
}
```
- **Response (201 Created):** Creates record with status `pending_admin_review` and sends in-app notification to Admin.

### 8.3 List Hazard Reports
- **Endpoint:** `GET /api/v1/hazards`
- **Auth:** Bearer Token (All authenticated roles; scoped to project access)
- **Query Parameters:** `page`, `size`, `status` (`pending_admin_review`, `approved`, `rejected`, `action_assigned`), `project_id`, `severity`

### 8.4 Admin Review Hazard Report
- **Endpoint:** `PATCH /api/v1/hazards/{id}/review`
- **Auth:** Bearer Token (Role: `admin`)
- **Request Body (JSON):**
```json
{
  "action": "assign_corrective_action", // "approve" | "reject" | "assign_corrective_action"
  "admin_notes": "Immediate remediation required per OSHA 1926.502.",
  "rejection_reason": null,
  "corrective_action": {
    "title": "Install toe-boards and tether scaffold tools on Floor 14",
    "priority": "high",
    "assigned_to": "6afc3570cd965bcd7da9abfb", // PM ID
    "due_date": "2026-11-20T17:00:00Z"
  }
}
```
- **Response (200 OK):** Updates report status to `action_assigned`, spawns linked CAPA in `corrective_actions`, records audit log entry, and notifies Inspector and Project Manager.

---

## 9. Analytics, Safety Reporting & Data Exports API

### 9.1 Executive Safety Dashboard Analytics
- **Endpoint:** `GET /api/v1/analytics/dashboard`
- **Auth:** Bearer Token (Roles: `admin`, `project_manager`, `safety_inspector`, `client`)
- **Query Parameters:**
  - `project_id` (optional): Filter analytics to a specific project.
  - `range` (optional, default `30d`): `7d`, `30d`, `90d`, `1y`, `all`.
- **Response (200 OK):** Returns computed KPIs, monthly trends, distributions, and project comparisons.
```json
{
  "kpis": {
    "total_projects": 4,
    "total_workers": 28,
    "total_hazard_reports": 15,
    "pending_admin_reviews": 3,
    "approved_hazards": 9,
    "rejected_hazards": 1,
    "open_corrective_actions": 5,
    "completed_corrective_actions": 12,
    "total_incidents": 6,
    "safety_inspection_pass_rate": 87.5,
    "average_capa_resolution_time_days": 4.2
  },
  "monthly_hazard_trends": [
    { "month": "2026-09", "total_reported": 4, "approved": 3, "rejected": 0, "action_assigned": 1 },
    { "month": "2026-10", "total_reported": 6, "approved": 4, "rejected": 1, "action_assigned": 1 },
    { "month": "2026-11", "total_reported": 5, "approved": 2, "rejected": 0, "action_assigned": 3 }
  ],
  "incident_severity_distribution": [
    { "severity": "low", "count": 2, "percentage": 33.3 },
    { "severity": "medium", "count": 3, "percentage": 50.0 },
    { "severity": "high", "count": 1, "percentage": 16.7 }
  ],
  "hazard_category_distribution": [
    { "category": "falling_object", "count": 5, "percentage": 33.3 },
    { "category": "missing_ppe", "count": 4, "percentage": 26.7 },
    { "category": "electrical_hazard", "count": 3, "percentage": 20.0 }
  ],
  "capa_status_distribution": [
    { "status": "open", "count": 3 },
    { "status": "in_progress", "count": 2 },
    { "status": "completed", "count": 10 },
    { "status": "verified_closed", "count": 2 }
  ],
  "project_safety_comparisons": [
    {
      "project_id": "6afc3f692527fffffb098a61",
      "project_name": "Hudson Yards Phase 2",
      "project_code": "PRJ-HUDSON-01",
      "hazard_count": 8,
      "incident_count": 2,
      "inspection_pass_rate": 91.2,
      "open_capa_count": 2
    }
  ]
}
```

### 9.2 Sub-Analytics Endpoints
- **Hazard Analytics:** `GET /api/v1/analytics/hazards`
- **Incident Analytics:** `GET /api/v1/analytics/incidents`
- **Inspection Analytics:** `GET /api/v1/analytics/inspections`
- **CAPA Analytics:** `GET /api/v1/analytics/capa`

### 9.3 PDF Safety Reports
Generated on demand via ReportLab with corporate headers, metadata cards, two-pass `NumberedCanvas` ("Page X of Y"), and confidentiality protection:
- `GET /api/v1/reports/project/{project_id}/pdf` — Project Safety Performance Report
- `GET /api/v1/reports/incidents/pdf` — Incident Log & Investigation Summary Report
- `GET /api/v1/reports/inspections/pdf` — Safety Inspection Audit & Compliance Report
- `GET /api/v1/reports/capa/pdf` — Corrective & Preventive Action (CAPA) Closure Report

### 9.4 Tabular Data Exports (CSV & OpenPyXL Excel)
- `GET /api/v1/exports/{report_type}/csv` — Streaming UTF-8 CSV
- `GET /api/v1/exports/{report_type}/xlsx` — Styled Excel spreadsheet with auto-width columns, navy header cells, and alternating zebra rows.
- **Supported `report_type`:** `hazards`, `incidents`, `inspections`, `capa`, `projects`
- **Client Redaction:** For `client` role, worker personal info, internal investigation notes, and witness statements are automatically redacted.
