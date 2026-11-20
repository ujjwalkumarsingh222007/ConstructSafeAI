import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listCorrectiveActions,
  createCorrectiveAction,
  updateCorrectiveAction,
  CorrectiveAction
} from '../../api/correctiveActions';
import { listProjects, Project } from '../../api/projects';
import { uploadEvidenceFile } from '../../api/storage';
import { useAuth } from '../../context/AuthContext';
import {
  CheckSquare,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  X,
  Camera,
  ShieldCheck
} from 'lucide-react';

export const CorrectiveActionList: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');

  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [newSourceType, setNewSourceType] = useState<string>('inspection');
  const [newSourceId, setNewSourceId] = useState<string>('');
  const [newPriority, setNewPriority] = useState<string>('high');
  const [newDueDate, setNewDueDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Action Update / Resolution Modal state
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('in_progress');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [updating, setUpdating] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  const canManage = user && ['admin', 'project_manager', 'safety_inspector'].includes(user.role_name);

  // Check URL query parameters for pre-filling creation
  useEffect(() => {
    const srcType = searchParams.get('source_type');
    const srcId = searchParams.get('source_id');
    const titleParam = searchParams.get('title');
    if (srcType && srcId) {
      setNewSourceType(srcType);
      setNewSourceId(srcId);
      if (titleParam) setNewTitle(titleParam);
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const params: any = { size: 50 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (projectFilter) params.project_id = projectFilter;

      const res = await listCorrectiveActions(params);
      setActions(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await listProjects({ size: 100 });
      setProjects(res.items);
      if (res.items.length > 0 && !newProjectId) {
        setNewProjectId(res.items[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActions();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, priorityFilter, projectFilter]);

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProjectId) {
      setErrorMsg('Title and Project are required');
      return;
    }

    try {
      setCreating(true);
      setErrorMsg('');

      // Assignee defaults to project's first manager or current user
      const proj = projects.find((p) => p.id === newProjectId);
      const targetUser = proj?.manager_ids?.[0] || user?.id || '';

      await createCorrectiveAction({
        project_id: newProjectId,
        source_type: newSourceType,
        source_id: newSourceId || newProjectId,
        title: newTitle.trim(),
        description: newDesc.trim() || 'Remediation directive issued.',
        priority: newPriority,
        assigned_to: targetUser,
        due_date: new Date(newDueDate).toISOString(),
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      fetchActions();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create corrective action');
    } finally {
      setCreating(false);
    }
  };

  const openResolutionModal = (action: CorrectiveAction) => {
    setSelectedAction(action);
    setUpdateStatus(action.status);
    setResolutionNotes(action.resolution_notes || '');
    setVerificationNotes(action.verification_notes || '');
    setEvidencePhotos(action.completion_evidence || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await uploadEvidenceFile(file);
      setEvidencePhotos((prev) => [...prev, res.url]);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload completion evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;

    try {
      setUpdating(true);
      await updateCorrectiveAction(selectedAction.id, {
        status: updateStatus,
        resolution_notes: resolutionNotes.trim() || undefined,
        verification_notes: verificationNotes.trim() || undefined,
        completion_evidence: evidencePhotos,
      });

      setSelectedAction(null);
      fetchActions();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update action');
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-red-100 text-red-800 border border-red-200 uppercase">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200 uppercase">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'completed':
      case 'closed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified Closed
          </span>
        );
      case 'pending_verification':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
            <ShieldCheck className="w-3 h-3 mr-1" /> Pending Verification
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" /> In Progress
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            Open
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-brand-600" />
            Corrective & Preventive Actions (CAPA)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforce remediation workflows for audit non-conformances, near-misses, and safety hazards.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Issue Action Item
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action #, directive, title..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-md text-xs font-medium text-slate-600">
          {['all', 'open', 'in_progress', 'pending_verification', 'completed', 'overdue'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded capitalize transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Action Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading corrective actions...</div>
        ) : actions.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No corrective actions found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All safety non-conformances in this scope are cleared.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Action #</th>
                  <th className="py-3 px-4">Title & Remediation Directive</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {actions.map((act) => {
                  const isOverdue =
                    act.status !== 'completed' &&
                    act.status !== 'closed' &&
                    new Date(act.due_date) < new Date();

                  return (
                    <tr
                      key={act.id}
                      onClick={() => openResolutionModal(act)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        {act.action_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{act.title}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {act.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {act.source_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{getPriorityBadge(act.priority)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{act.assigned_to_name || 'Project Manager'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          className={`flex items-center gap-1 font-medium ${
                            isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(act.due_date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(isOverdue ? 'overdue' : act.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="text-brand-600 hover:text-brand-800 text-[11px] font-semibold">
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolution & Verification Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-brand-500" />
                <h3 className="font-semibold text-sm">
                  Update Action {selectedAction.action_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAction(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAction} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-slate-900">{selectedAction.title}</div>
                <div className="text-[11px] text-slate-600">{selectedAction.description}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lifecycle Status *
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending_verification">Pending Verification</option>
                  {canManage && <option value="completed">Verified & Completed</option>}
                  {canManage && <option value="closed">Closed Out</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Notes / Implementation Evidence
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe repair actions performed (e.g. replaced loose wire rope cable section, bolted steel toe-boards on Deck 14)..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              {/* Verification clearance notes for inspector/PM */}
              {canManage && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inspector Verification Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Sign-off comments by inspecting authority upon visual verification..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              )}

              {/* Completion Evidence Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Completion Proof Photos
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {evidencePhotos.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-12 h-12 rounded border border-slate-200 overflow-hidden"
                    >
                      <img src={url} alt="proof" className="w-full h-full object-cover" />
                    </a>
                  ))}

                  <label className="w-12 h-12 rounded border-2 border-dashed border-slate-300 hover:border-brand-500 flex items-center justify-center cursor-pointer text-slate-400 hover:text-brand-600 transition-colors bg-slate-50">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      disabled={uploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {uploading && <span className="text-[11px] text-slate-500">Uploading...</span>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAction(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded shadow-xs"
                >
                  {updating ? 'Updating...' : 'Save Action Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-brand-500" />
                <h3 className="font-semibold text-sm">Issue Corrective Action Item</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Action Directive Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reinstall edge cable railing on Deck 14"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project *
                </label>
                <select
                  required
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority *
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical (Stop-Work)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remediation Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Directive / OSHA Reference
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail exact technical requirements (e.g. 200lb outward force resistance per OSHA 1926.502)..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded shadow-xs"
                >
                  {creating ? 'Issuing Action...' : 'Issue Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
