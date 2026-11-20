import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  GraduationCap,
  Camera,
  Building2,
  Bell,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { correctiveActionsApi, CorrectiveAction } from '../../api/correctiveActions';
import { notificationsApi, NotificationItem } from '../../api/notifications';
import { EmptyState } from '../common/EmptyState';
import { getStatusBadgeClass, getStatusLabel } from '../../utils/statusColors';

interface WorkerDashboardProps {
  userName: string;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ userName }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<CorrectiveAction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, notifRes] = await Promise.all([
          correctiveActionsApi.list({ size: 5 }),
          notificationsApi.list({ limit: 3 })
        ]);
        setTasks(taskRes.items || []);
        setNotifications(notifRes.notifications || []);
      } catch (err) {
        console.error('Failed to load worker data:', err);
      }
    };
    fetchData();
  }, []);

  const openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1 & 2: Welcome Message & Instruction */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAEAEA] shadow-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] mb-2 uppercase tracking-wide">
          Site Workforce Portal
        </span>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#121926]">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-sm text-[#666666]">
          View your assigned safety tasks, complete safety training modules, and maintain site induction credentials.
        </p>
      </div>

      {/* 3: Four Important Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              My Jobsite
            </span>
            <Building2 className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-2xl font-extrabold font-heading text-[#121926]">
            Active
          </div>
          <p className="text-xs text-[#666666] mt-1">Designated project site</p>
        </div>

        <div className={`p-6 rounded-2xl border shadow-xs transition-all ${
          openTasks.length > 0 ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-white border-[#EAEAEA]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Assigned Tasks
            </span>
            <CheckSquare className="w-5 h-5 text-[#E6C700]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {openTasks.length}
          </div>
          <p className="text-xs text-[#666666] mt-1">Pending safety remediation</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Induction Status
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-heading text-emerald-700">
            Certified
          </div>
          <p className="text-xs text-[#666666] mt-1">Safety orientation verified</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              Notifications
            </span>
            <Bell className="w-5 h-5 text-[#121926]" />
          </div>
          <div className="text-3xl font-extrabold font-heading text-[#121926]">
            {notifications.length}
          </div>
          <p className="text-xs text-[#666666] mt-1">Recent safety alerts</p>
        </div>
      </div>

      {/* 4: Three Important Quick Actions */}
      <div>
        <h2 className="text-xs font-bold text-[#666666] uppercase tracking-wider mb-3">
          Worker Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/corrective-actions')}
            className="p-5 rounded-2xl bg-[#FFDD00] hover:bg-[#E6C700] text-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-[#FFDD00] flex items-center justify-center mb-2">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">View My Tasks</h3>
              <p className="text-xs text-[#121926]/80 mt-0.5">Check and close assigned corrective actions</p>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/workers/me')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">View Training</h3>
              <p className="text-xs text-[#666666] mt-0.5">Certificates & safety induction status</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/hazards/new')}
            className="p-5 rounded-2xl bg-white hover:bg-[#FBFBFB] border border-[#EAEAEA] hover:border-[#121926] text-left transition-all shadow-xs flex items-center justify-between group"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[#121926] text-white flex items-center justify-center mb-2">
                <Camera className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#121926]">Report a Hazard</h3>
              <p className="text-xs text-[#666666] mt-0.5">Upload a photo of an unsafe condition</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#666666] group-hover:translate-x-1 group-hover:text-[#121926] transition-all" />
          </button>
        </div>
      </div>

      {/* 5: Recent Tasks & Site Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EAEAEA] shadow-xs p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#121926]">
                Assigned Corrective Tasks
              </h3>
              <p className="text-xs text-[#666666]">
                Remediation items currently assigned to your profile
              </p>
            </div>
            <button
              onClick={() => navigate('/corrective-actions')}
              className="text-xs font-bold text-[#121926] hover:text-[#E6C700] flex items-center gap-1"
            >
              All Tasks <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {tasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EAEAEA] text-[#666666] font-bold uppercase text-[10px]">
                    <th className="pb-3">Action #</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Due Date</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA] text-[#040404]">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-[#FBFBFB] transition-colors">
                      <td className="py-3 font-mono font-bold text-[#121926]">{t.action_number}</td>
                      <td className="py-3 font-medium max-w-xs truncate">{t.description}</td>
                      <td className="py-3 text-[#666666]">{t.due_date || 'ASAP'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 text-[10px] rounded-md border ${getStatusBadgeClass(t.status)}`}>
                          {getStatusLabel(t.status)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => navigate('/corrective-actions')}
                          className="btn-outline text-xs py-1 px-2.5"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Pending Tasks"
              description="You have no open corrective action tasks assigned. Maintain safe working standards!"
            />
          )}
        </div>

        {/* Mandatory Jobsite Protocol Card */}
        <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FFDD00] text-[#121926] flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[#121926]">
                Mandatory Site Rules
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs text-[#666666] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#121926] font-bold">•</span>
                <span>Wear hard hat, high-vis vest, and safety boots at all times.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#121926] font-bold">•</span>
                <span>Tie off harness 100% when working above 6 feet.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#121926] font-bold">•</span>
                <span>Keep all walkways clear of debris and trip hazards.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#121926] font-bold">•</span>
                <span>Report damaged electrical cords or missing guards immediately.</span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => navigate('/workers/me')}
            className="mt-4 pt-3 border-t border-[#EAEAEA] text-xs font-bold text-[#121926] hover:text-[#E6C700] flex items-center justify-between w-full"
          >
            <span>Worker Profile & Certifications</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
