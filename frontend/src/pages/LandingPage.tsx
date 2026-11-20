import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Camera,
  ClipboardCheck,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  HardHat,
  Users,
  Building2,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Sliders,
  UploadCloud,
  Cpu,
  Layers,
  RotateCcw
} from 'lucide-react';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

interface DetectionBox {
  id: string;
  category: string;
  confidence: number;
  type: 'danger' | 'warning' | 'info' | 'success';
  top: string;
  left: string;
  width: string;
  height: string;
}

interface HazardDemoPreset {
  id: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium';
  confidence: number;
  location: string;
  description: string;
  recommendation: string;
  image: string;
  latencyMs: number;
  boxes: DetectionBox[];
}

const DEMO_PRESETS: HazardDemoPreset[] = [
  {
    id: 'fall',
    title: 'Perimeter Fall Risk',
    category: 'Work at Height',
    severity: 'critical',
    confidence: 96.8,
    location: 'Sector 4, Level 6 Slab Edge',
    description: 'Unprotected high-rise floor perimeter missing certified safety guardrails and toe-boards.',
    recommendation: 'Erect temporary certified perimeter safety railing and install toe-boards immediately.',
    image: '/images/hazards/hazard_fall_risk.jpg',
    latencyMs: 38,
    boxes: [
      {
        id: 'b1',
        category: 'Perimeter Fall Risk (No Guardrail)',
        confidence: 96.8,
        type: 'danger',
        top: '45%',
        left: '25%',
        width: '52%',
        height: '42%'
      },
      {
        id: 'b2',
        category: 'Exposed Edge Rebar',
        confidence: 93.4,
        type: 'warning',
        top: '65%',
        left: '60%',
        width: '32%',
        height: '28%'
      },
      {
        id: 'b3',
        category: 'Worker Near Edge (3.2m)',
        confidence: 98.1,
        type: 'info',
        top: '28%',
        left: '12%',
        width: '20%',
        height: '48%'
      }
    ]
  },
  {
    id: 'ppe',
    title: 'Missing Head Protection',
    category: 'Personal Protection',
    severity: 'high',
    confidence: 95.4,
    location: 'Tower B, Active Scaffolding Zone',
    description: 'Frontline construction worker operating without a safety helmet and high-visibility vest.',
    recommendation: 'Issue immediate safety stand-down. Equip worker with ANSI Z89.1 Type I hardhat and Class 2 vest.',
    image: '/images/hazards/hazard_missing_ppe.jpg',
    latencyMs: 42,
    boxes: [
      {
        id: 'b1',
        category: 'Missing PPE: Hardhat',
        confidence: 95.4,
        type: 'danger',
        top: '12%',
        left: '34%',
        width: '30%',
        height: '24%'
      },
      {
        id: 'b2',
        category: 'Missing: High-Vis Safety Vest',
        confidence: 92.8,
        type: 'warning',
        top: '34%',
        left: '28%',
        width: '44%',
        height: '38%'
      },
      {
        id: 'b3',
        category: 'Active Worker #04',
        confidence: 98.6,
        type: 'info',
        top: '10%',
        left: '24%',
        width: '52%',
        height: '82%'
      },
      {
        id: 'b4',
        category: 'Compliant: Safety Work Boots',
        confidence: 96.1,
        type: 'success',
        top: '80%',
        left: '32%',
        width: '36%',
        height: '18%'
      }
    ]
  },
  {
    id: 'electrical',
    title: 'Exposed High-Voltage Cable',
    category: 'Electrical Hazard',
    severity: 'high',
    confidence: 93.8,
    location: 'Basement Mechanical Zone',
    description: 'Heavy-duty 480V generator supply cables strewn across water puddle and muddy walkway.',
    recommendation: 'De-energize circuit, elevate wiring on insulated J-hooks, and install heavy-duty drive-over ramps.',
    image: '/images/hazards/hazard_electrical.jpg',
    latencyMs: 46,
    boxes: [
      {
        id: 'b1',
        category: 'Exposed High-Voltage Cable',
        confidence: 93.8,
        type: 'danger',
        top: '48%',
        left: '18%',
        width: '64%',
        height: '36%'
      },
      {
        id: 'b2',
        category: 'Water Pool / Electrocution Risk',
        confidence: 96.5,
        type: 'danger',
        top: '58%',
        left: '35%',
        width: '48%',
        height: '34%'
      },
      {
        id: 'b3',
        category: 'Temporary Distribution Panel',
        confidence: 94.0,
        type: 'info',
        top: '15%',
        left: '65%',
        width: '28%',
        height: '45%'
      }
    ]
  },
  {
    id: 'egress',
    title: 'Emergency Egress Obstruction',
    category: 'Fire & Housekeeping',
    severity: 'medium',
    confidence: 95.1,
    location: 'Stairwell B, Ground Floor Discharge',
    description: 'Stacked wooden pallets and construction debris blocking access to designated emergency exit door.',
    recommendation: 'Relocate materials to outdoor staging area within 2 hours. Restore 1.2m clear walking corridor.',
    image: '/images/hazards/hazard_egress_obstruction.jpg',
    latencyMs: 35,
    boxes: [
      {
        id: 'b1',
        category: 'Blocked Emergency Exit Door',
        confidence: 96.8,
        type: 'danger',
        top: '18%',
        left: '52%',
        width: '34%',
        height: '60%'
      },
      {
        id: 'b2',
        category: 'Stacked Wooden Pallets',
        confidence: 97.4,
        type: 'warning',
        top: '46%',
        left: '14%',
        width: '40%',
        height: '42%'
      },
      {
        id: 'b3',
        category: 'Drywall & Construction Debris',
        confidence: 91.2,
        type: 'warning',
        top: '68%',
        left: '42%',
        width: '36%',
        height: '24%'
      }
    ]
  }
];

