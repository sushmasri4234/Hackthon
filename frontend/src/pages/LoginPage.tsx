import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import {
  Shield, CheckCircle, XCircle, AlertCircle, Search, Download,
  UserPlus, LogIn, Building, MapPin, CheckCircle2, ChevronRight,
  ExternalLink, Sparkles, Award, Lock, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
  stateCode: string;
  stateName?: string;
}

interface StateOption {
  code: string;
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

  // Sign in form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Sign up form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'TRAINING_CENTRE' | 'DISTRICT_OFFICER' | 'QUALITY_TEAM' | 'STATE_OFFICE'>('TRAINING_CENTRE');
  const [selectedState, setSelectedState] = useState('MH');
  const [regDistrictId, setRegDistrictId] = useState('');
  const [regTcName, setRegTcName] = useState('');
  const [regTcCode, setRegTcCode] = useState('');

  // States & districts lists
  const [statesList, setStatesList] = useState<StateOption[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  // Public Verification State (Right side - No Login Required)
  const [certQuery, setCertQuery] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user]);

  useEffect(() => {
    API.get('/auth/demo-users').then((r) => setDemoUsers(r.data)).catch(() => {});
    API.get('/states').then((r) => {
      setStatesList(r.data);
      if (r.data.length > 0) setSelectedState(r.data[0].code);
    }).catch(() => {
      setStatesList([
        { code: 'MH', name: 'Maharashtra' },
        { code: 'DL', name: 'Delhi NCR' },
        { code: 'KA', name: 'Karnataka' },
        { code: 'TS', name: 'Telangana' },
        { code: 'TN', name: 'Tamil Nadu' },
        { code: 'UP', name: 'Uttar Pradesh' },
        { code: 'GJ', name: 'Gujarat' },
        { code: 'RJ', name: 'Rajasthan' },
        { code: 'WB', name: 'West Bengal' },
      ]);
    });

    API.get('/districts').then((r) => {
      setDistricts(r.data);
      if (r.data?.length > 0) setRegDistrictId(r.data[0].id);
    }).catch(() => {});
  }, []);

  // Filter districts by selected state
  const filteredDistricts = districts.filter(d => !selectedState || d.stateCode === selectedState);

  useEffect(() => {
    if (filteredDistricts.length > 0) {
      setRegDistrictId(filteredDistricts[0].id);
    }
  }, [selectedState, districts]);

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
      toast.error(err.response?.data?.error || 'Invalid credentials. Please verify your email and password.');
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
        trainingCentreName: regRole === 'TRAINING_CENTRE' ? regTcName.trim() : undefined,
        trainingCentreCode: regRole === 'TRAINING_CENTRE' ? regTcCode.trim() : undefined,
      });
      toast.success(`Account created as ${ROLE_LABELS[regRole]}! Signed in.`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: DemoUser) => {
    setDemoLoading(demoUser.id);
    try {
      await login(demoUser.email, 'Demo@1234');
      toast.success(`Signed in as ${demoUser.name} (${ROLE_LABELS[demoUser.role]})`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to sign in with demo account');
    } finally {
      setDemoLoading(null);
    }
  };

  // Instant Verification Function (Public, No Login Needed)
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = certQuery.trim().toUpperCase();
    if (!query) {
      toast.error('Please enter a Certificate ID');
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    setVerifyError('');
    try {
      const res = await API.get(`/verify/${query}`);
      setVerifyResult(res.data);
    } catch (err: any) {
      setVerifyError(err.response?.data?.error || 'Verification request failed. Please check the ID.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(at 0% 0%, #eff6ff 0px, transparent 50%), radial-gradient(at 100% 0%, #f5f3ff 0px, transparent 50%), radial-gradient(at 100% 100%, #ecfdf5 0px, transparent 50%), #f8fafc',
      padding: '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Top Government Branding Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px', maxWidth: '800px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
          <Sparkles size={14} color="#2563eb" /> National Skilling Digital Mission · Government of India
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
          CertiFlow Skilling Credential Platform
        </h1>
        <p style={{ color: '#475569', fontSize: '15px', margin: 0 }}>
          Centralized trust-first certificate issuance, multi-level officer consensus, and instant public verification.
        </p>
      </div>

      {/* Main Responsive Two-Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '28px',
        width: '100%',
        maxWidth: '1200px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Authentication & Registration */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.02)'
        }}>
          {/* Tab Selector */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <button
              type="button"
              onClick={() => setTab('login')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: tab === 'login' ? '#ffffff' : 'transparent',
                color: tab === 'login' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: tab === 'login' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: tab === 'register' ? '#ffffff' : 'transparent',
                color: tab === 'register' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: tab === 'register' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <UserPlus size={15} /> Create Account
            </button>
          </div>

          {/* TAB 1: SIGN IN FORM */}
          {tab === 'login' && (
            <div>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Official Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g., officer@certiflow.demo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
                >
                  {loading ? 'Authenticating...' : 'Sign In to Portal'}
                </button>
              </form>

              {/* Demo Accounts Quick-Switch for Judges & Evaluators */}
              <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⚡ Evaluation Demo Accounts (One-Click)
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Password: Demo@1234</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {demoUsers.map((u) => {
                    const rc = ROLE_COLORS[u.role] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
                    const isBusy = demoLoading === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleDemoLogin(u)}
                        disabled={!!demoLoading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: rc.bg,
                          border: `1px solid ${rc.border}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                          <div style={{ fontSize: '10.5px', color: rc.text, fontWeight: 600 }}>{ROLE_LABELS[u.role]}</div>
                        </div>
                        {isBusy ? (
                          <span className="animate-spin" style={{ fontSize: '12px', color: rc.text }}>⟳</span>
                        ) : (
                          <ChevronRight size={14} color={rc.text} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE ACCOUNT FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Assigned Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {(['TRAINING_CENTRE', 'DISTRICT_OFFICER', 'QUALITY_TEAM', 'STATE_OFFICE'] as const).map((r) => {
                    const isSelected = regRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRegRole(r)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1e40af' : '#475569',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Rajesh Kumar"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Official Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g., rajesh.kumar@skills.gov.in"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Create Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Choose a strong password..."
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              {/* State & District Selectors (All States across India) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>State / UT</label>
                  <select
                    className="form-input"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                  >
                    {statesList.map((st) => (
                      <option key={st.code} value={st.code}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>District</label>
                  <select
                    className="form-input"
                    value={regDistrictId}
                    onChange={(e) => setRegDistrictId(e.target.value)}
                  >
                    {filteredDistricts.length === 0 ? (
                      <option value="">No districts listed</option>
                    ) : (
                      filteredDistricts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Training Centre Specific Fields */}
              {regRole === 'TRAINING_CENTRE' && (
                <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Training Centre Affiliation
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Centre Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g., Apex Skilling Academy"
                      value={regTcName}
                      onChange={(e) => setRegTcName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Centre Accreditation Code</label>
                    <input
                      className="form-input"
                      placeholder="e.g., TC-APEX-101"
                      value={regTcCode}
                      onChange={(e) => setRegTcCode(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
              >
                {loading ? 'Creating Account...' : 'Complete Registration & Sign In'}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: Instant Public & Employer Verification Portal (NO LOGIN REQUIRED) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.02)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={24} color="#2563eb" />
            </div>
            <div>
              <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '9999px', textTransform: 'uppercase', marginBottom: '4px' }}>
                ✓ Zero Login Required
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Public &amp; Employer Verification
              </h2>
            </div>
          </div>

          <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.5, marginBottom: '20px' }}>
            Employers, recruiting agencies, and citizens can instantly query the national blockchain-backed registry to verify the validity of any issued skilling certificate.
          </p>

          {/* Verification Form */}
          <form onSubmit={handleVerify}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Enter Certificate ID / QR Code Number</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '40px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}
                  placeholder="e.g., PSM-2026-XXXXXXXX"
                  value={certQuery}
                  onChange={(e) => setCertQuery(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={verifying || !certQuery.trim()}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
            >
              {verifying ? <span className="animate-spin">⟳</span> : <Shield size={16} />}
              {verifying ? 'Querying National Registry...' : 'Verify Certificate Instantly'}
            </button>
          </form>

          {/* Error Message */}
          {verifyError && (
            <div className="alert alert-error" style={{ marginTop: '16px' }}>
              <AlertCircle size={16} /> <span>{verifyError}</span>
            </div>
          )}

          {/* Verification Result Display */}
          {verifyResult && (
            <div style={{ marginTop: '20px', animation: 'fadeIn 0.25s ease-out' }}>
              {verifyResult.status === 'VALID' && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={20} color="#059669" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#065f46' }}>
                        ✓ Authentic &amp; Active Credential
                      </div>
                      <div style={{ fontSize: '11px', color: '#047857' }}>
                        Issued by Pragati Skills Mission · Status: Active
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '14px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Certificate ID</span>
                      <span style={{ fontWeight: 800, color: '#1e40af', fontFamily: 'monospace' }}>{verifyResult.certificateNumber}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Certified Candidate</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{verifyResult.holder}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Qualification</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{verifyResult.course}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Training Centre</span>
                      <span style={{ color: '#334155' }}>{verifyResult.trainingCentre}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>District &amp; State</span>
                      <span style={{ color: '#334155' }}>{verifyResult.district}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Completion Date</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {verifyResult.completionDate ? format(new Date(verifyResult.completionDate), 'dd MMMM yyyy') : '—'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> DPDP Act Privacy Protected
                    </span>
                    <button
                      type="button"
                      onClick={() => window.open(`http://localhost:3001/api/certificates/${verifyResult.certificateNumber}/download`, '_blank')}
                      className="btn btn-success"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <Download size={13} /> Download Official PDF
                    </button>
                  </div>
                </div>
              )}

              {verifyResult.status === 'CANCELLED' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
                  <XCircle size={32} color="#dc2626" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '15px' }}>
                    Certificate Cancelled / Revoked
                  </div>
                  <div style={{ color: '#b91c1c', fontSize: '12.5px', marginTop: '4px' }}>
                    {verifyResult.message}
                  </div>
                  {verifyResult.reason && (
                    <div style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '8px', borderRadius: '6px', fontSize: '12px', color: '#7f1d1d', fontStyle: 'italic', marginTop: '8px' }}>
                      Revocation Reason: "{verifyResult.reason}"
                    </div>
                  )}
                </div>
              )}

              {verifyResult.status === 'INVALID' && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
                  <AlertCircle size={32} color="#ea580c" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 800, color: '#9a3412', fontSize: '15px' }}>
                    Record Not Found
                  </div>
                  <div style={{ color: '#c2410c', fontSize: '12.5px', marginTop: '4px' }}>
                    No matching skilling credential exists for this ID in the national registry.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Privacy & Compliance Assurance Badge */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Lock size={16} color="#64748b" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
              Zero login public verification guarantees privacy under the Digital Personal Data Protection (DPDP) Act. Candidate phone numbers and personal emails are never exposed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
