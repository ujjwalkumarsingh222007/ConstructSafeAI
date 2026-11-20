import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listProjects, Project } from '../api/projects';
import { analyticsApi } from '../api/analytics';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Building2,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  Lock,
  RefreshCw,
  Info
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter states for individual report cards
  const [projectReportId, setProjectReportId] = useState<string>('');
  const [incidentProjectId, setIncidentProjectId] = useState<string>('');
  const [inspectionProjectId, setInspectionProjectId] = useState<string>('');
  const [capaProjectId, setCapaProjectId] = useState<string>('');

  // Bulk Export Card state
  const [exportType, setExportType] = useState<string>('hazards');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');
  const [exportProjectId, setExportProjectId] = useState<string>('');
  const [exportRange, setExportRange] = useState<string>('30d');
  const [exporting, setExporting] = useState<boolean>(false);
  const [downloadingCard, setDownloadingCard] = useState<string | null>(null);

  const isClient = user?.role_name === 'client';

  useEffect(() => {
    listProjects({ size: 100 })
      .then((res) => {
        setProjects(res.items);
        if (res.items.length > 0) {
          const firstId = res.items[0].id;
          setProjectReportId(firstId);
          setIncidentProjectId(firstId);
          setInspectionProjectId(firstId);
          setCapaProjectId(firstId);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadProjectPdf = async () => {
    if (!projectReportId) return;
    try {
      setDownloadingCard('project');
      const proj = projects.find((p) => p.id === projectReportId);
      const code = proj?.code || 'PRJ';
      await analyticsApi.downloadProjectReportPdf(projectReportId, `Project_Safety_Report_${code}.pdf`);
    } catch (err: any) {
      alert('Failed to generate project report: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingCard(null);
    }
  };

  const handleDownloadIncidentPdf = async () => {
    try {
      setDownloadingCard('incident');
      await analyticsApi.downloadIncidentReportPdf({
        project_id: incidentProjectId || undefined
      });
    } catch (err: any) {
      alert('Failed to generate incident report: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingCard(null);
    }
  };

  const handleDownloadInspectionPdf = async () => {
    try {
      setDownloadingCard('inspection');
      await analyticsApi.downloadInspectionReportPdf({
        project_id: inspectionProjectId || undefined
      });
    } catch (err: any) {
      alert('Failed to generate inspection report: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingCard(null);
    }
  };

  const handleDownloadCapaPdf = async () => {
    try {
      setDownloadingCard('capa');
      await analyticsApi.downloadCapaReportPdf({
        project_id: capaProjectId || undefined
      });
    } catch (err: any) {
      alert('Failed to generate CAPA report: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setDownloadingCard(null);
    }
  };

  const handleTabularExport = async () => {
    try {
      setExporting(true);
      const params: Record<string, string> = {
        date_range: exportRange
      };
      if (exportProjectId) params.project_id = exportProjectId;

      if (exportFormat === 'csv') {
        await analyticsApi.downloadExportCsv(exportType, params);
      } else {
        await analyticsApi.downloadExportXlsx(exportType, params);
      }
    } catch (err: any) {
      alert('Export failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
          <span>Loading reporting metadata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Safety Reporting & Compliance Exports
          </h1>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            ReportLab + OpenPyXL
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Generate formal audit documentation, download executive PDF briefs, and export datasets in CSV or Excel formats.
        </p>
      </div>

      {isClient && (
        <div className="p-3.5 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Client Read-Only Access:</strong> Internal worker medical records, witness statements, and private investigation notes are automatically redacted from your generated reports.
          </span>
        </div>
      )}

      {/* SECTION 1: Formal Downloadable PDF Reports (4 Cards) */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600" />
          Executive PDF Audit Reports
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Project Safety Report */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Audit Document A
                </span>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Project Safety Audit Report</h3>
              <p className="text-xs text-slate-600">
                Full site safety briefing including project details, hazard breakdown, incidents, inspection results, CAPA progress, and executive signature block.
              </p>

              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Project</label>
                <select
                  value={projectReportId}
                  onChange={(e) => setProjectReportId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleDownloadProjectPdf}
              disabled={downloadingCard === 'project' || !projectReportId}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {downloadingCard === 'project' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Download Project Audit PDF
                </>
              )}
            </button>
          </div>

          {/* Card B: Incident Safety Report */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Audit Document B
                </span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Incident Investigation Report</h3>
              <p className="text-xs text-slate-600">
                Detailed safety incident dossier covering severity, occurrence timeline, root cause analysis, corrective actions, and witness documentation.
              </p>

              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Filter by Project (Optional)</label>
                <select
                  value={incidentProjectId}
                  onChange={(e) => setIncidentProjectId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none"
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

            <button
              onClick={handleDownloadIncidentPdf}
              disabled={downloadingCard === 'incident'}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {downloadingCard === 'incident' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Download Incident Report PDF
                </>
              )}
            </button>
          </div>

          {/* Card C: Safety Inspection Report */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Audit Document C
                </span>
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Inspection & Audit Report</h3>
              <p className="text-xs text-slate-600">
                Formal checklist evaluation dossier detailing scorable items passed/failed, overall compliance score, inspector observations, and photographic evidence.
              </p>

              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Filter by Project (Optional)</label>
                <select
                  value={inspectionProjectId}
                  onChange={(e) => setInspectionProjectId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none"
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

            <button
              onClick={handleDownloadInspectionPdf}
              disabled={downloadingCard === 'inspection'}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {downloadingCard === 'inspection' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Download Inspection Audit PDF
                </>
              )}
            </button>
          </div>

          {/* Card D: CAPA Closure Report */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Audit Document D
                </span>
                <CheckSquare className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">CAPA Ticket Closure Audit</h3>
              <p className="text-xs text-slate-600">
                Corrective and preventive action resolution certificate with assigned responsibility, remediation remarks, verification timestamps, and formal closure sign-off.
              </p>

              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Filter by Project (Optional)</label>
                <select
                  value={capaProjectId}
                  onChange={(e) => setCapaProjectId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none"
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

            <button
              onClick={handleDownloadCapaPdf}
              disabled={downloadingCard === 'capa'}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {downloadingCard === 'capa' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Download CAPA Closure PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Tabular Data Exports (CSV & Excel XLSX) */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Custom Tabular Data Exports (CSV / Excel XLSX)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Export raw and filtered datasets for external analytics, reporting, and safety compliance archival.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Data Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dataset Type</label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none"
            >
              <option value="hazards">Hazard Observations</option>
              <option value="incidents">Safety Incidents</option>
              <option value="inspections">Inspection Audits</option>
              <option value="capa">Corrective Actions (CAPA)</option>
              <option value="projects">Project Information</option>
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Project Scope</label>
            <select
              value={exportProjectId}
              onChange={(e) => setExportProjectId(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none"
            >
              <option value="">All Authorized Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reporting Period</label>
            <select
              value={exportRange}
              onChange={(e) => setExportRange(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Past 1 Year</option>
              <option value="all">All-Time Database Records</option>
            </select>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">File Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`py-2 px-2.5 rounded border text-center font-semibold text-xs ${
                  exportFormat === 'xlsx'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`py-2 px-2.5 rounded border text-center font-semibold text-xs ${
                  exportFormat === 'csv'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                CSV Text
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleTabularExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling Data...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Export {exportFormat.toUpperCase()} Dataset
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 3: Compliance & KPI Formula Reference */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-400" />
          Safety Measurement & Calculation Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-900 block">Inspection Pass Rate</span>
            <code className="text-[11px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
              (Passed Scorable Items / Total Scorable Items) × 100
            </code>
            <p className="text-[11px] text-slate-500 pt-1">
              Checklist items marked N/A are excluded from scoring denominators to preserve statistical validity.
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-900 block">CAPA Closure Rate</span>
            <code className="text-[11px] text-purple-700 bg-purple-50 px-1 py-0.5 rounded">
              (Completed + Closed CAPAs / Total Created CAPAs) × 100
            </code>
            <p className="text-[11px] text-slate-500 pt-1">
              Measures percentage of issued corrective action tickets verified and closed out by safety directors.
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-900 block">Average Resolution Duration</span>
            <code className="text-[11px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
              Avg(Verified Timestamp - Ticket Creation Timestamp)
            </code>
            <p className="text-[11px] text-slate-500 pt-1">
              Calculates mean calendar days required from hazard escalation to verified resolution on site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
