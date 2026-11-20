import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { workersApi, Worker, WorkerCreateParams } from '../../api/workers';
import { projectsApi, Project } from '../../api/projects';
import {
  Users,
  Plus,
  Search,
  AlertTriangle,
  ChevronRight,
  Archive,
  AlertCircle,
  Loader2,
  X,
  Building,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const WorkerList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('project_id') || '';

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [tradeFilter, setTradeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkerCreateParams>({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    designation: '',
    trade: 'General Labor',
    contractor_company: 'ConstructSafe Direct',
    current_project_id: initialProjectId || '',
    status: 'active',
    training_status: 'certified',
    emergency_contact: {
      name: '',
      relation: '',
      phone: ''
    }
  });

  const canAddWorker = user?.role_name === 'admin' || user?.role_name === 'project_manager';

  // If user is Worker or Client, handle restrictions gracefully
  useEffect(() => {
    if (user?.role_name === 'worker') {
      navigate('/workers/me');
    }
  }, [user]);

  const loadFilterProjects = async () => {
    try {
      const res = await projectsApi.listProjects({ size: 100 });
      setProjects(res.items);
    } catch (e) {
      // Non-critical if fails
    }
  };

  const fetchWorkers = async () => {
    if (user?.role_name === 'client' || user?.role_name === 'worker') return;
    try {
      setLoading(true);
      setError(null);
      const res = await workersApi.listWorkers({
        page,
        size: 10,
        search: search.trim() || undefined,
        trade: tradeFilter || undefined,
        status: statusFilter || undefined,
        project_id: projectFilter || undefined,
      });
      setWorkers(res.items);
      setTotalPages(res.pages);
      setTotalCount(res.total);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load workers directory';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterProjects();
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [page, tradeFilter, statusFilter, projectFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWorkers();
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError(null);
      const payload: WorkerCreateParams = {
        ...formData,
        assigned_project_ids: formData.current_project_id ? [formData.current_project_id] : [],
      };
      await workersApi.createWorker(payload);
      setIsModalOpen(false);
      setFormData({
        employee_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        designation: '',
        trade: 'General Labor',
        contractor_company: 'ConstructSafe Direct',
        current_project_id: '',
        status: 'active',
        training_status: 'certified',
        emergency_contact: { name: '', relation: '', phone: '' }
      });
      fetchWorkers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Error adding worker';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to deactivate/soft-delete worker "${name}"?`)) return;
    try {
      await workersApi.deleteWorker(id);
      fetchWorkers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to deactivate worker');
    }
  };

  if (user?.role_name === 'client') {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <Users className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Worker Directory Access Restricted</h2>
        <p className="text-sm text-slate-500">
          Client accounts have executive oversight permissions for construction project KPIs, inspection reports, and safety summaries. Individual worker badges and personal records are restricted to project management and site inspectors.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
        >
          View Assigned Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workforce & Safety Badges</h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {totalCount} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Certified workforce roster, trade qualifications, emergency contacts, and OSHA induction status.
          </p>
        </div>

        {canAddWorker && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Worker
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by worker name, badge ID, trade, company, or phone..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>

          {/* Trade Filter */}
          <select
            value={tradeFilter}
            onChange={(e) => {
              setTradeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Trades</option>
            <option value="Electrician">Electrician</option>
            <option value="Steelworker">Steelworker</option>
            <option value="Scaffolder">Scaffolder</option>
            <option value="Equipment Operator">Equipment Operator</option>
            <option value="General Labor">General Labor</option>
            <option value="Safety Officer">Safety Officer</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Failed to load workforce directory</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
          <p className="text-sm">Fetching workforce roster...</p>
        </div>
      ) : workers.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No workers found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {search || tradeFilter || statusFilter || projectFilter
              ? 'Try adjusting your search criteria.'
              : 'No workers are currently enrolled on this jobsite.'}
          </p>
        </div>
      ) : (
        /* Workers Table */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Badge / Worker</th>
                  <th className="py-3 px-4">Trade & Company</th>
                  <th className="py-3 px-4">Assigned Jobsite</th>
                  <th className="py-3 px-4">Safety Induction</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {workers.map((worker) => (
                  <tr
                    key={worker.id}
                    onClick={() => navigate(`/workers/${worker.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200">
                          {worker.first_name[0]}{worker.last_name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 hover:text-orange-600 transition-colors">
                            {worker.full_name}
                          </div>
                          <div className="font-mono text-xs text-slate-500">
                            {worker.employee_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{worker.trade}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {worker.contractor_company || 'ConstructSafe Direct'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {worker.assigned_projects && worker.assigned_projects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {worker.assigned_projects.map((p) => (
                            <span
                              key={p.id}
                              className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {p.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {worker.training_status === 'certified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Certified
                        </span>
                      ) : worker.training_status === 'pending_induction' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> Pending Induction
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3" /> Expired
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        worker.status === 'active' ? 'bg-slate-100 text-slate-800' :
                        worker.status === 'on_leave' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {worker.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {user?.role_name === 'admin' && (
                          <button
                            onClick={(e) => handleArchive(e, worker.id, worker.full_name)}
                            title="Deactivate Worker"
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/workers/${worker.id}`)}
                          className="p-1 text-slate-400 hover:text-orange-600 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} ({totalCount} workers)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Worker Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-900">Add Worker to Directory</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Badge / Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value.toUpperCase() })}
                    placeholder="e.g. W-3041"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Project</label>
                  <select
                    value={formData.current_project_id}
                    onChange={(e) => setFormData({ ...formData, current_project_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="">Select a Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="John"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Doe"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Craft / Trade *</label>
                  <input
                    type="text"
                    required
                    value={formData.trade}
                    onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                    placeholder="e.g. Ironworker, Electrician"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contractor / Employer</label>
                  <input
                    type="text"
                    value={formData.contractor_company || ''}
                    onChange={(e) => setFormData({ ...formData, contractor_company: e.target.value })}
                    placeholder="ConstructSafe Direct"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="worker@example.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1-555-0123"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Emergency Contact</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={formData.emergency_contact?.name || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                    })}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    placeholder="Relationship"
                    value={formData.emergency_contact?.relation || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: { ...formData.emergency_contact, relation: e.target.value }
                    })}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    placeholder="Emergency Phone"
                    value={formData.emergency_contact?.phone || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                    })}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
