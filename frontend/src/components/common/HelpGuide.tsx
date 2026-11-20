import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface HelpGuideProps {
  role?: string;
  defaultExpanded?: boolean;
}

const ROLE_STEPS: Record<string, { title: string; steps: string[] }> = {
  admin: {
    title: 'Administrator Getting Started Guide',
    steps: [
      'Create and configure construction projects with site codes and timelines.',
      'Add system users and assign personnel to active jobsites.',
      'Form project teams by assigning project managers and safety inspectors.',
      'Review pending hazard submissions and escalate critical findings into CAPAs.',
      'Monitor safety KPIs, inspection pass rates, and export executive reports.'
    ]
  },
  project_manager: {
    title: 'Project Manager Safety Workflow',
    steps: [
      'Access your assigned construction projects and monitor active jobsite statuses.',
      'Review workforce rosters and verify worker assignment status.',
      'Track open and overdue corrective actions (CAPAs) to ensure timely resolution.',
      'Monitor project safety trends, incident logs, and download compliance reports.'
    ]
  },
  safety_inspector: {
    title: 'Safety Inspector Protocol & AI Workflow',
    steps: [
      'Select your active project location for safety monitoring.',
      'Capture and upload clear hazard photographs from the jobsite.',
      'Run AI image analysis to detect potential safety violations and confidence scores.',
      'Verify or adjust AI findings with your human expert assessment.',
      'Submit the finalized report to Admin and track review approvals in real time.'
    ]
  },
  worker: {
    title: 'Site Worker Safety Guide',
    steps: [
      'Check your assigned jobsite and personal safety profile.',
      'Review your pending safety tasks and corrective actions.',
      'Complete safety training and maintain valid induction credentials.',
      'Promptly report any hazards or unsafe working conditions you observe.'
    ]
  },
  client: {
    title: 'Client Safety Oversight Portal',
    steps: [
      'View your authorized projects and high-level safety scorecards.',
      'Review overall project safety compliance and inspection pass rates.',
      'Inspect verified hazard resolutions and corrective action progress.',
      'Download audit-ready PDF and Excel safety reports on demand.'
    ]
  }
};

export const HelpGuide: React.FC<HelpGuideProps> = ({ role = 'admin', defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const guide = ROLE_STEPS[role] || ROLE_STEPS.admin;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-100 text-left transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-brand-500/10 text-brand-600 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 tracking-wide flex items-center gap-2">
              {guide.title}
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                Help & Instructions
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">Quick 4-step workflow guidance for your role</p>
          </div>
        </div>
        <div className="text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-3 border-t border-slate-100 bg-white">
          <ol className="space-y-2.5">
            {guide.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center font-bold text-[10px] mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
