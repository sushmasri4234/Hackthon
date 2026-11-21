import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, FileText, PlusCircle, CheckSquare, Award,
  ClipboardList, Shield, LogOut, ChevronDown, Bell, ExternalLink,
  Users, FileSearch, Sparkles
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
  { label: 'All Batches', to: '/batches', icon: FileText, roles: ['QUALITY_TEAM'] },
  // STATE_OFFICE
  { label: 'Final Approvals', to: '/approvals', icon: CheckSquare, roles: ['STATE_OFFICE'] },
  { label: 'All Batches', to: '/batches', icon: FileText, roles: ['STATE_OFFICE'] },
  { label: 'Certificates', to: '/certificates', icon: Award, roles: ['STATE_OFFICE', 'TRAINING_CENTRE', 'DISTRICT_OFFICER', 'QUALITY_TEAM'] },
  { label: 'Audit Log', to: '/audit', icon: ClipboardList, roles: ['STATE_OFFICE', 'QUALITY_TEAM', 'DISTRICT_OFFICER'] },
];

const DEMO_USERS = [
  { name: 'Anika Sharma', label: 'Training Centre', email: 'anika@certiflow.demo', role: 'TRAINING_CENTRE' },
  { name: 'Dev Kulkarni', label: 'District Officer (Pune)', email: 'dev@certiflow.demo', role: 'DISTRICT_OFFICER' },
  { name: 'Meera Joshi', label: 'District Officer 2 (Pune)', email: 'meera@certiflow.demo', role: 'DISTRICT_OFFICER' },
  { name: 'Kabir Patel', label: 'District Officer (Nashik)', email: 'kabir@certiflow.demo', role: 'DISTRICT_OFFICER' },
  { name: 'Neha Gupta', label: 'Quality Assurance', email: 'neha@certiflow.demo', role: 'QUALITY_TEAM' },
  { name: 'Farah Khan', label: 'State Office Director', email: 'farah@certiflow.demo', role: 'STATE_OFFICE' },
];

const ROLE_LABELS: Record<string, string> = {
  TRAINING_CENTRE: 'Training Centre',
  DISTRICT_OFFICER: 'District Officer',
  QUALITY_TEAM: 'Quality Team',
  STATE_OFFICE: 'State Office',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, switchUser } = useAuth();
  const navigate = useNavigate();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type?: string }[]>([]);

  // Socket.IO real-time notifications
  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:3001', {
      auth: { token: localStorage.getItem('accessToken') },
      transports: ['websocket'],
    });

    socket.on('notification', (data: { message: string; type?: string }) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: data.message, type: data.type || 'info' }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    });

    socket.on('batch_update', (data: { batchName: string; status: string }) => {
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message: `Batch "${data.batchName}" updated to ${data.status.replace(/_/g, ' ')}`, type: 'info' },
      ]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    });

    return () => { socket.disconnect(); };
  }, [user]);

  const visibleLinks = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── Pastel Sidebar ── */}
      <aside style={{
        width: '260px',
        minHeight: '100vh',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        boxShadow: '2px 0 12px rgba(15, 23, 42, 0.02)'
      }}>
        {/* Brand Header */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #0284c7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
            }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                CertiFlow
              </div>
              <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600, letterSpacing: '0.4px', marginTop: '3px' }}>
                PRAGATI SKILLS MISSION
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 10px 10px' }}>
            Menu
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
                  gap: '11px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '3px',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#1d4ed8' : '#475569',
                  background: isActive ? '#eff6ff' : 'transparent',
                  border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                })}
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}

          {/* Verification Portal link */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 10px 8px' }}>
              Public Portals
            </div>
            <button
              onClick={() => window.open('/verify', '_blank')}
              style={{
                display: 'flex', alignItems: 'center', gap: '11px', width: '100%',
                padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0',
                background: '#ffffff', color: '#0f172a', fontSize: '13.5px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <ExternalLink size={16} color="#0284c7" />
              Public Verification
            </button>
          </div>
        </nav>

        {/* Current User Card */}
        {user && (
          <div style={{ padding: '16px 14px', borderTop: '1px solid #e2e8f0', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: '#dbeafe', color: '#1d4ed8', fontWeight: 800,
                fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {user.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                  {ROLE_LABELS[user.role] || user.role}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', padding: '6px', borderRadius: '6px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e11d48'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <LogOut size={16} />
              </button>
            </div>

            {/* Quick Demo Switcher Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSwitcher(!showSwitcher)}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  color: '#1d4ed8', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={12} /> Switch Demo Role
                </span>
                <ChevronDown size={13} />
              </button>

              {/* Dropdown Menu */}
              {showSwitcher && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '8px',
                  background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', padding: '6px', zIndex: 1000
                }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', padding: '6px 8px', textTransform: 'uppercase' }}>
                    Quick Account Switch
                  </div>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      onClick={async () => {
                        setShowSwitcher(false);
                        await switchUser(u.email);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '8px 10px', borderRadius: '8px', border: 'none',
                        background: user.email === u.email ? '#eff6ff' : 'transparent',
                        color: user.email === u.email ? '#1d4ed8' : '#334155',
                        fontSize: '12px', fontWeight: user.email === u.email ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left'
                      }}
                      onMouseEnter={(e) => { if (user.email !== u.email) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (user.email !== u.email) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span>{u.name}</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{u.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Content Area ── */}
      <div style={{ marginLeft: '260px', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{
          height: '64px', background: '#ffffff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Government of Maharashtra · <span style={{ color: '#0f172a', fontWeight: 600 }}>Pragati Skills Mission Platform</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="badge badge-valid" style={{ fontSize: '11px' }}>
              ● System Online
            </span>
            <div style={{
              padding: '6px 12px', borderRadius: '20px', background: '#f1f5f9',
              fontSize: '12px', color: '#334155', fontWeight: 600
            }}>
              Active Role: <strong style={{ color: '#2563eb' }}>{ROLE_LABELS[user?.role || ''] || user?.role}</strong>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, background: '#f8fafc' }}>
          {children}
        </main>
      </div>

      {/* Real-time Toasts */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: '12px 16px', borderRadius: '12px', background: '#ffffff',
              border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: '13px', fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px'
            }}
          >
            <Bell size={15} color="#2563eb" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
