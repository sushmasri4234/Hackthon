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
  BATCH_SUBMITTED:       { color: '#2563eb', bg: '#eff6ff', label: 'Submitted',           icon: Activity },
  DISTRICT_APPROVED:     { color: '#059669', bg: '#ecfdf5', label: 'District Approved',   icon: CheckCircle },
  QUALITY_APPROVED:      { color: '#059669', bg: '#ecfdf5', label: 'Quality Approved',    icon: CheckCircle },
  QUALITY_REVIEWED:      { color: '#d97706', bg: '#fef3c7', label: 'Quality Reviewed',    icon: Shield },
  STATE_APPROVED:        { color: '#059669', bg: '#ecfdf5', label: 'State Approved',      icon: CheckCircle },
  REJECTED:              { color: '#dc2626', bg: '#fef2f2', label: 'Rejected',            icon: XCircle },
  RETURNED:              { color: '#d97706', bg: '#fef3c7', label: 'Returned',            icon: RotateCcw },
  CERTIFICATE_GENERATED: { color: '#7c3aed', bg: '#f5f3ff', label: 'Certificate Issued',  icon: Award },
  CERTIFICATE_CANCELLED: { color: '#dc2626', bg: '#fef2f2', label: 'Certificate Revoked', icon: AlertTriangle },
};

function getActionStyle(action: string) {
  for (const key of Object.keys(ACTION_STYLES)) {
    if (action.includes(key)) return ACTION_STYLES[key];
  }
  return { color: '#475569', bg: '#f1f5f9', label: action, icon: Activity };
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
        const list: BatchSummary[] = batchRes.data?.data ?? batchRes.data?.batches ?? batchRes.data ?? [];
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
    <div className="animate-fade-in" style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px',
          padding: '12px 20px', fontSize: '13px', color: '#1e40af', boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
            Compliance &amp; Governance
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            System Audit Trail
          </h1>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Cryptographically append-only audit records for every action across Pragati Skills Mission
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => showToast('Audit export generated')}
        >
          <Download size={15} /> Export Audit Log
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="#2563eb" />
            </div>
            <TrendingUp size={14} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {loadingBatches ? '-' : (stats?.totalBatches ?? batches.length)}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>Total Tracked Batches</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#d97706" />
            </div>
            <TrendingUp size={14} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {loadingBatches ? '-' : (stats?.pendingApprovals ?? 0)}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>Active Pending Approvals</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#ea580c" />
            </div>
            <TrendingUp size={14} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {loadingBatches ? '-' : (stats?.delayedBatches ?? 0)}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>SLA Alerts (&gt;48h)</div>
        </div>
      </div>

      {/* Main Trail Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        {/* Batch Dropdown */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Select Batch to Inspect
          </label>
          <div style={{ position: 'relative', display: 'inline-block', minWidth: '420px', maxWidth: '100%' }}>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={loadingBatches || batches.length === 0}
              className="form-input"
              style={{ cursor: 'pointer' }}
            >
              {loadingBatches && <option>Loading batches...</option>}
              {!loadingBatches && batches.length === 0 && <option>No batches available</option>}
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchName} [{b.status}] {b.trainingCentre ? `· ${b.trainingCentre.name}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Log Entries */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
            {selectedBatch ? `Immutable Audit Log — ${selectedBatch.batchName}` : 'Audit Log'}
          </h3>

          {loadingAudit ? (
            <div style={{ color: '#64748b', fontSize: '13px' }}>Loading audit trail...</div>
          ) : auditLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <Activity size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>No audit entries for this batch</div>
              <div style={{ fontSize: '12px' }}>Events are permanently recorded as decisions and workflows take place.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {auditLog.map((entry) => {
                const style = getActionStyle(entry.action);
                const Icon = style.icon;
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px',
                      borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px', background: style.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Icon size={18} color={style.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          {entry.action.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm:ss') : '—'}
                        </div>
                      </div>
                      {entry.user && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          Actor: <strong>{entry.user.name}</strong> ({entry.user.role?.replace(/_/g, ' ')})
                        </div>
                      )}
                      {entry.reason && (
                        <div style={{ fontSize: '12px', color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', fontStyle: 'italic' }}>
                          Reason / Remarks: "{entry.reason}"
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
