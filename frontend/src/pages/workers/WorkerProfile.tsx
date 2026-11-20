import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { workersApi, Worker, WorkerUpdateParams } from '../../api/workers';
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Loader2,
  HardHat,
  CheckCircle2,
  Clock,
  Edit3,
  X,
  FileCheck2,
  PhoneCall
} from 'lucide-react';

export const WorkerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isMe = !id || id === 'me';
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<WorkerUpdateParams>({});

  const canEditWorker = user?.role_name === 'admin' || user?.role_name === 'project_manager';

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      let data: Worker;
      if (isMe) {
        data = await workersApi.getMyWorkerProfile();
      } else {
        data = await workersApi.getWorker(id!);
      }
      setWorker(data);
      setEditForm({
        trade: data.trade,
        designation: data.designation,
        phone: data.phone,
        status: data.status,
        training_status: data.training_status,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load worker profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;
    try {
      setUpdating(true);
      setEditError(null);
      const updated = await workersApi.updateWorker(worker.id, editForm);
      setWorker(updated);
      setIsEditModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update worker profile';
      setEditError(msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
        <p className="text-sm">Retrieving worker personnel file...</p>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="space-y-4">
        {user?.role_name !== 'worker' && (
          <button
            onClick={() => navigate('/workers')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workforce Directory
          </button>
        )}
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-base">Personnel File Inaccessible</h3>
            <p className="text-sm mt-1">{error || 'Worker record not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      {user?.role_name !== 'worker' && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/workers')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workforce Directory</span>
          </button>

          {canEditWorker && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              Edit Personnel Record
            </button>
          )}
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center text-xl shadow-md border-2 border-slate-100 flex-shrink-0">
              {worker.first_name[0]}{worker.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{worker.full_name}</h1>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {worker.employee_id}
                </span>
              </div>
              <p className="text-sm font-medium text-orange-600 mt-0.5">
                {worker.designation || worker.trade}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{worker.contractor_company || 'ConstructSafe Direct'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              worker.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
              worker.status === 'on_leave' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}>
              {worker.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Contact info strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{worker.email || 'No email registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{worker.phone || 'No phone registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Enrolled: {worker.joining_date ? new Date(worker.joining_date).toLocaleDateString() : 'Active Member'}</span>
          </div>
        </div>
      </div>

      {/* Grid: Assigned Project & Emergency Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assigned Projects */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HardHat className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-slate-900 text-sm">Assigned Jobsites</h3>
            </div>
            <span className="text-xs text-slate-400">{worker.assigned_projects?.length || 0} Sites</span>
          </div>

          {worker.assigned_projects && worker.assigned_projects.length > 0 ? (
            <div className="space-y-2">
              {worker.assigned_projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 mr-2">
                      {p.code}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{p.name}</span>
                  </div>
                  <span className="text-xs text-orange-600 font-semibold">View Site →</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No project currently assigned.</p>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-red-600" />
              <h3 className="font-bold text-slate-900 text-sm">Emergency Contact Information</h3>
            </div>
            <span className="text-xs text-emerald-600 font-semibold">Verified</span>
          </div>

          {worker.emergency_contact?.name ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 text-xs">Primary Contact</span>
                <span className="font-semibold text-slate-900">{worker.emergency_contact.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 text-xs">Relationship</span>
                <span className="font-medium text-slate-700">{worker.emergency_contact.relation || 'Next of Kin'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 text-xs">Phone Number</span>
                <span className="font-mono font-bold text-slate-900">{worker.emergency_contact.phone || 'Unavailable'}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No emergency contact currently on file.</p>
          )}
        </div>
      </div>

      {/* Training & Induction Records */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">OSHA Safety Certifications & Training Records</h3>
              <p className="text-xs text-slate-500">Documented completion of mandatory site induction and trade safety modules.</p>
            </div>
          </div>

          {worker.safety_induction_completed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Site Induction Completed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5" />
              Induction Pending
            </span>
          )}
        </div>

        {worker.training_records && worker.training_records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Safety Training Module</th>
                  <th className="py-2.5 px-3">Date Completed</th>
                  <th className="py-2.5 px-3">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {worker.training_records.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-800">{rec.module_title}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {rec.completion_date || 'Documented'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Valid & Passed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            No training modules logged yet for this worker badge.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Edit Worker Profile: {worker.employee_id}</h3>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Craft / Trade</label>
                  <input
                    type="text"
                    value={editForm.trade || ''}
                    onChange={(e) => setEditForm({ ...editForm, trade: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation || ''}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editForm.status || worker.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Training Status</label>
                  <select
                    value={editForm.training_status || worker.training_status}
                    onChange={(e) => setEditForm({ ...editForm, training_status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                  >
                    <option value="certified">Certified</option>
                    <option value="pending_induction">Pending Induction</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
