import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction, ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlaceholderProps {
  title?: string;
  phase?: string;
}

export const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, phase }) => {
  const location = useLocation();
  const pageTitle = title || location.pathname.replace('/', '').toUpperCase() || 'MODULE';

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
        <Construction className="w-8 h-8 text-brand-600" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
        {pageTitle} Module
      </h1>
      <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
        This feature module is scheduled for implementation in <strong>{phase || 'an upcoming phase'}</strong> according to the approved ConstructSafe AI Development Roadmap.
      </p>
      
      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-8">
        <Shield className="w-3.5 h-3.5 text-brand-600 mr-1.5" />
        Current Active Phase: Phase 1 (Foundation Stack)
      </div>

      <div>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Return to Safety Dashboard
        </Link>
      </div>
    </div>
  );
};
