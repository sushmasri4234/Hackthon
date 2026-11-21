import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { format } from 'date-fns';
import {
  Clock, AlertTriangle, CheckCircle, FileText, ArrowRight, Users, Timer, TrendingUp
} from 'lucide-react';

interface Batch {
  id: string;
  batchName: string;
  status: string;
  candidatesCount: number;
  trainingCentre: { name: string };
  district?: { name: string };
  updatedAt: string;
  createdAt: string;
}

interface DelayedBatch {
  id: string;
  batchName: string;
  delayedDays: number;
}

function getStatusForRole(role: string): string {
  switch (role) {
    case 'DISTRICT_OFFICER': return 'DISTRICT_REVIEW';
    case 'QUALITY_TEAM':    return 'QUALITY_REVIEW';
    case 'STATE_OFFICE':    return 'STATE_REVIEW';
    default:                return 'DISTRICT_REVIEW';
  }
}

function computeAvgWaitHours(batches: Batch[]): string {
  if (!batches.length) return '—';
  const now = Date.now();
  const total = batches.reduce((sum, b) => sum + (now - new Date(b.updatedAt).getTime()), 0);
  const avgMs = total / batches.length;
  const hours = Math.round(avgMs / 36e5);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [delayedBatches, setDelayedBatches] = useState<DelayedBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const status = getStatusForRole(user.role);
    Promise.all([
      API.get(`/batches?status=${status}`),
      API.get('/dashboard/delayed-batches'),
    ])
      .then(([batchRes, delayedRes]) => {
        setBatches(batchRes.data?.batches ?? batchRes.data ?? []);
        setDelayedBatches(delayedRes.data?.batches ?? delayedRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const delayedCount = delayedBatches.length;
  const avgWait = computeAvgWaitHours(batches);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Workflow
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
          Pending Approvals
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Batches awaiting your review
        </div>
      </div>

      {/* Delayed warning banner */}
      {!loading && delayedCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={16} />
          <span>
            <strong>{delayedCount} batch(es)</strong> have exceeded the approval deadline and need urgent attention.
          </span>
        </div>
      )}

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#3b82f6" />
            </div>
            <TrendingUp size={12} color="var(--text-dim)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
            {loading ? <div style={{ width: '48px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} /> : batches.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total Pending</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Timer size={18} color="#f59e0b" />
            </div>
            <TrendingUp size={12} color="var(--text-dim)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
            {loading ? <div style={{ width: '48px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} /> : avgWait}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Avg Wait Time</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
            <TrendingUp size={12} color="var(--text-dim)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
            {loading ? <div style={{ width: '48px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} /> : delayedCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Delayed</div>
        </div>
      </div>

      {/* Batch list */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Batches Pending Review</h3>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
        ) : batches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>No pending items</div>
            <div style={{ fontSize: '13px' }}>You're all caught up!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {batches.map((batch) => (
              <div
                key={batch.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px',
                  borderRadius: '10px', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.3)',
                  cursor: 'pointer', transition: 'background 0.2s'
                }}
                onClick={() => navigate(`/batches/${batch.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(26,86,219,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(15,23,42,0.4)')}
              >
                {/* Icon */}
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color="#3b82f6" />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {batch.batchName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={11} /> {batch.candidatesCount ?? 0} candidates
                    </span>
                    <span>{batch.trainingCentre?.name}</span>
                    {batch.district && <span>{batch.district.name}</span>}
                  </div>
                </div>

                {/* Submitted date */}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    {format(new Date(batch.updatedAt), 'dd MMM yyyy')}
                  </div>
                </div>

                {/* Review button */}
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0 }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/batches/${batch.id}`); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Review <ArrowRight size={12} />
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
