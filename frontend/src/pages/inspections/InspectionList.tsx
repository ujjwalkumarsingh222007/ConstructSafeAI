import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listInspections,
  createInspection,
  Inspection,
  InspectionItem
} from '../../api/inspections';
import { listProjects, Project } from '../../api/projects';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardCheck,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  User,
  ChevronRight,
  X,
  FileCheck2,
  Info
} from 'lucide-react';

const DEFAULT_CHECKLIST_TEMPLATE: InspectionItem[] = [
  { item_id: 'CHK-01', category: 'PPE Compliance', description: 'Hardhats, high-visibility vests, eye protection, and safety boots in active use', status: 'pass', passed: true, notes: '', photos: [] },
  { item_id: 'CHK-02', category: 'Fall Protection', description: 'Full-body harnesses, 100% tie-off anchors, and safety netting installed at height', status: 'pass', passed: true, notes: '', photos: [] },
  { item_id: 'CHK-03', category: 'Edge Protection', description: 'Standard perimeter guardrails, midrails, and 4-inch toe-boards secured', status: 'pass', passed: true, notes: '', photos: [] },
  { item_id: 'CHK-04', category: 'Electrical Safety', description: 'GFCI protection functional, cables elevated off standing water, panels locked', status: 'pass', passed: true, notes: '', photos: [] },
  { item_id: 'CHK-05', category: 'Housekeeping & Access', description: 'Clear egress corridors, stairs free of trip debris, trash chutes operational', status: 'pass', passed: true, notes: '', photos: [] },
  { item_id: 'CHK-06', category: 'Fire Protection', description: 'Fire extinguishers charged, tagged within 12 months, and unobstructed', status: 'pass', passed: true, notes: '', photos: [] }
];

export const InspectionList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('');

  // Creation modal state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [newScheduledDate, setNewScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newNotes, setNewNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const canCreate = user && ['admin', 'safety_inspector', 'project_manager'].includes(user.role_name);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const params: any = { size: 50 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (projectFilter) params.project_id = projectFilter;

      const res = await listInspections(params);
      setInspections(res.items);
      setTotal(res.total);
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
      fetchInspections();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, projectFilter]);

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProjectId) {
      setErrorMsg('Title and Project are required');
      return;
    }

    try {
      setCreating(true);
      setErrorMsg('');
      const created = await createInspection({
        project_id: newProjectId,
        title: newTitle.trim(),
        scheduled_date: newScheduledDate ? new Date(newScheduledDate).toISOString() : undefined,
        notes: newNotes.trim() || undefined,
        checklist_items: DEFAULT_CHECKLIST_TEMPLATE,
      });

      setShowModal(false);
      setNewTitle('');
      setNewNotes('');
      navigate(`/inspections/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create inspection');
    } finally {
      setCreating(false);
    }
  };

  const getScoreBadge = (score: number, status: string) => {
    if (status === 'scheduled') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
          <Clock className="w-3 h-3 mr-1" /> Pending
        </span>
      );
    }
    if (score >= 90) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {score.toFixed(1)}% Pass
        </span>
      );
    }
    if (score >= 75) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {score.toFixed(1)}% Action Needed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        {score.toFixed(1)}% Critical Defect
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" /> In Progress
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> Failed Audit
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            <Calendar className="w-3 h-3 mr-1" /> Scheduled
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
            <ClipboardCheck className="w-6 h-6 text-brand-600" />
            Safety Audits & Inspections
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Conduct site compliance evaluations, calculate pass/fail audit scores, and track corrective resolutions ({total} total audits).
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Schedule Audit
          </button>
        )}
      </div>

      {/* Helpful Instructions Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 stroke-[2]" />
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold">Inspection Protocol: </strong>
          Select a project, complete the checklist, upload evidence photos, and submit your inspection for scoring.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 w-full gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit title, inspection #..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="relative w-48">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-brand-500"
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
        <div className="flex bg-slate-100 p-0.5 rounded-md text-xs font-medium text-slate-600 w-full md:w-auto">
          {['all', 'scheduled', 'in_progress', 'completed', 'failed'].map((st) => (
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

      {/* Inspections Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Loading safety audits...
          </div>
        ) : inspections.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No inspections found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no safety inspections matching your filters in this authorized project scope.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Audit Number</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Inspector</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {inspections.map((insp) => (
                  <tr
                    key={insp.id}
                    onClick={() => navigate(`/inspections/${insp.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {insp.inspection_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{insp.title}</div>
                      {insp.notes && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">{insp.notes}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">
                        {insp.project_code || 'PRJ'}
                      </span>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {insp.project_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{insp.inspector_name || 'Assigned Lead'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(insp.scheduled_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getScoreBadge(insp.overall_score, insp.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(insp.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="text-slate-400 hover:text-brand-600 p-1">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Inspection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-brand-500" />
                <h3 className="font-semibold text-sm">Schedule Safety Audit</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInspection} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Fall Protection & Scaffold Inspection"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Construction Project *
                </label>
                <select
                  required
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheduled Audit Date
                </label>
                <input
                  type="date"
                  value={newScheduledDate}
                  onChange={(e) => setNewScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope Notes / Special Directives
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific floors, subcontractor trades, or high-risk operations to evaluate..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">Standard OSHA Checklist:</span> 6 foundational categories (PPE, Fall Protection, Edge Protection, Electrical, Housekeeping, Fire Safety) will be attached automatically.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {creating ? 'Scheduling...' : 'Create Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
