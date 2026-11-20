import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  Clock,
  ArrowRight,
  Inbox
} from 'lucide-react';
import {
  NotificationItem,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../api/notifications';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'critical' | 'hazards' | 'inspections' | 'actions'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchNotificationsData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await listNotifications(false);
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotificationsData();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setRefreshing(true);
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkSingleRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setActionLoadingId(id);
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNavigateLink = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        console.error(e);
      }
    }
    if (notif.link_url) {
      navigate(notif.link_url);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Tab filter
      if (activeTab === 'unread' && item.is_read) return false;
      if (activeTab === 'critical' && item.severity !== 'critical') return false;
      if (activeTab === 'hazards' && item.type !== 'hazard' && !item.title.toLowerCase().includes('hazard')) return false;
      if (activeTab === 'inspections' && item.type !== 'inspection' && !item.title.toLowerCase().includes('inspection')) return false;
      if (activeTab === 'actions' && item.type !== 'assignment' && !item.title.toLowerCase().includes('action') && !item.title.toLowerCase().includes('incident')) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesMsg = item.message.toLowerCase().includes(query);
        return matchesTitle || matchesMsg;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const getTypeIcon = (type: string, severity: string) => {
    if (severity === 'critical') {
      return <ShieldAlert className="w-5 h-5 text-red-600" />;
    }
    switch (type) {
      case 'hazard':
        return <AlertTriangle className="w-5 h-5 text-[#E6C700]" />;
      case 'inspection':
        return <ClipboardCheck className="w-5 h-5 text-blue-600" />;
      case 'assignment':
        return <CheckSquare className="w-5 h-5 text-emerald-600" />;
      case 'incident':
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-[#121926]" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-red-100 text-red-800 border border-red-200">
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-[#FFDD00]/30 text-[#121926] border border-[#FFDD00]/60">
            Warning
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#EAEAEA] text-[#666666]">
            Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Visionex Astro Architecture */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAEAEA] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAEAEA] text-[#121926] text-xs font-bold uppercase tracking-wider mb-2">
              <Bell className="w-3.5 h-3.5 text-[#E6C700]" />
              Notifications Center
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-[#121926] tracking-tight">
              Safety Alerts & Directives
            </h1>
            <p className="text-sm text-[#666666] mt-1">
              Centralized feed of real-time site hazards, inspection reports, AI reviews, and assigned corrective actions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchNotificationsData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#EAEAEA] bg-white text-xs font-bold text-[#121926] hover:bg-[#FBFBFB] transition-colors shadow-xs"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#121926]' : ''}`} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFDD00] hover:bg-[#E6C700] text-xs font-extrabold text-[#121926] transition-colors shadow-xs"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#EAEAEA]">
          <div className="bg-[#FBFBFB] rounded-xl p-3 border border-[#EAEAEA]">
            <span className="text-[11px] font-bold text-[#666666] uppercase block">Total Alerts</span>
            <span className="text-xl font-heading font-extrabold text-[#121926]">{notifications.length}</span>
          </div>
          <div className="bg-[#FBFBFB] rounded-xl p-3 border border-[#EAEAEA]">
            <span className="text-[11px] font-bold text-[#666666] uppercase block">Unread Items</span>
            <span className="text-xl font-heading font-extrabold text-[#121926]">{unreadCount}</span>
          </div>
          <div className="bg-[#FBFBFB] rounded-xl p-3 border border-[#EAEAEA]">
            <span className="text-[11px] font-bold text-[#666666] uppercase block">Critical Alerts</span>
            <span className="text-xl font-heading font-extrabold text-red-600">
              {notifications.filter((n) => n.severity === 'critical').length}
            </span>
          </div>
          <div className="bg-[#FBFBFB] rounded-xl p-3 border border-[#EAEAEA]">
            <span className="text-[11px] font-bold text-[#666666] uppercase block">AI Hazard Events</span>
            <span className="text-xl font-heading font-extrabold text-[#121926]">
              {notifications.filter((n) => n.type === 'hazard').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Alerts', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'critical', label: 'Critical', count: notifications.filter((n) => n.severity === 'critical').length },
            { id: 'hazards', label: 'Hazards', count: notifications.filter((n) => n.type === 'hazard').length },
            { id: 'inspections', label: 'Inspections', count: notifications.filter((n) => n.type === 'inspection').length },
            { id: 'actions', label: 'Actions & CAPA', count: notifications.filter((n) => n.type === 'assignment').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[#121926] text-white'
                  : 'bg-[#FBFBFB] text-[#666666] hover:text-[#121926] border border-[#EAEAEA]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id
                      ? 'bg-[#FFDD00] text-[#121926] font-extrabold'
                      : 'bg-[#EAEAEA] text-[#121926]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts by title, description..."
            className="w-full pl-9 pr-3 py-2 bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-xs text-[#121926] placeholder-[#666666] focus:outline-none focus:border-[#121926] transition-colors"
          />
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 border border-[#EAEAEA] text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#FFDD00] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#666666]">Retrieving security directives and notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-[#EAEAEA] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EAEAEA] text-[#121926] flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6 text-[#666666]" />
            </div>
            <h3 className="text-base font-heading font-extrabold text-[#121926]">No Notifications Found</h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto">
              {searchQuery || activeTab !== 'all'
                ? 'No alerts match the selected filter or search term. Try adjusting your filter.'
                : "You're completely up to date! There are no outstanding directives or unread safety alerts."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isUnread = !notif.is_read;
            return (
              <div
                key={notif.id}
                onClick={() => handleNavigateLink(notif)}
                className={`group bg-white rounded-2xl p-5 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col md:flex-row items-start justify-between gap-4 ${
                  isUnread
                    ? 'border-[#FFDD00] ring-1 ring-[#FFDD00]/40 bg-gradient-to-r from-amber-50/20 via-white to-white'
                    : 'border-[#EAEAEA] hover:border-[#121926]/40'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Category / Type Icon Surface */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                      isUnread ? 'bg-[#FFDD00]/25' : 'bg-[#EAEAEA]'
                    }`}
                  >
                    {getTypeIcon(notif.type, notif.severity)}
                  </div>

                  {/* Body Content */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading font-extrabold text-sm text-[#121926] leading-snug">
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#E6C700] ring-2 ring-[#FFDD00]/50" />
                      )}
                      {getSeverityBadge(notif.severity)}
                      <span className="text-[11px] font-medium text-[#666666] capitalize bg-[#FBFBFB] px-2 py-0.5 rounded border border-[#EAEAEA]">
                        {notif.type}
                      </span>
                    </div>

                    <p className="text-xs text-[#666666] leading-relaxed line-clamp-2 md:line-clamp-none">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-[#666666] pt-1">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#666666]" />
                        {new Date(notif.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {notif.link_url && (
                        <span className="text-[#121926] font-extrabold inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Open deep link <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  {isUnread && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkSingleRead(e, notif.id)}
                      disabled={actionLoadingId === notif.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EAEAEA] bg-[#FBFBFB] hover:bg-white text-xs font-bold text-[#121926] transition-colors"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-[#666666]" />
                      <span className="hidden sm:inline">Mark Read</span>
                    </button>
                  )}

                  {notif.link_url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateLink(notif);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121926] text-white hover:bg-black text-xs font-bold transition-colors"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
