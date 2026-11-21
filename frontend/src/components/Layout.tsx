import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, FileText, PlusCircle, CheckSquare, Award,
  ClipboardList, Shield, LogOut, ChevronDown, Bell, X, ExternalLink,
  BookOpen, Users, FileSearch
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles?: string[];
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  // TRAINING_CENTRE
  { label: 'My Batches', to: '/batches', icon: FileText, roles: ['TRAINING_CENTRE'] },
  { label: 'New Batch', to: '/batches/new', icon: PlusCircle, roles: ['TRAINING_CENTRE'] },
  // DISTRICT_OFFICER
  { label: 'Pending Approvals', to: '/approvals', icon: CheckSquare, roles: ['DISTRICT_OFFICER'] },
  { label: 'All Batches', to: '/batches', icon: FileText, roles: ['DISTRICT_OFFICER'] },
  // QUALITY_TEAM
  { label: 'Quality Reviews', to: '/approvals', icon: FileSearch, roles: ['QUALITY_TEAM'] },
  // STATE_OFFICE
  { label: 'Final Approvals', to: '/approvals', icon: CheckSquare, roles: ['STATE_OFFICE'] },
  { label: 'All Batches', to: '/batches', icon: FileText, roles: ['STATE_OFFICE'] },
  { label: 'Certificates', to: '/certificates', icon: Award, roles: ['STATE_OFFICE'] },
  { label: 'Audit Log', to: '/audit', icon: ClipboardList, roles: ['STATE_OFFICE'] },
];

const DEMO_USERS = [
  { label: 'Training Centre', email: 'tc@demo.com' },
  { label: 'District Officer', email: 'district@demo.com' },
  { label: 'Quality Team', email: 'quality@demo.com' },
  { label: 'State Office', email: 'state@demo.com' },
];

const ROLE_LABELS: Record<string, string> = {
  TRAINING_CENTRE: 'Training Centre',
  DISTRICT_OFFICER: 'District Officer',
  QUALITY_TEAM: 'Quality Team',
  STATE_OFFICE: 'State Office',
};

interface ToastMsg {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, switchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Socket.IO real-time notifications
  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:3001', {
      auth: { token: localStorage.getItem('accessToken') },
      transports: ['websocket'],
    });

    socket.on('notification', (data: { message: string; type?: 'info' | 'success' | 'warning' }) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: data.message, type: data.type || 'info' }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    });

    socket.on('batch_update', (data: { batchName: string; status: string }) => {
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message: `Batch "${data.batchName}" → ${data.status.replace(/_/g, ' ')}`, type: 'info' },
      ]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    });

    return () => { socket.disconnect(); };
  }, [user]);

  const visibleLinks = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const toastColors: Record<string, string> = {
    info: 'rgba(14,165,233,0.15)',
    success: 'rgba(5,150,105,0.15)',
    warning: 'rgba(217,119,6,0.15)',
  };
  const toastBorders: Record<string, string> = {
    info: 'rgba(14,165,233,0.4)',
    success: 'rgba(5,150,105,0.4)',
    warning: 'rgba(217,119,6,0.4)',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: '240px',
        minHeight: '100vh',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>CertiFlow</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.5px', marginTop: '2px' }}>
                CERTIFICATION PORTAL
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px 8px' }}>
            Navigation
          </div>
          {visibleLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  marginBottom: '2px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive ? 'linear-gradient(135deg, #1a56db, #0f3fa6)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(26,86,219,0.3)' : 'none',
                })}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  if (!el.style.background.includes('gradient')) {
                    el.style.background = 'rgba(255,255,255,0.05)';
                    el.style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  if (!el.style.background.includes('gradient')) {
                    el.style.background = 'transparent';
                    el.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}

          {/* Always-visible public link */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px 8px' }}>
              Public
            </div>
            <button
              onClick={() => window.open('/verify', '_blank')}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '9px 10px', borderRadius: '8px', border: 'none',
                background: 'transparent', color: 'var(--text-muted)', fontSize: '13px',
                cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <ExternalLink size={16} />
              Certificate Verify
            </button>
          </div>
        </nav>

        {/* User info + switcher */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px' }}>
          {user && (
            <>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                  borderRadius: '8px', marginBottom: '8px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: 'white',
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {ROLE_LABELS[user.role] || user.role}
                  </div>
                </div>
              </div>

              {/* Demo user switcher */}
              <div style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => setShowSwitcher((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                    padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)', fontSize: '11px',
                    cursor: 'pointer', fontFamily: 'inherit', justifyContent: 'space-between',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={12} />
                    Demo Switch
                  </span>
                  <ChevronDown size={12} style={{ transform: showSwitcher ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showSwitcher && (
                  <div style={{
                    marginTop: '4px', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '8px', overflow: 'hidden', animation: 'fadeIn 0.15s ease',
                  }}>
                    {DEMO_USERS.map((du) => (
                      <button
                        key={du.email}
                        onClick={async () => {
                          setShowSwitcher(false);
                          await switchUser(du.email);
                          navigate('/dashboard');
                        }}
                        style={{
                          display: 'block', width: '100%', padding: '8px 12px',
                          border: 'none', background: user.email === du.email ? 'rgba(26,86,219,0.1)' : 'transparent',
                          color: user.email === du.email ? '#3b82f6' : 'var(--text-muted)',
                          fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                          fontFamily: 'inherit', transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { if (user.email !== du.email) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { if (user.email !== du.email) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {du.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Logout */}
              <button
                onClick={() => logout()}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '7px' }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar (Navbar) is rendered by children via Navbar.tsx; layout just provides the shell */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>

      {/* ── Toast stack ── */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999,
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-in"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', borderRadius: '10px', maxWidth: '340px',
              background: toastColors[t.type] || toastColors.info,
              border: `1px solid ${toastBorders[t.type] || toastBorders.info}`,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              fontSize: '13px', color: 'var(--text)',
            }}
          >
            <Bell size={14} style={{ flexShrink: 0, color: 'var(--accent)' }} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
