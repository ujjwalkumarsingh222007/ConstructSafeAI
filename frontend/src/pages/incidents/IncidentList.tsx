import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listIncidents, Incident } from '../../api/incidents';
import { listProjects, Project } from '../../api/projects';
import {
  AlertOctagon,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export const IncidentList: React.FC = () => {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('');

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params: any = { size: 50 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (severityFilter) params.severity = severityFilter;
      if (projectFilter) params.project_id = projectFilter;

      const res = await listIncidents(params);
      setIncidents(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await listProjects({ size: 100 });
      setProjects(res.items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncidents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, categoryFilter, severityFilter, projectFilter]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'major_injury':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase">
            <AlertOctagon className="w-3 h-3 mr-1" /> {severity.replace('_', ' ')}
          </span>
        );
      case 'minor_injury':
      case 'property_damage':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 capitalize">
            <AlertTriangle className="w-3 h-3 mr-1" /> {severity.replace('_', ' ')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 capitalize">
            Near Miss
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {status.replace('_', ' ')}
          </span>
        );
      case 'under_investigation':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" /> Investigating
          </span>
        );
      case 'corrective_action_assigned':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Action Assigned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Reported
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-brand-600" />
            Safety Incidents & Hazard Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log worker injuries, equipment failures, near-misses, and on-site hazard observations.
          </p>
        </div>

        <button
          onClick={() => navigate('/incidents/report')}
          className="inline-flex items-center justify-center px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Report Incident / Hazard
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Recorded
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{incidents.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
            Under Investigation
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {incidents.filter((i) => i.status === 'under_investigation').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Near Miss Reports
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {incidents.filter((i) => i.incident_category === 'near_miss').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Resolved / Closed
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {incidents.filter((i) => ['resolved', 'closed'].includes(i.status)).length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incident #, title, description..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Categories</option>
              <option value="near_miss">Near Miss</option>
              <option value="worker_injury">Worker Injury</option>
              <option value="electrical_hazard">Electrical Hazard</option>
              <option value="falling_object">Falling Object</option>
              <option value="fire_hazard">Fire Hazard</option>
              <option value="equipment_accident">Equipment Accident</option>
              <option value="unsafe_working_condition">Unsafe Condition</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Severities</option>
              <option value="near_miss">Near Miss</option>
              <option value="minor_injury">Minor Injury</option>
              <option value="major_injury">Major Injury</option>
              <option value="critical">Critical</option>
              <option value="property_damage">Property Damage</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:border-brand-500"
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

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-md text-xs font-medium text-slate-600">
          {['all', 'reported', 'under_investigation', 'corrective_action_assigned', 'resolved', 'closed'].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading incident records...</div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No incident records found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No reported incidents or hazard logs match your current filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Incident #</th>
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Occurred</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {inc.incident_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{inc.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{inc.description}</div>
                    </td>
                    <td className="py-3.5 px-4 capitalize font-medium text-slate-700">
                      {inc.incident_category.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">{getSeverityBadge(inc.severity)}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">
                        {inc.project_code || 'PRJ'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(inc.occurred_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(inc.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="text-slate-400 hover:text-brand-600 p-1">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
