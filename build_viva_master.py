"""
ConstructSafe AI – Complete Viva Voce Q&A Generator
Compiles 50+ comprehensive viva questions across 10 technical categories.
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

from generate_viva_file import (
    OUTPUT_DOCX, OUTPUT_MD, LOGO_PATH,
    COLOR_NAVY, COLOR_TEXT, COLOR_MUTED, COLOR_BLUE, COLOR_AMBER,
    add_callout, add_qna, add_sec, set_cell_background, set_cell_margins
)

def build_viva_guide():
    print("Initializing Viva Voce Document...")
    doc = Document()
    md_lines = []
    
    # Page setup
    for s in doc.sections:
        s.page_width = Inches(8.27)
        s.page_height = Inches(11.69)
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    # Document Header
    p_h = doc.add_paragraph()
    p_h.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_h.paragraph_format.space_before = Pt(6)
    p_h.paragraph_format.space_after = Pt(2)
    r_h = p_h.add_run("CONSTRUCTSAFE AI — COMPREHENSIVE VIVA VOCE EXAMINATION GUIDE")
    r_h.font.name = "Segoe UI"
    r_h.font.size = Pt(16)
    r_h.font.bold = True
    r_h.font.color.rgb = COLOR_NAVY
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(14)
    r_sub = p_sub.add_run("Complete Technical, Architectural, Code, Machine Learning & Viva Defense Handbook\nSR University – School of Computer Science & Artificial Intelligence")
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(10.5)
    r_sub.font.color.rgb = COLOR_MUTED
    
    md_lines.append("# ConstructSafe AI — Comprehensive Viva Voce Examination Guide\n")
    md_lines.append("> **Complete Technical, Architectural, Code, Machine Learning & Viva Defense Handbook**\n")
    md_lines.append("> **SR University – School of Computer Science & Artificial Intelligence**\n\n---\n")

    # =========================================================================
    # SECTION 1: PROJECT OVERVIEW & DOMAIN KNOWLEDGE
    # =========================================================================
    add_sec(doc, "SECTION 1: PROJECT OVERVIEW & DOMAIN KNOWLEDGE", md_lines)
    
    add_qna(doc, 1,
        "What is ConstructSafe AI in simple terms?",
        "ConstructSafe AI is an enterprise-grade web platform designed to improve construction site safety. It allows safety inspectors and site workers to upload photographs taken on site, uses an AI model (YOLOv8) to detect hazards (like missing helmets, exposed live wires, fall hazards, and blocked emergency exits) in less than 100 milliseconds, and automatically triggers an actionable workflow (Corrective & Preventive Action - CAPA) so the hazard gets fixed and verified.",
        tip="Begin your viva answer with this crisp 2-sentence elevator pitch. It shows you understand the big picture before diving into technical details.",
        md_lines=md_lines
    )

    add_qna(doc, 2,
        "What real-world problem does your project solve?",
        "In the construction sector, 1 in 5 workplace fatalities occur worldwide. Safety monitoring currently relies on manual clipboard inspections or unorganized WhatsApp groups. These methods suffer from human fatigue, slow reporting (taking 24–72 hours to log a hazard), and zero accountability for who fixes the danger. ConstructSafe AI cuts hazard detection and reporting time to seconds and provides an end-to-end digital audit trail.",
        md_lines=md_lines
    )

    add_qna(doc, 3,
        "What are OSHA's 'Fatal Four' construction hazards?",
        "The Occupational Safety and Health Administration (OSHA) identifies the 'Fatal Four' hazards responsible for over 60% of all construction deaths: 1) Falls from heights, 2) Struck-by incidents (falling objects or moving machinery), 3) Caught-in or between objects (trench cave-ins, rotating equipment), and 4) Electrocutions. Our AI model specifically targets fall risks, electrical hazards, and missing PPE related to these risks.",
        md_lines=md_lines
    )

    add_qna(doc, 4,
        "Why did you choose photo-based AI detection instead of 24/7 CCTV surveillance cameras?",
        "Continuous CCTV surveillance on construction sites has major drawbacks: 1) High infrastructure cost (cabling, power, rugged cameras on raw dirt sites), 2) High network bandwidth requirements, 3) Frequent camera blinding from dust, concrete spray, and crane movements, and 4) Serious worker privacy and surveillance pushback. Our photo-upload approach is on-demand, works on any smartphone, requires no fixed hardware, and respects worker privacy.",
        tip="Examiners frequently ask this. Emphasize 'privacy-preserving' and 'zero infrastructure cost'.",
        md_lines=md_lines
    )

    add_qna(doc, 5,
        "What is the 'human-in-the-loop' concept in your project and why is it important?",
        "Human-in-the-loop means artificial intelligence assists the human but does not make final critical safety decisions autonomously. In ConstructSafe AI, when the YOLOv8 model detects a hazard, the findings are displayed to a certified Safety Inspector who validates or edits the severity before submission. Then an Administrator reviews and approves it before a CAPA is issued. This eliminates costly false alarms and ensures legal accountability.",
        md_lines=md_lines
    )

    add_qna(doc, 6,
        "What are the 5 user roles in your platform?",
        "The five roles are: 1) Administrator (full system oversight, user/project management, hazard review queue, enterprise analytics), 2) Project Manager (assigned project oversight, workforce monitoring, tracking open CAPAs), 3) Safety Inspector (conducting audits, uploading hazard photos, AI analysis, incident reporting), 4) Field Worker (viewing assigned daily tasks, training status, uploading photo proof of fixes), and 5) Client (read-only project safety scorecards and compliance summaries).",
        md_lines=md_lines
    )

    add_qna(doc, 7,
        "What is CAPA and how does it work in ConstructSafe AI?",
        "CAPA stands for Corrective and Preventive Action. In our system, when an Admin approves a hazard, a CAPA ticket is automatically spawned in MongoDB. It has a designated assignee (worker or PM), a deadline based on hazard severity (Critical = 24h, High = 72h, Medium = 7d), mitigation instructions, and requires photo proof of the fix before the inspector re-inspects and marks it closed.",
        md_lines=md_lines
    )

    # =========================================================================
    # SECTION 2: FRONTEND & UI/UX (React 18, TypeScript, Vite, Tailwind)
    # =========================================================================
    add_sec(doc, "SECTION 2: FRONTEND & UI/UX (React 18, TypeScript, Vite, Tailwind CSS)", md_lines)

    add_qna(doc, 8,
        "Why did you choose React 18 for the frontend?",
        "React 18 provides component-based reusability, single-page application (SPA) responsiveness, and modern features like Concurrent Rendering and automatic state batching. It allowed us to build 5 independent, role-scoped dashboards, an interactive AI hazard simulator, and real-time notification components that re-render instantly without reloading the browser page.",
        md_lines=md_lines
    )

    add_qna(doc, 9,
        "Why use TypeScript instead of plain JavaScript?",
        "TypeScript introduces compile-time static type checking. In a multi-role safety application with complex schemas (users, projects, hazards, CAPAs), TypeScript caught dozens of potential runtime bugs during development—such as undefined object properties, missing API payload fields, and mismatched IDs—before the code ever reached the browser.",
        md_lines=md_lines
    )

    add_qna(doc, 10,
        "Why did you use Vite instead of Create React App (CRA)?",
        "Create React App uses Webpack, which bundles the entire application before starting the dev server, resulting in slow startup times (30–60 seconds). Vite leverages native ES Modules (ESM) in modern browsers and the ultra-fast Esbuild pre-bundler written in Go. Server start is practically instant (<300ms) and Hot Module Replacement (HMR) updates the UI in milliseconds without losing application state.",
        md_lines=md_lines
    )

    add_qna(doc, 11,
        "How does Tailwind CSS work and what is utility-first CSS?",
        "Tailwind CSS is a utility-first CSS framework that provides low-level utility classes like `flex`, `pt-4`, `text-center`, and `rounded-xl`. Instead of writing custom CSS files with naming conflicts, classes are applied directly in JSX. Tailwind's Just-In-Time (JIT) compiler scans template files and generates only the CSS rules actually used, producing an ultra-small production stylesheet (<50KB).",
        md_lines=md_lines
    )

    add_qna(doc, 12,
        "What is the Visionex Astro design system you implemented?",
        "Visionex Astro is a professional SaaS design language by Themefisher. It uses a high-contrast, clean color palette: Dark Navy (#121926) for sidebar and primary cards, Safety Yellow (#FFDD00) for active action buttons and hazard tags, and Light Gray (#FBFBFB) for background surfaces. It emphasizes generous white space, rounded 12px cards, Raleway headings, and Lato body font, completely eliminating neon/cyberpunk clutter.",
        md_lines=md_lines
    )

    add_qna(doc, 13,
        "How do you manage client-side state across your application?",
        "We use React's built-in Context API (`AuthContext`) combined with custom hooks (`useAuth`). The `AuthContext` stores the authenticated user object, active JWT token, user role, and session expiration. Child components access user details without 'prop drilling'. Local component state is handled using `useState` and asynchronous data fetching via `useEffect`.",
        md_lines=md_lines
    )

    add_qna(doc, 14,
        "How do Route Guards (ProtectedRoute) work in your React code?",
        "A custom `ProtectedRoute` wrapper component intercepts navigation in `react-router-dom`. When a user attempts to visit a URL (e.g., `/dashboard/admin`), the component checks: 1) Is the user authenticated? If not, redirect to `/login`. 2) Does the user's role match the permitted roles for that route? If not, redirect to their authorized dashboard or show an Access Denied view.",
        code_snippet="""// Frontend Route Guard Example
