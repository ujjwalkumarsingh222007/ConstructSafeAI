"""ConstructSafe AI - Data Export Service (CSV & Excel XLSX)
Implements high-performance, role-scoped data export in CSV and formatted Excel XLSX format using openpyxl.
Includes enterprise column styling, auto-width adjustments, and data sanitization.
"""

import io
import csv
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


class ExportService:
    """Enterprise tabular data exporter supporting CSV and OpenPyXL Excel formats with formula-injection defense."""

    FORMULA_TRIGGERS = ('=', '+', '-', '@', '\t', '\r')

    @classmethod
    def sanitize_val(cls, val: Any) -> Any:
        """
        Format values cleanly for spreadsheet cells while mitigating
        Spreadsheet Formula Injection / CSV Injection (CWE-1236).
        Strings beginning with '=', '+', '-', '@', '\t', or '\r' are escaped with a leading quote.
        """
        if val is None:
            return ""
        if isinstance(val, bool):
            return val
        if isinstance(val, (int, float)):
            return val
        if isinstance(val, datetime):
            return val.strftime("%Y-%m-%d %H:%M:%S")
        if isinstance(val, (list, dict)):
            val = str(val)

        val_str = str(val)
        if val_str and val_str.startswith(cls.FORMULA_TRIGGERS):
            return f"'{val_str}"

        return val_str

    @classmethod
    def export_csv(
        cls,
        data: List[Dict[str, Any]],
        columns: List[str],
        column_labels: Optional[Dict[str, str]] = None
    ) -> str:
        """Generate formatted CSV string with headers."""
        output = io.StringIO()
        labels = [column_labels.get(c, c.replace("_", " ").title()) if column_labels else c for c in columns]
        
        writer = csv.writer(output, lineterminator="\r\n")
        writer.writerow(labels)

        for row in data:
            row_vals = [cls.sanitize_val(row.get(c)) for c in columns]
            writer.writerow(row_vals)

        return output.getvalue()

    @classmethod
    def export_xlsx(
        cls,
        sheets_data: Dict[str, Dict[str, Any]],
        title: str = "ConstructSafe AI Report"
    ) -> bytes:
        """
        Generate formatted multi-sheet or single-sheet Excel workbook as bytes.
        sheets_data schema:
        {
           "SheetName": {
               "columns": ["id", "project_name", ...],
               "labels": {"id": "Record ID", ...},
               "rows": [{...}, {...}]
           }
        }
        """
        wb = openpyxl.Workbook()
        # Remove default sheet
        wb.remove(wb.active)

        # Common styles
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")  # Slate 800
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")  # Slate 50
        regular_font = Font(name="Calibri", size=10, color="0F172A")
        bold_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
        
        thin_border = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )

        for sheet_name, content in sheets_data.items():
            ws = wb.create_sheet(title=sheet_name[:31])  # Excel sheet title max 31 chars
            ws.views.sheetView[0].showGridLines = True

            columns = content.get("columns", [])
            labels_map = content.get("labels", {})
            rows = content.get("rows", [])

            # Write header
            headers = [labels_map.get(c, c.replace("_", " ").title()) for c in columns]
            ws.append(headers)

            for col_num in range(1, len(headers) + 1):
                cell = ws.cell(row=1, column=col_num)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                cell.border = thin_border
            ws.row_dimensions[1].height = 26

            # Write rows
            for r_idx, row_dict in enumerate(rows, start=2):
                row_vals = [cls.sanitize_val(row_dict.get(c)) for c in columns]
                ws.append(row_vals)
                ws.row_dimensions[r_idx].height = 20

                is_alt = (r_idx % 2 == 0)
                for col_num in range(1, len(columns) + 1):
                    cell = ws.cell(row=r_idx, column=col_num)
                    cell.font = regular_font
                    cell.border = thin_border
                    cell.alignment = Alignment(vertical="center")
                    if is_alt:
                        cell.fill = alt_fill

            # Auto-adjust column widths with sensible min/max
            for col in ws.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    val_str = str(cell.value or "")
                    if len(val_str) > max_len:
                        max_len = len(val_str)
                ws.column_dimensions[col_letter].width = max(min(max_len + 4, 50), 12)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
