import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  badge?: string;
  accentColor?: string;
  variant?: 'default' | 'primary';
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  badge,
  variant = 'default'
}) => {
  const isPrimary = variant === 'primary';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-150 ${
        isPrimary
          ? 'bg-gradient-to-br from-brand-50 to-white border-brand-200 hover:border-brand-400 hover:shadow-md'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isPrimary
                ? 'bg-brand-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 group-hover:bg-brand-50 group-hover:text-brand-600'
            }`}
          >
            <Icon className="w-5 h-5 stroke-[2]" />
          </div>
          {badge && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isPrimary
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-700'
              }`}
            >
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 group-hover:text-brand-600 transition-colors">
        <span>Proceed</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
};
