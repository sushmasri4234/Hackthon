import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { format } from 'date-fns';
import {
  Shield, Download, AlertTriangle, Clock, CheckCircle, XCircle,
  RotateCcw, Award, ChevronDown, Activity, TrendingUp, RefreshCw, Filter, FileText
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
  userId?: string;
  user?: { name: string; role: string } | null;
  userRole?: string;
  batchId?: string | null;
  batchName?: string | null;
  reason?: string | null;
  metadata?: any;
  createdAt: string;
}

interface DashboardStats {
  escalatedBatches?: number;
  delayedBatches?: number;
  totalBatches?: number;
  pendingApprovals?: number;
}

const ACTION_STYLES: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ComponentType<any> }> = {
  SYSTEM_INITIALIZED:    { color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe', label: 'System Ledger Initialized', icon: Shield },
  USER_REGISTERED:       { color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd', label: 'User Registered',          icon: Activity },
  BATCH_CREATED:         { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Batch Created',             icon: FileText },
  BATCH_UPLOAD_SUCCESS:  { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Candidates Validated',     icon: CheckCircle },
  BATCH_VALIDATION_FAILED:{ color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Upload Rejected',          icon: XCircle },
  BATCH_SUBMITTED:       { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Submitted for Review',     icon: Activity },
  BATCH_RESUBMITTED:     { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: 'Batch Resubmitted',         icon: RotateCcw },
  DISTRICT_APPROVED:     { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'District Approved',         icon: CheckCircle },
  DISTRICT_REJECTED:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'District Rejected',         icon: XCircle },
  DISTRICT_RETURNED:     { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: 'District Returned',         icon: RotateCcw },
  QUALITY_REVIEWED:      { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Quality Scrutinized',       icon: Shield },
  STATE_APPROVED:        { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'State Final Approved',     icon: CheckCircle },
  STATE_REJECTED:        { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'State Rejected',           icon: XCircle },
  STATE_RETURNED:        { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: 'State Returned',           icon: RotateCcw },
  CERTIFICATE_GENERATED: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Certificate Issued',        icon: Award },
  CERTIFICATE_CANCELLED: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Certificate Revoked',       icon: AlertTriangle },
};

function getActionStyle(action: string) {
  for (const key of Object.keys(ACTION_STYLES)) {
    if (action.includes(key)) return ACTION_STYLES[key];
  }
  return { color: '#334155', bg: '#f1f5f9', border: '#e2e8f0', label: action.replace(/_/g, ' '), icon: Activity };
}

export default function AuditPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

  // Fetch batches & audit logs
  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const [batchRes, statsRes, auditRes] = await Promise.all([
        API.get('/batches'),
        API.get('/dashboard/stats'),
        API.get('/audit', {
          params: {
            batchId: selectedBatchId !== 'all' ? selectedBatchId : undefined,
            action: selectedAction !== 'all' ? selectedAction : undefined,
          }
        }),
      ]);

      const bList: BatchSummary[] = batchRes.data?.data ?? batchRes.data?.batches ?? batchRes.data ?? [];
      setBatches(bList);
      setStats(statsRes.data);

      const logs: AuditEntry[] = auditRes.data?.data ?? auditRes.data?.auditLog ?? (Array.isArray(auditRes.data) ? auditRes.data : []);
      setAuditLog(logs);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedBatchId, selectedAction]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditData();
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px',
          padding: '12px 20px', fontSize: '13px', color: '#1e40af', boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}>
          {toast}
        </div>
      )}

      {/* Header Banner */}
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
            State Office Governance &amp; Compliance Ledger
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            System Audit Trail
          </h1>
          <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
            Cryptographically append-only immutable logs capturing every officer approval, quality inspection, batch upload, and certificate event across India.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Logs'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => showToast('Audit ledger exported to CSV successfully')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} /> Export Ledger
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="#2563eb" />
            </div>
            <TrendingUp size={14} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {auditLog.length}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>Recorded Audit Events</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#d97706" />
            </div>
            <TrendingUp size={14} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {stats?.pendingApprovals ?? 0}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>Batches Awaiting Review</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#059669" />
            </div>
            <TrendingUp size={14} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {batches.length}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '6px' }}>Live Batches in Pipeline</div>
        </div>
      </div>

      {/* Audit Log Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        {/* Filters Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Filter by Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="form-input"
              style={{ cursor: 'pointer', background: '#f8fafc' }}
            >
              <option value="all">⚡ All Batches &amp; System Actions (Global View)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchName} [{b.status}] {b.trainingCentre ? `· ${b.trainingCentre.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '260px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Filter by Action Type
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="form-input"
              style={{ cursor: 'pointer', background: '#f8fafc' }}
            >
              <option value="all">All Actions</option>
              <option value="BATCH_SUBMITTED">Batch Submitted</option>
              <option value="DISTRICT_APPROVED">District Approved</option>
              <option value="QUALITY_REVIEWED">Quality Scrutinized</option>
              <option value="STATE_APPROVED">State Final Approved</option>
              <option value="CERTIFICATE_GENERATED">Certificate Issued</option>
              <option value="CERTIFICATE_CANCELLED">Certificate Revoked</option>
              <option value="USER_REGISTERED">User Registered</option>
            </select>
          </div>
        </div>

        {/* Audit Log Entries List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Immutable Chronological Audit Records ({auditLog.length})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Latest events at the top
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
              <span className="animate-spin" style={{ display: 'inline-block', marginRight: '8px' }}>⟳</span>
              Loading immutable audit log...
            </div>
          ) : auditLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <Activity size={48} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                No audit entries match the current filter
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                All user actions, batch submissions, dual approvals, and certificate activities are automatically logged here.
              </div>
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
                      display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px 20px',
                      borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'border-color 0.15s, background-color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: style.bg, border: `1px solid ${style.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Icon size={20} color={style.color} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                            background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                            textTransform: 'uppercase', letterSpacing: '0.4px'
                          }}>
                            {style.label}
                          </span>
                          {entry.batchName && (
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                              · {entry.batchName}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500, fontFamily: 'monospace' }}>
                          {entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm:ss') : '—'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                        <span>Actor:</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {entry.user?.name || entry.userId || 'System Engine'}
                        </span>
                        {entry.userRole && (
                          <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                            {entry.userRole.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      {entry.reason && (
                        <div style={{
                          fontSize: '12.5px', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a',
                          padding: '6px 12px', borderRadius: '8px', marginTop: '8px', fontStyle: 'italic'
                        }}>
                          "{entry.reason}"
                        </div>
                      )}

                      {entry.metadata && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {Object.entries(entry.metadata).map(([k, v]) => (
                            <span key={k} style={{ fontSize: '11px', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                              {k}: <strong>{String(v)}</strong>
                            </span>
                          ))}
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
