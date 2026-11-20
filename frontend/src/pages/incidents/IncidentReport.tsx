import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIncident } from '../../api/incidents';
import { listProjects, Project } from '../../api/projects';
import { uploadEvidenceFile } from '../../api/storage';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  HardHat,
  Flame,
  Zap,
  X,
  FileText,
  ShieldAlert
} from 'lucide-react';

const CATEGORIES = [
  { id: 'near_miss', name: 'Near Miss', desc: 'An event that could have caused injury or damage but did not', icon: AlertTriangle },
  { id: 'unsafe_working_condition', name: 'Unsafe Condition', desc: 'Missing guards, oil spills, inadequate lighting, or tripping hazards', icon: HardHat },
  { id: 'falling_object', name: 'Falling Object', desc: 'Tools, staging materials, or debris falling from height', icon: AlertTriangle },
  { id: 'electrical_hazard', name: 'Electrical Hazard', desc: 'Exposed wiring, ungrounded tools, arcing, or water near power', icon: Zap },
  { id: 'fire_hazard', name: 'Fire Hazard', desc: 'Blocked exits, flammable storage, hot work without extinguishers', icon: Flame },
  { id: 'worker_injury', name: 'Worker Injury', desc: 'Laceration, fall, strain, impact, or burn requiring medical attention', icon: ShieldAlert },
  { id: 'equipment_accident', name: 'Equipment Accident', desc: 'Scaffolding collapse, crane defect, forklift or vehicle collision', icon: HardHat },
  { id: 'other', name: 'Other Safety Hazard', desc: 'Any other safety concern requiring supervisor or inspector action', icon: FileText },
];

const SEVERITIES = [
  { id: 'near_miss', name: 'Near Miss', desc: 'Zero injury or property damage' },
  { id: 'minor_injury', name: 'Minor', desc: 'First aid treatment on site' },
  { id: 'major_injury', name: 'Major', desc: 'Off-site medical treatment required' },
  { id: 'critical', name: 'Critical', desc: 'Hospitalization or structural compromise' },
  { id: 'property_damage', name: 'Property Damage', desc: 'Equipment or material loss only' },
];

export const IncidentReport: React.FC = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [category, setCategory] = useState<string>('near_miss');
  const [severity, setSeverity] = useState<string>('near_miss');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [locationDetails, setLocationDetails] = useState<string>('');
  const [occurredAt, setOccurredAt] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );

  // Witness details
  const [witnessName, setWitnessName] = useState<string>('');
  const [witnessStatement, setWitnessStatement] = useState<string>('');

  // Evidence photos
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    const fetchProj = async () => {
      try {
        const res = await listProjects({ size: 50 });
        setProjects(res.items);
        if (res.items.length > 0) {
          setProjectId(res.items[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProj();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg('');
      const res = await uploadEvidenceFile(file);
      setEvidencePhotos((prev) => [...prev, res.url]);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload photo evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setEvidencePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !projectId) {
      setErrorMsg('Please complete the title, description, and project fields');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const witnesses = witnessName.trim()
        ? [
            {
              name: witnessName.trim(),
              statement: witnessStatement.trim() || 'Observed event on site',
              recorded_at: new Date().toISOString(),
            },
          ]
        : [];

      const created = await createIncident({
        project_id: projectId,
        title: title.trim(),
        incident_category: category,
        severity,
        description: description.trim(),
        location_details: locationDetails.trim() || undefined,
        occurred_at: new Date(occurredAt).toISOString(),
        evidence_photos: evidencePhotos,
        witness_details: witnesses,
      });

      setSuccessMsg(`Incident ${created.incident_number} successfully reported.`);
      setTimeout(() => {
        navigate(`/incidents/${created.id}`);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit incident report');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Navigation */}
      <button
        onClick={() => navigate('/incidents')}
        className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Incidents & Hazard Log
      </button>

      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-50 text-brand-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Submit Safety Incident or Hazard Observation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Every worker and supervisor has the stop-work authority to report unsafe conditions.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Project & Location */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Site & Occurrence Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Construction Project *
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
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
                Date & Time of Occurrence *
              </label>
              <input
                type="datetime-local"
                required
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Exact On-Site Location
            </label>
            <input
              type="text"
              placeholder="e.g. Floor 14 West Perimeter, Tower Crane Bay 2, Sub-basement Electrical Vault"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Step 2: Category Selector */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            2. Incident / Hazard Category *
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-brand-500 bg-orange-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`p-2 rounded ${
                      isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-brand-900' : 'text-slate-800'
                      }`}
                    >
                      {cat.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{cat.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Severity Selector */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            3. Severity Rating *
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SEVERITIES.map((sev) => {
              const isSelected = severity === sev.id;
              return (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-orange-50/60 font-semibold text-slate-900 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">{sev.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{sev.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Incident Description & Title */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            4. Details & Factual Account
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Incident Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Unsecured lumber fell 2 stories onto safety netting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Description & Circumstances *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe what occurred, any equipment involved, immediate corrective measures taken, and whether any worker was affected..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Step 5: Photographs & Evidence */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            5. Evidence Photographs & Documents
          </h2>

          <div className="flex flex-wrap gap-3 items-center">
            {evidencePhotos.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded border border-slate-200 overflow-hidden group">
                <img src={url} alt="evidence" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            <label className="w-20 h-20 rounded border-2 border-dashed border-slate-300 hover:border-brand-500 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-brand-600 transition-colors bg-slate-50">
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Add Photo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploading && (
              <span className="text-xs text-slate-500 animate-pulse">Uploading file...</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Upload clear site photographs of defects, tags, or damage (Max 10MB; JPG, PNG, WEBP, PDF).
          </p>
        </div>

        {/* Step 6: Witness Statement (Optional) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            6. Witness Statement (Optional)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Witness Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Carlos Rodriguez"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Witness Observation Summary
              </label>
              <input
                type="text"
                placeholder="e.g. Heard shout and saw debris netted immediately"
                value={witnessStatement}
                onChange={(e) => setWitnessStatement(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
          >
            {submitting ? 'Submitting Report...' : 'File Official Incident Report'}
          </button>
        </div>
      </form>
    </div>
  );
};
