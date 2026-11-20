import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Building2,
  Users,
  CheckSquare,
  ArrowRight,
  Clock
} from 'lucide-react';
import { analyticsApi, DashboardKPIs } from '../../api/analytics';
import { hazardsApi, HazardReport } from '../../api/hazards';
import { EmptyState } from '../common/EmptyState';

interface AdminDashboardProps {
  userName: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ userName }) => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [pendingReports, setPendingReports] = useState<HazardReport[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, hazardRes] = await Promise.all([
          analyticsApi.getDashboard({ date_range: '30d' }),
          hazardsApi.listReports({ status: 'pending_admin_review', size: 5 })
        ]);
        setKpis(dashRes.kpis);
        setPendingReports(hazardRes.items || []);
      } catch (err) {
        console.error('Failed to load admin metrics:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1 & 2: Welcome Message & Role-Specific Instruction */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAEAEA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] mb-2 uppercase tracking-wide">
            Administrator Oversight
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#121926]">
            Welcome back, {userName}
          </h1>
          <p className="mt-1 text-sm text-[#666666]">
            Review field hazard submissions, assign corrective actions, and oversee jobsite workforce compliance.
          </p>
        </div>

        {/* Quick Review Badge */}
        {kpis && kpis.pending_admin_reviews > 0 && (
          <div className="bg-[#FFFBEB] border border-[#FEF3C7] p-3.5 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FFDD00] text-[#121926] flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#121926] block">
                {kpis.pending_admin_reviews} Submissions Waiting
              </span>
              <span className="text-[11px] text-[#666666]">Requires administrative review</span>
            </div>
          </div>
        )}
      </div>

      {/* 3: Four Important Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Pending Hazard Approvals */}
        <div className={`p-6 rounded-2xl border shadow-xs transition-all ${
          kpis && kpis.pending_admin_reviews > 0
            ? 'bg-[#FFFBEB] border-[#FDE68A]'
            : 'bg-white border-[#EAEAEA]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Pending Approvals
            </span>
            <ShieldAlert className="w-5 h-5 text-[#E6C700]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {kpis?.pending_admin_reviews ?? 0}
          </div>
          <p className="text-xs text-[#666666] mt-1">Hazard reports awaiting review</p>
        </div>

        {/* Card 2: Active Projects */}
        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Active Projects
            </span>
            <Building2 className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {kpis?.total_projects ?? 0}
          </div>
          <p className="text-xs text-[#666666] mt-1">Monitored construction jobsites</p>
        </div>

        {/* Card 3: Total Workers */}
        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Total Workers
            </span>
            <Users className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {kpis?.total_workers ?? 0}
          </div>
          <p className="text-xs text-[#666666] mt-1">Registered workforce personnel</p>
        </div>

        {/* Card 4: Open Corrective Actions */}
        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Open CAPA
            </span>
            <CheckSquare className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {kpis?.open_corrective_actions ?? 0}
          </div>
          <p className="text-xs text-[#666666] mt-1">Active remedial safety tasks</p>
        </div>
      </div>

      {/* 4: Two or Three Important Quick Actions */}
      <div>
        <h2 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
          Administrative Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/hazards/review-queue')}
            className="p-5 rounded-2xl bg-[#FFDD00] hover:bg-[#E6C700] text-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-[#FFDD00] flex items-center justify-center mb-2">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Review Hazards</h3>
              <p className="text-xs text-[#121926]/80 mt-0.5">Authorize or reject pending photo submissions</p>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Manage Projects</h3>
              <p className="text-xs text-[#666666] mt-0.5">Configure sites and assign safety personnel</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Manage Users</h3>
              <p className="text-xs text-[#666666] mt-0.5">Oversee site workforce and project roles</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>
        </div>
      </div>

      {/* 5: Recent Activity or Pending Tasks */}
      <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-xs p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#121926]">
              Pending Hazard Reviews
            </h3>
            <p className="text-xs text-[#666666]">
              Field submissions requiring administrative verification or corrective action assignment
            </p>
          </div>
          <button
            onClick={() => navigate('/hazards/review-queue')}
            className="text-xs font-bold text-[#121926] hover:text-[#E6C700] flex items-center gap-1"
          >
            Open Review Queue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAEAEA] text-[#666666] font-bold uppercase text-[10px]">
                  <th className="pb-3">Report #</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Submitted</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA] text-[#040404]">
                {pendingReports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FBFBFB] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#121926]">{r.report_number}</td>
                    <td className="py-3 font-medium">{r.category}</td>
                    <td className="py-3">
                      <span className="capitalize font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {r.severity}
                      </span>
                    </td>
                    <td className="py-3 text-[#666666]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => navigate('/hazards/review-queue')}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Review Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="All Hazards Reviewed"
            description="No hazard reports are currently awaiting administrative review. Great job maintaining zero backlog!"
          />
        )}
      </div>
    </div>
  );
};
