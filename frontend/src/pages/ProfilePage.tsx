import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { projectsApi, Project } from '../api/projects';
import { workersApi, Worker } from '../api/workers';
import {
  UserCheck,
  KeyRound,
  Building2,
  Phone,
  Mail,
  HardHat,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'details' | 'security' | 'permissions' | 'projects' | 'worker'>('details');

  // Edit Profile Form State
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPw, setShowCurrentPw] = useState<boolean>(false);
  const [showNewPw, setShowNewPw] = useState<boolean>(false);
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Assigned Projects & Worker Record State
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [workerRecord, setWorkerRecord] = useState<Worker | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Load Projects and optional Worker details
  useEffect(() => {
    const loadContextData = async () => {
      if (!user) return;

      // 1. Load Projects if user has assigned projects
      if (user.assigned_project_ids && user.assigned_project_ids.length > 0) {
        setLoadingProjects(true);
        try {
          const res = await projectsApi.listProjects({ size: 50 });
          const filtered = (res.items || []).filter((p: Project) =>
            user.assigned_project_ids.includes(p.id)
          );
          setAssignedProjects(filtered);
        } catch (e) {
          console.warn('Could not load assigned projects', e);
        } finally {
          setLoadingProjects(false);
        }
      }

      // 2. If user is a worker or might have a worker profile, attempt to fetch
      if (user.role_name === 'worker' || user.role_name === 'safety_inspector') {
        try {
          const w = await workersApi.getMyWorkerProfile();
          setWorkerRecord(w);
        } catch {
          // Normal if not linked to a worker record
        }
      }
    };

    loadContextData();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setSavingProfile(true);

    try {
      await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim()
      });
      setProfileSuccess('Profile details saved successfully.');
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update profile';
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setSavingPassword(true);

    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordSuccess('Password changed successfully. Your account is secured.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to change password.';
      setPasswordError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const getRoleDisplayName = (r?: string) => {
    switch (r) {
      case 'admin':
        return 'System Administrator';
      case 'project_manager':
        return 'Project Manager';
      case 'safety_inspector':
        return 'Safety Inspector';
      case 'worker':
        return 'Site Construction Worker';
      case 'client':
        return 'Client Oversight Representative';
      default:
        return r || 'User';
    }
  };

  const getRoleBadgeStyle = (r?: string) => {
    switch (r) {
      case 'admin':
        return 'bg-[#FFDD00] text-[#121926] border-[#E6C700]';
      case 'project_manager':
        return 'bg-[#121926] text-white border-black';
      case 'safety_inspector':
        return 'bg-blue-600 text-white border-blue-700';
      case 'worker':
        return 'bg-amber-600 text-white border-amber-700';
      case 'client':
        return 'bg-emerald-700 text-white border-emerald-800';
      default:
        return 'bg-slate-800 text-white border-slate-900';
    }
  };

  const getInitials = () => {
    if (!user) return 'CS';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'CS';
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAEAEA] shadow-xs relative overflow-hidden">
        {/* Subtle decorative yellow accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFDD00] via-[#FFDD00] to-[#121926]" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-2">
          <div className="flex items-center gap-5">
            {/* Big Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-[#121926] text-[#FFDD00] flex items-center justify-center font-heading font-extrabold text-2xl shadow-md ring-4 ring-[#FBFBFB] flex-shrink-0">
              {getInitials()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-[#121926]">
                  {user?.first_name} {user?.last_name}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${getRoleBadgeStyle(user?.role_name)}`}>
                  {getRoleDisplayName(user?.role_name)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Account
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#666666] pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#121926]" />
                  {user?.email}
                </span>
                {user?.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#121926]" />
                    {user.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#666666]">
                  UID: {user?.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation Strip */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-[#EAEAEA] overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'details'
                ? 'bg-[#121926] text-white shadow-xs'
                : 'bg-[#FBFBFB] text-[#666666] hover:text-[#121926] border border-[#EAEAEA]'
            }`}
          >
            <UserCheck className="w-4 h-4 text-[#FFDD00]" />
            <span>Personal Details</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-[#121926] text-white shadow-xs'
                : 'bg-[#FBFBFB] text-[#666666] hover:text-[#121926] border border-[#EAEAEA]'
            }`}
          >
            <KeyRound className="w-4 h-4 text-[#FFDD00]" />
            <span>Password & Security</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'bg-[#121926] text-white shadow-xs'
                : 'bg-[#FBFBFB] text-[#666666] hover:text-[#121926] border border-[#EAEAEA]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#FFDD00]" />
            <span>Role Permissions ({user?.permissions?.length || 0})</span>
          </button>

          {(user?.role_name !== 'admin' || assignedProjects.length > 0) && (
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'projects'
                  ? 'bg-[#121926] text-white shadow-xs'
                  : 'bg-[#FBFBFB] text-[#666666] hover:text-[#121926] border border-[#EAEAEA]'
              }`}
            >
              <Building2 className="w-4 h-4 text-[#FFDD00]" />
              <span>Assigned Projects ({user?.assigned_project_ids?.length || 0})</span>
            </button>
          )}

          {workerRecord && (
            <button
              onClick={() => setActiveTab('worker')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'worker'
                  ? 'bg-[#121926] text-white shadow-xs'
                  : 'bg-[#FBFBFB] text-[#666666] hover:text-[#121926] border border-[#EAEAEA]'
              }`}
            >
              <HardHat className="w-4 h-4 text-[#FFDD00]" />
              <span>Safety Certifications & Trade</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT 1: PERSONAL DETAILS */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAEAEA] shadow-xs max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-heading font-extrabold text-[#121926]">
              Edit Profile Information
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Update your contact details and jobsite name display.
            </p>
          </div>

          {profileSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-xs font-semibold text-[#121926] focus:outline-none focus:border-[#121926] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-xs font-semibold text-[#121926] focus:outline-none focus:border-[#121926] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                Email Address (Corporate Login)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-4 py-2.5 bg-[#EAEAEA] border border-[#EAEAEA] rounded-xl text-xs font-medium text-[#666666] cursor-not-allowed"
              />
              <span className="text-[11px] text-[#666666] mt-1 block">
                Email changes require administrator authorization.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                Phone Number (Jobsite Emergency Contact)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 012-3456"
                className="w-full px-4 py-2.5 bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-xs font-semibold text-[#121926] focus:outline-none focus:border-[#121926] transition-colors"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFDD00] hover:bg-[#E6C700] text-[#121926] text-xs font-extrabold shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAEAEA] shadow-xs max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-heading font-extrabold text-[#121926]">
              Change Password & Account Security
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Secure your account using Argon2id password encryption. All active sessions will be safely refreshed.
            </p>
          </div>

          {passwordSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-4 py-2.5 pr-10 bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-xs font-semibold text-[#121926] focus:outline-none focus:border-[#121926] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#121926]"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters with upper, lower, digit & special"
                  className="w-full px-4 py-2.5 pr-10 bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-xs font-semibold text-[#121926] focus:outline-none focus:border-[#121926] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#121926]"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121926] mb-1.5 uppercase tracking-wide">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-2.5 bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-xs font-semibold text-[#121926] focus:outline-none focus:border-[#121926] transition-colors"
              />
            </div>

            <div className="p-3.5 bg-[#FBFBFB] rounded-xl border border-[#EAEAEA] text-xs space-y-1 text-[#666666]">
              <span className="font-bold text-[#121926] block">Password Security Standards:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>At least 8 characters in length</li>
                <li>At least one uppercase letter (A-Z) and one lowercase (a-z)</li>
                <li>At least one number (0-9) and one special character (!@#$%^&*)</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#121926] hover:bg-black text-white text-xs font-extrabold shadow-xs transition-colors"
              >
                <Lock className="w-4 h-4 text-[#FFDD00]" />
                <span>{savingPassword ? 'Securing Account...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT 3: ROLE PERMISSIONS */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAEAEA] shadow-xs">
          <div className="mb-6">
            <h2 className="text-lg font-heading font-extrabold text-[#121926]">
              Role-Based Access Control (RBAC) Entitlements
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Permissions explicitly granted to role <span className="font-bold text-[#121926]">{getRoleDisplayName(user?.role_name)}</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {user?.permissions && user.permissions.length > 0 ? (
              user.permissions.map((perm, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA]"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#FFDD00]/25 text-[#121926] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[#E6C700]" />
                  </div>
                  <div>
                    <span className="font-heading font-extrabold text-xs text-[#121926] block">
                      {perm.replace(/:/g, ' → ').replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-[#666666] font-mono">{perm}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-6 text-center text-xs text-[#666666] bg-[#FBFBFB] rounded-xl border border-[#EAEAEA]">
                No explicit granular permissions assigned. Role defaults apply.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ASSIGNED PROJECTS */}
      {activeTab === 'projects' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAEAEA] shadow-xs">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-heading font-extrabold text-[#121926]">
                Assigned Construction Projects
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Jobsites and work packages you are designated to oversee or work on.
              </p>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-bold text-[#121926] hover:text-[#E6C700] flex items-center gap-1"
            >
              <span>All Projects</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingProjects ? (
            <div className="p-8 text-center text-xs text-[#666666]">
              <div className="w-6 h-6 border-2 border-[#FFDD00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading assigned jobsites...
            </div>
          ) : assignedProjects.length === 0 ? (
            <div className="p-8 text-center bg-[#FBFBFB] rounded-xl border border-[#EAEAEA] space-y-2">
              <Building2 className="w-8 h-8 text-[#666666] mx-auto" />
              <h3 className="text-sm font-bold text-[#121926]">No Specific Projects Assigned</h3>
              <p className="text-xs text-[#666666]">
                {user?.role_name === 'admin'
                  ? 'As an Administrator, you have global clearance across all projects in the system.'
                  : 'You have not been assigned to a specific project yet. Please contact your supervisor.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="p-5 rounded-xl bg-[#FBFBFB] hover:bg-white border border-[#EAEAEA] hover:border-[#121926] transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-[#666666] uppercase bg-white px-2 py-0.5 rounded border border-[#EAEAEA]">
                      {p.code}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800">
                      {p.status}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-sm text-[#121926] group-hover:text-[#E6C700] transition-colors truncate">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#666666] line-clamp-2 mt-1">
                    {p.description || 'Active construction site.'}
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#EAEAEA] flex items-center justify-between text-xs text-[#121926] font-bold">
                    <span>Open Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 5: WORKER DETAILS (IF LINKED) */}
      {activeTab === 'worker' && workerRecord && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAEAEA] shadow-xs max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-heading font-extrabold text-[#121926]">
                Site Worker Certifications & Induction
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                Designated trade, safety induction verification, and jobsite emergency contacts.
              </p>
            </div>
            <button
              onClick={() => navigate('/workers/me')}
              className="text-xs font-bold text-[#121926] hover:text-[#E6C700] flex items-center gap-1"
            >
              <span>Full Worker Card</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA]">
              <span className="text-[11px] font-bold text-[#666666] uppercase block">Trade / Craft</span>
              <span className="text-sm font-heading font-extrabold text-[#121926]">{workerRecord.trade}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA]">
              <span className="text-[11px] font-bold text-[#666666] uppercase block">Designation</span>
              <span className="text-sm font-heading font-extrabold text-[#121926]">{workerRecord.designation}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA]">
              <span className="text-[11px] font-bold text-[#666666] uppercase block">Induction Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {workerRecord.training_status || 'Verified Induction Complete'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA]">
              <span className="text-[11px] font-bold text-[#666666] uppercase block">Worker ID</span>
              <span className="text-sm font-mono font-bold text-[#121926]">{workerRecord.employee_id}</span>
            </div>
          </div>

          {workerRecord.emergency_contact && (
            <div className="mt-5 p-4 rounded-xl bg-[#FBFBFB] border border-[#EAEAEA]">
              <span className="text-[11px] font-bold text-[#666666] uppercase block mb-1">Emergency Contact</span>
              <div className="flex items-center justify-between text-xs font-semibold text-[#121926]">
                <span>{workerRecord.emergency_contact.name} ({workerRecord.emergency_contact.relation || 'Contact'})</span>
                <span className="font-mono">{workerRecord.emergency_contact.phone}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
