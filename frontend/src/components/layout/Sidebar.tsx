import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  ShieldAlert,
  ClipboardCheck,
  CheckSquare,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Camera,
  GraduationCap,
  Bell,
  UserCheck,
  FileDown,
  LogOut,
  Globe
} from 'lucide-react';

interface SubNavItem {
  name: string;
  to: string;
  badge?: string;
}

interface NavGroup {
  name: string;
  icon: React.ElementType;
  items: SubNavItem[];
}

interface DirectNavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
}

type SidebarItem =
  | { type: 'link'; item: DirectNavItem }
  | { type: 'group'; group: NavGroup };

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Safety: true,
    Administration: true,
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const role = user?.role_name || 'admin';

  // Part 4: Maximum top-level navigation structure per role
  const getNavItems = (): SidebarItem[] => {
    switch (role) {
      case 'admin':
        return [
          { type: 'link', item: { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard } },
          { type: 'link', item: { name: 'Projects', to: '/projects', icon: Building2 } },
          {
            type: 'group',
            group: {
              name: 'Safety',
              icon: ShieldAlert,
              items: [
                { name: 'Hazard Approvals', to: '/hazards/review-queue', badge: 'Queue' },
                { name: 'Hazard Reports', to: '/hazards' },
                { name: 'Inspections', to: '/inspections' },
                { name: 'Incidents', to: '/incidents' },
                { name: 'Corrective Actions', to: '/corrective-actions' }
              ]
            }
          },
          { type: 'link', item: { name: 'Reports', to: '/reports', icon: BarChart3 } },
          {
            type: 'group',
            group: {
              name: 'Administration',
              icon: Users,
              items: [
                { name: 'User Accounts', to: '/admin/users', badge: 'Admin' },
                { name: 'Worker Directory', to: '/workers' }
              ]
            }
          },
          { type: 'link', item: { name: 'Notifications', to: '/notifications', icon: Bell } },
          { type: 'link', item: { name: 'Profile', to: '/profile', icon: UserCheck } }
        ];

      case 'project_manager':
        return [
          { type: 'link', item: { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard } },
          { type: 'link', item: { name: 'My Projects', to: '/projects', icon: Building2 } },
          {
            type: 'group',
            group: {
              name: 'Safety',
              icon: ShieldAlert,
              items: [
                { name: 'Hazards', to: '/hazards' },
                { name: 'Inspections', to: '/inspections' },
                { name: 'Incidents', to: '/incidents' },
                { name: 'Corrective Actions', to: '/corrective-actions' }
              ]
            }
          },
          { type: 'link', item: { name: 'Reports', to: '/reports', icon: BarChart3 } },
          { type: 'link', item: { name: 'Notifications', to: '/notifications', icon: Bell } },
          { type: 'link', item: { name: 'Profile', to: '/profile', icon: UserCheck } }
        ];

      case 'safety_inspector':
        return [
          { type: 'link', item: { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard } },
          { type: 'link', item: { name: 'My Projects', to: '/projects', icon: Building2 } },
          { type: 'link', item: { name: 'Inspections', to: '/inspections', icon: ClipboardCheck } },
          { type: 'link', item: { name: 'Hazard Reports', to: '/hazards', icon: Camera, badge: 'AI' } },
          { type: 'link', item: { name: 'Notifications', to: '/notifications', icon: Bell } },
          { type: 'link', item: { name: 'Profile', to: '/profile', icon: UserCheck } }
        ];

      case 'worker':
        return [
          { type: 'link', item: { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard } },
          { type: 'link', item: { name: 'My Tasks', to: '/corrective-actions', icon: CheckSquare } },
          { type: 'link', item: { name: 'My Project', to: '/projects', icon: Building2 } },
          { type: 'link', item: { name: 'Training', to: '/workers/me', icon: GraduationCap } },
          { type: 'link', item: { name: 'Notifications', to: '/notifications', icon: Bell } },
          { type: 'link', item: { name: 'Profile', to: '/profile', icon: UserCheck } }
        ];

      case 'client':
        return [
          { type: 'link', item: { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard } },
          { type: 'link', item: { name: 'My Projects', to: '/projects', icon: Building2 } },
          { type: 'link', item: { name: 'Reports', to: '/reports', icon: FileDown } },
          { type: 'link', item: { name: 'Notifications', to: '/notifications', icon: Bell } },
          { type: 'link', item: { name: 'Profile', to: '/profile', icon: UserCheck } }
        ];

      default:
        return [
          { type: 'link', item: { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard } },
          { type: 'link', item: { name: 'Projects', to: '/projects', icon: Building2 } }
        ];
    }
  };

  const navElements = getNavItems();

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'project_manager':
        return 'Project Manager';
      case 'safety_inspector':
        return 'Safety Inspector';
      case 'worker':
        return 'Site Worker';
      case 'client':
        return 'Client Oversight';
      default:
        return role;
    }
  };

  return (
    <aside
      className={`bg-[#121926] text-white flex flex-col transition-all duration-200 ease-in-out border-r border-[#1E293B] select-none z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-[#1E293B]">
        <Link
          to="/"
          className="flex items-center space-x-3 overflow-hidden group hover:opacity-95 transition-opacity"
          title="Visit Public Landing Page"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFDD00] flex items-center justify-center text-[#121926] shadow-sm flex-shrink-0 font-bold group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-heading text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                ConstructSafe <span className="text-[#FFDD00]">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                {getRoleBadge()}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
        {navElements.map((entry, idx) => {
          if (entry.type === 'link') {
            const item = entry.item;
            const Icon = item.icon;
            return (
              <NavLink
                key={idx}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all group ${
                    isActive
                      ? 'bg-[#FFDD00] text-[#121926] shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
                {!collapsed && <span className="truncate flex-1 font-heading">{item.name}</span>}
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#121926] text-[#FFDD00] border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          }

          // Safety Group (Expandable)
          const group = entry.group;
          const GroupIcon = group.icon;

          if (collapsed) {
            return (
              <div key={idx} className="pt-2 border-t border-slate-800 mt-2">
                {group.items.map((sub, sIdx) => (
                  <NavLink
                    key={sIdx}
                    to={sub.to}
                    className={({ isActive }) =>
                      `flex items-center justify-center p-2.5 rounded-xl transition-colors mb-1 ${
                        isActive
                          ? 'bg-[#FFDD00] text-[#121926]'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                    title={sub.name}
                  >
                    <GroupIcon className="w-4 h-4" />
                  </NavLink>
                ))}
              </div>
            );
          }

          const isOpen = openGroups[group.name] ?? true;

          return (
            <div key={idx} className="pt-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider text-[11px]"
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon className="w-4 h-4 text-slate-400" />
                  <span className="font-heading">{group.name}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#FFDD00]' : 'text-slate-500'
                  }`}
                />
              </button>

              {isOpen && (
                <div className="mt-1 space-y-1 pl-3 border-l-2 border-slate-800 ml-4">
                  {group.items.map((sub, sIdx) => (
                    <NavLink
                      key={sIdx}
                      to={sub.to}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-[#FFDD00] text-[#121926] font-bold shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`
                      }
                    >
                      <span className="truncate flex-1">{sub.name}</span>
                      {sub.badge && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-[#FFDD00] border border-amber-500/30">
                          {sub.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Session Footer & Sign Out */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0E131F]">
        <Link
          to="/"
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors mb-2.5 ${
            collapsed ? 'justify-center px-1' : ''
          }`}
          title="Visit Public Landing Page"
        >
          <Globe className="w-4 h-4 text-[#FFDD00] flex-shrink-0" />
          {!collapsed && <span>Public Landing Page</span>}
        </Link>

        {!collapsed && (
          <div className="flex items-center justify-between mb-2 px-1">
            <Link to="/profile" className="truncate group flex-1 mr-2" title="View & Edit Profile">
              <span className="text-xs font-bold text-white block truncate group-hover:text-[#FFDD00] transition-colors">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="text-[10px] text-slate-400 block truncate group-hover:text-slate-300">{user?.email}</span>
            </Link>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        {collapsed && (
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
