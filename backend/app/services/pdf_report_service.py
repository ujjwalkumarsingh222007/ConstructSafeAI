"""ConstructSafe AI - Professional Safety PDF Report Service
Generates downloadable executive and compliance reports using Python ReportLab.
Includes custom header/footer canvas, page numbers, corporate styling, and confidentiality markers.
"""

import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable
)


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that accurately calculates total page count
    and renders corporate header rules and dynamic 'Page X of Y' footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))

        # Running Header
        self.drawString(40, 755, "ConstructSafe AI")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(120, 755, "|   Enterprise Safety & Health Compliance Platform")
        
        # Header rule
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 750, 572, 750)

        # Running Footer
        self.line(40, 45, 572, 45)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(40, 32, "CONFIDENTIAL & PROPRIETARY — CONSTRUCTSAFE AI AUDIT SYSTEM")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 32, page_str)

        self.restoreState()


class PDFReportService:
    """Service for compiling professional safety documents into PDF byte streams."""

    @staticmethod
    def _get_styles():
        base = getSampleStyleSheet()
        styles = {
            "title": ParagraphStyle(
                "DocTitle",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=20,
                leading=24,
                textColor=colors.HexColor("#0f172a")
            ),
            "subtitle": ParagraphStyle(
                "DocSubtitle",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=11,
                leading=14,
                textColor=colors.HexColor("#ea580c")  # Safety Orange
            ),
            "section": ParagraphStyle(
                "SectionHeader",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=13,
                leading=17,
                textColor=colors.HexColor("#1e293b"),
                spaceAfter=6
            ),
            "meta_label": ParagraphStyle(
                "MetaLabel",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=8.5,
                leading=11,
                textColor=colors.HexColor("#475569")
            ),
            "meta_val": ParagraphStyle(
                "MetaVal",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=8.5,
                leading=11,
                textColor=colors.HexColor("#0f172a")
            ),
            "table_header": ParagraphStyle(
                "TableHeader",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor("#1e293b")
            ),
            "table_cell": ParagraphStyle(
                "TableCell",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor("#334155")
            ),
            "table_cell_bold": ParagraphStyle(
                "TableCellBold",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor("#0f172a")
            ),
            "kpi_num": ParagraphStyle(
                "KPINumber",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=16,
                leading=18,
                alignment=1,  # Center
                textColor=colors.HexColor("#0f172a")
            ),
            "kpi_label": ParagraphStyle(
                "KPILabel",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=7.5,
                leading=9,
                alignment=1,  # Center
                textColor=colors.HexColor("#64748b")
            ),
            "disclaimer": ParagraphStyle(
                "DisclaimerText",
                parent=base["Normal"],
                fontName="Helvetica-Oblique",
                fontSize=7.5,
                leading=9.5,
                textColor=colors.HexColor("#64748b")
            )
        }
        return styles

    @classmethod
    def _create_metadata_card(cls, styles, fields: List[tuple], confidentiality_label: str = "CONFIDENTIAL"):
        rows = []
        for i in range(0, len(fields), 2):
            pair1 = fields[i]
            pair2 = fields[i + 1] if i + 1 < len(fields) else ("", "")
            rows.append([
                Paragraph(pair1[0], styles["meta_label"]),
                Paragraph(str(pair1[1]), styles["meta_val"]),
                Paragraph(pair2[0], styles["meta_label"]),
                Paragraph(str(pair2[1]), styles["meta_val"]),
            ])

        t = Table(rows, colWidths=[1.1 * inch, 2.1 * inch, 1.1 * inch, 2.1 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        return t

    @classmethod
    def _create_kpi_strip(cls, styles, kpis: List[tuple]):
        col_count = len(kpis)
        col_width = (6.4 * inch) / col_count
        header_row = [Paragraph(val, styles["kpi_num"]) for val, _ in kpis]
        label_row = [Paragraph(lbl, styles["kpi_label"]) for _, lbl in kpis]

        t = Table([header_row, label_row], colWidths=[col_width] * col_count)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
            ('TOPPADDING', (0, 1), (-1, 1), 0),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
        ]))
        return t

    # =========================================================================
    # A. PROJECT SAFETY REPORT
    # =========================================================================
    @classmethod
    def generate_project_safety_report(
        cls,
        project: Dict[str, Any],
        kpis: Dict[str, Any],
        hazards: List[Dict[str, Any]],
        incidents: List[Dict[str, Any]],
        inspections: List[Dict[str, Any]],
        capas: List[Dict[str, Any]],
        confidentiality_label: str = "CONFIDENTIAL - EXECUTIVE AUDIT",
        generated_by: str = "System Administrator"
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=55,
            bottomMargin=55
        )
        styles = cls._get_styles()
        story = []

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        # Header Title
        story.append(Paragraph("PROJECT SAFETY & COMPLIANCE AUDIT", styles["title"]))
        story.append(Spacer(1, 2))
        story.append(Paragraph(f"PROJECT: {project.get('name', 'N/A').upper()} ({project.get('code', 'N/A')})", styles["subtitle"]))
        story.append(Spacer(1, 10))

        # Metadata Card
        meta_fields = [
            ("Client:", project.get("client_name") or "ConstructSafe Client"),
            ("Status:", project.get("status", "active").upper()),
            ("Generated By:", generated_by),
            ("Audit Date:", now_str),
            ("Classification:", confidentiality_label),
            ("Location:", f"{project.get('location', {}).get('city', '')}, {project.get('location', {}).get('state', '')}")
        ]
        story.append(cls._create_metadata_card(styles, meta_fields, confidentiality_label))
        story.append(Spacer(1, 12))

        # Key Performance Indicators Strip
        kpi_items = [
            (str(kpis.get("total_hazards", 0)), "HAZARD REPORTS"),
            (str(kpis.get("total_incidents", 0)), "INCIDENTS"),
            (f"{kpis.get('inspection_pass_rate', 0.0):.1f}%", "INSPECTION PASS RATE"),
            (f"{kpis.get('capa_closure_rate', 0.0):.1f}%", "CAPA CLOSURE RATE"),
            (f"{kpis.get('average_resolution_time_days', 0.0):.1f}d", "AVG CAPA RESOLUTION")
        ]
        story.append(cls._create_kpi_strip(styles, kpi_items))
        story.append(Spacer(1, 16))

        # SECTION 1: Hazard Reports Summary
        story.append(Paragraph("1. Identified Site Hazards & Verification", styles["section"]))
        if not hazards:
            story.append(Paragraph("No hazard reports recorded for this project during the audit period.", styles["table_cell"]))
        else:
            table_data = [[
                Paragraph("Report #", styles["table_header"]),
                Paragraph("Category", styles["table_header"]),
                Paragraph("Severity", styles["table_header"]),
                Paragraph("Date", styles["table_header"]),
                Paragraph("Status", styles["table_header"]),
                Paragraph("Corrective Action", styles["table_header"])
            ]]
            for h in hazards[:15]:
                h_date = h.get("created_at")
                date_str = h_date.strftime("%Y-%m-%d") if isinstance(h_date, datetime) else str(h_date)[:10]
                act_str = h.get("corrective_action_number") or "-"
                table_data.append([
                    Paragraph(h.get("report_number", "-"), styles["table_cell_bold"]),
                    Paragraph(h.get("category", "-").replace("_", " ").title(), styles["table_cell"]),
                    Paragraph(h.get("severity", "-").upper(), styles["table_cell"]),
                    Paragraph(date_str, styles["table_cell"]),
                    Paragraph(h.get("status", "-").replace("_", " ").title(), styles["table_cell"]),
                    Paragraph(act_str, styles["table_cell"])
                ])
            t = Table(table_data, colWidths=[1.1 * inch, 1.4 * inch, 0.9 * inch, 0.9 * inch, 1.1 * inch, 1.0 * inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            story.append(t)
        story.append(Spacer(1, 14))

        # SECTION 2: Incident Summary
        story.append(Paragraph("2. Safety Incidents & Near Misses", styles["section"]))
        if not incidents:
            story.append(Paragraph("Zero safety incidents recorded for this project during the audit period.", styles["table_cell"]))
        else:
            table_data = [[
                Paragraph("Incident #", styles["table_header"]),
                Paragraph("Category", styles["table_header"]),
                Paragraph("Severity", styles["table_header"]),
                Paragraph("Date", styles["table_header"]),
                Paragraph("Status", styles["table_header"]),
                Paragraph("Root Cause", styles["table_header"])
            ]]
            for inc in incidents[:15]:
                occurred = inc.get("occurred_at")
                date_str = occurred.strftime("%Y-%m-%d") if isinstance(occurred, datetime) else str(occurred)[:10]
                rc = (inc.get("investigation") or {}).get("root_cause") or "-"
                table_data.append([
                    Paragraph(inc.get("incident_number", "-"), styles["table_cell_bold"]),
                    Paragraph(inc.get("incident_category", "-").replace("_", " ").title(), styles["table_cell"]),
                    Paragraph(inc.get("severity", "-").replace("_", " ").upper(), styles["table_cell"]),
                    Paragraph(date_str, styles["table_cell"]),
                    Paragraph(inc.get("status", "-").replace("_", " ").title(), styles["table_cell"]),
                    Paragraph(rc[:25] + ("..." if len(rc) > 25 else ""), styles["table_cell"])
                ])
            t = Table(table_data, colWidths=[1.1 * inch, 1.4 * inch, 1.0 * inch, 0.9 * inch, 1.0 * inch, 1.0 * inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            story.append(t)
        story.append(Spacer(1, 14))

        # SECTION 3: Corrective Actions (CAPA)
        story.append(Paragraph("3. Corrective & Preventive Actions (CAPA) Progress", styles["section"]))
        if not capas:
            story.append(Paragraph("No active or pending corrective actions linked to this project.", styles["table_cell"]))
        else:
            table_data = [[
                Paragraph("Action #", styles["table_header"]),
                Paragraph("Title", styles["table_header"]),
                Paragraph("Priority", styles["table_header"]),
                Paragraph("Due Date", styles["table_header"]),
                Paragraph("Status", styles["table_header"])
            ]]
            for c in capas[:15]:
                dd = c.get("due_date")
                dd_str = dd.strftime("%Y-%m-%d") if isinstance(dd, datetime) else str(dd)[:10]
                table_data.append([
                    Paragraph(c.get("action_number", "-"), styles["table_cell_bold"]),
                    Paragraph(c.get("title", "-")[:30], styles["table_cell"]),
                    Paragraph(c.get("priority", "-").upper(), styles["table_cell"]),
                    Paragraph(dd_str, styles["table_cell"]),
                    Paragraph(c.get("status", "-").replace("_", " ").title(), styles["table_cell"])
                ])
            t = Table(table_data, colWidths=[1.1 * inch, 2.5 * inch, 0.8 * inch, 1.0 * inch, 1.0 * inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            story.append(t)
        story.append(Spacer(1, 14))

        # SECTION 4: Sign-off block
        story.append(KeepTogether([
            Paragraph("4. Executive Safety Verification & Sign-off", styles["section"]),
            Spacer(1, 4),
            Table([
                [
                    Paragraph("Prepared By: ________________________", styles["meta_label"]),
                    Paragraph("Safety Director: ________________________", styles["meta_label"])
                ],
                [
                    Paragraph(f"Date: {now_str[:10]}", styles["meta_val"]),
                    Paragraph(f"Date: {now_str[:10]}", styles["meta_val"])
                ]
            ], colWidths=[3.2 * inch, 3.2 * inch], style=[
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ])
        ]))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    # =========================================================================
    # B. INCIDENT REPORT PDF
    # =========================================================================
    @classmethod
    def generate_incident_report(
        cls,
        incident: Dict[str, Any],
        project: Optional[Dict[str, Any]] = None,
        capas: Optional[List[Dict[str, Any]]] = None,
        is_client: bool = False,
        confidentiality_label: str = "CONFIDENTIAL - SAFETY INVESTIGATION"
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=55,
            bottomMargin=55
        )
        styles = cls._get_styles()
        story = []

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        proj_name = project.get("name") if project else incident.get("project_name", "N/A")
        proj_code = project.get("code") if project else incident.get("project_code", "")

        story.append(Paragraph("INCIDENT INVESTIGATION REPORT", styles["title"]))
        story.append(Spacer(1, 2))
        story.append(Paragraph(f"INCIDENT: {incident.get('incident_number', 'N/A')}  |  PROJECT: {proj_name} ({proj_code})", styles["subtitle"]))
        story.append(Spacer(1, 10))

        occurred = incident.get("occurred_at")
        occ_str = occurred.strftime("%Y-%m-%d %H:%M UTC") if isinstance(occurred, datetime) else str(occurred)

        meta_fields = [
            ("Incident #:", incident.get("incident_number", "N/A")),
            ("Date & Time:", occ_str),
            ("Category:", incident.get("incident_category", "").replace("_", " ").title()),
            ("Severity:", incident.get("severity", "").replace("_", " ").upper()),
            ("Location:", incident.get("location_details") or "On Site"),
            ("Status:", incident.get("status", "").replace("_", " ").upper()),
            ("Reporter:", incident.get("reporter_name") or "Authorized Reporter"),
            ("Investigator:", incident.get("assigned_investigator_name") or "Unassigned")
        ]
        story.append(cls._create_metadata_card(styles, meta_fields, confidentiality_label))
        story.append(Spacer(1, 14))

        # Title & Narrative
        story.append(Paragraph(f"Title: {incident.get('title', 'Safety Incident')}", styles["section"]))
        story.append(Paragraph(incident.get("description", "No narrative provided."), styles["table_cell"]))
        story.append(Spacer(1, 14))

        # Investigation Section (Redacted for client)
        story.append(Paragraph("Investigation Findings & Root Cause", styles["section"]))
        inv = incident.get("investigation") or {}
        rc = inv.get("root_cause") or "Investigation pending or root cause not established."
        findings = inv.get("findings") or "Findings pending formal investigation closure."
        
        story.append(Paragraph(f"<b>Root Cause:</b> {rc}", styles["table_cell"]))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"<b>Findings:</b> {findings}", styles["table_cell"]))
        story.append(Spacer(1, 10))

        # Witness Statements - strictly hidden from client
        if not is_client:
            witnesses = inv.get("witness_statements", []) or incident.get("witness_details", [])
            if witnesses:
                story.append(Paragraph("Recorded Witness Statements (Internal Only)", styles["meta_label"]))
                for w in witnesses:
                    name = w.get("name", "Witness")
                    stmt = w.get("statement", "")
                    story.append(Paragraph(f"• <b>{name}:</b> \"{stmt}\"", styles["table_cell"]))
                    story.append(Spacer(1, 2))
                story.append(Spacer(1, 10))

        # Linked CAPAs
        if capas:
            story.append(Paragraph("Assigned Corrective & Preventive Actions", styles["section"]))
            table_data = [[
                Paragraph("Action #", styles["table_header"]),
                Paragraph("Title", styles["table_header"]),
                Paragraph("Priority", styles["table_header"]),
                Paragraph("Status", styles["table_header"])
            ]]
            for c in capas:
                table_data.append([
                    Paragraph(c.get("action_number", "-"), styles["table_cell_bold"]),
                    Paragraph(c.get("title", "-"), styles["table_cell"]),
                    Paragraph(c.get("priority", "-").upper(), styles["table_cell"]),
                    Paragraph(c.get("status", "-").replace("_", " ").title(), styles["table_cell"])
                ])
            t = Table(table_data, colWidths=[1.2 * inch, 3.2 * inch, 1.0 * inch, 1.0 * inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3)
            ]))
            story.append(t)
            story.append(Spacer(1, 14))

        # Resolution notes
        if incident.get("resolution_notes"):
            story.append(Paragraph("Resolution & Sign-off Notes", styles["section"]))
            story.append(Paragraph(incident.get("resolution_notes"), styles["table_cell"]))
            story.append(Spacer(1, 14))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    # =========================================================================
    # C. INSPECTION REPORT PDF
    # =========================================================================
    @classmethod
    def generate_inspection_report(
        cls,
        inspection: Dict[str, Any],
        project: Optional[Dict[str, Any]] = None,
        confidentiality_label: str = "CONFIDENTIAL - SAFETY AUDIT"
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=55,
            bottomMargin=55
        )
        styles = cls._get_styles()
        story = []

        proj_name = project.get("name") if project else inspection.get("project_name", "N/A")
        proj_code = project.get("code") if project else inspection.get("project_code", "")

        story.append(Paragraph("SAFETY INSPECTION AUDIT REPORT", styles["title"]))
        story.append(Spacer(1, 2))
        story.append(Paragraph(f"INSPECTION: {inspection.get('inspection_number', 'N/A')}  |  SITE: {proj_name} ({proj_code})", styles["subtitle"]))
        story.append(Spacer(1, 10))

        sched = inspection.get("scheduled_date")
        sched_str = sched.strftime("%Y-%m-%d") if isinstance(sched, datetime) else str(sched)[:10]

        comp = inspection.get("completed_at")
        comp_str = comp.strftime("%Y-%m-%d %H:%M") if isinstance(comp, datetime) else (str(comp)[:16] if comp else "Incomplete")

        score = inspection.get("overall_score")
        score_str = f"{score:.1f}%" if score is not None else "N/A"

        meta_fields = [
            ("Inspection #:", inspection.get("inspection_number", "N/A")),
            ("Scheduled Date:", sched_str),
            ("Inspector:", inspection.get("inspector_name") or "Authorized Inspector"),
            ("Completed At:", comp_str),
            ("Status:", inspection.get("status", "").upper()),
            ("Overall Score:", score_str)
        ]
        story.append(cls._create_metadata_card(styles, meta_fields, confidentiality_label))
        story.append(Spacer(1, 14))

        # Checklist Items Table
        story.append(Paragraph("Inspection Checklist Evaluation", styles["section"]))
        items = inspection.get("checklist_items", [])
        if not items:
            story.append(Paragraph("No checklist items recorded for this inspection.", styles["table_cell"]))
        else:
            table_data = [[
                Paragraph("Item / Category", styles["table_header"]),
                Paragraph("Requirement Description", styles["table_header"]),
                Paragraph("Status", styles["table_header"]),
                Paragraph("Notes", styles["table_header"])
            ]]
            for item in items:
                st = item.get("status", "pass").lower()
                st_display = "PASS" if st == "pass" else ("FAIL" if st == "fail" else "N/A")
                cat_desc = f"{item.get('category', '').replace('_', ' ').title()}"
                table_data.append([
                    Paragraph(cat_desc, styles["table_cell_bold"]),
                    Paragraph(item.get("description", "-"), styles["table_cell"]),
                    Paragraph(st_display, styles["table_cell_bold"]),
                    Paragraph(item.get("notes") or "-", styles["table_cell"])
                ])
            t = Table(table_data, colWidths=[1.5 * inch, 2.7 * inch, 0.8 * inch, 1.4 * inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
            ]))
            story.append(t)
        story.append(Spacer(1, 14))

        # Notes
        if inspection.get("notes"):
            story.append(Paragraph("Inspector Remarks & Summary", styles["section"]))
            story.append(Paragraph(inspection.get("notes"), styles["table_cell"]))
            story.append(Spacer(1, 14))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    # =========================================================================
    # D. CAPA CLOSURE REPORT PDF
    # =========================================================================
    @classmethod
    def generate_capa_closure_report(
        cls,
        capa: Dict[str, Any],
        project: Optional[Dict[str, Any]] = None,
        confidentiality_label: str = "CONFIDENTIAL - CORRECTIVE ACTION AUDIT"
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=55,
            bottomMargin=55
        )
        styles = cls._get_styles()
        story = []

        proj_name = project.get("name") if project else capa.get("project_name", "N/A")
        proj_code = project.get("code") if project else capa.get("project_code", "")

        story.append(Paragraph("CORRECTIVE ACTION (CAPA) CLOSURE AUDIT", styles["title"]))
        story.append(Spacer(1, 2))
        story.append(Paragraph(f"CAPA TICKET: {capa.get('action_number', 'N/A')}  |  PROJECT: {proj_name} ({proj_code})", styles["subtitle"]))
        story.append(Spacer(1, 10))

        due = capa.get("due_date")
        due_str = due.strftime("%Y-%m-%d") if isinstance(due, datetime) else str(due)[:10]

        comp = capa.get("completed_at")
        comp_str = comp.strftime("%Y-%m-%d %H:%M") if isinstance(comp, datetime) else (str(comp)[:16] if comp else "Pending")

        ver = capa.get("verified_at")
        ver_str = ver.strftime("%Y-%m-%d %H:%M") if isinstance(ver, datetime) else (str(ver)[:16] if ver else "Unverified")

        meta_fields = [
            ("Action #:", capa.get("action_number", "N/A")),
            ("Source Type:", capa.get("source_type", "").upper()),
            ("Priority:", capa.get("priority", "").upper()),
            ("Status:", capa.get("status", "").upper()),
            ("Due Date:", due_str),
            ("Completed At:", comp_str),
            ("Assignee:", capa.get("assigned_to_name") or "Assigned Personnel"),
            ("Verified At:", ver_str)
        ]
        story.append(cls._create_metadata_card(styles, meta_fields, confidentiality_label))
        story.append(Spacer(1, 14))

        # Title & Description
        story.append(Paragraph(f"Action Title: {capa.get('title', 'Remediation Task')}", styles["section"]))
        story.append(Paragraph(capa.get("description", "No description provided."), styles["table_cell"]))
        story.append(Spacer(1, 14))

        # Resolution Details
        story.append(Paragraph("Remediation & Corrective Actions Taken", styles["section"]))
        res_notes = capa.get("resolution_notes") or "Pending worker completion notes."
        story.append(Paragraph(res_notes, styles["table_cell"]))
        story.append(Spacer(1, 14))

        # Verification & Audit Sign-off
        story.append(KeepTogether([
            Paragraph("Verification & Final Administrative Closure", styles["section"]),
            Paragraph(f"<b>Verification Remarks:</b> {capa.get('verification_notes') or 'Verified in compliance with site safety standards.'}", styles["table_cell"]),
            Spacer(1, 10),
            Table([
                [
                    Paragraph("Remediated By: ________________________", styles["meta_label"]),
                    Paragraph("Verified Safety Officer: ________________________", styles["meta_label"])
                ],
                [
                    Paragraph(f"Date: {comp_str[:10]}", styles["meta_val"]),
                    Paragraph(f"Date: {ver_str[:10]}", styles["meta_val"])
                ]
            ], colWidths=[3.2 * inch, 3.2 * inch], style=[
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ])
        ]))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()
