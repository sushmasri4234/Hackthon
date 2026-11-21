import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Bell, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  batches: 'Batches',
  new: 'New Batch',
  approvals: 'Approvals',
  certificates: 'Certificates',
  audit: 'Audit Log',
  verify: 'Verify Certificate',
  login: 'Login',
};

function buildBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: 'Home', path: '/' }];
  let acc = '';
  for (const part of parts) {
    acc += '/' + part;
    crumbs.push({
      label: BREADCRUMB_MAP[part] || (part.length > 24 ? part.slice(0, 8) + '…' : part),
      path: acc,
    });
  }
  return crumbs;
}

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname);
  const unread = notifications.filter((n) => !n.read).length;

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await API.get('/dashboard/notifications');
      setNotifications(Array.isArray(data) ? data : data.notifications ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Socket.IO for live badge update
  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:3001', {
      auth: { token: localStorage.getItem('accessToken') },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('notification', (data: Notification) => {
      setNotifications((prev) => [data, ...prev]);
    });

    return () => { socket.disconnect(); };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifIconColor: Record<string, string> = {
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#38bdf8',
  };

  const NotifIcon = ({ type }: { type: string }) => {
    if (type === 'success') return <CheckCircle size={14} color={notifIconColor.success} />;
    if (type === 'warning') return <AlertTriangle size={14} color={notifIconColor.warning} />;
    return <Info size={14} color={notifIconColor.info} />;
  };

  return (
    <header style={{
      height: '56px',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.path}>
            {i > 0 && <span style={{ color: 'var(--text-dim)' }}>/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Notification Bell */}
      <div style={{ position: 'relative' }} ref={dropRef}>
        <button
          onClick={() => { setOpen((v) => !v); if (!open) fetchNotifications(); }}
          style={{
            position: 'relative', background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', borderRadius: '8px',
            width: '36px', height: '36px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: '#dc2626', color: 'white',
              width: '16px', height: '16px', borderRadius: '50%',
              fontSize: '10px', fontWeight: 700, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: '340px', maxHeight: '420px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Notifications</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unread > 0 && (
                  <span style={{
                    background: 'rgba(220,38,38,0.15)', color: '#f87171',
                    border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: '999px', fontSize: '10px', fontWeight: 600,
                    padding: '2px 8px',
                  }}>
                    {unread} new
                  </span>
                )}
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Bell size={28} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(51,65,85,0.3)',
                      background: n.read ? 'transparent' : 'rgba(26,86,219,0.05)',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      <NotifIcon type={n.type} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: '1.4' }}>{n.message}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!n.read && (
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '5px' }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
