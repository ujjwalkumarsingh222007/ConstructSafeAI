# ConstructSafe AI - Database Architecture & Indexes

## Database Engine
- **Engine**: MongoDB Community Edition (v7.0+)
- **Driver**: PyMongo Async (`AsyncMongoClient`)
- **Connection URI**: `mongodb://127.0.0.1:27017`
- **Database Name**: `constructsafe_db`

## Collections Overview (16 Collections)
1. `users`: System users with Argon2id passwords, roles, and status
2. `roles`: RBAC roles (admin, project_manager, safety_inspector, worker, client)
3. `permissions`: Granular capability strings
4. `refresh_tokens`: Rotating refresh tokens with family tracking and reuse detection
5. `projects`: Construction sites with location, dates, status, and assigned personnel
6. `workers`: Workforce profiles, designations, emergency contacts, and training status
7. `inspections`: Safety audits, checklists (pass/fail/na), scores, and photos
8. `incidents`: Safety incidents with severity, witnesses, investigation findings
9. `hazard_reports`: Photo hazard submissions with AI bounding boxes and confidence scores
10. `hazard_analyses`: Raw AI inference metadata, detections, and latency tracking
11. `corrective_actions`: CAPA records assigned to resolve hazards/incidents
12. `notifications`: In-app event alerts with read status
13. `audit_logs`: Immutable security and data access event trail
14. `project_assignments`: Historical personnel allocations to projects
15. `worker_certifications`: Safety certifications, expiry dates, and verification status
16. `safety_metrics`: Pre-aggregated daily/monthly project safety performance snapshots
