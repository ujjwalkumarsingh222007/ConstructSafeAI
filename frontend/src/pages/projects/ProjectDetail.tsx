import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { projectsApi, Project, ProjectUpdateParams } from '../../api/projects';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Users,
  Edit3,
  Loader2,
  AlertCircle,
  UserCheck,
  ShieldAlert,
  X
} from 'lucide-react';
import { ImageWithFallback } from '../../components/common/ImageWithFallback';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProjectUpdateParams>({});

  const canEditProject =
    user?.role_name === 'admin' ||
    (user?.role_name === 'project_manager' &&
      project?.manager_ids?.includes(user.id));

  const fetchProjectDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.getProject(id);
      setProject(data);
      setEditForm({
        name: data.name,
        client_name: data.client_name,
        description: data.description,
        status: data.status,
        safety_target_rate: data.safety_target_rate,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load project details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setUpdating(true);
      setEditError(null);
      const updated = await projectsApi.updateProject(id, editForm);
      setProject(updated);
      setIsEditModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update project';
      setEditError(msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
        <p className="text-sm">Loading project information...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects Directory
        </button>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-base">Unable to access project</h3>
            <p className="text-sm mt-1">{error || 'Project not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        {canEditProject && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors"
          >
            <Edit3 className="w-4 h-4 text-slate-500" />
            Edit Project
          </button>
        )}
      </div>

      {/* Main Project Header Card with Photographic Backdrop */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-md text-white">
        <div className="absolute inset-0 z-0">
          <ImageWithFallback
            src="/images/projects/project_commercial.jpg"
            fallbackSrc="/images/projects/fallback_project.svg"
            alt={project.name}
            className="w-full h-full object-cover object-center filter brightness-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-950/80" />
        </div>

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-700/60">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800/80 text-slate-200 border border-slate-700">
                  {project.code}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  project.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  project.status === 'planning' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  project.status === 'paused' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-slate-700/50 text-slate-300'
                }`}>
                  {project.status.toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
              <p className="text-sm text-slate-300 flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Client: <strong className="text-white">{project.client_name}</strong></span>
                {project.location?.city && (
                  <>
                    <span className="text-slate-500">•</span>
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{project.location.address ? `${project.location.address}, ` : ''}{project.location.city}, {project.location.state || project.location.country}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 text-center min-w-[120px] backdrop-blur-xs">
                <span className="text-xs text-slate-400 block font-medium">Compliance Target</span>
                <span className="text-xl font-bold text-emerald-400">{project.safety_target_rate}%</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 text-center min-w-[120px] backdrop-blur-xs">
                <span className="text-xs text-slate-400 block font-medium">Active Workers</span>
                <span className="text-xl font-bold text-white">{project.worker_count}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div className="pt-4 text-sm text-slate-300 leading-relaxed">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Scope & Operations</h4>
              <p>{project.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Assigned Team & Fast Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Management Team */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-slate-900 text-sm">Designated Project Managers</h3>
            </div>
            <span className="text-xs text-slate-400">{project.managers.length} Assigned</span>
          </div>

          {project.managers.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No project managers currently assigned.</p>
          ) : (
            <div className="space-y-3">
              {project.managers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{m.first_name} {m.last_name}</h4>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                    Project Manager
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Inspection Team */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Site Safety Inspectors</h3>
            </div>
            <span className="text-xs text-slate-400">{project.inspectors.length} Assigned</span>
          </div>

          {project.inspectors.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No safety inspectors assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {project.inspectors.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{i.first_name} {i.last_name}</h4>
                    <p className="text-xs text-slate-500">{i.email}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Inspector
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workforce Quick Navigation Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Jobsite Workforce Directory
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Access and inspect badge registrations, safety certifications, and induction records for this jobsite.
          </p>
        </div>
        <Link
          to={`/workers?project_id=${project.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          View {project.worker_count} Assigned Workers
        </Link>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Edit Project: {project.code}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={editForm.client_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editForm.status || project.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Safety Target Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={editForm.safety_target_rate ?? project.safety_target_rate}
                  onChange={(e) => setEditForm({ ...editForm, safety_target_rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
