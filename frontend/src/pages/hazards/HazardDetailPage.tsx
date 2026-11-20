import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  History,
  CheckSquare,
  ShieldCheck,
  RefreshCw,
  X,
  ExternalLink
} from 'lucide-react';
import { getHazardReport, reviewHazardReport, HazardReport, ReviewHazardPayload } from '../../api/hazards';
import { workersApi, Worker, WorkerListResponse } from '../../api/workers';
import { useAuth } from '../../context/AuthContext';

export const HazardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState<HazardReport | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);

  // Decision Modal State for Admin
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | 'assign_action' | null>(null);
  const [reviewComments, setReviewComments] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [capaTitle, setCapaTitle] = useState<string>('');
  const [capaDescription, setCapaDescription] = useState<string>('');
  const [capaPriority, setCapaPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [capaAssignedTo, setCapaAssignedTo] = useState<string>('');
  const [capaDueDate, setCapaDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const [processing, setProcessing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isAdmin = user?.role_name === 'admin' || user?.role_name === 'super_admin';

  const fetchReport = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getHazardReport(id);
      setReport(data);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Failed to load report';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    if (isAdmin) {
      workersApi.listWorkers({ size: 100 })
        .then((res: WorkerListResponse) => {
          setWorkers(res.items);
          if (res.items.length > 0) setCapaAssignedTo(res.items[0].id);
        })
        .catch(console.error);
    }
  }, [id, isAdmin]);

  const openDecisionModal = (action: 'approve' | 'reject' | 'assign_action') => {
    if (!report) return;
    setDecisionAction(action);
    setReviewComments('');
    setRejectionReason('');
    setActionError(null);
    setActionSuccess(null);

    if (action === 'assign_action') {
      setCapaTitle(`Remediate Hazard: ${report.report_number} (${report.category.replace(/_/g, ' ')})`);
      setCapaDescription(
        `Immediate corrective action required at ${report.location_details}. Observation: ${report.description}`
      );
      setCapaPriority(report.severity);
    }
  };

  const closeDecisionModal = () => {
    setDecisionAction(null);
    setActionError(null);
  };

  const handleSubmitDecision = async () => {
    if (!report || !decisionAction) return;

    if (decisionAction === 'reject' && !rejectionReason.trim()) {
      setActionError('A valid rejection reason is required.');
      return;
    }

    if (decisionAction === 'assign_action') {
      if (!capaTitle.trim()) {
        setActionError('Please specify a title for the corrective action.');
        return;
      }
      if (!capaDescription.trim()) {
        setActionError('Please provide corrective action remediation instructions.');
        return;
      }
      if (!capaAssignedTo) {
        setActionError('Please assign this action to a responsible site personnel.');
        return;
      }
    }

    try {
      setProcessing(true);
      setActionError(null);

      const payload: ReviewHazardPayload = {
        action: decisionAction,
        review_comments: reviewComments.trim() || undefined,
        rejection_reason: decisionAction === 'reject' ? rejectionReason.trim() : undefined,
        capa:
          decisionAction === 'assign_action'
            ? {
                title: capaTitle.trim(),
                description: capaDescription.trim(),
                priority: capaPriority,
                assigned_to: capaAssignedTo,
                due_date: new Date(capaDueDate).toISOString(),
              }
            : undefined,
      };

      const updated = await reviewHazardReport(report.id, payload);
      setReport(updated);
      setActionSuccess(`Decision executed: ${decisionAction.toUpperCase()}`);

      setTimeout(() => {
        closeDecisionModal();
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Decision failed.';
      setActionError(msg);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 text-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-amber-600 mb-3" />
        <p>Loading hazard assessment...</p>
      </div>
    );
  }

  if (errorMessage || !report) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <button
          onClick={() => navigate('/hazards')}
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Hazard Reports
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md text-sm text-red-800">
          {errorMessage || 'Hazard report not found.'}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_admin_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Pending Admin Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <AlertTriangle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'action_assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <CheckSquare className="w-3.5 h-3.5" /> Corrective Action Assigned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">Critical</span>;
      case 'high':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">High</span>;
      case 'medium':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">Medium</span>;
      case 'low':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">Low</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{sev}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/hazards')}
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Hazard Reports
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-900">
              {report.report_number}
            </h1>
            {getStatusBadge(report.status)}
            {getSeverityBadge(report.severity)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
            <span>Submitted: {new Date(report.created_at).toLocaleString()}</span>
            <span>•</span>
            <span>Inspector: {report.inspector_name || 'Safety Inspector'}</span>
          </div>
        </div>

        {/* Quick Review Queue Link for Admin */}
        {isAdmin && (
          <button
            onClick={() => navigate('/hazards/review-queue')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Review Queue
          </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Photo Evidence & AI Findings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Photo Canvas Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-600" />
                Photographic Evidence
              </h2>
              {report.ai_analysis && (
                <button
                  type="button"
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
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

            {/* Photo with Bounding Boxes */}
            <div className="relative w-full overflow-hidden rounded-md border border-slate-200 bg-slate-900 flex items-center justify-center">
              <img
                src={report.photo_url}
                alt="Hazard Evidence"
                className="max-h-[460px] w-auto object-contain block"
              />

              {/* Bounding Box Overlays */}
              {showBoundingBoxes &&
                report.ai_analysis?.raw_detections?.map((det, idx) => {
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

            {/* Image Metadata Bar */}
            <div className="text-[11px] text-slate-500 pt-1 flex justify-between">
              <span>Path: {report.photo_url}</span>
              {report.image_metadata?.width && (
                <span>Dimensions: {report.image_metadata.width} × {report.image_metadata.height}px</span>
              )}
            </div>
          </div>

          {/* AI Analysis Findings Card */}
          {report.ai_analysis && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    AI Suggested Hazard Findings (Advisory Only)
                  </h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                  {report.ai_analysis.device.toUpperCase()}
                </span>
              </div>

              {/* Disclaimer */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-md p-3 text-xs text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Model Disclaimer: </span>
                  {report.ai_analysis.disclaimer}
                </div>
              </div>

              {/* Detections List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Raw Detections ({report.ai_analysis.raw_detections.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.ai_analysis.raw_detections.map((det, i) => (
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
              </div>

              {/* Model Info */}
              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-3 flex flex-wrap justify-between gap-2">
                <span>Model: {report.ai_analysis.model_name} ({report.ai_analysis.model_version})</span>
                <span>Analyzed: {new Date(report.ai_analysis.analyzed_at).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Human Verification, Details, Audit Trail (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Admin Decision Card (If Admin & Pending) */}
          {isAdmin && report.status === 'pending_admin_review' && (
            <div className="bg-white rounded-lg border-2 border-amber-300 shadow-md p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Admin Sign-off & Decision
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                You have administrative authority to approve, reject, or issue a formal Corrective & Preventive Action (CAPA) ticket.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openDecisionModal('approve')}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded shadow transition-colors text-center"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => openDecisionModal('assign_action')}
                  className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded shadow transition-colors text-center"
                >
                  Assign CAPA
                </button>
                <button
                  type="button"
                  onClick={() => openDecisionModal('reject')}
                  className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded shadow transition-colors text-center"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Admin Review Result Banner (If already reviewed) */}
          {report.admin_review && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-600" />
                  Admin Review Sign-off
                </h3>
                <span className="text-xs font-semibold uppercase text-slate-600">
                  {report.admin_review.action?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-xs space-y-1.5 text-slate-700">
                <div>
                  <span className="text-slate-500">Reviewed By: </span>
                  <strong>{report.admin_review.admin_name || 'System Administrator'}</strong>
                </div>
                {report.admin_review.reviewed_at && (
                  <div>
                    <span className="text-slate-500">Timestamp: </span>
                    {new Date(report.admin_review.reviewed_at).toLocaleString()}
                  </div>
                )}
                {report.admin_review.review_comments && (
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-800 mt-2">
                    <span className="font-semibold block text-slate-600 text-[11px] mb-0.5">Admin Comments:</span>
                    {report.admin_review.review_comments}
                  </div>
                )}
                {report.corrective_action_number && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-purple-900 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                      Linked CAPA: {report.corrective_action_number}
                    </span>
                    <button
                      onClick={() => navigate('/corrective-actions')}
                      className="text-xs text-purple-700 hover:text-purple-900 font-semibold inline-flex items-center gap-1"
                    >
                      View CAPA <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1. Human-in-the-Loop Confirmation Card */}
          <div className="bg-white rounded-lg border border-amber-200 shadow-sm p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                Human-Confirmed Findings
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                Verified by Inspector
              </span>
            </div>

            {/* Confirmed Categories */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Confirmed Hazard Categories:</div>
              <div className="flex flex-wrap gap-2">
                {(report.inspector_confirmation?.confirmed_categories || [report.category]).map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-900"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    {c.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Rejected AI Categories */}
            {report.inspector_confirmation?.rejected_ai_categories &&
              report.inspector_confirmation.rejected_ai_categories.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-500">
                    AI Categories Dismissed by Inspector:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {report.inspector_confirmation.rejected_ai_categories.map((rej, i) => (
                      <span
                        key={i}
                        className="text-xs text-slate-500 bg-slate-100 line-through px-2 py-0.5 rounded"
                      >
                        {rej.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Inspector Comments */}
            {report.inspector_confirmation?.inspector_comments && (
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700">
                <span className="font-semibold block text-slate-800 mb-0.5">Inspector Rationale:</span>
                {report.inspector_confirmation.inspector_comments}
              </div>
            )}
          </div>

          {/* 2. Site Hazard Observation Details */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Site & Observation Details
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Project:</span>
                <span className="font-medium text-slate-800">
                  {report.project_name || 'Project Site'} ({report.project_code || 'PRJ'})
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Location:</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {report.location_details}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Primary Hazard Category:</span>
                <span className="font-medium text-slate-800 capitalize">
                  {report.category.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Description:</span>
                <p className="text-slate-700 bg-slate-50 rounded p-2.5 mt-1 border border-slate-200 text-xs leading-relaxed">
                  {report.description}
                </p>
              </div>

              {report.notes && (
                <div>
                  <span className="text-xs text-slate-500 block">Additional Notes:</span>
                  <p className="text-slate-700 text-xs italic mt-0.5">{report.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Audit Trail Timeline */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Audit Trail
            </h3>

            <div className="space-y-3">
              {report.audit_trail.map((entry, idx) => (
                <div key={idx} className="border-l-2 border-slate-300 pl-3 py-0.5 space-y-0.5 text-xs">
                  <div className="flex items-center justify-between text-slate-800 font-semibold">
                    <span>{entry.action.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    By <span className="font-medium">{entry.actor_name}</span> ({entry.actor_role})
                  </div>
                  {entry.details && <div className="text-slate-500 italic mt-0.5">{entry.details}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {decisionAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {decisionAction === 'approve' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {decisionAction === 'reject' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                {decisionAction === 'assign_action' && <CheckSquare className="w-5 h-5 text-purple-600" />}
                <h3 className="text-base font-bold text-slate-900">
                  {decisionAction === 'approve' && `Approve Report ${report.report_number}`}
                  {decisionAction === 'reject' && `Reject Report ${report.report_number}`}
                  {decisionAction === 'assign_action' && `Issue CAPA for ${report.report_number}`}
                </h3>
              </div>
              <button onClick={closeDecisionModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error or Success notification */}
            {actionError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r text-xs text-red-800">
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r text-xs text-emerald-800">
                {actionSuccess}
              </div>
            )}

            {/* Modal Body for APPROVE */}
            {decisionAction === 'approve' && (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600 text-xs">
                  Approving confirms this hazard is verified on site. The report will be permanently recorded in the safety register and the submitting inspector will be notified.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrative Approval Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Verified with site supervisor. Housekeeping order issued."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Modal Body for REJECT */}
            {decisionAction === 'reject' && (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600 text-xs">
                  A mandatory rejection reason is required. This rationale will be returned to the submitting inspector and permanently logged in the audit trail.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Specify why this report is rejected (e.g. photo does not show violation; incorrect site location)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-md focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Modal Body for ASSIGN CAPA */}
            {decisionAction === 'assign_action' && (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600 text-xs">
                  Directly escalate this hazard report into a formal <strong>Corrective & Preventive Action (CAPA)</strong> item tracked in the corrective actions registry.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CAPA Title *</label>
                  <input
                    type="text"
                    value={capaTitle}
                    onChange={(e) => setCapaTitle(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-md focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Remediation Description *</label>
                  <textarea
                    rows={2}
                    value={capaDescription}
                    onChange={(e) => setCapaDescription(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-md focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee Personnel *</label>
                    <select
                      value={capaAssignedTo}
                      onChange={(e) => setCapaAssignedTo(e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-md focus:border-purple-500 focus:ring-purple-500 bg-white"
                      required
                    >
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.full_name} ({w.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level *</label>
                    <select
                      value={capaPriority}
                      onChange={(e) => setCapaPriority(e.target.value as any)}
                      className="w-full text-sm border-slate-300 rounded-md focus:border-purple-500 focus:ring-purple-500 bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Due Date *</label>
                  <input
                    type="date"
                    value={capaDueDate}
                    onChange={(e) => setCapaDueDate(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-md focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDecisionModal}
                disabled={processing}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDecision}
                disabled={processing}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded shadow-sm flex items-center gap-1.5 ${
                  decisionAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decisionAction === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {processing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {decisionAction === 'approve' && 'Confirm Approval'}
                {decisionAction === 'reject' && 'Confirm Rejection'}
                {decisionAction === 'assign_action' && 'Issue CAPA & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
