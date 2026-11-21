import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { Shield, ChevronRight, Zap, UserPlus, LogIn, Building, MapPin, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  trainingCentre?: { name: string } | null;
  district?: { name: string } | null;
}

interface District {
  id: string;
  name: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TRAINING_CENTRE: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  DISTRICT_OFFICER: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  QUALITY_TEAM: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  STATE_OFFICE: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
};

const ROLE_LABELS: Record<string, string> = {
  TRAINING_CENTRE: 'Training Centre',
  DISTRICT_OFFICER: 'District Officer',
  QUALITY_TEAM: 'Quality Team',
  STATE_OFFICE: 'State Office',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'TRAINING_CENTRE' | 'DISTRICT_OFFICER' | 'QUALITY_TEAM' | 'STATE_OFFICE'>('TRAINING_CENTRE');
  const [regDistrictId, setRegDistrictId] = useState('');
  const [regTcName, setRegTcName] = useState('');
  const [regTcCode, setRegTcCode] = useState('');

  const [districts, setDistricts] = useState<District[]>([]);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user]);

  useEffect(() => {
    API.get('/auth/demo-users').then((r) => setDemoUsers(r.data)).catch(() => {});
    API.get('/districts').then((r) => {
      setDistricts(r.data);
      if (r.data?.length > 0) setRegDistrictId(r.data[0].id);
    }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Signed in successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        districtId: regDistrictId || undefined,
        trainingCentreName: regRole === 'TRAINING_CENTRE' ? regTcName : undefined,
        trainingCentreCode: regRole === 'TRAINING_CENTRE' ? regTcCode : undefined,
      });
      toast.success('Account created successfully! Welcome to CertiFlow.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (u: DemoUser) => {
    setDemoLoading(u.id);
    try {
      await login(u.email, 'Demo@1234');
      toast.success(`Switched to ${u.name} (${ROLE_LABELS[u.role] || u.role})`);
      navigate('/dashboard');
    } catch {
      toast.error('Demo login failed');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc', position: 'relative' }}>
      {/* Left Branding Panel */}
      <div style={{
        flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '56px 64px', background: 'linear-gradient(145deg, #1e3a8a 0%, #0369a1 50%, #0284c7 100%)',
        color: '#ffffff', position: 'relative', overflow: 'hidden'
      }}>
        {/* Soft background glow circles */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%', width: '450px', height: '450px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(147,197,253,0.18) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '520px', position: 'relative', zIndex: 1 }}>
          {/* Logo Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
            }}>
              <Shield size={28} color="#1e40af" />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>CertiFlow</div>
              <div style={{ fontSize: '13px', color: '#bfdbfe', fontWeight: 500 }}>Pragati Skills Mission</div>
            </div>
          </div>

          <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.2, marginBottom: '20px', letterSpacing: '-0.5px' }}>
            Trust-First Skilling Certificate Platform
          </h1>
          <p style={{ color: '#e0f2fe', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px' }}>
            Centralized digital verification and multi-tier approval workflow for over 300 private training institutes across 36 districts.
          </p>

          {/* Key Feature Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              'Atomic Spreadsheet Validation (zero corrupted rows saved)',
              'Dual-Officer District Consensus before State Sign-off',
              'Instant QR-Code Public Verification (Zero PII exposed)',
              'Automated High-Resolution PDF Certificate Generation',
            ].map((text) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircle2 size={15} color="#ffffff" />
                </div>
                <span style={{ color: '#f0f9ff', fontSize: '14px', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Interaction Panel */}
      <div style={{
        flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px 56px', overflowY: 'auto', background: '#f8fafc'
      }}>
        <div style={{ maxWidth: '520px', width: '100%', margin: '0 auto' }}>
          
          {/* Auth Card */}
          <div className="glass-card" style={{ padding: '36px', marginBottom: '28px' }}>
            
            {/* Tabs: Sign In / Create Account */}
            <div style={{
              display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px',
              marginBottom: '28px', border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => setTab('login')}
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: '9px', fontSize: '13.5px', fontWeight: 600,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s ease',
                  background: tab === 'login' ? '#ffffff' : 'transparent',
                  color: tab === 'login' ? '#1e293b' : '#64748b',
                  boxShadow: tab === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <LogIn size={15} /> Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: '9px', fontSize: '13.5px', fontWeight: 600,
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s ease',
                  background: tab === 'register' ? '#ffffff' : 'transparent',
                  color: tab === 'register' ? '#1e293b' : '#64748b',
                  boxShadow: tab === 'register' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <UserPlus size={15} /> Create Account
              </button>
            </div>

            {/* TAB 1: Sign In */}
            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Welcome Back</h2>
                  <p style={{ color: '#64748b', fontSize: '13px' }}>Sign in to access your skilling programme dashboard.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. anika@certiflow.demo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
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

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14.5px' }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* TAB 2: Create Account */}
            {tab === 'register' && (
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Register Official Account</h2>
                  <p style={{ color: '#64748b', fontSize: '13px' }}>Select your role in the Pragati Skills Mission.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Role in Mission *</label>
                  <select
                    className="form-input"
                    value={regRole}
                    onChange={(e: any) => setRegRole(e.target.value)}
                    required
                  >
                    <option value="TRAINING_CENTRE">Training Centre (Submit Candidate Batches)</option>
                    <option value="DISTRICT_OFFICER">District Officer (Review & Approve Batches)</option>
                    <option value="QUALITY_TEAM">Quality Assurance Team (Review Large Batches)</option>
                    <option value="STATE_OFFICE">State Office (Final Authorization & Cancellation)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. rahul@skillcentre.in"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Create a secure password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                {/* District Selection for TC and District Officers */}
                {(regRole === 'TRAINING_CENTRE' || regRole === 'DISTRICT_OFFICER') && (
                  <div className="form-group">
                    <label className="form-label">Assigned District *</label>
                    <select
                      className="form-input"
                      value={regDistrictId}
                      onChange={(e) => setRegDistrictId(e.target.value)}
                      required
                    >
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} District (Maharashtra)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Training Centre Extra Fields */}
                {regRole === 'TRAINING_CENTRE' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Training Centre Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Apex Skill Institute"
                        value={regTcName}
                        onChange={(e) => setRegTcName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Training Centre Code (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. TC-PUNE-099"
                        value={regTcCode}
                        onChange={(e) => setRegTcCode(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14.5px', marginTop: '8px' }}>
                  {loading ? 'Creating Account...' : 'Create Account & Sign In'}
                </button>
              </form>
            )}
          </div>

          {/* Demo Accounts List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={13} color="#b45309" />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Instant Demo Logins (Click to Test)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {demoUsers.map((u) => {
                const style = ROLE_COLORS[u.role] || { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
                return (
                  <button
                    key={u.id}
                    onClick={() => handleDemoLogin(u)}
                    disabled={!!demoLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '11px 14px', borderRadius: '12px',
                      background: '#ffffff', border: `1px solid ${style.border}`,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = style.bg;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#ffffff';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      background: style.bg, border: `1.5px solid ${style.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 800, color: style.text
                    }}>
                      {u.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: '11px', color: style.text, fontWeight: 600 }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </div>
                    </div>
                    {demoLoading === u.id ? (
                      <span className="animate-spin" style={{ color: style.text }}>⟳</span>
                    ) : (
                      <ChevronRight size={13} color="#94a3b8" />
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11.5px', color: '#64748b' }}>
              Standard demo password for all accounts: <strong style={{ color: '#0f172a' }}>Demo@1234</strong>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