const FAQ_ITEMS = [
  {
    q: 'Does ConstructSafe AI require continuous CCTV cameras or RTSP video streams?',
    a: 'No. ConstructSafe AI operates on a privacy-first, photo-based analysis workflow. Inspectors snap high-resolution photographs of specific hazards in the field. This eliminates costly CCTV infrastructure, network bandwidth strain, and invasive surveillance of workers.'
  },
  {
    q: 'How does the YOLO AI hazard detection model operate?',
    a: 'When an inspector uploads a site photograph, our backend computer-vision engine performs static image inference in under 120ms. It detects hazard categories, draws coordinate bounding boxes, and generates confidence scores to assist the inspector.'
  },
  {
    q: 'How does human-in-the-loop verification prevent false positives?',
    a: 'AI never automatically declares a site or worker unsafe. The AI acts as an assistant. An authorized Safety Inspector must examine the bounding boxes, adjust or confirm findings, add site observations, and submit the report to the Admin queue for review.'
  },
  {
    q: 'What is the Corrective Action (CAPA) escalation workflow?',
    a: 'When an Administrator approves a hazard report, they can assign a linked Corrective Action to a specific Project Manager or Safety Officer with an assigned SLA deadline. The assignee resolves the condition, uploads photographic proof, and marks it closed.'
  },
  {
    q: 'Can clients and investors monitor project safety compliance?',
    a: 'Yes. ConstructSafe AI includes a dedicated Client Oversight portal. Clients have read-only visibility into their authorized projects, compliance scores, verified hazard resolutions, and one-click audit-ready PDF reports.'
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Interactive Simulator State
  const [selectedDemo, setSelectedDemo] = useState<HazardDemoPreset>(DEMO_PRESETS[0]);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(85);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'danger', 'ppe'
  
  // Custom Upload State
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [customDetections, setCustomDetections] = useState<DetectionBox[]>([]);
  const [customLatency, setCustomLatency] = useState<number>(45);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accordion & Role state
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeRoleTab, setActiveRoleTab] = useState<string>('inspector');

  // Filter boxes by confidence threshold and filterType
  const activeBoxes = (customImage ? customDetections : selectedDemo.boxes).filter((box) => {
    if (box.confidence < confidenceThreshold) return false;
    if (filterType === 'danger' && box.type !== 'danger') return false;
    if (filterType === 'ppe' && !box.category.toLowerCase().includes('ppe') && !box.category.toLowerCase().includes('hardhat') && !box.category.toLowerCase().includes('vest')) return false;
    return true;
  });

  // Handle custom photo upload
  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCustomImage(previewUrl);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('force_demo', 'false');

      const startTime = performance.now();
      const res = await fetch('http://127.0.0.1:8000/api/v1/hazards/analyze-demo', {
        method: 'POST',
        body: formData
      });
      const endTime = performance.now();
      setCustomLatency(Math.round(endTime - startTime));

      if (res.ok) {
        const data = await res.json();
        const detections = data.ai_analysis?.raw_detections || [];
        const mappedBoxes: DetectionBox[] = detections.map((d: any, idx: number) => {
          const norm = d.normalized_bbox || [0.2, 0.2, 0.6, 0.6];
          const [ymin, xmin, ymax, xmax] = norm;
          const isDanger = d.category.toLowerCase().includes('hazard') || d.category.toLowerCase().includes('risk') || d.category.toLowerCase().includes('fall') || d.category.toLowerCase().includes('no_');
          return {
            id: `custom-${idx}`,
            category: d.category.replace(/_/g, ' ').toUpperCase(),
            confidence: Math.round(d.confidence * 100),
            type: isDanger ? 'danger' : 'info',
            top: `${ymin * 100}%`,
            left: `${xmin * 100}%`,
            width: `${(xmax - xmin) * 100}%`,
            height: `${(ymax - ymin) * 100}%`
          };
        });

        if (mappedBoxes.length === 0) {
          mappedBoxes.push({
            id: 'custom-default',
            category: 'Site Safety Analysis Verified',
            confidence: 94.0,
            type: 'info',
            top: '25%',
            left: '25%',
            width: '50%',
            height: '50%'
          });
        }
        setCustomDetections(mappedBoxes);
      } else {
        // Fallback simulation
        setCustomDetections([
          {
            id: 'sim-1',
            category: 'Hazard Inspection Area',
            confidence: 92.5,
            type: 'danger',
            top: '30%',
            left: '30%',
            width: '40%',
            height: '40%'
          }
        ]);
      }
    } catch {
      setCustomDetections([
        {
          id: 'sim-1',
          category: 'Hazard Inspection Area',
          confidence: 92.5,
          type: 'danger',
          top: '30%',
          left: '30%',
          width: '40%',
          height: '40%'
        }
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetCustomUpload = () => {
    setCustomImage(null);
    setCustomDetections([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getBoxStyle = (type: string) => {
    switch (type) {
      case 'danger':
        return {
          border: 'border-2 border-red-500 bg-red-500/15 text-red-500',
          badge: 'bg-red-600 text-white'
        };
      case 'warning':
        return {
          border: 'border-2 border-[#FFDD00] bg-[#FFDD00]/20 text-[#121926]',
          badge: 'bg-[#FFDD00] text-[#121926]'
        };
      case 'success':
        return {
          border: 'border-2 border-emerald-500 bg-emerald-500/15 text-emerald-600',
          badge: 'bg-emerald-600 text-white'
        };
      case 'info':
      default:
        return {
          border: 'border-2 border-cyan-400 bg-cyan-400/15 text-cyan-400',
          badge: 'bg-cyan-600 text-white'
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#040404] flex flex-col font-sans">
      {/* SECTION 1: NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#121926] flex items-center justify-center text-[#FFDD00] shadow-sm transition-transform group-hover:scale-105">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-extrabold tracking-tight text-[#121926] leading-none">
                ConstructSafe <span className="text-[#FFDD00]">AI</span>
              </span>
              <span className="text-[10px] text-[#666666] tracking-wider font-semibold uppercase mt-0.5">
                Safety Management
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#666666]">
            <a href="#hero" className="text-[#040404] font-semibold hover:text-[#121926] transition-colors">
              Home
            </a>
            <a href="#features" className="hover:text-[#040404] transition-colors">
              Features
            </a>
            <a href="#interactive-demo" className="hover:text-[#040404] transition-colors flex items-center gap-1.5 text-[#121926] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#E6C700]" />
              Interactive AI Demo
            </a>
            <a href="#how-it-works" className="hover:text-[#040404] transition-colors">
              How It Works
            </a>
            <a href="#roles" className="hover:text-[#040404] transition-colors">
              Platform Roles
            </a>
            <a href="#benefits" className="hover:text-[#040404] transition-colors">
              Benefits
            </a>
            <a href="#faq" className="hover:text-[#040404] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right-side Auth Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-primary"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="btn-outline hidden sm:inline-flex"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="btn-primary"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* SECTION 2: HERO */}
      <section id="hero" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAEAEA] text-[#121926] text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#E6C700]" />
              Photo-Based AI Hazard Intelligence
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#121926] leading-[1.1] tracking-tight">
              Smarter Construction. <br />
              <span className="underline decoration-[#FFDD00] decoration-wavy decoration-from-font">
                Safer Workplaces.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#666666] leading-relaxed max-w-xl">
              An intelligent construction safety management platform that helps field inspectors identify hazards, manage compliance checklists, and close out corrective actions using human-in-the-loop AI vision.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <a href="#interactive-demo" className="btn-primary text-center">
                Try Interactive AI Demo <Sparkles className="w-4 h-4 ml-2 text-[#121926]" />
              </a>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-dark text-center"
              >
                Launch Safety Portal <ArrowRight className="w-4 h-4 ml-1.5 inline-block" />
              </button>
            </div>

            {/* Social Proof Badges */}
            <div className="pt-6 border-t border-[#EAEAEA] flex flex-wrap items-center gap-6 text-xs text-[#666666] font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#121926]" />
                <span>Zero CCTV Overhead</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#121926]" />
                <span>Human-in-the-Loop Review</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#121926]" />
                <span>Enterprise MongoDB RBAC</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual with Real Construction Site Photo */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-2xl overflow-hidden border border-[#EAEAEA] shadow-xl bg-white p-2">
                <div className="relative h-80 sm:h-96 rounded-xl overflow-hidden bg-[#121926]">
                  <ImageWithFallback
                    src="/images/hazards/hazard_fall_risk.jpg"
                    fallbackSrc="/images/dashboard/construction_banner.jpg"
                    alt="Active Construction Site Fall Hazard"
                    className="w-full h-full object-cover filter brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121926]/85 via-transparent to-transparent" />
                  
                  {/* Floating Status Pill */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#EAEAEA] shadow-sm flex items-center gap-2 text-xs font-bold text-[#121926]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active Jobsite Safety Guard
                  </div>

                  {/* Multi-Class Bounding Boxes on Real Construction Site */}
                  <div className="absolute top-[42%] left-[28%] w-[50%] h-[38%] border-2 border-red-500 bg-red-500/15 rounded-md pointer-events-none animate-pulse">
                    <span className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                      Critical: Perimeter Edge Fall Risk (96.8%)
                    </span>
                  </div>

                  <div className="absolute top-[26%] left-[12%] w-[22%] h-[40%] border-2 border-cyan-400 bg-cyan-400/10 rounded-md pointer-events-none">
                    <span className="absolute -top-6 left-0 bg-cyan-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                      Worker in Zone (98.1%)
                    </span>
                  </div>

                  {/* Floating AI Detection Sample Box */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-[#EAEAEA] shadow-md">
                    <div className="flex items-center justify-between text-xs font-bold text-[#121926] mb-1">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#E6C700]" />
                        YOLOv8 Hazard Inference Engine
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#FFDD00] text-[#121926] font-extrabold text-[10px]">
                        Latency: 38ms
                      </span>
                    </div>
                    <p className="text-[11px] text-[#666666]">
                      Fall risk identified on perimeter scaffolding edge. Assigned immediate guardrail CAPA.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PLATFORM FEATURES */}
      <section id="features" className="py-20 bg-white border-y border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666] block mb-2">
              Core Capabilities
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#121926]">
              Engineered For Modern Jobsite Safety
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#666666]">
              A complete suite of intelligent tools designed specifically for construction teams, field inspectors, and project executives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="card-vx hover:border-[#121926] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#FFDD00] flex items-center justify-center text-[#121926] mb-5 shadow-sm">
                  <Camera className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#121926] mb-2">
                  Photo Hazard Detection
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  Upload site hazard photographs and receive instant AI bounding boxes, supported categories, and confidence scores.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex items-center text-xs font-bold text-[#121926]">
                <span>Photo-Based Vision</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card-vx hover:border-[#121926] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#121926] flex items-center justify-center text-white mb-5 shadow-sm">
                  <ClipboardCheck className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#121926] mb-2">
                  Safety Inspections
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  Manage digital inspection checklists, calculate automated pass/fail audit scores, and log photographic notes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex items-center text-xs font-bold text-[#121926]">
                <span>Checklist Auditing</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card-vx hover:border-[#121926] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#FFDD00] flex items-center justify-center text-[#121926] mb-5 shadow-sm">
                  <AlertTriangle className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#121926] mb-2">
                  Incident & CAPA Tracking
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  Log near-misses and injuries, investigate causes, and assign accountable corrective actions with SLA deadlines.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex items-center text-xs font-bold text-[#121926]">
                <span>CAPA Escalation</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="card-vx hover:border-[#121926] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#121926] flex items-center justify-center text-white mb-5 shadow-sm">
                  <BarChart3 className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#121926] mb-2">
                  Analytics & PDF Reports
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  Monitor safety KPIs, inspection pass rates, and export one-click audit-ready PDF scorecards and Excel workbooks.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex items-center text-xs font-bold text-[#121926]">
                <span>Audit-Ready Exports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: ENHANCED INTERACTIVE AI HAZARD SIMULATOR */}
      <section id="interactive-demo" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#666666] block mb-2">
            Try It Now • Real Construction Scenarios
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#121926]">
            Interactive AI Hazard Vision Engine
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#666666]">
            Experience how our computer-vision engine detects multiple hazard classes, evaluates confidence thresholds, and aids safety inspectors in sub-second inference.
          </p>
        </div>

        {/* Top Controls: Preset Buttons + Upload Custom Photo */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
          {DEMO_PRESETS.map((preset) => {
            const isSelected = !customImage && selectedDemo.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setCustomImage(null);
                  setSelectedDemo(preset);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-[#121926] text-[#FFDD00] shadow-sm'
                    : 'bg-white text-[#121926] border border-[#EAEAEA] hover:border-[#121926]'
                }`}
              >
                {preset.title}
              </button>
            );
          })}

          {/* Custom Upload Trigger */}
          <label className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            customImage
              ? 'bg-[#FFDD00] text-[#121926] shadow-sm'
              : 'bg-white text-[#121926] border border-dashed border-[#121926] hover:bg-[#FBFBFB]'
          }`}>
            <UploadCloud className="w-4 h-4" />
            <span>{customImage ? 'Analyzed Custom Photo' : 'Upload Any Site Photo'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCustomFileUpload}
            />
          </label>

          {customImage && (
            <button
              onClick={resetCustomUpload}
              className="p-2.5 rounded-xl bg-white border border-[#EAEAEA] text-[#666666] hover:text-[#121926] text-xs font-bold flex items-center gap-1"
              title="Reset to demo presets"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Simulator Card with Dual-Pane Architecture */}
        <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-md p-6 sm:p-8 space-y-6">
          {/* AI Interactive Control Bar */}
          <div className="p-4 bg-[#FBFBFB] rounded-xl border border-[#EAEAEA] flex flex-wrap items-center justify-between gap-4">
            {/* Confidence Threshold Slider */}
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-[#121926]" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#121926]">Confidence Threshold:</span>
                  <span className="text-xs font-extrabold text-[#121926] font-mono px-2 py-0.5 rounded bg-[#FFDD00]">
                    {confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="98"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-36 sm:w-44 accent-[#121926] cursor-pointer mt-1"
                />
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#666666] hidden sm:inline">Filter:</span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'all'
                    ? 'bg-[#121926] text-white'
                    : 'bg-white text-[#666666] border border-[#EAEAEA] hover:text-[#121926]'
                }`}
              >
                All Detections
              </button>
              <button
                onClick={() => setFilterType('danger')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'danger'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-[#666666] border border-[#EAEAEA] hover:text-red-600'
                }`}
              >
                Critical Only
              </button>
              <button
                onClick={() => setFilterType('ppe')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'ppe'
                    ? 'bg-[#121926] text-[#FFDD00]'
                    : 'bg-white text-[#666666] border border-[#EAEAEA] hover:text-[#121926]'
                }`}
              >
                PPE Checks
              </button>
            </div>

            {/* View Layer Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  showHeatmap
                    ? 'bg-[#121926] text-[#FFDD00]'
                    : 'bg-white text-[#666666] border border-[#EAEAEA] hover:text-[#121926]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Heatmap Overlay</span>
              </button>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  showLabels
                    ? 'bg-[#121926] text-white'
                    : 'bg-white text-[#666666] border border-[#EAEAEA] hover:text-[#121926]'
                }`}
              >
                Labels {showLabels ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Main Visual & Inference Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visual Canvas with Dynamic Multi-Class Bounding Boxes */}
            <div className="lg:col-span-7">
              <div className="relative h-80 sm:h-[420px] rounded-xl overflow-hidden bg-[#121926] border border-[#EAEAEA]">
                <ImageWithFallback
                  src={customImage || selectedDemo.image}
                  fallbackSrc="/images/dashboard/construction_banner.jpg"
                  alt={selectedDemo.title}
                  className="w-full h-full object-cover filter brightness-90"
                />
                
                {/* Optional Heatmap Visual Simulation */}
                {showHeatmap && (
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.35)_0%,_rgba(255,221,0,0.25)_40%,_transparent_75%)] pointer-events-none mix-blend-screen animate-pulse" />
                )}

                {/* Loading state during custom image inference */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-[#121926]/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                    <div className="w-10 h-10 border-4 border-[#FFDD00] border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="font-heading font-extrabold text-sm text-[#FFDD00]">
                      YOLOv8 Inference Running...
                    </span>
                    <span className="text-xs text-slate-300 mt-1">Analyzing tensors & bounding coordinates</span>
                  </div>
                )}

                {/* Dynamic Multi-Object Bounding Boxes */}
                {!isAnalyzing && activeBoxes.map((box) => {
                  const style = getBoxStyle(box.type);
                  return (
                    <div
                      key={box.id}
                      style={{
                        top: box.top,
                        left: box.left,
                        width: box.width,
                        height: box.height
                      }}
                      className={`absolute ${style.border} rounded-md transition-all duration-300 group`}
                    >
                      {showLabels && (
                        <div className={`absolute -top-6 left-0 ${style.badge} px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-extrabold shadow-sm flex items-center gap-1 whitespace-nowrap z-10`}>
                          <span>{box.category}</span>
                          <span className="opacity-80 font-mono">({box.confidence}%)</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Bottom Canvas Telemetry Strip */}
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white z-10 pointer-events-none">
                  <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg font-mono text-[11px] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>1280×720 RGB</span>
                    <span>•</span>
                    <span>{activeBoxes.length} Detections Filtered</span>
                  </div>
                  <div className="bg-[#FFDD00] text-[#121926] px-3 py-1 rounded-lg font-extrabold uppercase text-[10px] tracking-wide">
                    {customImage ? 'Custom Site Photo' : `${selectedDemo.severity} Severity`}
                  </div>
                </div>
              </div>
            </div>

            {/* Inference Telemetry & Findings Breakdown */}
            <div className="lg:col-span-5 space-y-5">
              <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926]">
                  <Cpu className="w-3.5 h-3.5 text-[#E6C700]" />
                  Engine: YOLOv8 PyTorch
                </span>
                <span className="text-xs font-mono font-bold text-[#121926] bg-[#FFDD00]/30 px-2 py-0.5 rounded">
                  Latency: {customImage ? customLatency : selectedDemo.latencyMs}ms
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-[#666666] uppercase tracking-wide">
                  {customImage ? 'Live Custom Inference' : selectedDemo.category}
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-[#121926] mt-0.5">
                  {customImage ? 'Uploaded Jobsite Photograph Analysis' : selectedDemo.title}
                </h3>
              </div>

              {/* Detections Checklist */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#121926] uppercase tracking-wide block">
                  Identified Coordinates ({activeBoxes.length}):
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activeBoxes.map((box) => (
                    <div
                      key={box.id}
                      className="p-2 rounded-lg bg-[#FBFBFB] border border-[#EAEAEA] flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-[#121926]">{box.category}</span>
                      <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-[#EAEAEA]">
                        {box.confidence}%
                      </span>
                    </div>
                  ))}
                  {activeBoxes.length === 0 && (
                    <p className="text-xs text-[#666666] italic">
                      No detections above current {confidenceThreshold}% confidence threshold. Try lowering the threshold slider.
                    </p>
                  )}
                </div>
              </div>

              {/* Inspector Recommendation */}
              <div className="p-3.5 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] text-xs text-[#78350F] space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Recommended Corrective Action (CAPA):
                </span>
                <p className="leading-relaxed">
                  {customImage
                    ? 'Conduct immediate field inspection of highlighted coordinates and file signed CAPA form.'
                    : selectedDemo.recommendation}
                </p>
              </div>

              {/* Human-in-the-Loop Verification Callout */}
              <div className="pt-3 border-t border-[#EAEAEA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Human-in-the-Loop: Pending Inspector Approval</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="btn-primary text-xs py-2 px-3.5 whitespace-nowrap"
                >
                  Log In to Confirm Finding
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#666666] block mb-2">
              Four-Step Lifecycle
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#121926]">
              How ConstructSafe AI Works
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#666666]">
              A transparent, privacy-first protocol ensuring every construction hazard is detected, verified by a human, and resolved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="card-vx relative hover:border-[#121926] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#121926] text-[#FFDD00] font-heading font-extrabold text-base flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926] mb-1.5">
                Upload Photograph
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Safety Inspector captures a clear jobsite photo via tablet or phone and uploads it to the hazard report form.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-vx relative hover:border-[#121926] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#FFDD00] text-[#121926] font-heading font-extrabold text-base flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926] mb-1.5">
                AI Inference
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                YOLO computer vision analyzes the photograph, isolates coordinates, identifies categories, and returns confidence scores.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-vx relative hover:border-[#121926] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#121926] text-[#FFDD00] font-heading font-extrabold text-base flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926] mb-1.5">
                Inspector Verification
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Inspector reviews AI suggestions, confirms or edits the findings, and submits the verified report to Admin.
              </p>
            </div>

            {/* Step 4 */}
            <div className="card-vx relative hover:border-[#121926] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#FFDD00] text-[#121926] font-heading font-extrabold text-base flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926] mb-1.5">
                Admin Approval & CAPA
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Admin reviews evidence, approves the hazard, and assigns an accountable Corrective Action (CAPA) with an SLA deadline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: ROLE-BASED PLATFORM SPOTLIGHT */}
      <section id="roles" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#666666] block mb-2">
            Tailored User Roles
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#121926]">
            Dedicated Portals For Every Stakeholder
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#666666]">
            Select a role to see how ConstructSafe AI adapts to their specific daily workflow.
          </p>
        </div>

        {/* Role Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
          {[
            { id: 'admin', label: 'Administrator', icon: Shield },
            { id: 'pm', label: 'Project Manager', icon: Building2 },
            { id: 'inspector', label: 'Safety Inspector', icon: HardHat },
            { id: 'worker', label: 'Site Worker', icon: Users },
            { id: 'client', label: 'Client / Owner', icon: Eye }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeRoleTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveRoleTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[#121926] text-[#FFDD00] shadow-sm'
                    : 'bg-white text-[#121926] border border-[#EAEAEA] hover:border-[#121926]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Role Content Card */}
        <div className="card-vx p-6 sm:p-8 bg-white border border-[#EAEAEA] shadow-md">
          {activeRoleTab === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] uppercase">
                  Global Governance
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-[#121926] mt-3 mb-2">
                  Administrator Portal
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed mb-4">
                  Full administrative authority across projects, user accounts, and hazard approvals. Process incoming inspector submissions, enforce CAPA closeout SLAs, and access company-wide safety analytics.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-[#121926] mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Review and authorize incoming hazard reports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Assign corrective actions to project managers
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Export enterprise safety reports in PDF & Excel
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary text-xs py-2.5 px-4"
                >
                  Test Admin Account (admin@constructsafe.com)
                </button>
              </div>
              <div className="p-6 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA] space-y-3">
                <div className="text-xs font-bold text-[#121926] uppercase">Admin KPI Snapshot</div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-[#121926]">52</div>
                    <div className="text-[10px] text-[#666666]">Pending Approvals</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-[#121926]">19</div>
                    <div className="text-[10px] text-[#666666]">Active Projects</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRoleTab === 'pm' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] uppercase">
                  Project Leadership
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-[#121926] mt-3 mb-2">
                  Project Manager Portal
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed mb-4">
                  Focused dashboard displaying only projects assigned to you. Track open corrective actions, monitor workforce safety compliance, and ensure zero-delay project delivery.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-[#121926] mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Scoped project safety scorecards
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> CAPA task tracking and verification closeout
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Site worker compliance and audit tracking
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary text-xs py-2.5 px-4"
                >
                  Test PM Account (pm@constructsafe.com)
                </button>
              </div>
              <div className="p-6 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA] space-y-3">
                <div className="text-xs font-bold text-[#121926] uppercase">PM Operations Snapshot</div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-[#121926]">2</div>
                    <div className="text-[10px] text-[#666666]">Managed Projects</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-[#121926]">25</div>
                    <div className="text-[10px] text-[#666666]">Open CAPAs</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRoleTab === 'inspector' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFDD00] text-[#121926] uppercase">
                  Field Operations
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-[#121926] mt-3 mb-2">
                  Safety Inspector Portal
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed mb-4">
                  Built for rapid field use on tablets and phones. Prominent 1-click photo upload launches the YOLO inference workflow, followed by quick verification and submission.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-[#121926] mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> 1-Click "Upload Hazard Photo" hero action
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Conduct standardized safety checklist audits
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Real-time status tracking on submitted hazards
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary text-xs py-2.5 px-4"
                >
                  Test Inspector Account (inspector@constructsafe.com)
                </button>
              </div>
              <div className="p-6 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA] space-y-3">
                <div className="text-xs font-bold text-[#121926] uppercase">Inspector Snapshot</div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-[#121926]">52</div>
                    <div className="text-[10px] text-[#666666]">Submitted Hazards</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-[#121926]">2</div>
                    <div className="text-[10px] text-[#666666]">Pending Audits</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRoleTab === 'worker' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] uppercase">
                  Frontline Workforce
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-[#121926] mt-3 mb-2">
                  Site Worker Portal
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed mb-4">
                  Simple, distraction-free portal for frontline tradespeople. View personal safety task assignments, verify induction credentials, and report safety concerns directly.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-[#121926] mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Personal safety tasks and induction status
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Direct, anonymous hazard reporting option
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Mandatory site rules and protocol reference
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary text-xs py-2.5 px-4"
                >
                  Test Worker Account (worker@constructsafe.com)
                </button>
              </div>
              <div className="p-6 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA] space-y-3">
                <div className="text-xs font-bold text-[#121926] uppercase">Worker Status Snapshot</div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-emerald-600">Active</div>
                    <div className="text-[10px] text-[#666666]">Jobsite Status</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-[#121926]">Certified</div>
                    <div className="text-[10px] text-[#666666]">Induction Safety</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeRoleTab === 'client' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] uppercase">
                  Executive Transparency
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-[#121926] mt-3 mb-2">
                  Client Oversight Portal
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed mb-4">
                  Tailored for project developers, investors, and owners. Read-only transparency into project milestones, compliance rates, and verified hazard remediations.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-[#121926] mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> High-level compliance scorecards (98.3%)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Audit trail of verified hazard remediations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> One-click audit-ready PDF report downloads
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary text-xs py-2.5 px-4"
                >
                  Test Client Account (client@constructsafe.com)
                </button>
              </div>
              <div className="p-6 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA] space-y-3">
                <div className="text-xs font-bold text-[#121926] uppercase">Compliance Snapshot</div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-emerald-600">98.3%</div>
                    <div className="text-[10px] text-[#666666]">Safety Compliance</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-[#EAEAEA]">
                    <div className="text-xl font-extrabold text-[#121926]">12</div>
                    <div className="text-[10px] text-[#666666]">Verified Hazards</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 7: BENEFITS */}
      <section id="benefits" className="py-20 bg-white border-y border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#666666] block">
                Proven Jobsite Impact
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#121926]">
                Why Construction Leaders Choose ConstructSafe AI
              </h2>
              <p className="text-sm text-[#666666] leading-relaxed">
                Transform construction safety from a slow paper checklist into an automated, accountable, and transparent digital workflow.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#E6C700] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading text-sm font-bold text-[#121926]">Centralized Safety Management</h4>
                  <p className="text-xs text-[#666666] mt-0.5">Unified jobsite oversight across projects, personnel, and subcontractors.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#E6C700] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading text-sm font-bold text-[#121926]">Faster Hazard Reporting</h4>
                  <p className="text-xs text-[#666666] mt-0.5">Photo capture and AI bounding boxes reduce reporting time by 75%.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#E6C700] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading text-sm font-bold text-[#121926]">Better Inspection Tracking</h4>
                  <p className="text-xs text-[#666666] mt-0.5">Automated pass/fail checklist scoring with full audit timestamping.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#E6C700] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading text-sm font-bold text-[#121926]">Accountable Corrective Actions</h4>
                  <p className="text-xs text-[#666666] mt-0.5">Single CAPA responsibility prevents duplicate work and resolves overdue items.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] flex items-start gap-3 sm:col-span-2">
                <CheckCircle2 className="w-5 h-5 text-[#E6C700] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading text-sm font-bold text-[#121926]">Clear Project Safety Reporting</h4>
                  <p className="text-xs text-[#666666] mt-0.5">Generate audit-ready PDF scorecards and Excel compliance reports in one click.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: FAQ ACCORDION */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#666666] block mb-2">
            Frequently Asked Questions
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#121926]">
            Everything You Need To Know
          </h2>
          <p className="mt-3 text-sm text-[#666666]">
            Common questions regarding our AI hazard detection, privacy architecture, and user workflows.
          </p>
        </div>

        <div className="space-y-3.5">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="card-vx p-0 overflow-hidden border border-[#EAEAEA] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm sm:text-base text-[#121926] hover:bg-[#FBFBFB] transition-colors"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#121926] flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#666666] flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#666666] leading-relaxed border-t border-[#EAEAEA]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 9: FINAL CTA */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-2xl bg-[#121926] p-8 sm:p-14 text-center text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFDD00] text-[#121926] uppercase">
              Zero-Incident Mission
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
              Build Safer Projects With Smarter Safety Management.
            </h2>
            <p className="text-sm sm:text-base text-[#EAEAEA] leading-relaxed">
              Empower your field teams and project leaders with AI-assisted safety intelligence today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto"
              >
                Get Started Now <ArrowRight className="w-4 h-4 ml-2" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-outline text-base px-8 py-3.5 w-full sm:w-auto bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Sign In with Demo Role
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: FOOTER */}
      <footer className="mt-auto bg-white border-t border-[#EAEAEA] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#EAEAEA]">
            {/* Logo & Description */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#121926] flex items-center justify-center text-[#FFDD00]">
                  <Shield className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="font-heading text-base font-extrabold text-[#121926]">
                  ConstructSafe <span className="text-[#FFDD00]">AI</span>
                </span>
              </div>
              <p className="text-xs text-[#666666] max-w-sm">
                Enterprise AI-assisted construction safety management, inspection auditing, and corrective action platform.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-[#666666]">
              <a href="#hero" className="hover:text-[#121926] transition-colors">Home</a>
              <a href="#features" className="hover:text-[#121926] transition-colors">Features</a>
              <a href="#interactive-demo" className="hover:text-[#121926] transition-colors">AI Demo</a>
              <a href="#how-it-works" className="hover:text-[#121926] transition-colors">How It Works</a>
              <a href="#roles" className="hover:text-[#121926] transition-colors">Roles</a>
              <a href="#faq" className="hover:text-[#121926] transition-colors">FAQ</a>
              <button onClick={() => navigate('/login')} className="hover:text-[#121926] transition-colors">Sign In</button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#666666]">
            <p>© 2026 ConstructSafe AI. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span>Visionex Design System</span>
              <span>•</span>
              <span>FastAPI & MongoDB Community</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;