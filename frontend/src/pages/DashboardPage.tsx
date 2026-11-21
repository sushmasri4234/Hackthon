import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import {
  FileText, CheckCircle, XCircle, Clock, Award, AlertTriangle,
  TrendingUp, ArrowRight, Shield, Users, Zap
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
    { label: 'Total Batches', value: stats?.totalBatches ?? '-', icon: FileText, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? '-', icon: Clock, color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
    { label: 'Approved Batches', value: stats?.approvedBatches ?? '-', icon: CheckCircle, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'Rejected Batches', value: stats?.rejectedBatches ?? '-', icon: XCircle, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    { label: 'Certificates Issued', value: stats?.certificatesIssued ?? '-', icon: Award, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    { label: 'Delayed Batches', value: stats?.delayedBatches ?? '-', icon: AlertTriangle, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
        border: '1px solid #bfdbfe',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
            Pragati Skills Mission Portal
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Welcome back, {user.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`badge ${STATUS_BADGE_MAP[user.role] || 'badge-draft'}`}>
              {user.role.replace('_', ' ')}
            </span>
            {user.trainingCentre && <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>· {user.trainingCentre.name}</span>}
            {user.district && <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>· {user.district.name} District</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => window.open('/verify', '_blank')}>
            <Shield size={15} color="#2563eb" /> Verify Certificate
          </button>
        </div>
      </div>

      {/* Alert: Delayed Batches */}
      {!loading && (stats?.delayedBatches ?? 0) > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={18} />
          <span><strong>{stats!.delayedBatches} batch(es)</strong> have exceeded the 48-hour approval deadline and need attention.</span>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '10px', background: s.bg,
                  border: `1px solid ${s.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={20} color={s.color} />
                </div>
                <TrendingUp size={14} color="#94a3b8" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {loading ? <div style={{ width: '48px', height: '28px', background: '#f1f5f9', borderRadius: '4px' }} /> : s.value}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Batches Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px', marginBottom: '32px' }}>
        {/* Quick Actions Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Workflow Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {user.role === 'TRAINING_CENTRE' && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/batches/new')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={16} /> Create & Upload New Batch</span>
                  <ArrowRight size={14} />
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/batches')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={16} /> View All Training Batches</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
            {user.role === 'DISTRICT_OFFICER' && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/approvals')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle size={16} /> Pending District Reviews</span>
                  <span className="badge badge-district">{stats?.pendingApprovals ?? 0}</span>
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/batches')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={16} /> View District Batches</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
            {user.role === 'QUALITY_TEAM' && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/approvals')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={16} /> Large Batches for Quality Review</span>
                  <span className="badge badge-quality">{stats?.pendingApprovals ?? 0}</span>
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/batches')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={16} /> All Programme Batches</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
            {user.role === 'STATE_OFFICE' && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/approvals')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle size={16} /> Awaiting State Final Authorization</span>
                  <span className="badge badge-state">{stats?.pendingApprovals ?? 0}</span>
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/certificates')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Award size={16} /> Issued Certificates Registry</span>
                  <ArrowRight size={14} />
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/audit')} style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={16} /> System Audit Trail</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => window.open('/verify', '_blank')} style={{ justifyContent: 'space-between', border: '1px dashed #cbd5e1' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={16} color="#475569" /> Public Certificate Verification</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent Batches Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Recent Batches</h3>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => navigate('/batches')}>
              View all
            </button>
          </div>
          {loading ? (
            <div style={{ color: '#64748b', fontSize: '13px' }}>Loading batches...</div>
          ) : stats?.recentBatches?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
              <FileText size={36} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <div style={{ fontSize: '13px' }}>No batches found</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats?.recentBatches?.slice(0, 5).map((b: any) => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/batches/${b.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px',
                    background: '#f8fafc', cursor: 'pointer', border: '1px solid #e2e8f0',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eff6ff';
                    e.currentTarget.style.borderColor = '#bfdbfe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.batchName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {b.trainingCentre?.name || 'Skill Centre'} · {b.district?.name || 'Pune'} · {b.totalCandidates} candidates
                    </div>
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
