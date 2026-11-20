# 🏗️ ConstructSafe AI — Intelligent Construction Safety Management Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Community%207.0+-47A248.svg?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF.svg?style=flat&logo=yolo&logoColor=black)](https://docs.ultralytics.com/)
[![Pytest](https://img.shields.io/badge/Tests-62%2F62%20Passed-10B981.svg?style=flat&logo=pytest&logoColor=white)](https://pytest.org/)
[![Security](https://img.shields.io/badge/Security-Argon2id%20%7C%20JWT%20Rotation-F59E0B.svg?style=flat&logo=auth0&logoColor=white)](https://tools.ietf.org/html/rfc9106)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **ConstructSafe AI** is an enterprise-grade construction safety management and computer vision platform. It integrates on-demand photographic AI hazard detection (YOLOv8), a strict human-in-the-loop verification workflow, five role-tailored dashboards, an automated Corrective and Preventive Action (CAPA) lifecycle, and comprehensive audit reporting.

---

## 📌 Table of Contents

- [Core Value Proposition & Novelty](#-core-value-proposition--novelty)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Five Role-Based Dashboards](#-five-role-based-dashboards)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup-fastapi)
  - [2. Frontend Setup](#2-frontend-setup-react--vite)
  - [3. MongoDB Setup](#3-mongodb-setup)
- [Demo Credentials](#-demo-credentials)
- [API Endpoints Overview](#-api-endpoints-overview)
- [Security Hardening & Quality Assurance](#-security-hardening--quality-assurance)
- [Included Academic Deliverables](#-included-academic-deliverables)
- [Author & Acknowledgements](#-author--acknowledgements)

---

## 💡 Core Value Proposition & Novelty

In the construction sector, **1 in 5 workplace fatalities** occur globally (OSHA Fatal Four: falls, struck-by, caught-in, electrocutions). Traditional safety auditing relies on manual paper checklists and informal WhatsApp chats, leading to significant reporting latency (24–72 hours) and zero accountability.

### Why ConstructSafe AI is Different:
1. **Privacy-Preserving On-Demand Vision:** Eliminates the extreme infrastructure cost, bandwidth drain, and worker privacy concerns of 24/7 continuous CCTV surveillance by processing on-demand smartphone/tablet photographs.
2. **Human-in-the-Loop Trust Model:** AI assists inspectors by localizing hazards and estimating confidence in sub-100ms, but certified Safety Inspectors and Administrators validate and approve findings before corrective actions are triggered.
3. **End-to-End Safety Lifecycle:** Unifies photo hazard recognition, digital checklists, incident logs, CAPA resolution with photo proof, and automated PDF/Excel export into a single platform.

---

## ✨ Key Features

- **👁️ YOLOv8 Photo Hazard Detection:** Real-time object detection identifying:
  - 🦺 **Missing PPE** (workers lacking mandatory hardhats or safety vests)
  - ⚡ **Electrical Hazards** (exposed live wires, ungrounded distribution boards)
  - 🪜 **Fall Risks** (unprotected slab edges, missing guardrails, unsafe scaffolding)
  - 🚪 **Emergency Egress Obstruction** (debris blocking exit stairwells and fire escape corridors)
- **⚡ Sub-100ms Inference:** Fine-tuned YOLOv8 model running via PyTorch with bounding box spatial regression and Non-Maximum Suppression (NMS).
- **🔒 Defense-in-Depth Security:**
  - Memory-hard **Argon2id** password hashing (RFC 9106)
  - Cryptographic **JWT access/refresh token rotation** with reuse detection (RFC 7519)
  - **SlowAPI** rate limiting on authentication and upload routes (HTTP 429)
  - Strict MIME magic-byte validation rejecting executable polyglot files
  - Append-only MongoDB audit logs for immutable compliance tracking
- **📋 Closed-Loop CAPA Engine:**
  - Automatic severity-based deadline calculation (Critical: 24h, High: 72h, Medium: 7d)
  - Accountable worker assignment and in-app notifications
  - Mandatory photographic proof of resolution before re-inspection sign-off
- **📊 Real-Time Analytics & Reporting:**
  - Interactive Recharts visualization (safety trends, severity distributions, project comparisons)
  - Cryptographic-grade PDF safety digests via **ReportLab**
  - Multi-tab compliance registers exported in Excel via **OpenPyXL**
- **🎨 Visionex Astro UI:** Clean, distraction-free aesthetic with #121926 Dark Navy, #FFDD00 Safety Yellow, and #FBFBFB surface colors.

---

## 🏛️ System Architecture

ConstructSafe AI is built on a decoupled, cloud-native 4-tier architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. PRESENTATION LAYER                           │
│  React 18 SPA • TypeScript • Vite • Tailwind CSS • Recharts • Lucide   │
│  5 Isolated Role Dashboards • Interactive AI Simulator • Public Portal  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                       2. REST API & SECURITY GATEWAY                   │
│  FastAPI (Python 3.12) • Uvicorn ASGI • Pydantic v2 • SlowAPI          │
│  Argon2id Hashing • JWT Rotation with Reuse Detection • RBAC Guards    │
└──────────────────┬──────────────────────────────────┬──────────────────┘
                   │                                  │
┌──────────────────▼─────────────────┐   ┌────────────▼──────────────────┐
│     3. AI VISION INFERENCE TIER    │   │   4. DATA PERSISTENCE LAYER   │
│  Ultralytics YOLOv8 • PyTorch      │   │  MongoDB Community Edition    │
│  PIL • Bounding Box Regression     │   │  Motor (Async) • File Storage │
│  Sub-100ms Detection & Confidence  │   │  Atomic Updates • Audit Logs  │
└────────────────────────────────────┘   └───────────────────────────────┘
```

---

## 👥 Five Role-Based Dashboards

| Role | Primary Dashboard Responsibilities | Security Scoping |
| :--- | :--- | :--- |
| **🛡️ Administrator** | Enterprise-wide metrics, project/worker CRUD, hazard approval queue, CAPA assignments, system audit logs, full analytics. | Global Organization Scope |
| **🏗️ Project Manager** | Assigned project safety monitoring, assigned workforce tracking, open & overdue CAPA resolution, project PDF downloads. | Scoped Strictly to Assigned Sites |
| **🔍 Safety Inspector** | Conducting digital audit checklists, photo hazard uploads, AI hazard verification, incident reporting. | Inspection Scope; Cannot Self-Approve |
| **👷 Field Worker** | Assigned daily safety tasks, assigned CAPA actions, site induction status, safety instructions, photo proof upload. | Worker Personal Scope |
| **💼 Client** | Read-only project safety scorecards, approved hazard digests, inspection passing rates, executive report downloads. | Strictly Read-Only; No Confidential Data |

---

## 💻 Tech Stack

### Frontend:
- **Library:** React 18.3 (Single-Page Application)
- **Language:** TypeScript 5.6 (Strict Type Safety)
- **Build Tool:** Vite 5.4 (Instant HMR & ES Modules)
- **Styling:** Tailwind CSS 3.4 (Utility-First, JIT Compilation)
- **Charts:** Recharts 2.12 (SVG Data Visualizations)
- **Icons:** Lucide React

### Backend:
- **Framework:** FastAPI 0.115+ (High-Performance Async Python)
- **Runtime:** Python 3.12 + Uvicorn ASGI Server
- **Validation:** Pydantic v2 (Strict Schema Enforcement)
- **Database Driver:** Motor 3.6 (Async MongoDB Driver)
- **Rate Limiting:** SlowAPI (In-Memory IP Limiting)
- **Document Engines:** ReportLab (PDF) & OpenPyXL (Excel)

### Artificial Intelligence:
- **Model:** Ultralytics YOLOv8 (Deep Convolutional Object Detection)
- **Framework:** PyTorch 2.4+
- **Image Processing:** Pillow (PIL) & NumPy

### Database & Storage:
- **Database:** MongoDB Community Edition 7.0+
- **Storage:** Local isolated media storage with MIME/magic-byte validation

---

## 📂 Project Directory Structure

```
construction_project/
├── frontend/                     # React 18 + TypeScript + Vite Application
│   ├── src/
│   │   ├── api/                  # Axios API clients for Auth, Hazards, Projects, etc.
│   │   ├── components/           # Navbar, Sidebar, ProtectedRoute, Simulator, Modals
│   │   ├── contexts/             # AuthContext (JWT session state & role guards)
│   │   ├── pages/                # LandingPage, Login, ProfilePage, NotificationsPage
│   │   │   └── dashboards/       # 5 Role-Specific Dashboards (Admin, PM, Inspector, Worker, Client)
│   │   └── types/                # TypeScript interfaces and schema contracts
│   ├── package.json
│   └── vite.config.ts
├── backend/                      # FastAPI Python REST API
│   ├── app/
│   │   ├── core/                 # App configuration, security settings, JWT helpers
│   │   ├── models/               # PyMongo BSON/ObjectId models
│   │   ├── routers/              # Modular REST APIRouters (auth, hazards, capas, etc.)
│   │   ├── schemas/              # Pydantic v2 request/response validation models
│   │   ├── services/             # YOLOv8 hazard detection, PDF & Excel export services
│   │   └── main.py               # FastAPI application entrypoint & middleware setup
│   ├── tests/                    # 62 Automated pytest unit and integration tests
│   └── requirements.txt
├── ai_engine/                    # Standalone computer vision service & YOLO weights
├── storage/                      # Secure file storage (evidence, reports, snapshots)
│   └── mongodb_data/             # Local MongoDB data directory (git-ignored)
├── docs/                         # Architectural diagrams and specifications
├── docker-compose.yml            # Containerized deployment specification
├── README.md                     # Project documentation
├── ConstructSafe_AI_Project_Report.docx         # Complete Course Project Report (SR University)
├── ConstructSafe_AI_Modern_Presentation.pptx   # Modern 14-Slide Presentation Deck
└── ConstructSafe_AI_Viva_Voce_QnA.docx          # 50+ Master Viva Voce Q&A Handbook
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v18.0.0+ (v20+ LTS recommended)
- **Python:** v3.11 or v3.12
- **MongoDB:** v7.0+ Community Edition installed locally or accessible via URI

---

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   - **Windows:**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - **API Base:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
   - **Interactive Swagger Docs:** [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

---

### 2. Frontend Setup (React + Vite)

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - **Application URL:** [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

### 3. MongoDB Setup

Ensure MongoDB is running locally on port 27017:
```powershell
# Windows Example:
mongod --dbpath "d:\construction_project\storage\mongodb_data" --port 27017 --bind_ip 127.0.0.1
```

---

## 🔑 Demo Credentials

For quick evaluation and testing across all 5 user roles, use the following pre-configured credentials (or use the one-click demo persona buttons on the login page):

| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@constructsafe.ai` | `Admin@123456` |
| **Project Manager** | `pm@constructsafe.ai` | `Pm@123456` |
| **Safety Inspector** | `inspector@constructsafe.ai` | `Inspector@123456` |
| **Field Worker** | `worker@constructsafe.ai` | `Worker@123456` |
| **Client** | `client@constructsafe.ai` | `Client@123456` |

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate user, issue JWT access + refresh tokens | Public |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token with reuse detection | Public |
| `PATCH` | `/api/v1/auth/me` | Update current user profile and credentials | All Roles |
| `POST` | `/api/v1/hazards/analyze` | Run YOLOv8 inference on uploaded site photo | Inspector, Admin |
| `POST` | `/api/v1/hazards` | Submit verified hazard report | Inspector, Admin |
| `POST` | `/api/v1/hazards/{id}/approve` | Approve report and atomically trigger CAPA | Admin Only |
| `POST` | `/api/v1/hazards/{id}/reject` | Reject report with justification note | Admin Only |
| `GET` | `/api/v1/projects` | List projects (scoped by user assignment) | All Roles |
| `POST` | `/api/v1/capas/{id}/resolve` | Submit photographic proof of hazard mitigation | Worker, PM, Admin |
| `GET` | `/api/v1/analytics/overview` | Fetch safety metrics and severity breakdowns | Admin, PM, Client |
| `GET` | `/api/v1/analytics/export/pdf` | Generate downloadable PDF audit digest | Admin, PM, Client |
| `GET` | `/api/v1/notifications` | Fetch user-specific real-time safety alerts | All Roles |

---

## 🧪 Security Hardening & Quality Assurance

ConstructSafe AI was subjected to extensive security audits and automated testing:

```bash
# Run the complete test suite
cd backend
pytest tests/ -v
```

### ✅ Test Results Summary:
- **Total Tests:** 62
- **Passed:** 62 (100% Pass Rate)
- **Execution Time:** ~3.2 seconds
- **Test Categories:**
  - 🔑 **Authentication & JWT (6 tests):** Argon2id hashing complexity, token expiration, refresh token rotation, and reuse revocation.
  - 🛡️ **Role-Based Access Control (12 tests):** Cross-project isolation, prevention of worker approvals, client read-only boundaries.
  - 👁️ **Hazard & AI Workflows (14 tests):** Photo validation, YOLOv8 trigger, review queue status state machines.
  - ⚡ **Rate Limiting & Input Sanitization (10 tests):** SlowAPI HTTP 429 enforcement, oversized file rejection, malformed JSON handling.
  - 🗄️ **MongoDB Integrity & Audit Trails (12 tests):** Atomic document transitions, unique constraints, append-only logs.

---

## 📚 Included Academic Deliverables

This repository includes complete academic course project deliverables prepared for **SR University (School of Computer Science & Artificial Intelligence)**:

1. **📄 Course Project Report:** [`ConstructSafe_AI_Project_Report.docx`](ConstructSafe_AI_Project_Report.docx) *(A4 formatted, 12 embedded figures, tables, code listings, adhering to university template)*
2. **🖥️ Modern Presentation Deck:** [`ConstructSafe_AI_Modern_Presentation.pptx`](ConstructSafe_AI_Modern_Presentation.pptx) *(16:9 widescreen, 14 required slides + extra showcase slides, Apple/Stripe design aesthetic)*
3. **🎓 Master Viva Voce Guide:** [`ConstructSafe_AI_Viva_Voce_QnA.docx`](ConstructSafe_AI_Viva_Voce_QnA.docx) / [`ConstructSafe_AI_Viva_Voce_QnA.md`](ConstructSafe_AI_Viva_Voce_QnA.md) *(50+ detailed technical questions, answers, and examiner defense tips)*

---

## 👨‍💻 Author & Acknowledgements

- **Lead Developer:** Ujjwal
- **Institution:** SR University, Ananthasagar, Warangal, Telangana – 506 371
- **Department:** School of Computer Science & Artificial Intelligence
- **Project Guide:** Mr. S Naresh Kumar (Assistant Professor, School of CS&AI)
- **AI Coding Assistant:** Google Antigravity (Powered by DeepMind Gemini Models)

---

### 📄 License
This project is licensed under the [MIT License](LICENSE).
