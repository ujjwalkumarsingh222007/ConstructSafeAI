import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  X,
  RefreshCw,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  listHazardReports,
  reviewHazardReport,
  HazardReport,
  ReviewHazardPayload
} from '../../api/hazards';
import { listProjects, Project } from '../../api/projects';
import { workersApi, Worker } from '../../api/workers';

export const HazardReviewQueuePage: React.FC = () => {
  const navigate = useNavigate();

  const [reports, setReports] = useState<HazardReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const pageSize = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending_admin_review');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Decision Modal State
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | 'assign_action' | null>(null);
  const [reviewComments, setReviewComments] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  
  // CAPA Form fields
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

  // Load projects and workers for CAPA assignees
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [projRes, workerRes] = await Promise.all([
          listProjects({ size: 100 }),
          workersApi.listWorkers({ size: 100 })
        ]);
        setProjects(projRes.items);
        setWorkers(workerRes.items);
        if (workerRes.items.length > 0) {
          setCapaAssignedTo(workerRes.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load review queue metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch reports
  const fetchQueueReports = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        size: pageSize,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedStatus) params.status = selectedStatus;
      if (selectedSeverity) params.severity = selectedSeverity;
      if (selectedProject) params.project_id = selectedProject;

      const data = await listHazardReports(params);
      setReports(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Failed to load review queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueReports();
  }, [page, selectedStatus, selectedSeverity, selectedProject]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQueueReports();
  };

  // Open modal
  const openDecisionModal = (report: HazardReport, action: 'approve' | 'reject' | 'assign_action') => {
    setSelectedReport(report);
    setDecisionAction(action);
    setReviewComments('');
    setRejectionReason('');
    setActionError(null);
    setActionSuccess(null);

    // Pre-populate CAPA if assigning action
    if (action === 'assign_action') {
      setCapaTitle(`Remediate Hazard: ${report.report_number} (${report.category.replace(/_/g, ' ')})`);
      setCapaDescription(
        `Immediate corrective action required at ${report.location_details}. Observation: ${report.description}`
      );
      setCapaPriority(report.severity);
    }
  };

  const closeDecisionModal = () => {
    setSelectedReport(null);
    setDecisionAction(null);
    setActionError(null);
  };

  // Submit decision
  const handleSubmitDecision = async () => {
    if (!selectedReport || !decisionAction) return;

    if (decisionAction === 'reject' && !rejectionReason.trim()) {
      setActionError('A valid rejection reason is required to reject this report.');
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

      const updated = await reviewHazardReport(selectedReport.id, payload);
      setActionSuccess(
        `Report ${updated.report_number} successfully updated: ${decisionAction.replace(/_/g, ' ').toUpperCase()}`
      );

      // Refresh list after brief display
      setTimeout(() => {
        closeDecisionModal();
        fetchQueueReports();
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Decision failed.';
      setActionError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Low</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">{sev}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <ShieldCheck className="w-4 h-4" /> Administrator Review Center
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Hazard Review & Approval Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Evaluate field inspector photographic hazard submissions, compare against AI findings, and execute administrative sign-off or CAPA escalation.
          </p>
        </div>
      </div>

      {/* Helpful Instructions Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 stroke-[2]" />
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold">Review Protocol: </strong>
          Review the inspector's evidence and decide whether to approve, reject or assign corrective action.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search pending reviews by #, location, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 text-sm border-slate-300 rounded-md focus:border-amber-500 focus:ring-amber-500"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-52">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border-slate-300 rounded-md focus:border-amber-500 focus:ring-amber-500 bg-white font-medium"
            >
              <option value="pending_admin_review">Pending Review (Action Needed)</option>
              <option value="approved">Approved Reports</option>
              <option value="rejected">Rejected Reports</option>
              <option value="action_assigned">CAPA Assigned</option>
              <option value="">All Review States</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="w-full md:w-40">
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border-slate-300 rounded-md focus:border-amber-500 focus:ring-amber-500 bg-white"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>

          {/* Project Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border-slate-300 rounded-md focus:border-amber-500 focus:ring-amber-500 bg-white"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-amber-600 mb-3" />
            <p>Loading hazard review queue...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Queue is Clear</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              There are no hazard assessments currently awaiting administrative review matching your filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Report</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4">Project & Location</th>
                  <th className="py-3 px-4">Inspector Confirmed</th>
                  <th className="py-3 px-4">AI Suggested</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Admin Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Report # & Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-900">
                        {report.report_number}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        by {report.inspector_name || 'Inspector'}
                      </div>
                    </td>

                    {/* Photo Thumbnail */}
                    <td className="py-3 px-4">
                      {report.photo_url ? (
                        <div
                          onClick={() => navigate(`/hazards/${report.id}`)}
                          className="w-14 h-14 rounded border border-slate-200 overflow-hidden bg-slate-900 cursor-pointer hover:opacity-90 relative group"
                        >
                          <img
                            src={report.photo_url}
                            alt="Evidence"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                      )}
                    </td>

                    {/* Project & Location */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-900 truncate">
                        {report.project_name || 'Project Site'}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {report.location_details}
                      </div>
                    </td>

                    {/* Inspector Confirmed Findings */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(report.inspector_confirmation?.confirmed_categories || [report.category]).map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            {c.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* AI Suggested Findings */}
                    <td className="py-3 px-4 max-w-xs">
                      {report.ai_analysis && report.ai_analysis.suggested_categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {report.ai_analysis.suggested_categories.map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {c.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None suggested</span>
                      )}
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getSeverityBadge(report.severity)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {report.status === 'pending_admin_review' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      ) : report.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      ) : report.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                          <AlertTriangle className="w-3 h-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                          <CheckSquare className="w-3 h-3" /> CAPA Issued
                        </span>
                      )}
                    </td>

                    {/* Decisions / Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {report.status === 'pending_admin_review' ? (
                          <>
                            <button
                              onClick={() => openDecisionModal(report, 'approve')}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openDecisionModal(report, 'assign_action')}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                            >
                              Assign CAPA
                            </button>
                            <button
                              onClick={() => openDecisionModal(report, 'reject')}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => navigate(`/hazards/${report.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(page * pageSize, total)}</span> of{' '}
              <span className="font-semibold">{total}</span> pending reviews
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {selectedReport && decisionAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {decisionAction === 'approve' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {decisionAction === 'reject' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                {decisionAction === 'assign_action' && <CheckSquare className="w-5 h-5 text-purple-600" />}
                <h3 className="text-base font-bold text-slate-900">
                  {decisionAction === 'approve' && `Approve Report ${selectedReport.report_number}`}
                  {decisionAction === 'reject' && `Reject Report ${selectedReport.report_number}`}
                  {decisionAction === 'assign_action' && `Issue CAPA for ${selectedReport.report_number}`}
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
