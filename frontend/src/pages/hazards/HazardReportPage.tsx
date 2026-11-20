import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Upload,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Info,
  CheckSquare,
  Square,
  FileText,
  MapPin,
  Flame,
  Zap,
  HardHat
} from 'lucide-react';
import {
  analyzeHazardPhoto,
  submitHazardReport,
  HazardAnalysisResponse
} from '../../api/hazards';
import { listProjects, Project } from '../../api/projects';

const COMMON_HAZARD_CATEGORIES = [
  { id: 'no_hard_hat', label: 'Missing Hard Hat', icon: HardHat },
  { id: 'no_safety_vest', label: 'Missing Hi-Vis Vest', icon: ShieldAlert },
  { id: 'no_safety_harness', label: 'Missing Fall Harness', icon: AlertTriangle },
  { id: 'trip_hazard', label: 'Tripping / Housekeeping Hazard', icon: AlertTriangle },
  { id: 'improper_scaffolding', label: 'Unsafe Scaffolding / Edge', icon: AlertTriangle },
  { id: 'electrical_hazard', label: 'Exposed Electrical / Wiring', icon: Zap },
  { id: 'spill_hazard', label: 'Chemical / Liquid Spill', icon: Flame },
  { id: 'blocked_exit', label: 'Blocked Emergency Exit / Route', icon: AlertTriangle },
  { id: 'unsupported_trench', label: 'Excavation / Trench Hazard', icon: AlertTriangle },
  { id: 'other', label: 'Other Construction Site Hazard', icon: FileText }
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-300', desc: 'Minimal risk; minor housekeeping or maintenance needed' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', desc: 'Moderate hazard requiring prompt corrective action' },
  { id: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300', desc: 'Serious safety breach presenting imminent injury risk' },
  { id: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300', desc: 'Immediate life/health hazard; requires work stoppage' }
];

export const HazardReportPage: React.FC = () => {
  const navigate = useNavigate();

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Upload & File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [forceDemo, setForceDemo] = useState<boolean>(true); // Default demo mode if no weights
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<HazardAnalysisResponse | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);

  // Form fields
  const [projectId, setProjectId] = useState<string>('');
  const [locationDetails, setLocationDetails] = useState<string>('');
  const [primaryCategory, setPrimaryCategory] = useState<string>('trip_hazard');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Human-in-the-loop inspector confirmation
  const [confirmedCategories, setConfirmedCategories] = useState<string[]>([]);
  const [rejectedAiCategories, setRejectedAiCategories] = useState<string[]>([]);
  const [inspectorComments, setInspectorComments] = useState<string>('');

  // UI status
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Load active projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await listProjects({ status: 'active', size: 100 });
        setProjects(res.items);
        if (res.items.length > 0) {
          setProjectId(res.items[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load projects', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      setConfirmedCategories([]);
      setRejectedAiCategories([]);
      setErrorMessage(null);
    }
  };

  // Run AI Analysis
  const handleRunAnalysis = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or upload a construction photo first.');
      return;
    }

    try {
      setAnalyzing(true);
      setErrorMessage(null);
      const res = await analyzeHazardPhoto(selectedFile, forceDemo);
      setAnalysisResult(res);

      // Pre-populate confirmed categories with AI suggestions
      if (res.ai_analysis.suggested_categories.length > 0) {
        setConfirmedCategories([...res.ai_analysis.suggested_categories]);
        setPrimaryCategory(res.ai_analysis.suggested_categories[0]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'AI analysis failed.';
      setErrorMessage(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Toggle category confirmation
  const toggleCategory = (catId: string) => {
    if (confirmedCategories.includes(catId)) {
      setConfirmedCategories(confirmedCategories.filter((c) => c !== catId));
      // If was AI suggested, track as rejected
      if (analysisResult?.ai_analysis.suggested_categories.includes(catId)) {
        if (!rejectedAiCategories.includes(catId)) {
          setRejectedAiCategories([...rejectedAiCategories, catId]);
        }
      }
    } else {
      setConfirmedCategories([...confirmedCategories, catId]);
      setRejectedAiCategories(rejectedAiCategories.filter((c) => c !== catId));
    }
  };

  // Submit report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysisResult) {
      setErrorMessage('Please run AI analysis on the uploaded photo before submitting.');
      return;
    }
    if (!projectId) {
      setErrorMessage('Please select an active construction project.');
      return;
    }
    if (!locationDetails.trim()) {
      setErrorMessage('Please specify the site location details (e.g. Zone B Level 3).');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please provide a detailed description of the observed safety hazard.');
      return;
    }
    if (confirmedCategories.length === 0) {
      setErrorMessage('Please confirm at least one verified hazard category.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        project_id: projectId,
        location_details: locationDetails.trim(),
        category: primaryCategory || confirmedCategories[0],
        severity,
        description: description.trim(),
        notes: notes.trim() || undefined,
        photo_url: analysisResult.photo_url,
        image_metadata: {
          file_name: analysisResult.file_name,
          width: analysisResult.width,
          height: analysisResult.height,
          file_size_bytes: analysisResult.file_size_bytes,
        },
        ai_analysis: analysisResult.ai_analysis,
        confirmed_categories: confirmedCategories,
        rejected_ai_categories: rejectedAiCategories,
        inspector_comments: inspectorComments.trim() || undefined,
      };

      const created = await submitHazardReport(payload);
      setSuccessMessage(`Hazard Report ${created.report_number} submitted successfully! Redirecting...`);
      setTimeout(() => {
        navigate('/hazards');
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Failed to submit report.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/hazards')}
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Hazard Reports
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-amber-600" />
            AI-Assisted Photo Hazard Reporting
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload construction site photographs for YOLO static inference. Inspector human-in-the-loop review is strictly required.
          </p>
        </div>
      </div>

      {/* Helpful Instructions Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 stroke-[2]" />
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold">Step-by-Step Guidance: </strong>
          Upload a clear photograph of the hazard. Review the AI suggestions before submitting to the Admin review queue.
        </p>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800 font-medium">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-md flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-800 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Upload & AI Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Photo Upload & Preview Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-600" />
                1. Site Hazard Photograph
              </h2>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setAnalysisResult(null);
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Remove Photo
                </button>
              )}
            </div>

            {/* Dropzone / Preview */}
            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-lg p-8 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-amber-50/20"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Click to select or drag and drop site photo
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: JPG, JPEG, PNG, WebP (Max 10MB)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Visual Canvas with Bounding Boxes */}
                <div
                  ref={imageContainerRef}
                  className="relative w-full overflow-hidden rounded-md border border-slate-200 bg-slate-900 flex items-center justify-center"
                  style={{ maxHeight: '440px' }}
                >
                  <img
                    src={previewUrl}
                    alt="Hazard Site Evidence"
                    className="max-h-[440px] w-auto object-contain block"
                  />

                  {/* Bounding Box Overlays */}
                  {showBoundingBoxes &&
                    analysisResult?.ai_analysis?.raw_detections?.map((det, idx) => {
                      if (!det.normalized_bbox) return null;
                      const [ymin, xmin, ymax, xmax] = det.normalized_bbox;
                      return (
                        <div
                          key={idx}
                          className="absolute border-2 border-blue-400 bg-blue-500/15 pointer-events-none transition-all"
                          style={{
                            top: `${ymin * 100}%`,
                            left: `${xmin * 100}%`,
                            width: `${(xmax - xmin) * 100}%`,
                            height: `${(ymax - ymin) * 100}%`,
                          }}
                        >
                          <span className="absolute -top-6 left-0 bg-blue-600 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded shadow">
                            {det.category.replace(/_/g, ' ')} ({Math.round(det.confidence * 100)}%)
                          </span>
                        </div>
                      );
                    })}
                </div>

                {/* Controls under image */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                  <span className="font-medium">
                    {selectedFile?.name} ({(selectedFile ? selectedFile.size / (1024 * 1024) : 0).toFixed(2)} MB)
                  </span>

                  {analysisResult && (
                    <button
                      type="button"
                      onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                    >
                      {showBoundingBoxes ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide AI Boxes
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Show AI Boxes
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Analysis Action Bar */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={forceDemo}
                      onChange={(e) => setForceDemo(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Demo/Testing Mode (simulates hazards if custom weights missing)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={analyzing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        Analyzing with YOLO...
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4 text-amber-400" />
                        {analysisResult ? 'Re-Analyze Image' : 'Run AI Hazard Analysis'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. AI Analysis Findings Card (Visible once analyzed) */}
          {analysisResult && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    AI Suggested Hazard Findings (Advisory Only)
                  </h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                  {analysisResult.ai_analysis.device.toUpperCase()} Inference
                </span>
              </div>

              {/* Disclaimer Notice */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-md p-3 text-xs text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Model Notice: </span>
                  {analysisResult.ai_analysis.disclaimer}
                </div>
              </div>

              {/* Detection Tags */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Detected Bounding Boxes ({analysisResult.ai_analysis.raw_detections.length}):
                </div>
                {analysisResult.ai_analysis.raw_detections.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No automated hazard detections returned by model.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.ai_analysis.raw_detections.map((det, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {det.category.replace(/_/g, ' ')}
                        <span className="text-slate-500 font-normal">
                          ({Math.round(det.confidence * 100)}%)
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Model Metadata */}
              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-3 flex flex-wrap justify-between gap-2">
                <span>Model: {analysisResult.ai_analysis.model_name} ({analysisResult.ai_analysis.model_version})</span>
                <span>Analyzed: {new Date(analysisResult.ai_analysis.analyzed_at).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Human Verification & Submission Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-5">
            {/* Step 2 Header */}
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                2. Human Verification & Report Details
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Confirm observed hazards and assign report attributes.
              </p>
            </div>

            {/* Human-in-the-Loop Category Confirmation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Confirmed Site Hazards *
                </label>
                <span className="text-[11px] text-slate-500">
                  {confirmedCategories.length} selected
                </span>
              </div>

              {/* Distinction Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <strong>Orange:</strong> Human-Confirmed Findings
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <strong>Blue:</strong> AI Suggestion
                </span>
              </div>

              {/* Categories Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 border border-slate-200 rounded-md p-2">
                {COMMON_HAZARD_CATEGORIES.map((cat) => {
                  const isConfirmed = confirmedCategories.includes(cat.id);
                  const isAiSuggested = analysisResult?.ai_analysis.suggested_categories.includes(cat.id);

                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-start gap-2 p-2 rounded text-left text-xs transition-colors border ${
                        isConfirmed
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isConfirmed ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{cat.label}</div>
                        {isAiSuggested && (
                          <span className="inline-block text-[10px] text-blue-600 font-normal">
                            AI suggested
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Construction Project *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={loadingProjects}
                className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-white"
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Location Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specific Location Details *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Zone B Level 3 Scaffold, East Elevation"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  className="w-full pl-9 text-sm border-slate-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Primary Category & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Category *
                </label>
                <select
                  value={primaryCategory}
                  onChange={(e) => setPrimaryCategory(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-white"
                >
                  {COMMON_HAZARD_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Severity Rating *
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-white font-medium"
                >
                  {SEVERITY_LEVELS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} Severity
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hazard Observation Description *
              </label>
              <textarea
                rows={3}
                placeholder="Describe observed unsafe conditions, worker positioning, and physical site factors..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
                required
              />
            </div>

            {/* Inspector Verification Comments */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inspector Verification Comments & AI Rationale
              </label>
              <textarea
                rows={2}
                placeholder="Notes on AI findings (e.g. why specific AI boxes were accepted or rejected)..."
                value={inspectorComments}
                onChange={(e) => setInspectorComments(e.target.value)}
                className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Recommendations / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Optional recommendations for project management or site engineers..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
              />
            </div>

            {/* Submission Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !analysisResult}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-md shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting Report to Admin...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Submit Official Hazard Report
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                Report will be sent to Administrator with status <strong>Pending Admin Review</strong>.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
