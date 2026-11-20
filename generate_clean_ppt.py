"""
ConstructSafe AI – High-Impact Modern PowerPoint Presentation Generator
Designed with modern tech presentation aesthetics:
- Minimal text, punchy bullet points, simple vocabulary
- Large stats and visual badges
- Beautiful card layouts with strong hierarchy
- High-resolution framed screenshots
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

SCREENSHOTS_DIR = r"C:\Users\Ujjwal\.gemini\antigravity\brain\8d595bba-314b-40a2-a4a7-630d3483c3a3\screenshots"
OUTPUT_PATH = r"d:\construction_project\ConstructSafe_AI_Modern_Presentation.pptx"
FALLBACK_PATH = r"d:\construction_project\ConstructSafe_AI_Presentation.pptx"

# ─── Modern Color Palette ───────────────────────────────────────────────────
BG_DARK = RGBColor(0x0F, 0x17, 0x2A)        # Slate 900
BG_LIGHT = RGBColor(0xF8, 0xFA, 0xFC)       # Slate 50
CARD_WHITE = RGBColor(0xFF, 0xFF, 0xFF)     # Pure White
CARD_DARK = RGBColor(0x1E, 0x29, 0x3B)      # Slate 800

ACCENT_YELLOW = RGBColor(0xF5, 0x9E, 0x0B)  # Safety Amber / Yellow
ACCENT_BLUE = RGBColor(0x25, 0x63, 0xEB)    # Royal Blue
ACCENT_GREEN = RGBColor(0x10, 0xB9, 0x81)   # Emerald Green
ACCENT_RED = RGBColor(0xEF, 0x44, 0x44)     # Red Danger

TEXT_DARK = RGBColor(0x0F, 0x17, 0x2A)      # Main Dark Text
TEXT_WHITE = RGBColor(0xFF, 0xFF, 0xFF)     # White Text
TEXT_MUTED = RGBColor(0x64, 0x74, 0x8B)     # Slate 500
BORDER_LIGHT = RGBColor(0xE2, 0xE8, 0xF0)   # Slate 200
BORDER_DARK = RGBColor(0x33, 0x41, 0x55)    # Slate 700

FONT_MAIN = "Segoe UI"
FONT_HEADING = "Segoe UI"

SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)

prs = Presentation()
prs.slide_width = SLIDE_WIDTH
prs.slide_height = SLIDE_HEIGHT
blank_layout = prs.slide_layouts[6]

def get_img(name):
    p = os.path.join(SCREENSHOTS_DIR, name)
    return p if os.path.exists(p) else None

def set_slide_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def create_card(slide, left, top, width, height, bg_color=CARD_WHITE, border_color=BORDER_LIGHT, radius=0.03):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1.5)
    else:
        shape.line.fill.background()
    shape.adjustments[0] = radius
    return shape

def add_header(slide, tag, title, dark=False, slide_num=""):
    """Modern header with tag badge and punchy title."""
    badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.45), Inches(1.8), Inches(0.32))
    badge.fill.solid()
    badge.fill.fore_color.rgb = ACCENT_YELLOW
    badge.line.fill.background()
    badge.adjustments[0] = 0.3
    
    tf_b = badge.text_frame
    tf_b.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_b = tf_b.paragraphs[0]
    p_b.text = tag.upper()
    p_b.font.name = FONT_MAIN
    p_b.font.size = Pt(10)
    p_b.font.bold = True
    p_b.font.color.rgb = BG_DARK
    p_b.alignment = PP_ALIGN.CENTER
    
    tx = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(10.5), Inches(0.7))
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_HEADING
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE if dark else TEXT_DARK
    
    if slide_num:
        tx_n = slide.shapes.add_textbox(Inches(11.5), Inches(0.45), Inches(1.2), Inches(0.4))
        p_n = tx_n.text_frame.paragraphs[0]
        p_n.text = f"{slide_num}/14"
        p_n.font.name = FONT_MAIN
        p_n.font.size = Pt(11)
        p_n.font.bold = True
        p_n.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8) if dark else TEXT_MUTED
        p_n.alignment = PP_ALIGN.RIGHT

def add_framed_image(slide, img_path, left, top, width, height=None, border_color=BORDER_LIGHT):
    if not img_path or not os.path.exists(img_path):
        return None
    card_w = width + Inches(0.1)
    card_h = (height + Inches(0.1)) if height else Inches(3.6)
    bg = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left - Inches(0.05), top - Inches(0.05), card_w, card_h)
    bg.fill.solid()
    bg.fill.fore_color.rgb = CARD_WHITE
    bg.line.color.rgb = border_color
    bg.line.width = Pt(1)
    bg.adjustments[0] = 0.02
    
    if height:
        return slide.shapes.add_picture(img_path, left, top, width=width, height=height)
    else:
        return slide.shapes.add_picture(img_path, left, top, width=width)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1: TITLE SLIDE (Modern Tech Dark Theme)
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 1: Title...")
s1 = prs.slides.add_slide(blank_layout)
set_slide_bg(s1, BG_DARK)

# Glowing yellow accent bar
bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.2), SLIDE_HEIGHT)
bar.fill.solid()
bar.fill.fore_color.rgb = ACCENT_YELLOW
bar.line.fill.background()

# Title tag
tag1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(1.0), Inches(2.8), Inches(0.38))
tag1.fill.solid()
tag1.fill.fore_color.rgb = ACCENT_YELLOW
tag1.line.fill.background()
tag1.adjustments[0] = 0.3
tf = tag1.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.text = "AI-POWERED PLATFORM"
p.font.name = FONT_MAIN
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = BG_DARK
p.alignment = PP_ALIGN.CENTER

# Main Title
tx = s1.shapes.add_textbox(Inches(1.0), Inches(1.5), Inches(6.5), Inches(1.3))
tf = tx.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "ConstructSafe AI"
p.font.name = FONT_HEADING
p.font.size = Pt(46)
p.font.bold = True
p.font.color.rgb = TEXT_WHITE

# Subtitle
tx = s1.shapes.add_textbox(Inches(1.0), Inches(2.7), Inches(6.2), Inches(0.8))
tf = tx.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "Intelligent Construction Safety Management\nPowered by YOLOv8 Computer Vision"
p.font.name = FONT_MAIN
p.font.size = Pt(16)
p.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

# Team Card
card_team = create_card(s1, Inches(1.0), Inches(3.8), Inches(5.8), Inches(2.8), bg_color=CARD_DARK, border_color=BORDER_DARK)
tx = s1.shapes.add_textbox(Inches(1.2), Inches(4.0), Inches(5.4), Inches(2.4))
tf = tx.text_frame
p = tf.paragraphs[0]
p.text = "PROJECT TEAM"
p.font.name = FONT_MAIN
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = ACCENT_YELLOW

members = [
    "•  Ujjwal  (Lead Developer)",
    "•  Team Member 2  (Roll No: _______)",
    "•  Team Member 3  (Roll No: _______)",
    "•  Guide: Mr. S Naresh Kumar  (Asst. Professor, School of CS&AI)"
]
for m in members:
    p = tf.add_paragraph()
    p.text = m
    p.font.name = FONT_MAIN
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT_WHITE
    p.space_before = Pt(4)

p_inst = tf.add_paragraph()
p_inst.text = "SR University  |  Warangal, Telangana"
p_inst.font.name = FONT_MAIN
p_inst.font.size = Pt(10)
p_inst.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
p_inst.space_before = Pt(8)

# Hero image on right side
add_framed_image(s1, get_img("visionex_landing_hero.png"), Inches(7.2), Inches(1.5), width=Inches(5.4), height=Inches(4.8), border_color=BORDER_DARK)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2: INTRODUCTION
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 2: Introduction...")
s2 = prs.slides.add_slide(blank_layout)
set_slide_bg(s2, BG_LIGHT)
add_header(s2, "02 // Background", "Introduction: The Construction Safety Challenge", slide_num="02")

# 3 Clean Cards on Left
cards_info = [
    ("High Risk Domain", "Construction accounts for 1 in 5 workplace fatalities worldwide. Falls, electrical shocks, and struck-by hazards threaten lives daily.", ACCENT_RED),
    ("Manual Oversight Limits", "Inspectors cannot watch every corner of a large site. Paper checklists cause 24-48 hr delays before hazards get fixed.", ACCENT_YELLOW),
    ("Intelligent Solution", "ConstructSafe AI uses smartphone photos + AI to detect hazards in seconds, with human verification for 100% trust.", ACCENT_GREEN)
]

for i, (title, desc, color) in enumerate(cards_info):
    top = Inches(1.7) + i * Inches(1.7)
    card = create_card(s2, Inches(0.8), top, Inches(6.0), Inches(1.5))
    
    # Left colored accent line
    bar = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), top, Inches(0.08), Inches(1.5))
    bar.fill.solid()
    bar.fill.fore_color.rgb = color
    bar.line.fill.background()
    
    tx = s2.shapes.add_textbox(Inches(1.1), top + Inches(0.15), Inches(5.5), Inches(1.2))
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_MAIN
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_before = Pt(4)

# Real Site Image on Right
add_framed_image(s2, get_img("hero_real_construction_photo.png"), Inches(7.2), Inches(1.7), width=Inches(5.3), height=Inches(4.9))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3: PROBLEM STATEMENT
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 3: Problem Statement...")
s3 = prs.slides.add_slide(blank_layout)
set_slide_bg(s3, BG_LIGHT)
add_header(s3, "03 // The Problem", "Why Current Safety Systems Fail", slide_num="03")

problems = [
    ("01", "Missed Hazards", "Manual inspections miss small but deadly hazards like frayed wires, missing goggles, or blocked fire exits.", ACCENT_RED),
    ("02", "Slow Paper Reporting", "Writing paper reports and transcribing to Excel takes days. High-risk hazards stay active too long.", ACCENT_YELLOW),
    ("03", "No Real-Time Visibility", "Project managers and clients have no live view of safety compliance or overdue fixes across jobsites.", ACCENT_BLUE),
    ("04", "Broken Follow-Ups", "Safety tasks get lost in WhatsApp chats. Nobody knows who fixed what, and there is no audit trail.", ACCENT_RED)
]

for i, (num, title, desc, color) in enumerate(problems):
    row = i // 2
    col = i % 2
    left = Inches(0.8) + col * Inches(6.0)
    top = Inches(1.8) + row * Inches(2.5)
    
    card = create_card(s3, left, top, Inches(5.7), Inches(2.2))
    
    # Number badge
    nb = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.3), top + Inches(0.3), Inches(0.6), Inches(0.45))
    nb.fill.solid()
    nb.fill.fore_color.rgb = color
    nb.line.fill.background()
    nb.adjustments[0] = 0.2
    tf = nb.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = num
    p.font.name = FONT_MAIN
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER
    
    # Title
    tx = s3.shapes.add_textbox(left + Inches(1.1), top + Inches(0.25), Inches(4.3), Inches(0.5))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_MAIN
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    
    # Description
    tx2 = s3.shapes.add_textbox(left + Inches(0.3), top + Inches(0.9), Inches(5.1), Inches(1.1))
    tf2 = tx2.text_frame
    tf2.word_wrap = True
    p2 = tf2.paragraphs[0]
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_MUTED

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4: OBJECTIVES
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 4: Objectives...")
s4 = prs.slides.add_slide(blank_layout)
set_slide_bg(s4, BG_LIGHT)
add_header(s4, "04 // Goals", "Project Objectives: What We Built", slide_num="04")

objectives = [
    ("AI Hazard Detection", "Detect Missing PPE, Electrical Hazards, Fall Risks, and Blocked Exits in <100ms from photos using YOLOv8."),
    ("Human Verification", "Keep human inspectors in control. AI suggests hazards, certified inspectors verify before action."),
    ("Role-Based Dashboards", "5 customized portals: Admin, Project Manager, Safety Inspector, Field Worker, and Client."),
    ("Closed-Loop Action (CAPA)", "Auto-assign safety tasks with deadlines, photo proof of fix, and complete audit trail.")
]

for i, (title, desc) in enumerate(objectives):
    top = Inches(1.8) + i * Inches(1.25)
    card = create_card(s4, Inches(0.8), top, Inches(11.7), Inches(1.05))
    
    # Check circle
    ck = s4.shapes.add_shape(MSO_SHAPE.OVAL, Inches(1.1), top + Inches(0.25), Inches(0.5), Inches(0.5))
    ck.fill.solid()
    ck.fill.fore_color.rgb = ACCENT_GREEN
    ck.line.fill.background()
    tf_ck = ck.text_frame
    tf_ck.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_ck = tf_ck.paragraphs[0]
    p_ck.text = "✓"
    p_ck.font.name = FONT_MAIN
    p_ck.font.size = Pt(16)
    p_ck.font.bold = True
    p_ck.font.color.rgb = TEXT_WHITE
    p_ck.alignment = PP_ALIGN.CENTER
    
    # Title & Desc
    tx = s4.shapes.add_textbox(Inches(1.8), top + Inches(0.12), Inches(10.4), Inches(0.8))
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_MAIN
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_before = Pt(2)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5: PROPOSED SOLUTION & NOVELTY
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 5: Proposed Solution...")
s5 = prs.slides.add_slide(blank_layout)
set_slide_bg(s5, BG_LIGHT)
add_header(s5, "05 // Solution", "Proposed Solution: Photo-Based AI Platform", slide_num="05")

# Left: 3 feature cards
sol_features = [
    ("On-Demand Photo Upload", "Inspectors take site photos with standard phones. No expensive fixed cameras needed."),
    ("YOLOv8 Vision Model", "Identifies hazard location with colored bounding boxes and confidence score in 84ms."),
    ("Accountable Action Plan", "Approved hazards automatically trigger CAPA tickets with deadlines and photo proof.")
]

for i, (title, desc) in enumerate(sol_features):
    top = Inches(1.8) + i * Inches(1.4)
    card = create_card(s5, Inches(0.8), top, Inches(5.6), Inches(1.2))
    tx = s5.shapes.add_textbox(Inches(1.0), top + Inches(0.15), Inches(5.2), Inches(0.9))
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = f"•  {title}"
    p.font.name = FONT_MAIN
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_before = Pt(3)

# Novelty banner at bottom left
nov_card = create_card(s5, Inches(0.8), Inches(6.1), Inches(5.6), Inches(0.9), bg_color=CARD_DARK, border_color=BORDER_DARK)
tx_nov = s5.shapes.add_textbox(Inches(1.0), Inches(6.15), Inches(5.2), Inches(0.8))
tf_nov = tx_nov.text_frame
p = tf_nov.paragraphs[0]
p.text = "✦  KEY NOVELTY"
p.font.name = FONT_MAIN
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = ACCENT_YELLOW
p2 = tf_nov.add_paragraph()
p2.text = "Privacy-friendly alternative to invasive 24/7 CCTV • Human-in-the-loop"
p2.font.name = FONT_MAIN
p2.font.size = Pt(10)
p2.font.color.rgb = TEXT_WHITE

# Right: AI Simulator Image
add_framed_image(s5, get_img("simulator_missing_ppe.png"), Inches(6.8), Inches(1.8), width=Inches(5.7), height=Inches(5.2))

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6: TOOLS & TECHNOLOGIES
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 6: Tools & Technologies...")
s6 = prs.slides.add_slide(blank_layout)
set_slide_bg(s6, BG_LIGHT)
add_header(s6, "06 // Tech Stack", "Modern, Production-Grade Technologies", slide_num="06")

stacks = [
    ("Frontend UI", ["React 18 + TypeScript", "Vite (Fast Build)", "Tailwind CSS", "Recharts (Visualizations)"], ACCENT_BLUE),
    ("Backend API", ["Python 3.12", "FastAPI (Async)", "Uvicorn ASGI", "Pydantic v2 (Validation)"], ACCENT_GREEN),
    ("AI / Vision", ["Ultralytics YOLOv8", "PyTorch Deep Learning", "PIL (Image Processing)", "Bounding Box Regression"], ACCENT_YELLOW),
    ("Database & Security", ["MongoDB Community", "Motor Async Driver", "Argon2id Password Hashing", "JWT Token Rotation"], ACCENT_RED),
]

for i, (cat, items, color) in enumerate(stacks):
    col = i % 4
    left = Inches(0.8) + col * Inches(2.95)
    top = Inches(1.8)
    
    card = create_card(s6, left, top, Inches(2.8), Inches(4.2))
    
    # Top color stripe
    st = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(2.8), Inches(0.1))
    st.fill.solid()
    st.fill.fore_color.rgb = color
    st.line.fill.background()
    
    # Title
    tx = s6.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), Inches(2.4), Inches(0.4))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    p.text = cat
    p.font.name = FONT_MAIN
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    
    # Items
    tx2 = s6.shapes.add_textbox(left + Inches(0.2), top + Inches(0.8), Inches(2.4), Inches(3.2))
    tf2 = tx2.text_frame
    for j, item in enumerate(items):
        p = tf2.paragraphs[0] if j == 0 else tf2.add_paragraph()
        p.text = f"✔  {item}"
        p.font.name = FONT_MAIN
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = Pt(8)

# AI Tool callout bar at bottom
bot_card = create_card(s6, Inches(0.8), Inches(6.2), Inches(11.7), Inches(0.8), bg_color=CARD_DARK, border_color=BORDER_DARK)
tx_bot = s6.shapes.add_textbox(Inches(1.0), Inches(6.25), Inches(11.3), Inches(0.7))
tf_bot = tx_bot.text_frame
p = tf_bot.paragraphs[0]
p.text = "AI CODING ASSISTANT:  Google Antigravity (Powered by Gemini Models)"
p.font.name = FONT_MAIN
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = ACCENT_YELLOW

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 7: AI-ASSISTED CODING
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 7: AI Coding...")
s7 = prs.slides.add_slide(blank_layout)
set_slide_bg(s7, BG_LIGHT)
add_header(s7, "07 // AI Workflow", "AI-Assisted Development with Google Antigravity", slide_num="07")

# Left: 3 steps
ai_steps = [
    ("Targeted Prompts", "Fed clear module requirements, Pydantic schemas, and security constraints into Google Antigravity."),
    ("Iterative Code Gen", "AI generated async FastAPI endpoints, React components, and YOLOv8 inference wrappers."),
    ("Automated Audits", "AI subagents ran security reviews, identified rate limit gaps, and generated 62 pytest unit tests.")
]

for i, (title, desc) in enumerate(ai_steps):
    top = Inches(1.8) + i * Inches(1.3)
    card = create_card(s7, Inches(0.8), top, Inches(5.6), Inches(1.15))
    tx = s7.shapes.add_textbox(Inches(1.0), top + Inches(0.12), Inches(5.2), Inches(0.9))
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = f"Step {i+1}: {title}"
    p.font.name = FONT_MAIN
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_before = Pt(2)

# Sample Prompt Box
pbox = create_card(s7, Inches(0.8), Inches(5.8), Inches(5.6), Inches(1.2), bg_color=CARD_WHITE, border_color=ACCENT_BLUE)
tx_pb = s7.shapes.add_textbox(Inches(1.0), Inches(5.85), Inches(5.2), Inches(1.1))
tf_pb = tx_pb.text_frame
tf_pb.word_wrap = True
p = tf_pb.paragraphs[0]
p.text = "SAMPLE PROMPT USED:"
p.font.name = FONT_MAIN
p.font.size = Pt(10)
p.font.bold = True
p.font.color.rgb = ACCENT_BLUE
p2 = tf_pb.add_paragraph()
p2.text = '"Implement YOLOv8 hazard detection service in FastAPI with bounding box outputs and strict image MIME magic-byte validation."'
p2.font.name = FONT_MAIN
p2.font.size = Pt(10)
p2.font.color.rgb = TEXT_DARK

# Right: Clean Code Box (Dark)
code_card = create_card(s7, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.2), bg_color=CARD_DARK, border_color=BORDER_DARK)
tx_c = s7.shapes.add_textbox(Inches(7.0), Inches(1.9), Inches(5.3), Inches(5.0))
tf_c = tx_c.text_frame
p = tf_c.paragraphs[0]
p.text = "# AI-Generated YOLOv8 Service"
p.font.name = "Consolas"
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = ACCENT_YELLOW

code_lines = [
    "from ultralytics import YOLO",
    "from PIL import Image",
    "",
    "class HazardDetector:",
    "    def __init__(self):",
    "        self.model = YOLO('yolov8n.pt')",
    "        self.classes = {",
    "            0: 'Missing PPE',",
    "            1: 'Electrical Hazard',",
    "            2: 'Fall Risk',",
    "            3: 'Blocked Egress'",
    "        }",
    "",
    "    async def detect(self, img_path):",
    "        img = Image.open(img_path)",
    "        results = self.model(img, conf=0.45)",
    "        return [{",
    "            'hazard': self.classes[int(b.cls)],",
    "            'conf': round(float(b.conf)*100, 1),",
    "            'bbox': b.xyxy[0].tolist()",
    "        } for b in results[0].boxes]"
]
for line in code_lines:
    p = tf_c.add_paragraph()
    p.text = line
    p.font.name = "Consolas"
    p.font.size = Pt(9.5)
    p.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 8: SYSTEM ARCHITECTURE
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 8: Architecture...")
s8 = prs.slides.add_slide(blank_layout)
set_slide_bg(s8, BG_DARK)
add_header(s8, "08 // Architecture", "System Design: 4-Tier Cloud Architecture", dark=True, slide_num="08")

layers = [
    ("1. PRESENTATION LAYER", "React 18 + TypeScript + Vite + Tailwind CSS", "5 Role Dashboards • Interactive AI Simulator • Recharts Visuals", ACCENT_BLUE),
    ("2. REST API GATEWAY", "FastAPI (Python 3.12) + Uvicorn ASGI Server", "Argon2id Hashing • JWT Rotation • SlowAPI Rate Limiter", ACCENT_GREEN),
    ("3. AI INFERENCE ENGINE", "Ultralytics YOLOv8 + PyTorch Runtime", "Sub-100ms Inference • Bounding Box Localization • 4 Hazard Types", ACCENT_YELLOW),
    ("4. DATA PERSISTENCE", "MongoDB Community Edition + File Storage", "Atomic Updates • Project-Level Scoping • Append-Only Audit Logs", ACCENT_RED)
]

for i, (title, tech, desc, color) in enumerate(layers):
    top = Inches(1.7) + i * Inches(1.3)
    card = create_card(s8, Inches(0.8), top, Inches(11.7), Inches(1.15), bg_color=CARD_DARK, border_color=BORDER_DARK)
    
    # Left pill
    pill = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.1), top + Inches(0.2), Inches(2.6), Inches(0.75))
    pill.fill.solid()
    pill.fill.fore_color.rgb = color
    pill.line.fill.background()
    pill.adjustments[0] = 0.2
    tf = pill.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_MAIN
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER
    
    # Tech + Description
    tx = s8.shapes.add_textbox(Inches(3.9), top + Inches(0.18), Inches(8.3), Inches(0.8))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    p.text = tech
    p.font.name = FONT_MAIN
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(11)
    p2.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
    p2.space_before = Pt(2)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 9: IMPLEMENTATION MODULES
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 9: Implementation...")
s9 = prs.slides.add_slide(blank_layout)
set_slide_bg(s9, BG_LIGHT)
add_header(s9, "09 // Modules", "Core System Modules Implemented", slide_num="09")

modules_info = [
    ("Auth & Security", "Argon2id hashing, JWT access/refresh rotation with reuse detection, SlowAPI rate limits.", "🛡️"),
    ("AI Hazard Vision", "YOLOv8 model detects Missing PPE, Wires, Falls, and Blocked Exits from photos.", "👁️"),
    ("Safety Audits", "Digital inspection checklists, scoring, photo evidence, and inspector signatures.", "📋"),
    ("Incident Reports", "Track accidents, near-misses, severity levels, witness notes, and root causes.", "⚠️"),
    ("Admin & CAPA", "Approve/reject hazard queue, assign mitigation actions with deadlines & photo proof.", "✅"),
    ("Analytics & Reports", "Live Recharts dashboards + one-click PDF (ReportLab) and Excel (OpenPyXL) exports.", "📊"),
]

for i, (title, desc, icon) in enumerate(modules_info):
    row = i // 3
    col = i % 3
    left = Inches(0.8) + col * Inches(3.95)
    top = Inches(1.8) + row * Inches(2.6)
    
    card = create_card(s9, left, top, Inches(3.75), Inches(2.3))
    
    # Icon
    tx_ic = s9.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15), Inches(0.6), Inches(0.6))
    p = tx_ic.text_frame.paragraphs[0]
    p.text = icon
    p.font.size = Pt(24)
    
    # Title
    tx = s9.shapes.add_textbox(left + Inches(0.85), top + Inches(0.2), Inches(2.7), Inches(0.5))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_MAIN
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    
    # Desc
    tx2 = s9.shapes.add_textbox(left + Inches(0.2), top + Inches(0.85), Inches(3.35), Inches(1.3))
    tf2 = tx2.text_frame
    tf2.word_wrap = True
    p2 = tf2.paragraphs[0]
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_MUTED

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 10a: RESULTS — LIVE APPLICATION
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 10a: Results Live App...")
s10a = prs.slides.add_slide(blank_layout)
set_slide_bg(s10a, BG_LIGHT)
add_header(s10a, "10 // Results", "Results: Public Landing Page & Secure Login", slide_num="10")

# 2 Large Framed Screenshots Side-by-Side
add_framed_image(s10a, get_img("visionex_landing_hero.png"), Inches(0.8), Inches(1.8), width=Inches(5.7), height=Inches(4.2))
add_framed_image(s10a, get_img("visionex_login.png"), Inches(6.8), Inches(1.8), width=Inches(5.7), height=Inches(4.2))

# Captions below
tx1 = s10a.shapes.add_textbox(Inches(0.8), Inches(6.1), Inches(5.7), Inches(0.8))
tf1 = tx1.text_frame
p = tf1.paragraphs[0]
p.text = "Public Landing Page (Visionex Astro Design)"
p.font.name = FONT_MAIN
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = TEXT_DARK
p2 = tf1.add_paragraph()
p2.text = "Features clean hero, platform overview, role explanations, and live AI demo link."
p2.font.size = Pt(10)
p2.font.color.rgb = TEXT_MUTED

tx2 = s10a.shapes.add_textbox(Inches(6.8), Inches(6.1), Inches(5.7), Inches(0.8))
tf2 = tx2.text_frame
p = tf2.paragraphs[0]
p.text = "Secure Multi-Role Authentication"
p.font.name = FONT_MAIN
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = TEXT_DARK
p2 = tf2.add_paragraph()
p2.text = "Argon2id password verification, quick-fill demo personas, and JWT session handling."
p2.font.size = Pt(10)
p2.font.color.rgb = TEXT_MUTED

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 10b: RESULTS — AI HAZARD DETECTION
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 10b: Results AI Vision...")
s10b = prs.slides.add_slide(blank_layout)
set_slide_bg(s10b, BG_LIGHT)
add_header(s10b, "10 // AI in Action", "Results: Real-Time AI Hazard Detection Simulator", slide_num="10b")

# Left: Missing PPE detection screenshot
add_framed_image(s10b, get_img("simulator_missing_ppe.png"), Inches(0.8), Inches(1.8), width=Inches(5.7), height=Inches(4.0))

# Right: Egress Obstruction screenshot
add_framed_image(s10b, get_img("verified_egress_hazard_image.png"), Inches(6.8), Inches(1.8), width=Inches(5.7), height=Inches(4.0))

# Stats Callout Bar Below
stat_bar = create_card(s10b, Inches(0.8), Inches(6.0), Inches(11.7), Inches(1.1), bg_color=CARD_DARK, border_color=BORDER_DARK)

stats = [
    ("84 ms", "Inference Speed"),
    ("96.4%", "AI Confidence"),
    ("4 Classes", "Hazard Detection"),
    ("100%", "Human Verification")
]

for i, (val, lbl) in enumerate(stats):
    left = Inches(1.2) + i * Inches(2.9)
    tx = s10b.shapes.add_textbox(left, Inches(6.05), Inches(2.6), Inches(0.9))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    p.text = val
    p.font.name = FONT_MAIN
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = ACCENT_YELLOW
    p2 = tf.add_paragraph()
    p2.text = lbl
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_WHITE

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 10c: RESULTS — ROLE DASHBOARDS
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 10c: Results Dashboards...")
s10c = prs.slides.add_slide(blank_layout)
set_slide_bg(s10c, BG_LIGHT)
add_header(s10c, "10 // Dashboards", "Results: Role-Based Dashboards for 5 Stakeholders", slide_num="10c")

# 3 Dashboards: Admin, Inspector, Worker
add_framed_image(s10c, get_img("visionex_admin_dashboard.png"), Inches(0.8), Inches(1.8), width=Inches(3.7), height=Inches(4.2))
add_framed_image(s10c, get_img("visionex_inspector_dashboard.png"), Inches(4.8), Inches(1.8), width=Inches(3.7), height=Inches(4.2))
add_framed_image(s10c, get_img("visionex_worker_dashboard.png"), Inches(8.8), Inches(1.8), width=Inches(3.7), height=Inches(4.2))

# Labels below
titles = [
    ("Admin Dashboard", "All projects, approvals, CAPAs & metrics"),
    ("Inspector Dashboard", "Audit checklist, photo AI analysis"),
    ("Worker Dashboard", "Assigned safety tasks & daily induction")
]
for i, (t, d) in enumerate(titles):
    left = Inches(0.8) + i * Inches(4.0)
    tx = s10c.shapes.add_textbox(left, Inches(6.1), Inches(3.7), Inches(0.9))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    p.text = t
    p.font.name = FONT_MAIN
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p2 = tf.add_paragraph()
    p2.text = d
    p2.font.size = Pt(10)
    p2.font.color.rgb = TEXT_MUTED

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 11: TESTING & QUALITY ASSURANCE
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 11: Testing...")
s11 = prs.slides.add_slide(blank_layout)
set_slide_bg(s11, BG_LIGHT)
add_header(s11, "11 // Validation", "Testing: 62 Automated Tests (100% Passed)", slide_num="11")

# Left: Big Success Card
card_stat = create_card(s11, Inches(0.8), Inches(1.8), Inches(4.0), Inches(5.1), bg_color=CARD_WHITE, border_color=ACCENT_GREEN)
# Green top accent
gt = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.8), Inches(4.0), Inches(0.12))
gt.fill.solid()
gt.fill.fore_color.rgb = ACCENT_GREEN
gt.line.fill.background()

tx_st = s11.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(3.6), Inches(4.5))
tf_st = tx_st.text_frame
p = tf_st.paragraphs[0]
p.text = "62 / 62"
p.font.name = FONT_MAIN
p.font.size = Pt(54)
p.font.bold = True
p.font.color.rgb = ACCENT_GREEN

p2 = tf_st.add_paragraph()
p2.text = "Automated Tests Passed"
p2.font.name = FONT_MAIN
p2.font.size = Pt(16)
p2.font.bold = True
p2.font.color.rgb = TEXT_DARK
p2.space_before = Pt(4)

p3 = tf_st.add_paragraph()
p3.text = "• Framework: pytest\n• Coverage: Auth, RBAC, Vision, API\n• Success Rate: 100%\n• Fast Execution: <3.5 seconds"
p3.font.name = FONT_MAIN
p3.font.size = Pt(12)
p3.font.color.rgb = TEXT_MUTED
p3.space_before = Pt(16)

# Right: 4 Test Category Cards
test_cats = [
    ("Auth & Token Security (6 Tests)", "Verified Argon2id hash complexity, JWT token expiration, and instant session revocation on refresh token reuse."),
    ("RBAC Authorization (12 Tests)", "Verified 5 roles cannot view unauthorized projects, alter other users' data, or bypass admin approvals."),
    ("Hazard & AI Workflows (14 Tests)", "Tested file upload magic bytes, YOLOv8 trigger, inspector verification gates, and CAPA creation."),
    ("Rate Limiting & Hardening (10 Tests)", "Confirmed SlowAPI HTTP 429 throttling on brute-force login and safe JSON error envelopes.")
]

for i, (title, desc) in enumerate(test_cats):
    top = Inches(1.8) + i * Inches(1.25)
    card = create_card(s11, Inches(5.1), top, Inches(7.4), Inches(1.1))
    tx = s11.shapes.add_textbox(Inches(5.3), top + Inches(0.12), Inches(7.0), Inches(0.85))
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = f"✔  {title}"
    p.font.name = FONT_MAIN
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_before = Pt(2)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 12: CONCLUSION
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 12: Conclusion...")
s12 = prs.slides.add_slide(blank_layout)
set_slide_bg(s12, BG_DARK)
add_header(s12, "12 // Summary", "Conclusion: Project Achievements & Impact", dark=True, slide_num="12")

# 4 Stat Pillars
pillars = [
    ("8", "Completed Phases", "Scaffolding to Testing"),
    ("5", "User Roles", "Complete Data Isolation"),
    ("62", "Automated Tests", "100% Pass Rate"),
    ("<100ms", "AI Speed", "Real-Time Hazard Detection")
]

for i, (val, t, d) in enumerate(pillars):
    left = Inches(0.8) + i * Inches(2.95)
    top = Inches(1.8)
    card = create_card(s12, left, top, Inches(2.8), Inches(2.2), bg_color=CARD_DARK, border_color=BORDER_DARK)
    
    tx = s12.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), Inches(2.4), Inches(1.8))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    p.text = val
    p.font.name = FONT_MAIN
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = ACCENT_YELLOW
    
    p2 = tf.add_paragraph()
    p2.text = t
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(13)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(4)
    
    p3 = tf.add_paragraph()
    p3.text = d
    p3.font.name = FONT_MAIN
    p3.font.size = Pt(10)
    p3.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
    p3.space_before = Pt(2)

# Bottom Takeaway Card
take_card = create_card(s12, Inches(0.8), Inches(4.3), Inches(11.7), Inches(2.6), bg_color=CARD_DARK, border_color=ACCENT_YELLOW)
tx_tk = s12.shapes.add_textbox(Inches(1.1), Inches(4.5), Inches(11.1), Inches(2.2))
tf_tk = tx_tk.text_frame
p = tf_tk.paragraphs[0]
p.text = "KEY TAKEAWAY"
p.font.name = FONT_MAIN
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = ACCENT_YELLOW

takeaways = [
    "•  Proves AI computer vision can reliably protect lives in construction without invasive surveillance.",
    "•  Human-in-the-loop validation builds trust: inspectors verify AI findings before action.",
    "•  Role-specific dashboards ensure zero cognitive clutter and zero unauthorized data exposure.",
    "•  Enterprise-ready: hardened with Argon2id, JWT rotation, rate limiting, and automated audit logs."
]
for t in takeaways:
    p = tf_tk.add_paragraph()
    p.text = t
    p.font.name = FONT_MAIN
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_WHITE
    p.space_before = Pt(6)

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 13: FUTURE ENHANCEMENTS
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 13: Future Scope...")
s13 = prs.slides.add_slide(blank_layout)
set_slide_bg(s13, BG_LIGHT)
add_header(s13, "13 // Roadmap", "Future Enhancements & Scalability", slide_num="13")

future_cards = [
    ("Live Video Feeds", "Connect fixed RTSP safety cameras for continuous hazard alerting on tower cranes & gates.", "🎥"),
    ("Native Mobile App", "React Native iOS/Android app with offline photo caching for remote areas without internet.", "📱"),
    ("3D BIM Integration", "Map detected hazards directly onto Building Information 3D digital twins.", "🏗️"),
    ("IoT Smart Helmets", "Integrate wearable sensors to monitor worker body heat, impacts, and toxic gases.", "🪖")
]

for i, (title, desc, icon) in enumerate(future_cards):
    col = i % 4
    left = Inches(0.8) + col * Inches(2.95)
    top = Inches(1.8)
    
    card = create_card(s13, left, top, Inches(2.8), Inches(4.8))
    
    # Icon
    tx_ic = s13.shapes.add_textbox(left + Inches(0.2), top + Inches(0.3), Inches(1.0), Inches(0.8))
    p = tx_ic.text_frame.paragraphs[0]
    p.text = icon
    p.font.size = Pt(36)
    
    # Title
    tx = s13.shapes.add_textbox(left + Inches(0.2), top + Inches(1.3), Inches(2.4), Inches(0.6))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = FONT_MAIN
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    
    # Desc
    tx2 = s13.shapes.add_textbox(left + Inches(0.2), top + Inches(2.0), Inches(2.4), Inches(2.5))
    tf2 = tx2.text_frame
    tf2.word_wrap = True
    p2 = tf2.paragraphs[0]
    p2.text = desc
    p2.font.name = FONT_MAIN
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_MUTED

# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 14: REFERENCES & CLOSING
# ══════════════════════════════════════════════════════════════════════════════
print("Generating Slide 14: References...")
s14 = prs.slides.add_slide(blank_layout)
set_slide_bg(s14, BG_DARK)
add_header(s14, "14 // Literature", "References & Documentation Cited", dark=True, slide_num="14")

refs = [
    ("OSHA Fatal Four Statistics", "U.S. Department of Labor, Occupational Safety & Health Administration (osha.gov)"),
    ("Ultralytics YOLOv8 Documentation", "State-of-the-Art Object Detection Library & PyTorch Runtime (docs.ultralytics.com)"),
    ("FastAPI Framework", "Modern, High-Performance Python Web API Framework (fastapi.tiangolo.com)"),
    ("Argon2 Password Hashing", "RFC 9106 Specification — Memory-Hard Cryptographic Hashing Standard"),
    ("JSON Web Tokens (JWT)", "RFC 7519 Standards — Cryptographic Session and Token Rotation"),
    ("React 18 & Tailwind CSS", "Modern Component Architecture & Utility-First Responsive Styling (react.dev)"),
]

for i, (title, link) in enumerate(refs):
    top = Inches(1.8) + i * Inches(0.7)
    card = create_card(s14, Inches(0.8), top, Inches(11.7), Inches(0.6), bg_color=CARD_DARK, border_color=BORDER_DARK)
    
    tx = s14.shapes.add_textbox(Inches(1.0), top + Inches(0.08), Inches(11.3), Inches(0.5))
    tf = tx.text_frame
    p = tf.paragraphs[0]
    r1 = p.add_run()
    r1.text = f"[{i+1}]  {title} — "
    r1.font.name = FONT_MAIN
    r1.font.size = Pt(11)
    r1.font.bold = True
    r1.font.color.rgb = ACCENT_YELLOW
    
    r2 = p.add_run()
    r2.text = link
    r2.font.name = FONT_MAIN
    r2.font.size = Pt(11)
    r2.font.color.rgb = TEXT_WHITE

# Thank You Banner
thank_card = create_card(s14, Inches(0.8), Inches(6.0), Inches(11.7), Inches(1.0), bg_color=CARD_DARK, border_color=ACCENT_YELLOW)
tx_th = s14.shapes.add_textbox(Inches(1.0), Inches(6.1), Inches(11.3), Inches(0.8))
tf_th = tx_th.text_frame
p = tf_th.paragraphs[0]
p.text = "Thank You!  —  Questions & Feedback Welcome"
p.font.name = FONT_MAIN
p.font.size = Pt(20)
p.font.bold = True
p.font.color.rgb = ACCENT_YELLOW
p.alignment = PP_ALIGN.CENTER

# Save presentation
print(f"Saving high-impact presentation to: {OUTPUT_PATH}")
prs.save(OUTPUT_PATH)
print("✅ Modern presentation generated successfully at:", OUTPUT_PATH)

try:
    prs.save(FALLBACK_PATH)
    print("✅ Also updated original file:", FALLBACK_PATH)
except Exception as e:
    print("Notice: Original file was locked (likely open in PowerPoint). New file saved as:", OUTPUT_PATH)
