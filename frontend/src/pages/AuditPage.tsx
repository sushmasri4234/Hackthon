import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { format } from 'date-fns';
import {
  Shield, Download, AlertTriangle, Clock, CheckCircle, XCircle,
  RotateCcw, Award, ChevronDown, Activity, TrendingUp
} from 'lucide-react';

interface BatchSummary {
  id: string;
  batchName: string;
  status: string;
  trainingCentre?: { name: string };
}

interface AuditEntry {
  id: string;
  action: string;
  user: { name: string; role: string };
  reason?: string;
  createdAt: string;
}

interface DashboardStats {
  escalatedBatches?: number;
  delayedBatches?: number;
  recentBatches?: BatchSummary[];
  totalBatches?: number;
  pendingApprovals?: number;
}

const ACTION_STYLES: Record<string, { color: string; bg: string; label: string; icon: React.ComponentType<any> }> = {
  BATCH_SUBMITTED:       { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: 'Submitted',           icon: Activity },
  DISTRICT_APPROVED:     { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  label: 'District Approved',   icon: CheckCircle },
  QUALITY_APPROVED:      { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  label: 'Quality Approved',    icon: CheckCircle },
  STATE_APPROVED:        { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  label: 'State Approved',      icon: CheckCircle },
  REJECTED:              { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   label: 'Rejected',            icon: XCircle },
  RETURNED:              { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  label: 'Returned',            icon: RotateCcw },
  CERTIFICATE_GENERATED: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', label: 'Certificate Generated', icon: Award },
};

const ROLE_LABELS: Record<string, string> = {
  TRAINING_CENTRE: 'Training Centre',
  DISTRICT_OFFICER: 'District Officer',
  QUALITY_TEAM: 'Quality Team',
  STATE_OFFICE: 'State Office',
};

function getActionStyle(action: string) {
  for (const key of Object.keys(ACTION_STYLES)) {
    if (action.includes(key)) return ACTION_STYLES[key];
  }
  return { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)', label: action, icon: Activity };
}

export default function AuditPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [toast, setToast] = useState('');

  // Fetch batches list + dashboard stats
  useEffect(() => {
    setLoadingBatches(true);
    Promise.all([
      API.get('/batches'),
      API.get('/dashboard/stats'),
    ])
      .then(([batchRes, statsRes]) => {
        const list: BatchSummary[] = batchRes.data?.batches ?? batchRes.data ?? [];
        setBatches(list);
        setStats(statsRes.data);
        if (list.length > 0) {
          setSelectedBatchId(list[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBatches(false));
  }, []);

  // Fetch audit log when selected batch changes
  useEffect(() => {
    if (!selectedBatchId) return;
    setLoadingAudit(true);
    API.get(`/batches/${selectedBatchId}/audit`)
      .then((r) => {
        setAuditLog(r.data?.auditLog ?? r.data?.entries ?? r.data ?? []);
      })
      .catch(() => setAuditLog([]))
      .finally(() => setLoadingAudit(false));
  }, [selectedBatchId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  if (!user) return null;

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px',
          padding: '12px 20px', fontSize: '13px', color: 'var(--text)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Compliance
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
            Audit Log
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Full audit trail for batch workflows
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => showToast('Export coming soon')}
        >
          <Download size={15} />
          Export
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="#3b82f6" />
            </div>
            <TrendingUp size={12} color="var(--text-dim)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
            {loadingBatches ? <div style={{ width: '48px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} /> : (stats?.totalBatches ?? batches.length)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total Batches</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#f59e0b" />
            </div>
            <TrendingUp size={12} color="var(--text-dim)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
            {loadingBatches ? <div style={{ width: '48px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} /> : (stats?.pendingApprovals ?? '—')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Pending Approvals</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
            <TrendingUp size={12} color="var(--text-dim)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
            {loadingBatches ? <div style={{ width: '48px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} /> : (stats?.delayedBatches ?? '—')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Delayed / Escalated</div>
        </div>
      </div>

      {/* Delayed warning banner */}
      {!loadingBatches && (stats?.delayedBatches ?? 0) > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={16} />
          <span>
            <strong>{stats!.delayedBatches} batch(es)</strong> have exceeded the approval SLA and may be escalated.
          </span>
        </div>
      )}

      {/* Batch selector + timeline */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {/* Batch dropdown */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Select Batch
          </label>
          <div style={{ position: 'relative', display: 'inline-block', minWidth: '360px', maxWidth: '100%' }}>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={loadingBatches || batches.length === 0}
              style={{
                appearance: 'none', width: '100%',
                background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text)', padding: '10px 36px 10px 12px',
                fontSize: '13px', cursor: 'pointer', outline: 'none', fontFamily: 'inherit'
              }}
            >
              {loadingBatches && <option>Loading batches…</option>}
              {!loadingBatches && batches.length === 0 && <option>No batches available</option>}
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchName} {b.trainingCentre ? `· ${b.trainingCentre.name}` : ''} [{b.status}]
                </option>
              ))}
            </select>
            <ChevronDown size={14} color="var(--text-muted)" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
            {selectedBatch ? `Audit Trail — ${selectedBatch.batchName}` : 'Audit Trail'}
          </h3>

          {loadingAudit ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading audit log…</div>
          ) : auditLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Activity size={36} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>No audit entries</div>
              <div style={{ fontSize: '12px' }}>Events will appear here as the batch moves through the workflow.</div>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: '11px', top: '0', bottom: '0',
                width: '2px', background: 'rgba(51,65,85,0.5)', borderRadius: '2px'
              }} />

              {auditLog.map((entry, idx) => {
                const style = getActionStyle(entry.action);
                const Icon = style.icon;
                return (
                  <div key={entry.id ?? idx} style={{ position: 'relative', marginBottom: '24px', paddingLeft: '24px' }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: '-13px', top: '2px',
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: style.bg, border: `2px solid ${style.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={11} color={style.color} />
                    </div>

                    {/* Content */}
                    <div style={{
                      background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.3)',
                      borderRadius: '10px', padding: '14px 16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '12px', fontWeight: 700, color: style.color,
                          background: style.bg, padding: '2px 8px', borderRadius: '20px'
                        }}>
                          {style.label}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                          {entry.user?.name ?? 'System'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '20px' }}>
                          {ROLE_LABELS[entry.user?.role] ?? entry.user?.role}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          {entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
                        </span>
                      </div>
                      {entry.reason && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 10px', borderLeft: `3px solid ${style.color}` }}>
                          {entry.reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
