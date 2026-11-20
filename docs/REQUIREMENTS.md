# ConstructSafe AI — Requirements Specification

> **Document Type:** Software Requirements Specification (SRS)  
> **Version:** 1.0.0  
> **Status:** Baseline  
> **Last Updated:** 2026-11-17  
> **References:** PROJECT_OVERVIEW.md

---

## Table of Contents

1. [Functional Requirements](#1-functional-requirements)
   - 1.1 [Authentication & Authorization](#11-authentication--authorization)
   - 1.2 [Admin Module](#12-admin-module)
   - 1.3 [Project Manager Module](#13-project-manager-module)
   - 1.4 [Safety Inspector Module](#14-safety-inspector-module)
   - 1.5 [Worker Module](#15-worker-module)
   - 1.6 [Client Module](#16-client-module)
   - 1.7 [AI PPE Detection Engine](#17-ai-ppe-detection-engine)
   - 1.8 [AI-Assisted Photo Hazard Analysis & Admin Approval](#18-ai-assisted-photo-hazard-analysis--admin-approval)
   - 1.9 [Safety Incident Management](#19-safety-incident-management)
   - 1.10 [Safety Inspection Management](#110-safety-inspection-management)
   - 1.11 [Reports & Analytics](#111-reports--analytics)
   - 1.12 [Real-time Notifications](#112-real-time-notifications)
   - 1.13 [Worker & Project Management](#113-worker--project-management)
2. [Non-Functional Requirements](#2-non-functional-requirements)
3. [UI/UX Requirements](#3-uiux-requirements)
4. [AI-Specific Requirements](#4-ai-specific-requirements)
5. [Authentication Requirements](#5-authentication-requirements)
6. [Integration Requirements](#6-integration-requirements)
7. [Constraints](#7-constraints)
8. [Acceptance Criteria](#8-acceptance-criteria)

---

## 1. Functional Requirements

### 1.1 Authentication & Authorization

| ID | Requirement |
|----|------------|
| **FR-001** | The system SHALL provide a login page accessible to all roles via username/email and password. |
| **FR-002** | The system SHALL issue a JWT access token (15-minute expiry) and a refresh token (7-day expiry) upon successful login. |
| **FR-003** | The system SHALL enforce role-based access control (RBAC); each API endpoint SHALL validate the user's role before returning data or accepting mutations. |
| **FR-004** | The system SHALL redirect users to their role-specific dashboard immediately after login. |
| **FR-005** | The system SHALL allow password reset via a tokenized email link (or admin-triggered reset for on-premise deployments). |
| **FR-006** | The system SHALL lock an account after 5 consecutive failed login attempts for 15 minutes. |
| **FR-007** | The system SHALL log every successful login, failed attempt, and logout event with IP address and timestamp. |
| **FR-008** | The system SHALL automatically log out inactive sessions after 60 minutes of inactivity (configurable by Admin). |
| **FR-009** | The system SHALL support forced logout of any active session by an Administrator. |
| **FR-010** | The system SHALL prevent access to any protected route when the JWT is expired, returning HTTP 401. |

---

### 1.2 Admin Module

| ID | Requirement |
|----|------------|
| **FR-011** | The Admin Dashboard SHALL display real-time KPIs: total active users, active projects, today's hazards, open incidents, inspections, and pending hazard approvals. |
| **FR-012** | The system SHALL allow Admins to create user accounts with the following fields: full name, email, role, assigned projects, phone number, and status (active/inactive). |
| **FR-013** | The system SHALL allow Admins to edit and deactivate any user account; deactivated accounts cannot log in but their records are retained. |
| **FR-014** | The system SHALL provide an audit log viewable only by Admins, listing all create/update/delete actions with actor, timestamp, entity type, and change summary. |
| **FR-015** | The system SHALL allow Admins to configure global settings: PPE detection confidence thresholds per class, notification escalation rules, data retention period, and working hours. |
| **FR-016** | The system SHALL provide Admins with system health indicators: backend API latency (p95), database connection status, Redis queue depth, and AI worker status. |
| **FR-017** | The system SHALL allow Admins to review, approve, reject, or assign corrective actions for inspector-submitted hazard reports. |
| **FR-018** | The system SHALL allow Admins to assign corrective actions directly from approved hazard reports to Project Managers. |

---

### 1.3 Project Manager Module

| ID | Requirement |
|----|------------|
| **FR-019** | The Project Manager Dashboard SHALL display all projects assigned to the logged-in PM with per-project compliance score, open incident count, and next scheduled inspection date. |
| **FR-020** | The system SHALL allow Project Managers to view the full incident list for their projects, filtered by status, severity, and date. |
| **FR-021** | The system SHALL allow Project Managers to approve or return (with comments) Safety Inspector incident reports. |
| **FR-022** | The system SHALL allow Project Managers to schedule safety inspections by selecting template, date, inspector, and project site. |
| **FR-023** | The system SHALL allow Project Managers to assign workers to projects and define required PPE per zone. |
| **FR-024** | The system SHALL provide Project Managers with a real-time PPE compliance percentage per project, updated at most every 5 minutes. |
| **FR-025** | The system SHALL allow Project Managers to generate and download project-scoped safety reports in PDF and CSV format. |
| **FR-026** | The system SHALL notify Project Managers via in-app alert when an incident is filed on one of their projects or when an inspection is overdue. |

---

### 1.4 Safety Inspector Module

| ID | Requirement |
|----|------------|
| **FR-027** | The Safety Inspector Dashboard SHALL prominently display a live feed of unverified AI detections requiring human review, ordered by most recent first. |
| **FR-028** | The system SHALL allow Safety Inspectors to verify (confirm) or dismiss an AI-flagged PPE violation. Each decision SHALL be recorded with actor and timestamp. |
| **FR-029** | The system SHALL allow Safety Inspectors to file a manual safety incident report from any screen via a floating action button. |
| **FR-030** | The system SHALL allow Safety Inspectors to view and execute their assigned inspection schedule, opening digital checklists directly from the dashboard. |
| **FR-031** | The system SHALL allow Safety Inspectors to upload site photos and execute AI hazard evaluations on their assigned projects. |
| **FR-032** | The system SHALL allow Safety Inspectors to attach up to 10 photographs to any incident or inspection record. |
| **FR-033** | The system SHALL allow Safety Inspectors to record corrective actions against an incident and mark them complete. |
| **FR-034** | The system SHALL display a count of violations pending verification as a badge on the Inspector's navigation item. |

---

### 1.5 Worker Module

| ID | Requirement |
|----|------------|
| **FR-035** | The Worker Dashboard SHALL display the worker's personal PPE compliance score for the current month as a prominent percentage indicator. |
| **FR-036** | The system SHALL show a worker their PPE violation history (last 30 days): date, camera, PPE item missing, inspector verification status. |
| **FR-037** | The system SHALL allow workers to self-report near-miss incidents with a description, location, and optional photo. |
| **FR-038** | The system SHALL display safety bulletins and site-specific rules relevant to the worker's assigned projects. |
| **FR-039** | The system SHALL show the worker's certification records: certification type, issue date, expiry date, and renewal status. |
| **FR-040** | The system SHALL send workers in-app notifications when a new safety bulletin is published for their site, or when their certification is within 30 days of expiry. |
| **FR-041** | The Worker Dashboard SHALL be optimized for tablet screens (minimum 768px) and must be fully usable with a single hand on mobile. |

---

### 1.6 Client Module

| ID | Requirement |
|----|------------|
| **FR-042** | The Client Dashboard SHALL display read-only safety KPIs for the client's contracted project(s): overall compliance rate, total incidents (by severity), and inspection completion rate. |
| **FR-043** | The system SHALL allow Clients to view monthly compliance trend charts (bar/line) for their projects. |
| **FR-044** | The system SHALL allow Clients to download pre-generated safety summary reports in PDF format. |
| **FR-045** | The Client module SHALL be strictly read-only; Clients SHALL have no ability to create, edit, or delete any record. |
| **FR-046** | The system SHALL allow Clients to view inspection completion status (count completed vs. scheduled) but NOT the detailed checklist content. |

---

### 1.7 AI PPE Detection Engine

| ID | Requirement |
|----|------------|
| **FR-047** | The system SHALL detect the following PPE classes in video frames: `helmet`, `safety_vest`, `gloves`, `safety_boots`, `goggles`. |
| **FR-048** | The system SHALL accept static construction photographs (JPEG, PNG, WEBP, max 10MB) for AI hazard detection. |
| **FR-049** | The system SHALL process video uploads as asynchronous Celery background jobs and notify the submitter via WebSocket upon completion. |
| **FR-050** | For each detected object, the system SHALL record: frame timestamp, bounding box coordinates (x, y, w, h), class label, confidence score, and source camera/upload ID. |
| **FR-051** | The system SHALL store a JPEG snapshot of each violation frame, annotated with bounding boxes and class labels, in the evidence store. |
| **FR-052** | The system SHALL create a pending PPE violation record for any worker zone frame where a mandatory PPE item is absent with confidence ≥ configured threshold. |
| **FR-053** | The system SHALL allow the confidence threshold for each PPE class to be configured independently by an Administrator (range 0.0–1.0). |
| **FR-054** | The system SHALL skip AI processing during configured non-working hours to conserve resources (configurable schedule). |

---

### 1.8 CCTV & Camera Monitoring

| ID | Requirement |
|----|------------|
| **FR-055** | The system SHALL allow Admins to register cameras by providing: camera name, location description, RTSP URL, assigned project, and assigned zone. |
| **FR-056** | The system SHALL display camera feed status (Online / Offline / Degraded) updated at least every 30 seconds. |
| **FR-057** | The Camera Monitoring page SHALL provide grid layout options: 1×1, 2×2, and 3×3 camera views selectable by the user. |
| **FR-058** | The system SHALL overlay real-time detection bounding boxes on live camera feeds when AI processing is active. |
| **FR-059** | The system SHALL allow authorized users to click any camera tile in the grid to expand it to full-screen view with detection annotations. |
| **FR-060** | The system SHALL generate an alert notification when a registered camera goes offline (no RTSP connection for > 60 seconds). |
| **FR-061** | The system SHALL allow upload of a pre-recorded video file (MP4, AVI, MKV ≤ 2 GB) for retrospective AI analysis. |
| **FR-062** | The system SHALL display upload progress and job status (Queued, Processing, Completed, Failed) for video upload jobs. |

---

### 1.10 Safety Inspection Management

| ID | Requirement |
|----|------------|
| **FR-063** | The system SHALL allow Admins and Project Managers to create reusable inspection templates with a name, category, and ordered list of checklist items. |
| **FR-064** | Each checklist item SHALL have: question text, expected answer type (Pass/Fail, Yes/No, numeric, text), and whether it is mandatory. |
| **FR-065** | The system SHALL allow scheduling an inspection by associating a template, date/time, assigned inspector, project, and site. |
| **FR-066** | The system SHALL send reminders to the assigned inspector 24 hours and 2 hours before a scheduled inspection. |
| **FR-067** | Safety Inspectors SHALL be able to complete an inspection on a mobile-friendly form, capturing: item results, comments per item, and photo evidence. |
| **FR-068** | Upon inspection submission, the system SHALL auto-generate an inspection report (PDF-renderable) capturing all responses, photos, and a pass/fail summary. |
| **FR-069** | The system SHALL track inspection statuses: Scheduled → In Progress → Submitted → Reviewed. |
| **FR-070** | An inspection SHALL be automatically marked Overdue if not started within 2 hours of its scheduled time. |

---

### 1.11 Reports & Analytics

| ID | Requirement |
|----|------------|
| **FR-071** | The system SHALL provide a **PPE Compliance Trend** report: daily/weekly compliance percentage as a line chart, filterable by project and date range. |
| **FR-072** | The system SHALL provide an **Incident Frequency** report: bar chart of incident counts grouped by type and severity over time. |
| **FR-073** | The system SHALL provide an **Inspection Completion Rate** report: stacked bar chart of completed vs. scheduled inspections per week/month. |
| **FR-074** | The system SHALL provide a **Worker Violation Heatmap**: tabular heatmap showing each worker's violation count per PPE type per period. |
| **FR-075** | The system SHALL provide a **Camera Coverage Analysis** report: uptime percentage, detection event count, and violation rate per camera. |
| **FR-076** | All reports SHALL support export to CSV (raw data) and PDF (formatted with charts). |
| **FR-077** | Report generation SHALL complete within 10 seconds for data sets up to 100,000 detection records. |
| **FR-078** | The system SHALL retain all analytics data for a configurable period (default: 5 years). |

---

### 1.12 Real-time Notifications

| ID | Requirement |
|----|------------|
| **FR-079** | The system SHALL deliver notifications via WebSocket to all connected, eligible users within 10 seconds of a triggering event. |
| **FR-080** | Notification types and their target roles SHALL be: PPE Violation (Inspector, PM), Incident Filed (PM, Inspector), Inspection Due (Inspector), Inspection Overdue (PM, Inspector), Hazard Report Pending Review (Admin), Hazard Report Approved/Rejected (Inspector, PM), Certification Expiring (Worker, Admin). |
| **FR-081** | The system SHALL display an unread notification count badge on the notification bell icon in the navigation bar. |
| **FR-082** | The system SHALL provide a notification center panel showing the last 100 notifications with read/unread state, timestamp, and a link to the relevant record. |
| **FR-083** | Users SHALL be able to mark individual notifications or all notifications as read. |
| **FR-084** | The system SHALL persist all notifications in the database; undelivered notifications (user offline) SHALL be delivered upon next connection. |
| **FR-085** | The system SHALL allow users to configure which notification types they want to receive (per-type toggle in profile settings). |

---

### 1.13 Worker & Project Management

| ID | Requirement |
|----|------------|
| **FR-086** | The system SHALL support a hierarchical organizational structure: Organization → Projects → Sites → Zones. |
| **FR-087** | Admins and PMs SHALL be able to create, edit, and archive projects with fields: name, description, start date, end date, status, and assigned PM. |
| **FR-088** | The system SHALL allow creation and management of worker profiles including: full name, employee ID, role, contact info, photo, assigned projects, and status. |
| **FR-089** | The system SHALL track worker certifications: type (First Aid, Working at Heights, Electrical Safety, etc.), issuing body, issue date, expiry date. |
| **FR-090** | The system SHALL allow Admins and PMs to define required PPE types per zone; workers assigned to a zone inherit those requirements. |
| **FR-091** | The system SHALL send automated alerts when a worker's certification expires within 30 days. |
| **FR-092** | The system SHALL allow bulk import of workers via CSV upload (template provided). |
| **FR-093** | The system SHALL display a worker's full history: all projects, violations, incident involvement, and inspection participation. |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| ID | Requirement |
|----|------------|
| **NFR-001** | API responses for CRUD operations (single record) SHALL complete in < 300 ms at p95 under normal load (≤ 50 concurrent users). |
| **NFR-002** | Dashboard data SHALL load within 2 seconds on a standard broadband connection (≥ 10 Mbps). |
| **NFR-003** | Report generation for datasets up to 50,000 records SHALL complete within 10 seconds. |
| **NFR-004** | The AI detection pipeline SHALL process a 1080p video frame in < 200 ms on CPU (YOLOv8n); GPU execution SHALL be < 50 ms. |
| **NFR-005** | The WebSocket notification delivery SHALL have < 10-second end-to-end latency from event to client receipt. |
| **NFR-006** | The camera feed overlay update rate SHALL be at least 5 FPS for detection annotations over RTSP. |

### 2.2 Scalability

| ID | Requirement |
|----|------------|
| **NFR-007** | The system architecture SHALL support horizontal scaling of the FastAPI backend via Docker Compose replica scaling without data loss. |
| **NFR-008** | The Celery worker pool SHALL scale independently to process up to 20 concurrent AI video analysis jobs. |
| **NFR-009** | The PostgreSQL database schema SHALL support up to 50 concurrent projects, 1,000 registered workers, 100 cameras, and 10 million detection records without structural changes. |
| **NFR-010** | Redis SHALL be used as a message broker and cache layer to decouple real-time event fan-out from the database. |

### 2.3 Security

| ID | Requirement |
|----|------------|
| **NFR-011** | All data in transit SHALL be encrypted using TLS 1.2 or higher (HTTPS/WSS). |
| **NFR-012** | Passwords SHALL be hashed using bcrypt with a minimum cost factor of 12. |
| **NFR-013** | JWT tokens SHALL be signed with HS256 or RS256; signing secrets SHALL be stored in environment variables, never in source code. |
| **NFR-014** | All API endpoints SHALL validate and sanitize inputs to prevent SQL injection, XSS, and path traversal attacks. |
| **NFR-015** | File uploads SHALL be validated for MIME type and scanned for oversized inputs; execution of uploaded files SHALL be strictly prevented. |
| **NFR-016** | RBAC SHALL be enforced server-side; frontend role gates are UI convenience only and SHALL NOT be the sole access control mechanism. |

### 2.4 Availability & Reliability

| ID | Requirement |
|----|------------|
| **NFR-017** | The system SHALL target 99.5% uptime during configured working hours (excluding planned maintenance windows). |
| **NFR-018** | The system SHALL implement health-check endpoints (`/health`, `/readiness`) consumable by Docker health checks. |
| **NFR-019** | Database writes SHALL use transactions to ensure atomicity; failed operations SHALL roll back without partial data corruption. |

### 2.5 Usability

| ID | Requirement |
|----|------------|
| **NFR-020** | A new Safety Inspector with no prior system training SHALL be able to complete their first incident report within 5 minutes of first login, guided by in-app tooltips. |

---

## 3. UI/UX Requirements

### 3.1 Visual Design Language

The ConstructSafe AI interface SHALL follow a **professional enterprise safety aesthetic** with the following mandatory design rules:

| Element | Specification |
|---------|--------------|
| **Background** | Light gray / off-white (`slate-50`, `gray-50`, or `#F8FAFC`) — NO dark backgrounds on main content |
| **Cards / Panels** | White (`#FFFFFF`) with subtle shadow (`shadow-sm` or `shadow-md`) and rounded corners (`rounded-lg`) |
| **Navigation Sidebar** | Slate dark (`slate-800` / `#1E293B`) with white icons and labels |
| **Primary Accent** | Safety Orange (`#F97316` / Tailwind `orange-500`) for CTAs, active states, alert badges |
| **Success / Compliant** | Green (`#22C55E` / `green-500`) for OK status, compliance indicators |
| **Danger / Violation** | Red (`#EF4444` / `red-500`) for violations, overdue items, critical alerts |
| **Warning / Caution** | Amber (`#F59E0B` / `amber-500`) for warnings and pending states |
| **Information** | Blue (`#3B82F6` / `blue-500`) for informational badges and links |
| **Typography** | System font stack or Inter; body text `slate-700`; headings `slate-900` |
| **Borders** | Subtle (`slate-200`) — no heavy borders or box-shadow overuse |

> [!IMPORTANT]
> The following styles are **explicitly prohibited**: neon colors, cyberpunk/dark-mode-only designs, animated gradient backgrounds, glassmorphism panels, excessive drop shadows, blinking elements (except critical unacknowledged alerts), and custom cursor styles.

### 3.2 Layout & Navigation

- **Sidebar navigation** (collapsible on mobile) with role-filtered menu items — users only see links relevant to their role.
- **Top bar** with: breadcrumb path, notification bell (with count badge), user avatar, and logout button.
- **Dashboard cards** arranged in a responsive CSS grid: 1 column (mobile) → 2 columns (tablet) → 4 columns (desktop).
- **Data tables** SHALL include: column sorting, pagination (25/50/100 rows per page), search/filter, and row selection for bulk actions.
- **Forms** SHALL display inline validation errors beneath each invalid field; server-side errors SHALL appear as a toast notification.

### 3.3 Responsive Design

| Breakpoint | Minimum Requirement |
|-----------|-------------------|
| Mobile (≥ 375px) | Worker dashboard and incident filing fully functional |
| Tablet (≥ 768px) | Inspection checklists and camera monitoring 2×2 grid |
| Desktop (≥ 1280px) | Full dashboard with sidebar expanded, 4-column KPI grid, 3×3 camera grid |

### 3.4 Accessibility

- All interactive elements SHALL have ARIA labels.
- Color SHALL NOT be the only differentiator for status (supplement with icons/text labels).
- Minimum contrast ratio: 4.5:1 for body text (WCAG AA).
- All form inputs SHALL have associated `<label>` elements.

### 3.5 Loading & Empty States

- All async data loads SHALL show a skeleton loading state (not a spinner) to preserve layout stability.
- Empty lists and tables SHALL display a contextual empty-state illustration with a call-to-action (e.g., "No incidents reported — Add Incident").
- Error states SHALL display a friendly message with a retry option, not a raw error trace.

---

## 4. AI-Specific Requirements

### 4.1 Model & Detection

| ID | Requirement |
|----|------------|
| **AIR-001** | The AI detection model SHALL be YOLOv8 (nano or small variant) from the Ultralytics library, using pre-trained COCO weights as the base, optionally fine-tuned on a construction PPE dataset. |
| **AIR-002** | The model SHALL detect exactly 5 PPE classes: `helmet`, `safety_vest`, `gloves`, `safety_boots`, `goggles`. |
| **AIR-003** | A **violation** is defined as: a human figure detected in the frame with one or more mandatory PPE items absent (not detected with confidence ≥ threshold). |
| **AIR-004** | The system SHALL draw bounding boxes on each detected object with: color-coded class label, confidence percentage overlay. |
| **AIR-005** | Bounding box colors SHALL follow: Green = PPE present and compliant, Red = PPE absent/violation, Yellow = Below confidence threshold (uncertain). |
| **AIR-006** | The detection pipeline SHALL be implemented using OpenCV for frame capture and preprocessing; the YOLO model runs inference on the preprocessed frame. |

### 4.2 Input Sources

| ID | Requirement |
|----|------------|
| **AIR-007** | **RTSP Stream:** The system SHALL connect to RTSP cameras using OpenCV `VideoCapture` with the camera's RTSP URL; frames SHALL be sampled at a configurable rate (default: 1 frame/second for violation scanning). |
| **AIR-008** | **Video Upload:** The system SHALL accept MP4, AVI, and MKV files; the backend SHALL validate format, store the file, enqueue a Celery job, and return a job ID to the frontend. |
| **AIR-009** | **Browser Webcam:** The frontend SHALL capture webcam frames via the MediaDevices API, send them to the backend as JPEG over HTTP POST, and display annotated results in real time. |

### 4.3 Evidence & Storage

| ID | Requirement |
|----|------------|
| **AIR-010** | For each confirmed violation frame, the system SHALL store: original JPEG frame, annotated JPEG frame (with bounding boxes), JSON metadata (timestamp, camera ID, detections array, job ID). |
| **AIR-011** | Evidence images SHALL be stored in a directory structure: `evidence/{year}/{month}/{day}/{camera_id}/`. |
| **AIR-012** | The database SHALL record: `detection_id`, `source_type` (rtsp/upload/webcam), `source_id`, `frame_timestamp`, `detections` (JSON array), `violation_flag`, `evidence_image_path`, `verified_by`, `verified_at`, `verification_status`. |
| **AIR-013** | Evidence images SHALL NOT be deletable by any user role; only an Admin can purge records older than the configured retention period. |

### 4.4 Human Verification Workflow

| ID | Requirement |
|----|------------|
| **AIR-014** | Every AI-flagged violation SHALL enter a `Pending Verification` state; it SHALL NOT be counted in official compliance metrics until verified. |
| **AIR-015** | Safety Inspectors SHALL see the annotated violation frame, the list of detected/missing PPE items, confidence scores, and camera location. |
| **AIR-016** | Inspectors SHALL choose one of three dispositions: **Confirm** (violation is real), **Dismiss** (false positive), or **Escalate** (requires PM review). |
| **AIR-017** | Upon **Confirm**, the violation SHALL be counted in compliance metrics, the worker (if identifiable) SHALL be notified, and an optional incident report SHALL be auto-drafted. |
| **AIR-018** | Upon **Dismiss**, the frame SHALL be archived as a false positive; confidence threshold auto-tuning suggestions SHALL be logged for Admin review. |
| **AIR-019** | The system SHALL track the false-positive rate per PPE class per camera; Admins can view this in the system health dashboard. |

---

## 5. Authentication Requirements

### 5.1 JWT Configuration

| Parameter | Specification |
|-----------|-------------|
| Algorithm | HS256 (or RS256 for production multi-service) |
| Access Token TTL | 15 minutes |
| Refresh Token TTL | 7 days (rotating refresh tokens) |
| Token Storage | Frontend: `httpOnly` cookie (preferred) or `localStorage` with XSS mitigation |
| Token Payload | `user_id`, `email`, `role`, `project_ids`, `iat`, `exp` |
| Signing Secret | Injected via environment variable `JWT_SECRET_KEY`; never hard-coded |

### 5.2 Role Definitions

| Role | Integer Constant | Permissions Summary |
|------|-----------------|-------------------|
| `admin` | 5 | Full system access, user management, system settings |
| `project_manager` | 4 | All data for assigned projects; approve incidents; schedule inspections |
| `safety_inspector` | 3 | View/create incidents; verify detections; execute inspections for assigned projects |
| `worker` | 2 | Personal dashboard; self-report near-miss; view own compliance |
| `client` | 1 | Read-only access to contracted project KPIs and reports |

### 5.3 Session Management

- Refresh token rotation: a new refresh token is issued with every access token renewal; the old refresh token is invalidated.
- Refresh tokens SHALL be stored in the database with a revocation flag for forced logout capability.
- All tokens for a user are revoked on password change or account deactivation.

---

## 6. Integration Requirements

### 6.1 REST API

| Requirement | Detail |
|------------|--------|
| Protocol | HTTP/1.1 with HTTPS (TLS 1.2+) |
| Format | JSON (application/json) for all request/response bodies |
| Versioning | URL path versioning: `/api/v1/` |
| Documentation | Auto-generated Swagger UI at `/api/docs`; ReDoc at `/api/redoc` |
| Authentication | `Authorization: Bearer <token>` header on all protected endpoints |
| Error Format | RFC 7807 Problem Details: `{"type", "title", "status", "detail", "instance"}` |
| Pagination | Cursor-based or offset-based: `?page=1&per_page=25`; response includes `total`, `page`, `per_page`, `items` |
| Rate Limiting | 100 requests/minute per authenticated user (configurable) |

### 6.2 WebSocket Integration

```
Connection URL: wss://<host>/api/v1/ws?token=<access_token>

Message Format (server → client):
{
  "type": "notification" | "detection_update" | "camera_status" | "job_progress",
  "payload": { ... },
  "timestamp": "ISO-8601"
}

Client heartbeat: PING frame every 30s; server responds with PONG.
Reconnect: Client SHALL implement exponential backoff reconnection (1s, 2s, 4s, 8s, max 60s).
```

### 6.3 RTSP Camera Integration

| Parameter | Requirement |
|-----------|-----------|
| Protocol | RTSP over TCP (preferred) or UDP |
| Resolution | Supports 480p, 720p, 1080p; detection runs on 640×640 resized frames |
| Codec | H.264/H.265 (decoded by OpenCV + FFmpeg backend) |
| Authentication | RTSP digest auth credentials stored encrypted in DB |
| Reconnect | Auto-reconnect after 10-second connection failure; alert after 60-second sustained failure |
| FFmpeg Dependency | FFmpeg must be installed in the AI worker Docker image |

### 6.4 File Upload Integration

| Parameter | Requirement |
|-----------|-----------|
| Accepted Formats | MP4, AVI, MKV |
| Maximum Size | 2 GB (configurable via `MAX_UPLOAD_SIZE` env var) |
| Upload Protocol | HTTP multipart/form-data POST |
| Progress | Server-Sent Events or WebSocket job progress messages |
| Storage | Uploaded files stored at `uploads/{job_id}/original.{ext}` |

---

## 7. Constraints

### 7.1 Technology Constraints

| Constraint | Rationale |
|-----------|-----------|
| **No paid APIs** | All AI models, mapping services, email services, and storage must be open-source or self-hosted. SMTP can use a local mail server or be disabled. |
| **Local/on-premise only** | The entire stack runs via `docker compose up`; no cloud provider account required. |
| **Free model weights** | YOLOv8 base weights (Ultralytics) are free for use. Any fine-tuned dataset must also be freely available or customer-provided. |
| **No proprietary camera SDKs** | Camera integration is RTSP-only; manufacturer-specific SDKs (e.g., Hikvision SDK) are not in scope. |
| **OpenCV for frame capture** | Frame capture and preprocessing must use OpenCV (`cv2`), not proprietary video libraries. |
| **PostgreSQL only** | No other relational databases (MySQL, SQLite for production) are supported; SQLite may be used for unit tests only. |

### 7.2 Operational Constraints

| Constraint | Detail |
|-----------|--------|
| **Minimum hardware** | 4-core CPU, 8 GB RAM, 100 GB SSD for single-node deployment without GPU. |
| **GPU optional** | The AI worker image SHALL detect CUDA availability and fall back to CPU inference automatically. |
| **Docker required** | Docker Engine 24+ and Docker Compose v2 must be installed on the host. |
| **Port reservations** | Frontend: 3000, Backend API: 8000, PostgreSQL: 5432, Redis: 6379, MinIO (optional): 9000 |
| **Environment variables** | All secrets (JWT key, DB password, RTSP credentials) are injected via `.env` file; no hardcoded credentials. |

---

## 8. Acceptance Criteria

### AC-01: User Authentication

- **Given** a valid email and password, **When** the user submits the login form, **Then** they receive a JWT and are redirected to their role dashboard within 2 seconds.
- **Given** an invalid password, **When** submitted 5 times consecutively, **Then** the account is locked and a lock message is displayed.
- **Given** an expired access token, **When** the client sends any API request, **Then** a 401 response triggers automatic token refresh using the refresh token.

### AC-02: AI PPE Detection (Video Upload)

- **Given** an MP4 video file containing workers without helmets, **When** uploaded and processed, **Then** the system creates PPE violation records with bounding-box annotated frames within 30 seconds of job completion.
- **Given** a video where all workers wear full PPE, **When** processed, **Then** no violation records are created and the job status shows "Completed — Compliant."
- **Given** an upload exceeding 2 GB, **When** submitted, **Then** the upload is rejected with a clear error message before processing begins.

### AC-03: AI PPE Detection (Live RTSP)

- **Given** a registered RTSP camera is online, **When** AI monitoring is enabled, **Then** the system samples frames and creates violation records within 10 seconds of a non-compliant worker entering the frame.
- **Given** the camera RTSP stream drops, **When** no connection is established for 60 seconds, **Then** a "Camera Offline" notification is delivered to Admin and PM.

### AC-04: Human Verification

- **Given** an AI-detected violation in Pending state, **When** an Inspector clicks Confirm, **Then** the violation status becomes Confirmed, the timestamp and inspector name are recorded, and compliance metrics update accordingly.
- **Given** an Inspector dismisses a detection, **When** dismissed, **Then** the record is archived as a false positive and excluded from compliance metrics.

### AC-05: Incident Management

- **Given** a Safety Inspector files an incident report with all required fields, **When** submitted, **Then** the incident appears in the PM's dashboard within 5 seconds (via WebSocket), and the incident is assigned status "Open."
- **Given** a PM reviews and approves an incident, **When** approved, **Then** the incident status changes to "Under Investigation" and the Inspector receives an in-app notification.

### AC-06: Inspection Workflow

- **Given** a PM schedules an inspection for a specific date and inspector, **When** the scheduled time arrives, **Then** the inspector receives a reminder notification 2 hours prior.
- **Given** an inspection is not started within 2 hours of its scheduled time, **When** the grace period passes, **Then** the inspection is automatically marked Overdue and the PM is notified.
- **Given** an Inspector submits a completed inspection, **When** submitted, **Then** a formatted inspection report is auto-generated and downloadable from the inspection record.

### AC-07: Real-time Notifications

- **Given** a connected Inspector, **When** a new PPE violation is detected on their assigned camera, **Then** an in-app notification appears within 10 seconds without page refresh.
- **Given** a user is offline when a notification is generated, **When** they next log in and connect, **Then** all missed notifications appear in their notification center in correct chronological order.

### AC-08: Reports & Analytics

- **Given** a PM requests a PPE Compliance Trend report for a 30-day range, **When** generated, **Then** the report renders as a line chart and is available for PDF and CSV download within 10 seconds.
- **Given** a Client views their project dashboard, **Then** they can see KPI cards and compliance charts but cannot access any form, button, or link that modifies data.

### AC-09: Camera Monitoring Grid

- **Given** a Safety Inspector opens the Camera Monitoring page with 4 registered cameras online, **When** the 2×2 grid layout is selected, **Then** all 4 live feeds render with detection overlays within 5 seconds.
- **Given** an Admin removes a camera, **When** removed, **Then** the camera disappears from all monitoring grids and no further RTSP connections are attempted.

### AC-10: Worker Profile & Certifications

- **Given** a worker's certification is 29 days from its expiry date, **Then** the system sends the worker and Admin an in-app notification within that calendar day.
- **Given** an Admin uploads a worker CSV, **When** the import is successful, **Then** all valid rows create worker records and an import summary (rows imported, rows skipped with reasons) is displayed.

---

*Document maintained by the ConstructSafe AI Architecture Team. Implementation teams should treat this document as the authoritative source of truth for all feature development. Any deviation requires a formal change request and version increment.*
