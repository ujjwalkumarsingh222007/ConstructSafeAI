import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ClipboardCheck,
  AlertTriangle,
  Building2,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { hazardsApi, HazardReport } from '../../api/hazards';
import { inspectionsApi, Inspection } from '../../api/inspections';
import { listProjects, Project } from '../../api/projects';
import { EmptyState } from '../common/EmptyState';
import { getStatusBadgeClass, getStatusLabel } from '../../utils/statusColors';

interface InspectorDashboardProps {
  userName: string;
}

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({ userName }) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hazardsRes, inspRes, projRes] = await Promise.all([
          hazardsApi.listReports({ size: 5 }),
          inspectionsApi.list({ size: 10 }),
          listProjects({ size: 10 })
        ]);
        setReports(hazardsRes.items || []);
        setInspections(inspRes.items || []);
        setProjects(projRes.items || []);
      } catch (err) {
        console.error('Failed to load inspector data:', err);
      }
    };
    fetchData();
  }, []);

  const pendingInspections = inspections.filter((i) => i.status === 'in_progress' || i.status === 'scheduled').length;
  const awaitingReview = reports.filter((r) => r.status === 'pending_admin_review').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1 & 2: Welcome Message & Instruction */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAEAEA] shadow-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] mb-2 uppercase tracking-wide">
          Field Safety Clearance
        </span>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#121926]">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-sm text-[#666666]">
          Capture jobsite photographs, run AI hazard detection, complete safety audits, and monitor report approvals.
        </p>
      </div>

      {/* PROMINENT ACTION: UPLOAD HAZARD PHOTO (Part 3 requirement) */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#121926] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md border border-[#1E293B]">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FFDD00] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> AI-Assisted Static Vision
          </div>
          <h2 className="font-heading text-2xl font-extrabold text-white">
            Observed an Unsafe Condition on Site?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Take a clear photo of the hazard. Our YOLO model will suggest hazard categories for your expert human review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/hazards/new')}
          className="btn-primary text-base py-3.5 px-7 flex-shrink-0"
        >
          <Camera className="w-5 h-5 mr-2" />
          Upload Hazard Photo
        </button>
      </div>

      {/* 3: Four Important Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Assigned Sites
            </span>
            <Building2 className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {projects.length}
          </div>
          <p className="text-xs text-[#666666] mt-1">Active project jobsites</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Pending Audits
            </span>
            <ClipboardCheck className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {pendingInspections}
          </div>
          <p className="text-xs text-[#666666] mt-1">Checklists to complete</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Submitted Hazards
            </span>
            <Camera className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {reports.length}
          </div>
          <p className="text-xs text-[#666666] mt-1">Hazard reports submitted</p>
        </div>

        <div className={`p-6 rounded-2xl border shadow-xs transition-all ${
          awaitingReview > 0 ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-white border-[#EAEAEA]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Awaiting Admin
            </span>
            <Clock className="w-5 h-5 text-[#E6C700]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {awaitingReview}
          </div>
          <p className="text-xs text-[#666666] mt-1">In Admin review queue</p>
        </div>
      </div>

      {/* 4: Three Important Quick Actions */}
      <div>
        <h2 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
          Inspector Operations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/hazards/new')}
            className="p-5 rounded-2xl bg-[#FFDD00] hover:bg-[#E6C700] text-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-[#FFDD00] flex items-center justify-center mb-2">
                <Camera className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Report Hazard</h3>
              <p className="text-xs text-[#121926]/80 mt-0.5">Upload photo & review YOLO inference</p>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/inspections')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Start Inspection</h3>
              <p className="text-xs text-[#666666] mt-0.5">Evaluate site checklist & audit score</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/incidents/report')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Report Incident</h3>
              <p className="text-xs text-[#666666] mt-0.5">Log near miss, injury, or site defect</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>
        </div>
      </div>

      {/* 5: Recent Activity (Submitted Hazards Table) */}
      <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-xs p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#121926]">
              Recent Hazard Submissions
            </h3>
            <p className="text-xs text-[#666666]">
              Real-time approval status from the administrative review queue
            </p>
          </div>
          <button
            onClick={() => navigate('/hazards')}
            className="text-xs font-bold text-[#121926] hover:text-[#E6C700] flex items-center gap-1"
          >
            All Hazard Reports <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAEAEA] text-[#666666] font-bold uppercase text-[10px]">
                  <th className="pb-3">Report #</th>
                  <th className="pb-3">Hazard Category</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA] text-[#040404]">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FBFBFB] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#121926]">{r.report_number}</td>
                    <td className="py-3 font-semibold">{r.category}</td>
                    <td className="py-3">
                      <span className="capitalize font-medium text-[#666666]">{r.severity}</span>
                    </td>
                    <td className="py-3 text-[#666666]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-[10px] rounded-md border ${getStatusBadgeClass(r.status)}`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => navigate(`/hazards/${r.id}`)}
                        className="btn-outline text-xs py-1 px-2.5"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No Hazard Reports Submitted"
            description="Use your camera to capture an image and submit your first AI-assisted hazard report."
            actionText="Upload Photo"
            onAction={() => navigate('/hazards/new')}
          />
        )}
      </div>
    </div>
  );
};
