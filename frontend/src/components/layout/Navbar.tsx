import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import { apiService, ApiStatusSummary } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem
} from '../../api/notifications';
import {
  Bell,
  Search,
  Database,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  LogOut,
  CheckCheck,
  ExternalLink,
  UserCheck,
  ArrowRight,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ApiStatusSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User Profile Menu State
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    setRefreshing(true);
    const result = await apiService.getFullStatus();
    setStatus(result);
    setLoading(false);
    setRefreshing(false);
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await listNotifications(false);
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      // Non-blocking notification polling failure
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchStatus();
      fetchNotifications();
    }, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setShowNotifications(false);
    if (notif.link_url) {
      navigate(notif.link_url);
    }
  };

  const getInitials = () => {
    if (!user) return 'CS';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'CS';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
      {/* Left: Breadcrumb Navigation */}
      <div className="flex items-center space-x-4">
        <Breadcrumbs />
      </div>

      {/* Right Controls & User Section */}
      <div className="flex items-center space-x-4">
        {/* Real-time Backend Connection Status Indicator */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs space-x-2">
          {loading ? (
            <span className="flex items-center text-slate-500 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin mr-1.5 text-slate-400" />
              Connecting...
            </span>
          ) : status?.apiConnected ? (
            <div className="flex items-center space-x-2">
              <span className="flex items-center text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
                FastAPI: Online
              </span>

              <span className="text-slate-300">|</span>

              <span className="text-slate-500 font-mono text-[11px]">
                {status.latencyMs}ms
              </span>

              <span className="text-slate-300">|</span>

              <span className={`flex items-center font-medium ${status.dbConnected ? 'text-emerald-700' : 'text-amber-700'}`}>
                <Database className="w-3 h-3 mr-1" />
                {status.dbConnected ? 'MongoDB: Active' : 'DB: Offline/Docker'}
              </span>
            </div>
          ) : (
            <span className="flex items-center text-red-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              Backend: Disconnected
            </span>
          )}

          <button
            onClick={fetchStatus}
            disabled={refreshing}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors focus:outline-none"
            title="Refresh connection status"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative hidden md:block w-48 lg:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, workers..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>

        {/* Link to Public Landing Page */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAEAEA] bg-white text-xs font-semibold text-[#121926] hover:bg-[#FBFBFB] transition-colors shadow-xs"
          title="Visit Public Landing Page"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#121926]" />
          <span className="hidden sm:inline">Landing Page</span>
        </button>

        {/* Notifications Icon with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none"
            title="Safety Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-brand-600 text-white font-bold text-[9px] ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-brand-500" />
                  <span className="font-semibold text-xs">Safety Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-brand-600 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No notifications at this time.
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                        !n.is_read ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            !n.is_read ? 'text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-brand-600 mt-1"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                        {n.link_url && (
                          <span className="flex items-center text-brand-600 font-medium">
                            View <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Notification Center Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/notifications');
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-[#121926] hover:bg-black text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Open Notifications Center</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FFDD00]" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200"></div>

        {/* Authenticated User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none border border-transparent hover:border-slate-200"
            title="User Profile Menu"
          >
            <div className="w-8 h-8 rounded-full bg-[#121926] text-[#FFDD00] flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
              {getInitials()}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#121926] leading-tight">
                {user ? `${user.first_name} ${user.last_name}` : 'Not Signed In'}
              </span>
              <span className="text-[10px] text-[#666666] flex items-center gap-1 font-semibold capitalize">
                <ShieldCheck className="w-3 h-3 text-[#E6C700]" />
                {user ? user.role_name.replace('_', ' ') : 'Guest'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#EAEAEA] rounded-2xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-4 py-3 bg-[#FBFBFB] border-b border-[#EAEAEA]">
                <span className="text-xs font-bold text-[#121926] block truncate">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-[11px] text-[#666666] block truncate">{user?.email}</span>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFDD00]/30 text-[#121926] border border-[#FFDD00]/50 capitalize">
                  {user?.role_name.replace('_', ' ')}
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-[#121926] hover:bg-[#FBFBFB] flex items-center gap-2.5 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-[#E6C700]" />
                  <span>My Profile & Security</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/notifications');
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-[#121926] hover:bg-[#FBFBFB] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-[#121926]" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#FFDD00] text-[#121926]">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-1 border-t border-[#EAEAEA]">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
