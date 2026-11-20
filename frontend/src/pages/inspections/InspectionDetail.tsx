import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getInspection,
  updateInspection,
  Inspection,
  InspectionItem
} from '../../api/inspections';
import { uploadEvidenceFile } from '../../api/storage';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Calendar,
  Building,
  User,
  Save,
  Camera,
  PlusCircle
} from 'lucide-react';

export const InspectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [checklist, setChecklist] = useState<InspectionItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<string>('scheduled');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);

  const canEdit = user && ['admin', 'safety_inspector', 'project_manager'].includes(user.role_name);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getInspection(id);
      setInspection(res);
      setChecklist(res.checklist_items || []);
      setNotes(res.notes || '');
      setStatus(res.status);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load inspection details',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Compute live score
  const computedScore = (() => {
    const scorable = checklist.filter((i) => i.status !== 'na');
    if (scorable.length === 0) return 100;
    const passed = scorable.filter((i) => i.status === 'pass').length;
    return Math.round((passed / scorable.length) * 1000) / 10;
  })();

  const handleItemStatusChange = (index: number, newStatus: 'pass' | 'fail' | 'na') => {
    if (!canEdit) return;
    setChecklist((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        status: newStatus,
        passed: newStatus === 'pass',
      };
      return updated;
    });
  };

  const handleItemNotesChange = (index: number, val: string) => {
    if (!canEdit) return;
    setChecklist((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], notes: val };
      return updated;
    });
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingItemIndex(index);
      const uploadRes = await uploadEvidenceFile(file);
      setChecklist((prev) => {
        const updated = [...prev];
        const existingPhotos = updated[index].photos || [];
        updated[index] = {
          ...updated[index],
          photos: [...existingPhotos, uploadRes.url],
        };
        return updated;
      });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploadingItemIndex(null);
    }
  };

  const handleSave = async () => {
    if (!id || !canEdit) return;
    try {
      setSaving(true);
      setMessage(null);
      const updated = await updateInspection(id, {
        status,
        notes: notes.trim(),
        checklist_items: checklist,
      });
      setInspection(updated);
      setChecklist(updated.checklist_items);
      setMessage({ type: 'success', text: 'Safety audit saved successfully' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to save audit changes',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading audit report...</div>;
  }

  if (!inspection) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h2 className="text-sm font-semibold text-slate-800">Inspection Not Found</h2>
        <button
          onClick={() => navigate('/inspections')}
          className="mt-4 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
        >
          Return to Inspections
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/inspections')}
          className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Inspections
        </button>

        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Saving...' : 'Save Audit Evaluation'}
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-xs border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold px-1">
            ✕
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                {inspection.inspection_number}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {inspection.project_code} ({inspection.project_name})
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{inspection.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Lead Inspector: <strong className="text-slate-700">{inspection.inspector_name || 'Inspector'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Scheduled: <strong className="text-slate-700">{new Date(inspection.scheduled_date).toLocaleDateString()}</strong>
              </span>
              {inspection.completed_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Completed: <strong className="text-slate-700">{new Date(inspection.completed_at).toLocaleDateString()}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Audit Score Gauge & Status Selector */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="text-center sm:text-right">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Audit Compliance Score
              </div>
              <div
                className={`text-2xl font-black ${
                  computedScore >= 90
                    ? 'text-emerald-600'
                    : computedScore >= 75
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {computedScore.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500">
                {checklist.filter((c) => c.status === 'pass').length} of{' '}
                {checklist.filter((c) => c.status !== 'na').length} Passed
              </div>
            </div>

            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Audit Status
              </label>
              {canEdit ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed (Pass)</option>
                  <option value="failed">Failed Audit</option>
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-800 capitalize">
                  {inspection.status.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Audit Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-brand-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Audit Checklist Items ({checklist.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Click status pill to mark Pass, Fail, or N/A
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {checklist.map((item, index) => (
            <div key={item.item_id || index} className="p-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.item_id}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{item.category}</span>
                  </div>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleItemStatusChange(index, 'pass')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                      item.status === 'pass'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pass
                  </button>

                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleItemStatusChange(index, 'fail')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                      item.status === 'fail'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Fail
                  </button>

                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleItemStatusChange(index, 'na')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                      item.status === 'na'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    N/A
                  </button>
                </div>
              </div>

              {/* Notes & Evidence Section for this Checklist item */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-50">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder="Inspector observation or defect notes..."
                    value={item.notes || ''}
                    onChange={(e) => handleItemNotesChange(index, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-between md:justify-end gap-2">
                  {/* Photo Evidence attachments */}
                  <div className="flex items-center gap-1.5">
                    {(item.photos || []).map((photoUrl, pIdx) => (
                      <a
                        key={pIdx}
                        href={photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-7 h-7 rounded border border-slate-200 overflow-hidden hover:opacity-80"
                        title="View photo evidence"
                      >
                        <img src={photoUrl} alt="evidence" className="w-full h-full object-cover" />
                      </a>
                    ))}

                    {canEdit && (
                      <label className="cursor-pointer p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          disabled={uploadingItemIndex === index}
                          onChange={(e) => handleFileUpload(index, e)}
                        />
                      </label>
                    )}
                  </div>

                  {/* If item failed, allow initiating corrective action */}
                  {item.status === 'fail' && canEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/corrective-actions?source_type=inspection&source_id=${inspection.id}&title=Resolve defect in ${item.category}`
                        )
                      }
                      className="inline-flex items-center text-[11px] text-brand-600 hover:text-brand-800 font-semibold"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Issue Action
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Inspector Audit Summary & Notes */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-2">
        <label className="block text-xs font-bold text-slate-800">
          Executive Audit Summary / Closeout Directives
        </label>
        <textarea
          rows={3}
          disabled={!canEdit}
          placeholder="Overall evaluation, structural safety recommendations, or remedial priorities..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
        />
      </div>
    </div>
  );
};