export const ProtectedRoute = ({ allowedRoles, children }) => {
    const { user, isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }
    return children;
};""",
        md_lines=md_lines
    )

    add_qna(doc, 15,
        "How do you render interactive charts in the dashboards?",
        "We use Recharts, a composable React charting library built on SVG elements and D3 scales. We render BarCharts for project-wise safety scores, PieCharts for hazard severity distribution (Low, Medium, High, Critical), and AreaCharts for monthly safety incident trends.",
        md_lines=md_lines
    )

    # =========================================================================
    # SECTION 3: BACKEND & REST API (FastAPI, Python 3.12, Uvicorn)
    # =========================================================================
    add_sec(doc, "SECTION 3: BACKEND & REST API (FastAPI, Python 3.12, Uvicorn)", md_lines)

    add_qna(doc, 16,
        "Why did you choose FastAPI over Django or Flask?",
        "1) Performance: FastAPI is one of the fastest Python frameworks, comparable to NodeJS and Go, because it is built on Starlette and uvloop. 2) Asynchronous Support: Native `async/await` enables non-blocking I/O operations for database queries and AI model inference. 3) Automatic Validation: Integrated Pydantic automatically validates request bodies and query parameters. 4) Auto Documentation: Generates interactive Swagger UI (/docs) and ReDoc documentation automatically.",
        tip="Highlight: 'Django is synchronous and too heavy for a pure REST API; Flask lacks native async and built-in type validation; FastAPI was the modern, high-performance choice.'",
        md_lines=md_lines
    )

    add_qna(doc, 17,
        "What is Uvicorn and what is the difference between ASGI and WSGI?",
        "WSGI (Web Server Gateway Interface) is the older, synchronous Python standard (used by Flask/Django), handling one request per worker thread. ASGI (Asynchronous Server Gateway Interface) is the modern asynchronous standard that allows Python applications to handle thousands of concurrent long-lived connections (async HTTP, WebSockets). Uvicorn is a lightning-fast ASGI server that runs our FastAPI application.",
        md_lines=md_lines
    )

    add_qna(doc, 18,
        "What is Pydantic and how is it used in your project?",
        "Pydantic is a data validation and settings management library using Python type annotations. In ConstructSafe AI, Pydantic models define strict schemas for every request and response (e.g., `UserCreateRequest`, `HazardReportCreate`, `CAPAUpdateSchema`). If an incoming HTTP request has missing fields, wrong types, or malformed values, Pydantic immediately returns an HTTP 422 Unprocessable Entity with exact error locations, protecting our database from corrupt data.",
        code_snippet="""class HazardReportCreate(BaseModel):
    project_id: str
    hazard_type: str = Field(..., min_length=3)
    severity: Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    description: str
    location: str
    bbox: list[float] | None = None""",
        md_lines=md_lines
    )

    add_qna(doc, 19,
        "What is Dependency Injection in FastAPI and how did you use it?",
        "Dependency Injection is a design pattern where a function declares the dependencies it needs instead of creating them internally. In FastAPI, this is done using `Depends()`. We use it for: 1) `get_db` to inject database connections, 2) `get_current_user` to validate the JWT token in HTTP Authorization headers, and 3) `require_roles(['admin', 'project_manager'])` to enforce RBAC permissions before the endpoint code executes.",
        code_snippet="""@router.post("/reports/{report_id}/approve")
