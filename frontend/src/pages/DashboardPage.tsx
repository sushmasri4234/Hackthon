import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import {
  FileText, CheckCircle, XCircle, Clock, Award, AlertTriangle,
  TrendingUp, ArrowRight, Bell, Shield, Users, Zap
} from 'lucide-react';

interface Stats {
  totalBatches: number;
  pendingApprovals: number;
  approvedBatches: number;
  rejectedBatches: number;
  returnedBatches: number;
  certificatesIssued: number;
  cancelledCertificates: number;
  delayedBatches: number;
  pendingNotifications: number;
  recentBatches: any[];
}

const STATUS_BADGE_MAP: Record<string, string> = {
  DRAFT: 'badge-draft',
  SUBMITTED: 'badge-submitted',
  DISTRICT_REVIEW: 'badge-district',
  QUALITY_REVIEW: 'badge-quality',
  STATE_REVIEW: 'badge-state',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  RETURNED: 'badge-returned',
  CANCELLED: 'badge-cancelled',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  DISTRICT_REVIEW: 'District Review',
  QUALITY_REVIEW: 'Quality Review',
  STATE_REVIEW: 'State Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard/stats')
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const statCards = [
    { label: 'Total Batches', value: stats?.totalBatches ?? '-', icon: FileText, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? '-', icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Approved', value: stats?.approvedBatches ?? '-', icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Rejected', value: stats?.rejectedBatches ?? '-', icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Certificates Issued', value: stats?.certificatesIssued ?? '-', icon: Award, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Delayed Batches', value: stats?.delayedBatches ?? '-', icon: AlertTriangle, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Welcome back
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
          {user.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${STATUS_BADGE_MAP[user.role] || 'badge-draft'}`}>
            {user.role.replace('_', ' ')}
          </span>
          {user.trainingCentre && <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>· {user.trainingCentre.name}</span>}
          {user.district && <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>· {user.district.name} District</span>}
        </div>
      </div>

      {/* Alert: Delayed Batches */}
      {!loading && (stats?.delayedBatches ?? 0) > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={16} />
          <span><strong>{stats!.delayedBatches} batch(es)</strong> have exceeded the approval deadline and need attention.</span>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: s.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={18} color={s.color} />
                </div>
                <TrendingUp size={12} color="var(--text-dim)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                {loading ? <div style={{ width: '48px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} /> : s.value}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Quick Actions Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {user.role === 'TRAINING_CENTRE' && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/batches/new')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={16} /> Create New Batch</span>
                  <ArrowRight size={14} />
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/batches')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={16} /> View My Batches</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
            {user.role === 'DISTRICT_OFFICER' && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/approvals')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> Pending Approvals</span>
                  <span className="badge badge-state" style={{ fontSize: '10px' }}>{stats?.pendingApprovals ?? 0}</span>
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/batches')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={16} /> All Batches</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
            {user.role === 'QUALITY_TEAM' && (
              <button className="btn btn-primary" onClick={() => navigate('/approvals')} style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={16} /> Quality Reviews</span>
                <span className="badge badge-quality">{stats?.pendingApprovals ?? 0}</span>
              </button>
            )}
            {user.role === 'STATE_OFFICE' && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/approvals')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> Final Approvals</span>
                  <span className="badge badge-state">{stats?.pendingApprovals ?? 0}</span>
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/certificates')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={16} /> Certificates</span>
                  <ArrowRight size={14} />
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/audit')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={16} /> Audit Logs</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => window.open('/verify', '_blank')} style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={16} /> Public Verification</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent Batches */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Batches</h3>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => navigate('/batches')}>
              View all
            </button>
          </div>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
          ) : stats?.recentBatches?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <div style={{ fontSize: '13px' }}>No batches yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats?.recentBatches?.slice(0, 5).map((b: any) => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/batches/${b.id}`)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px',
                    background: 'rgba(15,23,42,0.4)', cursor: 'pointer', border: '1px solid rgba(51,65,85,0.3)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(26,86,219,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(15,23,42,0.4)')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.batchName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.trainingCentre?.name} · {b.district?.name}</div>
                  </div>
                  <span className={`badge ${STATUS_BADGE_MAP[b.status] || 'badge-draft'}`}>
                    {STATUS_LABELS[b.status] || b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
