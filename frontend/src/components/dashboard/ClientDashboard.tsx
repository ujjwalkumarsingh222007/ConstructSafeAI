import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  FileDown,
  ClipboardCheck,
  ArrowRight,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { analyticsApi, DashboardKPIs } from '../../api/analytics';
import { listProjects, Project } from '../../api/projects';
import { hazardsApi, HazardReport } from '../../api/hazards';
import { EmptyState } from '../common/EmptyState';

interface ClientDashboardProps {
  userName: string;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ userName }) => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [approvedHazards, setApprovedHazards] = useState<HazardReport[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, projRes, hazardRes] = await Promise.all([
          analyticsApi.getDashboard({ date_range: '30d' }),
          listProjects({ size: 10 }),
          hazardsApi.listReports({ status: 'approved', size: 5 })
        ]);
        setKpis(dashRes.kpis);
        setProjects(projRes.items || []);
        setApprovedHazards(hazardRes.items || []);
      } catch (err) {
        console.error('Failed to load client oversight metrics:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1 & 2: Welcome Message & Instruction */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAEAEA] shadow-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] mb-2 uppercase tracking-wide">
          Client Oversight Portal
        </span>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#121926]">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-sm text-[#666666]">
          Review verified project safety scorecards, verified hazard remediations, and download audit-ready compliance reports.
        </p>
      </div>

      {/* 3: Four Important Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Authorized Sites
            </span>
            <Building2 className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {projects.length}
          </div>
          <p className="text-xs text-[#666666] mt-1">Monitored construction sites</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Safety Compliance
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-emerald-700">
            {kpis?.inspection_pass_rate ? `${kpis.inspection_pass_rate}%` : '100%'}
          </div>
          <p className="text-xs text-[#666666] mt-1">Audit pass percentage</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Verified Hazards
            </span>
            <CheckCircle2 className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {kpis?.approved_hazards ?? 0}
          </div>
          <p className="text-xs text-[#666666] mt-1">Resolved & signed-off</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Total Audits
            </span>
            <ClipboardCheck className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {kpis?.total_inspections ?? 0}
          </div>
          <p className="text-xs text-[#666666] mt-1">Safety checklist audits</p>
        </div>
      </div>

      {/* 4: Three Important Quick Actions */}
      <div>
        <h2 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
          Oversight Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">View Projects</h3>
              <p className="text-xs text-[#666666] mt-0.5">Inspect site scorecards & milestones</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="p-5 rounded-2xl bg-[#FFDD00] hover:bg-[#E6C700] text-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-[#FFDD00] flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">View Safety Report</h3>
              <p className="text-xs text-[#121926]/80 mt-0.5">Explore compliance charts & metrics</p>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <FileDown className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Download PDF</h3>
              <p className="text-xs text-[#666666] mt-0.5">Export audit-ready executive PDF files</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>
        </div>
      </div>

      {/* 5: Recent Activity (Verified Hazard Remediations - Zero Confidential Data) */}
      <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-xs p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#121926]">
              Verified Hazard Remediations
            </h3>
            <p className="text-xs text-[#666666]">
              Approved safety remediations and corrective measures
            </p>
          </div>
          <button
            onClick={() => navigate('/hazards')}
            className="text-xs font-bold text-[#121926] hover:text-[#E6C700] flex items-center gap-1"
          >
            All Approved Hazards <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {approvedHazards.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAEAEA] text-[#666666] font-bold uppercase text-[10px]">
                  <th className="pb-3">Report #</th>
                  <th className="pb-3">Hazard Category</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Date Approved</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA] text-[#040404]">
                {approvedHazards.map((h) => (
                  <tr key={h.id} className="hover:bg-[#FBFBFB] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#121926]">{h.report_number}</td>
                    <td className="py-3 font-semibold">{h.category}</td>
                    <td className="py-3">
                      <span className="capitalize font-medium text-[#666666]">{h.severity}</span>
                    </td>
                    <td className="py-3 text-[#666666]">
                      {new Date(h.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Remediated & Approved
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => navigate(`/hazards/${h.id}`)}
                        className="btn-outline text-xs py-1 px-2.5"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 inline" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No Verified Hazards Recorded"
            description="Verified safety reports will appear here as field audits are conducted and authorized by the administration."
          />
        )}
      </div>
    </div>
  );
};