async def approve_hazard_report(
    report_id: str,
    current_user: User = Depends(require_roles(["admin"])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Only executes if current_user has role 'admin'""",
        md_lines=md_lines
    )

    add_qna(doc, 20,
        "What are APIRouters in FastAPI?",
        "APIRouters allow modularizing the application into dedicated files rather than putting all routes in `main.py`. In ConstructSafe AI, we have separate routers for: `auth.py`, `projects.py`, `workers.py`, `hazards.py`, `inspections.py`, `incidents.py`, `capa.py`, `analytics.py`, and `notifications.py`. Each router is mounted in `main.py` with its own prefix (e.g., `/api/v1/hazards`) and tags.",
        md_lines=md_lines
    )

    add_qna(doc, 21,
        "What is CORS and why did you configure CORSMiddleware?",
        "CORS stands for Cross-Origin Resource Sharing. By default, web browsers block web pages hosted on one origin (e.g., frontend on `http://localhost:5173`) from making AJAX/Fetch requests to a different origin (e.g., backend on `http://localhost:8000`). We added FastAPI's `CORSMiddleware` with explicit allowed origins, credentials support, and allowed HTTP methods to permit secure communication between frontend and backend.",
        md_lines=md_lines
    )

    add_qna(doc, 22,
        "What HTTP status codes does your API return?",
        "Our API follows strict REST conventions: 200 OK (successful fetch/update), 201 Created (resource successfully inserted), 400 Bad Request (business logic violations), 401 Unauthorized (missing or expired JWT), 403 Forbidden (insufficient role permissions), 404 Not Found (resource ID does not exist), 422 Unprocessable Entity (Pydantic schema validation failure), 429 Too Many Requests (rate limit exceeded), and 500 Internal Server Error.",
        md_lines=md_lines
    )

    # =========================================================================
    # SECTION 4: AI & COMPUTER VISION (YOLOv8, PyTorch, PIL)
    # =========================================================================
    add_sec(doc, "SECTION 4: ARTIFICIAL INTELLIGENCE & COMPUTER VISION (YOLOv8, PyTorch)", md_lines)

    add_qna(doc, 23,
        "What is YOLOv8 and what does YOLO stand for?",
        "YOLO stands for 'You Only Look Once'. It is an ultra-fast, state-of-the-art deep learning architecture developed by Ultralytics for real-time object detection. Unlike traditional two-stage detectors (like Faster R-CNN) that first generate region proposals and then classify them, YOLO reframes object detection as a single regression problem, predicting bounding box coordinates and class probabilities directly from full images in a single forward pass.",
        md_lines=md_lines
    )

    add_qna(doc, 24,
        "What 4 hazard classes does your model detect?",
        "Our model detects four critical construction hazards: 1) Missing PPE (workers without mandatory hardhats or safety vests), 2) Electrical Hazard (exposed wiring, open distribution boards), 3) Fall Risk (unprotected elevated slab edges, missing guardrails), and 4) Emergency Egress Obstruction (construction debris or tools blocking stairwells and exit corridors).",
        md_lines=md_lines
    )

    add_qna(doc, 25,
        "What is a Bounding Box and how are coordinates formatted?",
        "A bounding box is a rectangular perimeter that encloses a detected object in an image. YOLOv8 outputs bounding boxes in `xyxy` format: `[xmin, ymin, xmax, ymax]`, where `(xmin, ymin)` is the top-left pixel corner and `(xmax, ymax)` is the bottom-right corner. These coordinates are normalized (0.0 to 1.0) relative to image width and height so they scale responsively on any screen resolution.",
        md_lines=md_lines
    )

    add_qna(doc, 26,
        "What is Non-Maximum Suppression (NMS) and why is it needed?",
        "When an object detection model scans an image, it often predicts multiple overlapping bounding boxes for the exact same physical hazard. Non-Maximum Suppression (NMS) is a post-processing algorithm that sorts all candidate boxes by confidence score, selects the box with highest confidence, and suppresses (deletes) any neighboring boxes whose Intersection over Union (IoU) with the top box exceeds a threshold (typically 0.45), ensuring only one clean box surrounds each hazard.",
        tip="Examiners love asking about NMS. Mention 'IoU overlap threshold' and 'suppressing redundant duplicate boxes'.",
        md_lines=md_lines
    )

    add_qna(doc, 27,
        "What is the inference time of your model and how did you measure it?",
        "Our model achieves an inference latency of 84ms to 100ms per image on a standard CPU / consumer GPU. We measure latency by recording timestamps immediately before passing the PIL image tensor into `model(image)` and immediately after obtaining `results[0].boxes`, returning the elapsed duration to the user interface.",
        md_lines=md_lines
    )

    add_qna(doc, 28,
        "What is the difference between training, fine-tuning, and inference? Which runs in your app?",
        "Training trains a neural network from scratch using millions of randomly initialized weights. Fine-tuning (Transfer Learning) takes a pre-trained model (like YOLOv8 pre-trained on the COCO dataset) and trains its final classification layers on a specialized domain dataset (construction safety hazards). Inference is the act of passing an unseen image through the trained model to produce predictions. Our live web application runs inference.",
        md_lines=md_lines
    )

    # =========================================================================
    # SECTION 5: DATABASE & PERSISTENCE (MongoDB, Motor, PyMongo)
    # =========================================================================
    add_sec(doc, "SECTION 5: DATABASE & PERSISTENCE (MongoDB Community, Motor Async)", md_lines)

    add_qna(doc, 29,
        "Why did you choose MongoDB (NoSQL) over a relational SQL database?",
        "1) Schema Flexibility: Hazard reports, inspection checklists, and audit logs have highly dynamic nested attributes (e.g., dynamic bounding box arrays, variable inspection checklist items, polymorphic audit details) that fit naturally into JSON/BSON documents without complex multi-table joins. 2) Asynchronous Speed: Combined with the Motor async driver, MongoDB handles high write volumes seamlessly. 3) Scalability: Horizontal sharding makes scaling across multiple jobsites straightforward.",
        md_lines=md_lines
    )

    add_qna(doc, 30,
        "What is the Motor driver?",
        "Motor is the official asynchronous Python driver for MongoDB built on Tornado and asyncio. Standard PyMongo is synchronous and blocks the Python thread during database queries. Motor allows FastAPI's event loop to continue serving other HTTP requests while waiting for MongoDB query results via `await db.collection.find_one(...)`.",
        md_lines=md_lines
    )

    add_qna(doc, 31,
        "Name all the collections in your database and their roles.",
        "Our database has 9 specialized collections: 1) `users` (credentials, role, status), 2) `projects` (construction sites, codes, dates), 3) `workers` (trades, induction dates, emergency contacts), 4) `hazard_reports` (photos, YOLOv8 bounding boxes, inspector notes, status), 5) `inspections` (safety checklist audits, scores), 6) `incidents` (near-misses, injuries, investigations), 7) `capas` (corrective action tickets, deadlines, proof photos), 8) `notifications` (real-time alerts), and 9) `audit_logs` (immutable event trail).",
        md_lines=md_lines
    )

    add_qna(doc, 32,
        "What indexes did you create in MongoDB and why?",
        "We created B-tree indexes to optimize query speed and enforce constraints: 1) Unique indexes on `users.email` and `workers.employee_id` to prevent duplicate accounts. 2) Compound indexes on `(project_id, status, created_at)` on `hazard_reports` and `capas` so dashboard filter queries execute in O(log N) time rather than doing full collection table scans.",
        code_snippet="""# MongoDB Index Setup
await db.users.create_index("email", unique=True)
await db.workers.create_index("employee_id", unique=True)
await db.hazard_reports.create_index([("project_id", 1), ("status", 1), ("created_at", -1)])""",
        md_lines=md_lines
    )

    add_qna(doc, 33,
        "How do you handle concurrency and race conditions in MongoDB?",
        "We utilize MongoDB's atomic document update operators (`$set`, `$inc`, `$push`). For example, when updating a CAPA status from 'IN_PROGRESS' to 'COMPLETED', we use `find_one_and_update` with a query precondition `{'status': 'IN_PROGRESS'}`. If two users click simultaneously, only the first request succeeds; the second receives no document match and fails gracefully.",
        md_lines=md_lines
    )

    add_qna(doc, 34,
        "What is an ObjectId in MongoDB and what is stored inside it?",
        "An ObjectId is a 12-byte (24-character hexadecimal) unique identifier generated by MongoDB. It consists of: 1) A 4-byte Unix timestamp representing document creation time, 2) A 5-byte random value unique to the machine and process, and 3) A 3-byte incrementing counter initialized to a random value. Because the first 4 bytes are a timestamp, ObjectIds are naturally sorted chronologically.",
        md_lines=md_lines
    )

    # =========================================================================
    # SECTION 6: SECURITY, AUTHENTICATION & RBAC
    # =========================================================================
    add_sec(doc, "SECTION 6: SECURITY, CRYPTOGRAPHY & ACCESS CONTROL", md_lines)

    add_qna(doc, 35,
        "How are passwords hashed and stored? Why Argon2id over bcrypt or SHA-256?",
        "Passwords are never stored in plaintext. We hash them using Argon2id, the official winner of the international Password Hashing Competition (PHC) and specified in RFC 9106. Unlike SHA-256 (which is fast and easily brute-forced on GPUs) or bcrypt (which is only CPU-hard), Argon2id is a memory-hard function. It requires significant RAM memory to compute each hash, rendering massive parallel GPU, FPGA, and ASIC dictionary attacks mathematically impractical.",
        tip="Examiners are deeply impressed when students know why Argon2id is better than bcrypt (memory hardness).",
        md_lines=md_lines
    )

    add_qna(doc, 36,
        "How does JWT authentication work and what are its components?",
        "JSON Web Token (RFC 7519) is a stateless authentication standard consisting of three Base64URL-encoded strings separated by dots (`header.payload.signature`): 1) Header: algorithm (e.g., HS256) and token type. 2) Payload: claims containing user ID, role, and expiration timestamp (`exp`). 3) Signature: cryptographic hash of `HMACSHA256(header + '.' + payload, secret_key)`. The server verifies authenticity by recomputing the signature without querying the database on every request.",
        md_lines=md_lines
    )

    add_qna(doc, 37,
        "What is the difference between Access Tokens and Refresh Tokens?",
        "An Access Token is short-lived (15 minutes in our app) and is sent in the `Authorization: Bearer <token>` header with every API request. Because it is short-lived, if intercepted, the attacker's window of opportunity is tiny. A Refresh Token is long-lived (7 days) and is stored securely. It is only used at the `/auth/refresh` endpoint to obtain a new access token without forcing the user to re-enter their password.",
        md_lines=md_lines
    )

    add_qna(doc, 38,
        "What is Refresh Token Rotation and Reuse Detection?",
        "Whenever a client exchanges a refresh token for a new access token, the old refresh token is immediately invalidated and a brand new refresh token is issued (Rotation). If an attacker steals an old refresh token and attempts to use it, the server detects that an already-used token was submitted (Reuse Detection). Recognizing a potential token theft, the server immediately revokes all active refresh tokens for that user account, logging the attacker out.",
        md_lines=md_lines
    )

    add_qna(doc, 39,
        "What is Rate Limiting and how did you implement it?",
        "Rate limiting restricts how many requests a client IP can make in a given timeframe to prevent Denial of Service (DoS) and brute-force password cracking. We implemented SlowAPI (an async port of Flask-Limiter). Sensitive endpoints have strict rules: `/auth/login` is limited to 5 attempts per minute, photo uploads to 10 per minute, and AI inference to 20 per minute. If a client exceeds this, the server returns HTTP 429 Too Many Requests.",
        md_lines=md_lines
    )

    add_qna(doc, 40,
        "How do you prevent malicious file uploads (e.g., polyglot shells disguised as images)?",
        "We implement defense-in-depth file validation: 1) File size check: reject files >10MB. 2) Extension whitelist: only `.jpg`, `.jpeg`, `.png` allowed. 3) MIME type header check. 4) Magic byte verification using the `python-magic` library, which reads the binary header bytes of the file directly (e.g., `\xFF\xD8\xFF` for JPEG) to ensure an executable `.exe` or `.php` script renamed to `.jpg` is immediately rejected.",
        md_lines=md_lines
    )

    add_qna(doc, 41,
        "Can a user bypass your role restrictions by editing localStorage or JavaScript in DevTools?",
        "No. Frontend route guards are purely for user experience (UX) to prevent displaying links the user cannot use. All real security is strictly enforced on the backend. Every API endpoint decodes the cryptographically signed JWT, extracts the verified user role from the payload, and executes permission checks before returning any data or modifying any database record. Even if a user alters client-side code, the backend rejects unauthorized requests with HTTP 403 Forbidden.",
        tip="This is a classic examiner trap question! Always answer: 'Client-side checks are for UX; backend enforces 100% of security.'",
        md_lines=md_lines
    )

    # =========================================================================
    # SECTION 7: TESTING & VALIDATION (Pytest)
    # =========================================================================
    add_sec(doc, "SECTION 7: TESTING & VALIDATION (Pytest Suite)", md_lines)

    add_qna(doc, 42,
        "What testing framework did you use and how many tests did you execute?",
        "We used pytest, the industry-standard Python testing framework, along with `httpx` and FastAPI's `TestClient`. We wrote and executed 62 automated test cases covering authentication, role-based authorization, hazard reporting, CAPA status transitions, rate limiting, and MongoDB data integrity. All 62 test cases passed with a 100% pass rate in under 3.5 seconds.",
        md_lines=md_lines
    )

    add_qna(doc, 43,
        "What is FastAPI's TestClient and how does it test endpoints?",
        "FastAPI's `TestClient` is built on `httpx`. It creates an in-process mock HTTP environment that routes requests directly through FastAPI's middleware, dependency injection, and router stack without needing to launch a live Uvicorn server on a network port. This makes automated test execution extremely fast, deterministic, and isolated.",
        md_lines=md_lines
    )

    add_qna(doc, 44,
        "Explain an example of an RBAC authorization test case you wrote.",
        "We wrote a test where a user logged in with the 'WORKER' role attempts to call `POST /api/v1/hazards/{id}/approve` (an action restricted to Administrators). The test asserts that the response HTTP status code is exactly 403 Forbidden, verifying that workers cannot approve or alter reports.",
        code_snippet="""def test_worker_cannot_approve_hazard(client, worker_token, hazard_id):
    headers = {"Authorization": f"Bearer {worker_token}"}
    response = client.post(f"/api/v1/hazards/{hazard_id}/approve", headers=headers)
    assert response.status_code == 403
    assert "insufficient permissions" in response.json()["detail"].lower()""",
        md_lines=md_lines
    )

    # =========================================================================
    # SECTION 8: AI-ASSISTED DEVELOPMENT (Google Antigravity / Gemini)
    # =========================================================================
    add_sec(doc, "SECTION 8: AI-ASSISTED DEVELOPMENT (Google Antigravity & Gemini)", md_lines)

    add_qna(doc, 45,
        "What role did Google Antigravity play in building this project?",
        "Google Antigravity (powered by DeepMind's Gemini models) served as an advanced agentic software development partner. We decomposed the application into eight structured engineering phases. Antigravity helped scaffold FastAPI router boilerplate, generate complex Pydantic validation models, configure YOLOv8 computer vision pipelines, audit security vulnerabilities, and write the 62 pytest unit tests.",
        md_lines=md_lines
    )

    add_qna(doc, 46,
        "Did you blindly accept the code generated by the AI assistant?",
        "No. Every generated snippet was subjected to a rigorous review cycle: 1) Syntax and typing validation using TypeScript and mypy, 2) Logic review to ensure business rules (like human verification before CAPA creation) were preserved, and 3) Automated verification through our 62 pytest test cases and browser testing subagents to guarantee functionality before merging.",
        tip="Professors want to see that you understand the AI-generated code and acted as the lead software engineer.",
        md_lines=md_lines
    )

    # =========================================================================
    # SECTION 9: TRICKY EXAMINER QUESTIONS & DEEP DIVES
    # =========================================================================
    add_sec(doc, "SECTION 9: TRICKY EXAMINER QUESTIONS & DEEP DIVES", md_lines)

    add_qna(doc, 47,
        "What happens if two inspectors upload the exact same hazard at the exact same time?",
        "Both images are ingested independently and assigned unique MongoDB ObjectIds. Each hazard record is evaluated by YOLOv8 and enters the Admin Review Queue. When the Administrator reviews the queue, they can observe that both reports refer to the same physical location and mark one as a duplicate or merge the notes, preventing redundant CAPA tickets from being spawned.",
        md_lines=md_lines
    )

    add_qna(doc, 48,
        "Can your YOLOv8 model detect hazards at night or in heavy rain?",
        "YOLOv8's accuracy depends on the visual feature representations extracted by its convolutional layers. In severe darkness or dense fog, feature contrast diminishes, which can lower confidence scores. To address this, we set a confidence threshold of 0.45 and rely on our human-in-the-loop design: if the AI misses a low-contrast hazard, the certified safety inspector can manually annotate and submit the hazard through the Inspector Dashboard.",
        md_lines=md_lines
    )

    add_qna(doc, 49,
        "How would you scale this system to support 500 construction sites and 100,000 workers?",
        "To scale to enterprise levels: 1) Containerize the FastAPI backend with Docker and deploy across a Kubernetes (EKS/GKE) cluster with Horizontal Pod Autoscaling (HPA). 2) Offload AI inference to an asynchronous task queue (Celery + Redis) running on dedicated GPU worker nodes so API web requests never block. 3) Use MongoDB Atlas with replica sets and sharding partitioned on `project_id`. 4) Store uploaded evidence images in Amazon S3 or Google Cloud Storage backed by CloudFront CDN.",
        tip="Mentioning 'Docker, Kubernetes, Celery task queue, S3, and CDN' proves you understand enterprise cloud scalability.",
        md_lines=md_lines
    )

    add_qna(doc, 50,
        "What was the most challenging technical bug you encountered and how did you resolve it?",
        "During Phase 8 security hardening, we encountered a `NameError: report_oid` in `hazards.py` when an admin tried to review a hazard using a human-readable reference number (e.g. `HAZ-2026-001`) instead of a raw 24-char ObjectId. The database lookup succeeded, but the variable holding the raw ObjectId was out of scope when updating the CAPA linkage. We resolved it by refactoring the endpoint to resolve both reference numbers and ObjectIds into a canonical `report['_id']` before triggering atomic updates, verified by pytest.",
        md_lines=md_lines
    )

    # Save documents
    print(f"Saving Word Document to: {OUTPUT_DOCX}")
    doc.save(OUTPUT_DOCX)
    print("✅ Word Document (.docx) saved successfully!")
    
    print(f"Saving Markdown Document to: {OUTPUT_MD}")
    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.writelines(md_lines)
    print("✅ Markdown Document (.md) saved successfully!")

if __name__ == "__main__":
    build_viva_guide()
