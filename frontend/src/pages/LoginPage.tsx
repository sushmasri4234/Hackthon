import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { Shield, ChevronRight, User, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  trainingCentre?: { name: string } | null;
  district?: { name: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  TRAINING_CENTRE: '#3b82f6',
  DISTRICT_OFFICER: '#8b5cf6',
  QUALITY_TEAM: '#f59e0b',
  STATE_OFFICE: '#10b981',
  CANDIDATE: '#ec4899',
};

const ROLE_LABELS: Record<string, string> = {
  TRAINING_CENTRE: 'Training Centre',
  DISTRICT_OFFICER: 'District Officer',
  QUALITY_TEAM: 'Quality Team',
  STATE_OFFICE: 'State Office',
  CANDIDATE: 'Candidate',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user]);

  useEffect(() => {
    API.get('/auth/demo-users').then((r) => setDemoUsers(r.data)).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (u: DemoUser) => {
    setDemoLoading(u.id);
    try {
      await login(u.email, 'Demo@1234');
      navigate('/dashboard');
    } catch {
      toast.error('Demo login failed');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(26,86,219,0.15) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(5,150,105,0.1) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      {/* Left Panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px', background: 'linear-gradient(135deg, #0d3166 0%, #0a2342 100%)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '480px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(26,86,219,0.4)'
            }}>
              <Shield size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>CertiFlow</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>Pragati Skills Mission</div>
            </div>
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '16px' }}>
            Trust-First Certificate<br />Issuance Platform
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: 1.6, marginBottom: '48px' }}>
            A centralized digital platform for issuing and verifying government skill certificates. 
            Secure, auditable, and built for scale.
          </p>

          {/* Feature pills */}
          {['Multi-level approval workflow', 'QR-verified digital certificates', 'Real-time status tracking', 'Complete audit history'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        width: '480px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px', overflowY: 'auto'
      }}>
        {/* Login Form */}
        <div className="glass-card" style={{ padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Sign In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>Enter your credentials or use a demo account below.</p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <span className="animate-spin">⟳</span> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo Users */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={14} color="var(--accent)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Demo Accounts – One-Click Login
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {demoUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleDemoLogin(u)}
                disabled={!!demoLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)',
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                  opacity: demoLoading && demoLoading !== u.id ? 0.6 : 1,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ROLE_COLORS[u.role] || '#3b82f6'; (e.currentTarget as HTMLElement).style.background = 'rgba(30,41,59,0.9)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(51,65,85,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(30,41,59,0.6)'; }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: `${ROLE_COLORS[u.role]}22`,
                  border: `2px solid ${ROLE_COLORS[u.role]}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: ROLE_COLORS[u.role],
                }}>
                  {u.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{u.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {ROLE_LABELS[u.role] || u.role}
                    {u.trainingCentre ? ` · ${u.trainingCentre.name}` : ''}
                    {u.district ? ` · ${u.district.name}` : ''}
                  </div>
                </div>
                {demoLoading === u.id
                  ? <div className="animate-spin" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>⟳</div>
                  : <ChevronRight size={14} color="var(--text-dim)" />
                }
              </button>
            ))}
          </div>

          <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
            All demo accounts use password: <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Demo@1234</code>
          </p>
        </div>
      </div>
    </div>
  );
}
