import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  HardHat,
  Briefcase,
  Search,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Phone,
  Mail,
  Sparkles,
  Lock,
  RefreshCw,
  Power
} from 'lucide-react';
import { authApi, AdminUserDetail, AdminCreateUserPayload } from '../../api/auth';
import { projectsApi, Project } from '../../api/projects';
import { useAuth } from '../../context/AuthContext';

const TRADES = [
  'General Labor',
  'Ironworker',
  'Electrician',
  'Scaffolder',
  'Welder',
  'Crane Operator',
  'Heavy Equipment Operator',
  'Mason / Concrete Worker',
  'Carpenter',
  'HVAC Specialist',
  'Pipefitter',
  'Site Supervisor'
];

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<AdminUserDetail | null>(null);

  // Form state for Create User
  const [formData, setFormData] = useState<AdminCreateUserPayload>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role_name: 'worker',
    phone: '',
    assigned_project_ids: [],
    trade: 'General Labor',
    employee_id: ''
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Form state for Reset Password
  const [newPassword, setNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState<boolean>(false);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, projectsRes] = await Promise.all([
        authApi.getUsers(),
        projectsApi.listProjects({ size: 100 })
      ]);
      setUsers(usersRes.users || []);
      setProjects(projectsRes.items || []);
    } catch (err: any) {
      console.error('Failed to load user management data:', err);
      showToast('Failed to load users list. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to generate a random strong password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pwd = 'CS@';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'all' && u.role_name !== roleFilter) return false;
      // Status filter
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = `${u.first_name} ${u.last_name}`.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesBadge = u.employee_id?.toLowerCase().includes(q);
        const matchesTrade = u.trade?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesBadge && !matchesTrade) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  // Statistics counts
  const stats = useMemo(() => {
    return {
      total: users.length,
      workers: users.filter((u) => u.role_name === 'worker').length,
      inspectors: users.filter((u) => u.role_name === 'safety_inspector').length,
      managers: users.filter((u) => u.role_name === 'project_manager').length,
      clients: users.filter((u) => u.role_name === 'client').length,
      admins: users.filter((u) => u.role_name === 'admin' || u.role_name === 'super_admin').length
    };
  }, [users]);

  // Handle Create User Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setFormError('Please fill in all required fields (Name, Email, Password).');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setFormSubmitting(true);
      const created = await authApi.createUser(formData);
      showToast(`User account created successfully for ${created.email}`);
      setIsCreateModalOpen(false);
      // Reset form
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role_name: 'worker',
        phone: '',
        assigned_project_ids: [],
        trade: 'General Labor',
        employee_id: ''
      });
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error?.message || 'Failed to create user account.';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (user: AdminUserDetail) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot deactivate your own administrative account.', 'error');
      return;
    }

    const nextState = !user.is_active;
    const confirmText = nextState
      ? `Reactivate account for ${user.first_name} ${user.last_name} (${user.email})?`
      : `Deactivate account for ${user.first_name} ${user.last_name} (${user.email})? The user will be immediately logged out.`;

    if (!window.confirm(confirmText)) return;

    try {
      await authApi.toggleUserStatus(user.id, nextState);
      showToast(`Account ${nextState ? 'activated' : 'deactivated'} for ${user.email}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextState } : u))
      );
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update user status.';
      showToast(msg, 'error');
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    setResetError(null);

    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setResetSubmitting(true);
      await authApi.resetUserPassword(selectedUserForReset.id, newPassword);
      showToast(`Password successfully reset for ${selectedUserForReset.email}`);
      setIsResetModalOpen(false);
      setSelectedUserForReset(null);
      setNewPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to reset password.';
      setResetError(msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'bg-[#121926] text-[#FFDD00] border border-[#121926]';
      case 'safety_inspector':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'project_manager':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'worker':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'client':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'safety_inspector':
        return 'Safety Inspector';
      case 'project_manager':
        return 'Project Manager';
      case 'worker':
        return 'Site Worker';
      case 'client':
        return 'Client Representative';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EAEAEA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAEAEA] text-[#121926] mb-2 uppercase tracking-wide">
            <Shield className="w-3.5 h-3.5 text-[#121926]" /> Admin Security Console
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#121926] tracking-tight">
            User Account & Access Management
          </h1>
          <p className="mt-1 text-sm text-[#666666] max-w-2xl">
            Provision authentication credentials, manage roles, and link jobsites for site workers, safety inspectors, project managers, and client stakeholders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({
              email: '',
              password: generateRandomPassword(),
              first_name: '',
              last_name: '',
              role_name: 'worker',
              phone: '',
              assigned_project_ids: [],
              trade: 'General Labor',
              employee_id: ''
            });
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFDD00] text-[#121926] font-heading font-extrabold text-sm shadow-sm hover:bg-[#ffe633] transition-all flex-shrink-0 group cursor-pointer"
        >
          <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
          Add New User Account
        </button>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div
          onClick={() => setRoleFilter('all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'all'
              ? 'bg-[#121926] text-white border-[#121926] shadow-xs'
              : 'bg-white border-[#EAEAEA] hover:border-slate-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${roleFilter === 'all' ? 'text-slate-300' : 'text-[#666666]'}`}>
            Total Accounts
          </span>
          <span className="font-heading text-2xl font-extrabold mt-1 block">
            {stats.total}
          </span>
        </div>

        <div
          onClick={() => setRoleFilter('worker')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'worker'
              ? 'bg-[#121926] text-white border-[#121926] shadow-xs'
              : 'bg-white border-[#EAEAEA] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${roleFilter === 'worker' ? 'text-slate-300' : 'text-[#666666]'}`}>
              Site Workers
            </span>
            <HardHat className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="font-heading text-2xl font-extrabold mt-1 block">
            {stats.workers}
          </span>
        </div>

        <div
          onClick={() => setRoleFilter('safety_inspector')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'safety_inspector'
              ? 'bg-[#121926] text-white border-[#121926] shadow-xs'
              : 'bg-white border-[#EAEAEA] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${roleFilter === 'safety_inspector' ? 'text-slate-300' : 'text-[#666666]'}`}>
              Inspectors
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="font-heading text-2xl font-extrabold mt-1 block">
            {stats.inspectors}
          </span>
        </div>

        <div
          onClick={() => setRoleFilter('project_manager')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'project_manager'
              ? 'bg-[#121926] text-white border-[#121926] shadow-xs'
              : 'bg-white border-[#EAEAEA] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${roleFilter === 'project_manager' ? 'text-slate-300' : 'text-[#666666]'}`}>
              Project Managers
            </span>
            <Briefcase className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="font-heading text-2xl font-extrabold mt-1 block">
            {stats.managers}
          </span>
        </div>

        <div
          onClick={() => setRoleFilter('client')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'client'
              ? 'bg-[#121926] text-white border-[#121926] shadow-xs'
              : 'bg-white border-[#EAEAEA] hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${roleFilter === 'client' ? 'text-slate-300' : 'text-[#666666]'}`}>
              Clients
            </span>
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="font-heading text-2xl font-extrabold mt-1 block">
            {stats.clients}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, badge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] text-[#121926] placeholder-slate-400 focus:outline-none focus:border-[#121926]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role and Status Dropdown Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] font-semibold text-[#121926] focus:outline-none focus:border-[#121926]"
          >
            <option value="all">All Roles</option>
            <option value="worker">Site Worker</option>
            <option value="safety_inspector">Safety Inspector</option>
            <option value="project_manager">Project Manager</option>
            <option value="client">Client Representative</option>
            <option value="admin">Administrator</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] font-semibold text-[#121926] focus:outline-none focus:border-[#121926]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>

          <button
            onClick={loadData}
            title="Refresh Users"
            className="p-2 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#121926]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#121926] animate-spin" />
            <span className="text-xs font-semibold">Loading user accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <h3 className="font-heading text-sm font-bold text-[#121926]">No user accounts found</h3>
            <p className="text-xs text-[#666666] mt-1">
              Try adjusting your search query or role filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAEAEA] bg-[#FBFBFB] text-[#666666] font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Worker Info</th>
                  <th className="py-3.5 px-4">Assigned Projects</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {filteredUsers.map((u) => {
                  const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || 'U';
                  const isCurrentAdmin = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-[#FBFBFB] transition-colors">
                      {/* Name and Email */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#121926] text-[#FFDD00] font-heading font-extrabold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-heading font-bold text-sm text-[#121926] flex items-center gap-1.5">
                              {u.first_name} {u.last_name}
                              {isCurrentAdmin && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-[#666666] font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {u.email}
                            </span>
                            {u.phone && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                {u.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${getRoleBadgeStyle(
                            u.role_name
                          )}`}
                        >
                          {formatRoleLabel(u.role_name)}
                        </span>
                      </td>

                      {/* Worker Info if Worker */}
                      <td className="py-4 px-4 text-[#666666]">
                        {u.role_name === 'worker' ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-[#121926] text-xs">
                              {u.employee_id || 'Auto-Assigned'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {u.trade || 'General Labor'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">N/A (Staff/Client)</span>
                        )}
                      </td>

                      {/* Assigned Projects */}
                      <td className="py-4 px-4">
                        {u.assigned_project_names && u.assigned_project_names.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.assigned_project_names.map((pName, pIdx) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[#121926] text-[11px] font-semibold border border-slate-200"
                              >
                                <Building2 className="w-2.5 h-2.5 text-slate-500" />
                                {pName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Enterprise Global / Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Deactivated
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForReset(u);
                              setNewPassword(generateRandomPassword());
                              setResetError(null);
                              setIsResetModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-[#EAEAEA] bg-white hover:bg-[#FBFBFB] text-slate-600 hover:text-[#121926] transition-colors"
                            title="Reset User Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            type="button"
                            disabled={isCurrentAdmin}
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrentAdmin
                                ? 'opacity-30 cursor-not-allowed border-slate-200 bg-slate-100'
                                : u.is_active
                                ? 'border-[#EAEAEA] bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 hover:border-rose-200'
                                : 'border-[#EAEAEA] bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 hover:border-emerald-200'
                            }`}
                            title={
                              isCurrentAdmin
                                ? 'Cannot deactivate self'
                                : u.is_active
                                ? 'Deactivate account'
                                : 'Reactivate account'
                            }
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE NEW USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121926]/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-[#EAEAEA] shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FBFBFB]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFDD00] text-[#121926] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#121926]">
                    Provision New User Account
                  </h3>
                  <p className="text-xs text-[#666666]">
                    Add account credentials and permissions for workers, staff, or clients
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#121926] hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                  Account Role *
                </label>
                <select
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  className="w-full text-xs py-2.5 px-3 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] font-semibold text-[#121926] focus:outline-none focus:border-[#121926]"
                >
                  <option value="worker">Site Worker (Field PPE Compliance & Safety)</option>
                  <option value="safety_inspector">Safety Inspector (Field Audits & Alert Verification)</option>
                  <option value="project_manager">Project Manager (Site Oversight & Corrective Actions)</option>
                  <option value="client">Client Representative (Read-Only Safety Overview)</option>
                  <option value="admin">System Administrator (Full Enterprise Control)</option>
                </select>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121926] mb-1 uppercase tracking-wide">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marcus"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] text-[#121926] focus:outline-none focus:border-[#121926]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121926] mb-1 uppercase tracking-wide">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vance"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] text-[#121926] focus:outline-none focus:border-[#121926]"
                  />
                </div>
              </div>

              {/* Email / Account ID */}
              <div>
                <label className="block text-xs font-bold text-[#121926] mb-1 uppercase tracking-wide">
                  Account Email / ID *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="user@constructsafe.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] text-[#121926] focus:outline-none focus:border-[#121926]"
                  />
                </div>
              </div>

              {/* Password with generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#121926] uppercase tracking-wide">
                    Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                    className="text-[11px] font-bold text-[#121926] hover:text-amber-600 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" /> Generate Secure
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Initial password (min 6 chars)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs pl-9 pr-10 py-2 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] text-[#121926] font-mono focus:outline-none focus:border-[#121926]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone (Optional) */}
              <div>
                <label className="block text-xs font-bold text-[#121926] mb-1 uppercase tracking-wide">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="+1-555-0199"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] text-[#121926] focus:outline-none focus:border-[#121926]"
                  />
                </div>
              </div>

              {/* Extra Worker Fields */}
              {formData.role_name === 'worker' && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                  <span className="text-xs font-bold text-[#121926] flex items-center gap-1.5">
                    <HardHat className="w-4 h-4 text-amber-700" /> Worker Directory Parameters
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#121926] mb-1 uppercase tracking-wide">
                        Trade / Craft
                      </label>
                      <select
                        value={formData.trade || 'General Labor'}
                        onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-amber-200 bg-white font-medium text-[#121926] focus:outline-none"
                      >
                        {TRADES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#121926] mb-1 uppercase tracking-wide">
                        Badge ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. W-4821"
                        value={formData.employee_id || ''}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-amber-200 bg-white text-[#121926] font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Project Assignment */}
              {projects.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                    Assign Construction Project(s)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-[#EAEAEA] rounded-xl bg-[#FBFBFB]">
                    {projects.map((proj) => {
                      const isChecked = formData.assigned_project_ids?.includes(proj.id);
                      return (
                        <label
                          key={proj.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-amber-50/70 border-amber-300 font-bold text-[#121926]'
                              : 'bg-white border-[#EAEAEA] text-[#666666] hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const cur = formData.assigned_project_ids || [];
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  assigned_project_ids: [...cur, proj.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  assigned_project_ids: cur.filter((id) => id !== proj.id)
                                });
                              }
                            }}
                            className="rounded text-amber-500 focus:ring-0"
                          />
                          <span className="truncate">{proj.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-[#EAEAEA] text-[#666666] hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-heading font-extrabold rounded-xl bg-[#FFDD00] text-[#121926] hover:bg-[#ffe633] transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Create User Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121926]/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#EAEAEA] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FBFBFB]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#121926] text-[#FFDD00] flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#121926]">
                    Reset Account Password
                  </h3>
                  <p className="text-xs text-[#666666]">
                    Set a new credential for this user account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#121926] hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Target Account
                </span>
                <span className="font-heading font-bold text-sm text-[#121926] block">
                  {selectedUserForReset.first_name} {selectedUserForReset.last_name}
                </span>
                <span className="font-mono text-xs text-slate-600 block">
                  {selectedUserForReset.email}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#121926] uppercase tracking-wide">
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] font-bold text-[#121926] hover:text-amber-600 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" /> Generate Secure
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="New password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] text-[#121926] font-mono focus:outline-none focus:border-[#121926]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-[#EAEAEA] text-[#666666] hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-5 py-2 text-xs font-heading font-extrabold rounded-xl bg-[#121926] text-[#FFDD00] hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {resetSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Save Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
