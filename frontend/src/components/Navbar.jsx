import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ApiClient from '../services/api.js';
import {
  LayoutDashboard,
  BookOpen,
  Network,
  FileCheck2,
  Compass,
  FolderGit2,
  Bot,
  Code2,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Sparkles,
  User,
  Menu,
  X,
  Bell,
  CheckCheck,
  Trash2,
  Check,
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef(null);

  const navigate = (tabId) => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
    setActiveTab(tabId);
  };

  const fetchNotifData = async () => {
    if (!isAuthenticated) return;
    try {
      const [listRes, countRes] = await Promise.all([
        ApiClient.getNotifications(0, 10),
        ApiClient.getUnreadNotificationCount(),
      ]);
      setNotifications(listRes.items || []);
      setUnreadCount(countRes.unread_count || 0);
    } catch (_) {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifData();
      const interval = setInterval(fetchNotifData, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await ApiClient.markNotificationRead(id);
      fetchNotifData();
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await ApiClient.markAllNotificationsRead();
      fetchNotifData();
    } catch (_) {}
  };

  const handleDeleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await ApiClient.deleteNotification(id);
      fetchNotifData();
    } catch (_) {}
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'taxonomy', label: 'Skills DAG', icon: Network },
    { id: 'assessments', label: 'Assessments', icon: FileCheck2 },
    { id: 'careers', label: 'Careers', icon: Compass },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'tutor', label: 'AI Tutor', icon: Bot },
    { id: 'coding', label: 'Coding', icon: Code2 },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Console', icon: ShieldAlert });
  }

  return (
    <header className="navbar">
      <div className="nav-container">
        <div
          className="nav-brand"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(isAuthenticated ? 'dashboard' : 'login')}
        >
          <Sparkles size={24} color="#6366F1" />
          <span>SkillBridge AI</span>
        </div>

        {isAuthenticated && (
          <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              id="nav-tab-profile-menu"
              className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => navigate('profile')}
            >
              <User size={16} />
              <span>Profile</span>
            </button>
          </nav>
        )}

        <div className="nav-user">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Notification Bell Dropdown */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  id="btn-notifications-bell"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  title="Notifications"
                  style={{
                    position: 'relative',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-color)',
                  }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#EF4444',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '10px',
                        padding: '1px 5px',
                        lineHeight: 1,
                      }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '42px',
                      width: '340px',
                      maxHeight: '420px',
                      background: 'var(--card-bg, #1E1B4B)',
                      border: '1px solid var(--border-color, rgba(99,102,241,0.3))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color, rgba(99,102,241,0.2))',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(99,102,241,0.1)',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>
                        Notifications ({unreadCount} unread)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          title="Mark all as read"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#818CF8',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCheck size={14} /> Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '340px' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              background: n.is_read ? 'transparent' : 'rgba(99,102,241,0.08)',
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: n.is_read ? '#D1D5DB' : '#FFFFFF' }}>
                                {n.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '2px', lineHeight: 1.3 }}>
                                {n.message}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: '4px' }}>
                                {new Date(n.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {!n.is_read && (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkRead(n.id, e)}
                                  title="Mark as read"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#10B981',
                                    cursor: 'pointer',
                                    padding: '2px',
                                  }}
                                >
                                  <Check size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteNotif(n.id, e)}
                                title="Delete notification"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: '2px',
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile button */}
              <button
                id="nav-tab-profile"
                type="button"
                onClick={() => navigate('profile')}
                title="View & Edit Student Profile"
                style={{
                  background: activeTab === 'profile' ? 'var(--primary-light)' : 'transparent',
                  border: activeTab === 'profile' ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 10px',
                  textAlign: 'right',
                  display: 'flex',
                  flexDirection: 'column',
                  color: 'inherit',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.full_name}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isAdmin ? '#F59E0B' : '#10B981',
                  }}
                >
                  {user.role}
                </span>
              </button>
              <button
                id="btn-logout"
                className="btn btn-secondary btn-sm"
                onClick={logout}
                title="Log Out"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <LogOut size={14} />
                <span>Exit</span>
              </button>
              <button
                type="button"
                className="nav-mobile-toggle"
                aria-label="Toggle Navigation"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                id="btn-nav-login"
                className={`btn btn-sm ${activeTab === 'login' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('login')}
              >
                Sign In
              </button>
              <button
                id="btn-nav-register"
                className={`btn btn-sm ${activeTab === 'register' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('register')}
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
