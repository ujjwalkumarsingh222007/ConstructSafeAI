import React from 'react';
import { Shield, Calendar, Clock } from 'lucide-react';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface DashboardBannerProps {
  userName?: string;
  roleName?: string;
  roleDisplay?: string;
  tip?: string;
  secondaryTip?: string;
}

export const DashboardBanner: React.FC<DashboardBannerProps> = ({
  userName = 'Safety Officer',
  roleName = 'admin',
  roleDisplay,
  tip,
  secondaryTip
}) => {
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getRoleLabel = () => {
    if (roleDisplay) return roleDisplay;
    switch (roleName) {
      case 'admin':
        return 'System Administrator';
      case 'project_manager':
        return 'Project Manager';
      case 'safety_inspector':
        return 'Safety Inspector';
      case 'worker':
        return 'Site Worker';
      case 'client':
        return 'Client Oversight';
      default:
        return roleName.replace(/_/g, ' ').toUpperCase();
    }
  };

  const getDefaultTip = () => {
    if (tip) return tip;
    switch (roleName) {
      case 'admin':
        return 'Review pending hazard submissions and ensure critical corrective actions have designated leads.';
      case 'project_manager':
        return 'Monitor assigned site compliance and verify all overdue corrective actions are resolved.';
      case 'safety_inspector':
        return 'Upload jobsite photographs for AI hazard detection and verify findings before submitting.';
      case 'worker':
        return 'Review your daily safety tasks, safety instructions, and keep training certifications up to date.';
      case 'client':
        return 'Review verified safety reports and track jobsite inspection pass rates across your projects.';
      default:
        return 'Welcome to ConstructSafe AI enterprise safety monitoring.';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-900 shadow-md border border-slate-800 mb-6">
      {/* Background Photography with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="/images/dashboard/construction_banner.jpg"
          fallbackSrc="/images/dashboard/fallback_banner.svg"
          alt="Construction Site Backdrop"
          className="w-full h-full object-cover object-center filter brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-950/80" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Shield className="w-3 h-3 text-brand-500" />
              {getRoleLabel()}
            </span>
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {todayFormatted}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Welcome back, <span className="text-brand-400">{userName}</span>
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            {getDefaultTip()}
          </p>

          {secondaryTip && (
            <p className="mt-1 text-xs text-brand-300/90 font-medium">
              💡 {secondaryTip}
            </p>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3 bg-slate-800/60 backdrop-blur-xs border border-slate-700/60 rounded-lg p-3 px-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-md bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Session</div>
            <div className="text-xs text-slate-200 font-medium">ConstructSafe AI Cloud</div>
          </div>
        </div>
      </div>
    </div>
  );
};
