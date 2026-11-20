import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getIncident,
  updateIncident,
  Incident,
  IncidentInvestigation
} from '../../api/incidents';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  AlertTriangle,
  Building,
  User,
  Calendar,
  ShieldCheck,
  Save,
  PlusCircle,
  Lock,
  Camera
} from 'lucide-react';

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Investigation form state
  const [status, setStatus] = useState<string>('reported');
  const [rootCause, setRootCause] = useState<string>('');
  const [findings, setFindings] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const canInvestigate =
    user && ['admin', 'safety_inspector', 'project_manager'].includes(user.role_name);
  const isClient = user?.role_name === 'client';

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getIncident(id);
      setIncident(res);
      setStatus(res.status);
      setResolutionNotes(res.resolution_notes || '');
      if (res.investigation) {
        setRootCause(res.investigation.root_cause || '');
        setFindings(res.investigation.findings || '');
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load incident details',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleSaveInvestigation = async () => {
    if (!id || !canInvestigate) return;

    try {
      setSaving(true);
      setMessage(null);

      const invPayload: IncidentInvestigation = {
        root_cause: rootCause.trim() || undefined,
        findings: findings.trim() || undefined,
        witness_statements: incident?.investigation?.witness_statements || [],
        lead_investigator_id: incident?.assigned_investigator_id || user?.id,
        completed_at: ['resolved', 'closed'].includes(status) ? new Date().toISOString() : undefined,
      };

      const updated = await updateIncident(id, {
        status,
        investigation: invPayload,
        resolution_notes: resolutionNotes.trim() || undefined,
      });

      setIncident(updated);
      setMessage({ type: 'success', text: 'Incident investigation updated successfully.' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update investigation',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading incident data...</div>;
  }

  if (!incident) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h2 className="text-sm font-semibold text-slate-800">Incident Record Not Found</h2>
        <button
          onClick={() => navigate('/incidents')}
          className="mt-4 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
        >
          Return to Incident Log
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/incidents')}
          className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Incidents Log
        </button>

        <div className="flex items-center gap-2">
          {canInvestigate && (
            <button
              onClick={() =>
                navigate(
                  `/corrective-actions?source_type=incident&source_id=${incident.id}&title=Remediate ${incident.title}`
                )
              }
              className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1 text-brand-600" />
              Issue Corrective Action
            </button>
          )}

          {canInvestigate && (
            <button
              onClick={handleSaveInvestigation}
              disabled={saving}
              className="inline-flex items-center px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save Investigation'}
            </button>
          )}
        </div>
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

      {/* Main Overview Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                {incident.incident_number}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {incident.project_code} ({incident.project_name})
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{incident.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Reported by: <strong className="text-slate-700">{incident.reporter_name || 'Worker'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Occurred: <strong className="text-slate-700">{new Date(incident.occurred_at).toLocaleString()}</strong>
              </span>
              {incident.location_details && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Site Location: <strong className="text-slate-700">{incident.location_details}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
            <span
              className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                incident.severity === 'critical' || incident.severity === 'major_injury'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {incident.severity.replace('_', ' ')}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 capitalize">
              Category: {incident.incident_category.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Narrative & Photographs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Factual Account & Details
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded border border-slate-100">
            {incident.description}
          </p>

          {/* Evidence Photographs */}
          <div className="pt-3">
            <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-slate-400" />
              Attached Evidence Photographs ({incident.evidence_photos?.length || 0})
            </h3>
            {(!incident.evidence_photos || incident.evidence_photos.length === 0) ? (
              <div className="text-xs text-slate-400 italic">No photographs attached.</div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {incident.evidence_photos.map((photoUrl, idx) => (
                  <a
                    key={idx}
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-24 h-24 rounded border border-slate-200 overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    <img src={photoUrl} alt="evidence" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status & Witnesses */}
        <div className="space-y-6">
          {/* Status Box */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Investigation Status
            </h3>
            {canInvestigate ? (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
              >
                <option value="reported">Reported</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="corrective_action_assigned">Corrective Action Assigned</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            ) : (
              <div className="text-xs font-bold text-slate-800 capitalize px-3 py-2 bg-slate-50 rounded border border-slate-200">
                {incident.status.replace('_', ' ')}
              </div>
            )}

            <div className="text-[11px] text-slate-500">
              Assigned Investigator:{' '}
              <strong className="text-slate-700">
                {incident.assigned_investigator_name || 'Safety Inspector Marcus Vance'}
              </strong>
            </div>
          </div>

          {/* Witness Details (Confidential per RBAC) */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Witness Details
              </h3>
              {isClient && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Confidential
                </span>
              )}
            </div>

            {isClient ? (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500 italic">
                Witness identifying information and testimony are protected under privacy & safety compliance protocols.
              </div>
            ) : incident.witness_details && incident.witness_details.length > 0 ? (
              <div className="space-y-2">
                {incident.witness_details.map((w, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs">
                    <div className="font-semibold text-slate-800">{w.name}</div>
                    <div className="text-slate-600 mt-0.5">{w.statement}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">No formal witness records on file.</div>
            )}
          </div>
        </div>
      </div>

      {/* Root Cause & Corrective Action Directives */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          Root Cause Analysis & Investigation Findings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Determined Root Cause
            </label>
            <textarea
              rows={3}
              disabled={!canInvestigate}
              placeholder="Primary failure mode (e.g. failure to tie off staging materials prior to deck hoisting)..."
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Investigation Findings & Recommendations
            </label>
            <textarea
              rows={3}
              disabled={!canInvestigate}
              placeholder="Immediate site directives, toolbox talk refocused on tool lanyards, retraining required..."
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Resolution Notes
          </label>
          <textarea
            rows={2}
            disabled={!canInvestigate}
            placeholder="Official resolution summary upon closing out incident..."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>
      </div>
    </div>
  );
};
