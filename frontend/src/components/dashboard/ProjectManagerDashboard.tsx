import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  CheckSquare,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { analyticsApi, DashboardKPIs } from '../../api/analytics';
import { listProjects, Project } from '../../api/projects';
import { EmptyState } from '../common/EmptyState';

interface ProjectManagerDashboardProps {
  userName: string;
}

export const ProjectManagerDashboard: React.FC<ProjectManagerDashboardProps> = ({ userName }) => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, projRes] = await Promise.all([
          analyticsApi.getDashboard({ date_range: '30d' }),
          listProjects({ size: 5 })
        ]);
        setKpis(dashRes.kpis);
        setProjects(projRes.items || []);
      } catch (err) {
        console.error('Failed to load project manager metrics:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1 & 2: Welcome Message & Instruction */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAEAEA] shadow-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] mb-2 uppercase tracking-wide">
          Project Operations Lead
        </span>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#121926]">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-sm text-[#666666]">
          Monitor your assigned construction sites, resolve pending corrective actions, and track worker compliance.
        </p>
      </div>

      {/* 3: Four Important Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              My Projects
            </span>
            <Building2 className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {projects.length}
          </div>
          <p className="text-xs text-[#666666] mt-1">Assigned construction sites</p>
        </div>

        <div className={`p-6 rounded-2xl border shadow-xs transition-all ${
          kpis && kpis.open_corrective_actions > 0
            ? 'bg-[#FFFBEB] border-[#FDE68A]'
            : 'bg-white border-[#EAEAEA]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Open CAPAs
            </span>
            <CheckSquare className="w-5 h-5 text-[#E6C700]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {kpis?.open_corrective_actions ?? 0}
          </div>
          <p className="text-xs text-[#666666] mt-1">Pending corrective tasks</p>
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
          <p className="text-xs text-[#666666] mt-1">Completed site audits</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Project Incidents
            </span>
            <AlertTriangle className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {kpis?.total_incidents ?? 0}
          </div>
          <p className="text-xs text-[#666666] mt-1">Safety incident reports</p>
        </div>
      </div>

      {/* 4: Three Important Quick Actions */}
      <div>
        <h2 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
          Quick Operations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="p-5 rounded-2xl bg-[#FFDD00] hover:bg-[#E6C700] text-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-[#FFDD00] flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Open My Projects</h3>
              <p className="text-xs text-[#121926]/80 mt-0.5">View site details, milestones, and timelines</p>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/workers')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">View Workforce</h3>
              <p className="text-xs text-[#666666] mt-0.5">Review site workers and certifications</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/corrective-actions')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Track Corrective Actions</h3>
              <p className="text-xs text-[#666666] mt-0.5">Ensure open tasks are resolved before deadline</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>
        </div>
      </div>

      {/* 5: Recent Activity (Assigned Projects Roster) */}
      <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-xs p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#121926]">
              Assigned Construction Projects
            </h3>
            <p className="text-xs text-[#666666]">
              Jobsites under your operational project management
            </p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="text-xs font-bold text-[#121926] hover:text-[#E6C700] flex items-center gap-1"
          >
            All Projects <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {projects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAEAEA] text-[#666666] font-bold uppercase text-[10px]">
                  <th className="pb-3">Project Name</th>
                  <th className="pb-3">Site Code</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Workers</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA] text-[#040404]">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FBFBFB] transition-colors">
                    <td className="py-3 font-semibold text-[#121926]">{p.name}</td>
                    <td className="py-3 font-mono text-[#666666]">{p.code}</td>
                    <td className="py-3 text-[#666666]">{p.client_name}</td>
                    <td className="py-3 font-semibold">{p.worker_count} On-Site</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        Manage Site
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No Projects Assigned"
            description="You do not currently have any active construction projects assigned to your lead profile."
          />
        )}
      </div>
    </div>
  );
};
