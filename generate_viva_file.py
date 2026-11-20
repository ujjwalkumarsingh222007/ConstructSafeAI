"""
ConstructSafe AI – Complete Master Viva Voce Preparation Guide
Generates both:
- d:\construction_project\ConstructSafe_AI_Viva_Voce_QnA.docx
- d:\construction_project\ConstructSafe_AI_Viva_Voce_QnA.md
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

OUTPUT_DOCX = r"d:\construction_project\ConstructSafe_AI_Viva_Voce_QnA.docx"
OUTPUT_MD = r"d:\construction_project\ConstructSafe_AI_Viva_Voce_QnA.md"
LOGO_PATH = r"d:\construction_project\report_assets\sru_logo.png"

COLOR_NAVY = RGBColor(0x0F, 0x17, 0x2A)      # Slate 900
COLOR_TEXT = RGBColor(0x1E, 0x29, 0x3B)      # Slate 800
COLOR_MUTED = RGBColor(0x64, 0x74, 0x8B)     # Slate 500
COLOR_BLUE = RGBColor(0x1D, 0x4E, 0xD8)      # Blue 700
COLOR_AMBER = RGBColor(0xD9, 0x77, 0x06)     # Amber 600

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'  <w:top w:w="{top}" w:type="dxa"/>'
        f'  <w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'  <w:left w:w="{left}" w:type="dxa"/>'
        f'  <w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_callout(doc, text, title="PRO-TIP FOR VIVA DEFENSE"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=100, bottom=100, left=160, right=160)
    
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:top w:val="none"/>'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="F59E0B"/>'
        f'  <w:bottom w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run_t = p.add_run(f"💡 {title}: ")
    run_t.font.name = "Segoe UI"
    run_t.font.size = Pt(9.5)
    run_t.font.bold = True
    run_t.font.color.rgb = COLOR_AMBER
    
    run_body = p.add_run(text)
    run_body.font.name = "Segoe UI"
    run_body.font.size = Pt(9.5)
    run_body.font.color.rgb = COLOR_TEXT
    
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)

def add_qna(doc, q_num, question, answer, code_snippet="", tip="", md_lines=None):
    # Word doc
    p_q = doc.add_paragraph()
    p_q.paragraph_format.space_before = Pt(12)
    p_q.paragraph_format.space_after = Pt(3)
    p_q.paragraph_format.keep_with_next = True
    
    r_num = p_q.add_run(f"Q{q_num}. ")
    r_num.font.name = "Segoe UI"
    r_num.font.size = Pt(11.5)
    r_num.font.bold = True
    r_num.font.color.rgb = COLOR_BLUE
    
    r_q = p_q.add_run(question)
    r_q.font.name = "Segoe UI"
    r_q.font.size = Pt(11.5)
    r_q.font.bold = True
    r_q.font.color.rgb = COLOR_NAVY
    
    p_a = doc.add_paragraph()
    p_a.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_a.paragraph_format.space_before = Pt(2)
    p_a.paragraph_format.space_after = Pt(4)
    p_a.paragraph_format.line_spacing = 1.15
    
    r_ans_label = p_a.add_run("Answer: ")
    r_ans_label.font.name = "Segoe UI"
    r_ans_label.font.size = Pt(10.5)
    r_ans_label.font.bold = True
    r_ans_label.font.color.rgb = COLOR_TEXT
    
    r_ans = p_a.add_run(answer)
    r_ans.font.name = "Segoe UI"
    r_ans.font.size = Pt(10.5)
    r_ans.font.color.rgb = COLOR_TEXT
    
    if code_snippet:
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        cell = table.cell(0, 0)
        cell.width = Inches(6.5)
        set_cell_background(cell, "F1F5F9")
        set_cell_margins(cell, top=80, bottom=80, left=140, right=140)
        
        tcPr = cell._tc.get_or_add_tcPr()
        tcBorders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>'
            f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
            f'  <w:left w:val="single" w:sz="16" w:space="0" w:color="0284C7"/>'
            f'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
            f'  <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
            f'</w:tcBorders>'
        )
        tcPr.append(tcBorders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        p.paragraph_format.line_spacing = 1.05
        run = p.add_run(code_snippet.strip())
        run.font.name = "Consolas"
        run.font.size = Pt(8.5)
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        
        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(0)
        sp.paragraph_format.space_after = Pt(4)
        
    if tip:
        add_callout(doc, tip)
        
    # Markdown
    if md_lines is not None:
        md_lines.append(f"### Q{q_num}. {question}\n")
        md_lines.append(f"**Answer:** {answer}\n")
        if code_snippet:
            md_lines.append(f"```python\n{code_snippet.strip()}\n```\n")
        if tip:
            md_lines.append(f"> 💡 **Viva Pro-Tip:** {tip}\n")
        md_lines.append("\n---\n")

def add_sec(doc, title, md_lines):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(22)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    
    r = p.add_run(title)
    r.font.name = "Segoe UI"
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = COLOR_NAVY
    
    # Underline bar
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "1D4ED8")
    set_cell_margins(cell, top=6, bottom=6, left=0, right=0)
    cell.paragraphs[0].paragraph_format.space_after = Pt(1)
    
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)
    
    md_lines.append(f"\n## {title}\n")

print("Q&A Builder framework ready.")
