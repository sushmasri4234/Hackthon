import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { format } from 'date-fns';
import {
  Clock, AlertTriangle, CheckCircle, FileText, ArrowRight, Users, Timer, TrendingUp, ShieldCheck
} from 'lucide-react';

interface Batch {
  id: string;
  batchName: string;
  courseName?: string;
  status: string;
  totalCandidates: number;
  candidates?: any[];
  trainingCentre?: { name: string };
  district?: { name: string };
  updatedAt: string;
  createdAt: string;
  isLargeBatch?: boolean;
  submissions?: any[];
}

function getStatusForRole(role: string): string {
  switch (role) {
    case 'DISTRICT_OFFICER': return 'DISTRICT_REVIEW';
    case 'QUALITY_TEAM':    return 'QUALITY_REVIEW';
    case 'STATE_OFFICE':    return 'STATE_REVIEW';
    default:                return 'DISTRICT_REVIEW';
  }
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [delayedBatches, setDelayedBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const status = getStatusForRole(user.role);
    setLoading(true);
    Promise.all([
      API.get(`/batches?status=${status}`),
      API.get('/dashboard/delayed-batches').catch(() => ({ data: [] })),
    ])
      .then(([batchRes, delayedRes]) => {
        const rawBatches = batchRes.data?.data || batchRes.data?.batches || (Array.isArray(batchRes.data) ? batchRes.data : []);
        setBatches(rawBatches);
        const rawDelayed = delayedRes.data?.batches || (Array.isArray(delayedRes.data) ? delayedRes.data : []);
        setDelayedBatches(rawDelayed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const roleTitle = user.role === 'DISTRICT_OFFICER' ? 'District Officer Approvals'
    : user.role === 'QUALITY_TEAM' ? 'Quality Team Review Queue'
    : 'State Office Final Approvals';

  const roleSubtitle = user.role === 'DISTRICT_OFFICER' ? 'Batches requiring district officer validation and consensus.'
    : user.role === 'QUALITY_TEAM' ? 'High-capacity batches (>50 candidates) flagged for thorough quality scrutiny.'
    : 'Batches with completed district & quality approvals ready for final state certificate sign-off.';

  return (
    <div className="animate-fade-in" style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
          Workflow Queue
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
          {roleTitle}
        </h1>
        <div style={{ fontSize: '14px', color: '#64748b' }}>
          {roleSubtitle}
        </div>
      </div>

      {/* Delayed alert banner */}
      {!loading && delayedBatches.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={18} color="#b45309" />
          <span>
            <strong>{delayedBatches.length} batch(es)</strong> have exceeded the 48-hour approval deadline. Please prioritize these reviews.
          </span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {loading ? '—' : batches.length}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>Awaiting Your Action</div>
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {user.role === 'DISTRICT_OFFICER' ? '2 Officers' : user.role === 'QUALITY_TEAM' ? '100% Audit' : 'State Sign-off'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>Approval Standard</div>
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Timer size={22} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              48h SLA
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>Turnaround Target</div>
          </div>
        </div>
      </div>

      {/* Batch Cards List */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Batches Waiting for Review ({batches.length})
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Click any batch to inspect candidates and submit decision</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <span className="animate-spin" style={{ display: 'inline-block', fontSize: '20px', marginBottom: '8px' }}>⟳</span>
            <div>Loading pending batches...</div>
          </div>
        ) : batches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: '#64748b' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} color="#059669" />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Queue is Clear!</div>
            <div style={{ fontSize: '13.5px', maxWidth: '400px', margin: '0 auto' }}>
              There are no candidate batches waiting for your approval right now.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {batches.map((batch) => {
              const candidateCount = batch.totalCandidates || batch.candidates?.length || 0;
              const sub = batch.submissions?.[0];
              const approvalsCount = sub?.districtApprovals?.length || 0;

              return (
                <div
                  key={batch.id}
                  onClick={() => navigate(`/batches/${batch.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 20px',
                    borderRadius: '14px', background: '#ffffff', border: '1.5px solid #e2e8f0',
                    cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#93c5fd';
                    (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(37,99,235,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                    (e.currentTarget as HTMLElement).style.background = '#ffffff';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <FileText size={20} color="#2563eb" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {batch.batchName}
                      </span>
                      {batch.isLargeBatch && (
                        <span className="badge badge-quality" style={{ fontSize: '10px' }}>Large Batch</span>
                      )}
                      {user.role === 'DISTRICT_OFFICER' && (
                        <span className="badge badge-district" style={{ fontSize: '10px' }}>
                          Approvals: {approvalsCount}/2
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span><strong>Course:</strong> {batch.courseName}</span>
                      <span><strong>Centre:</strong> {batch.trainingCentre?.name || 'Skill Centre'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} /> {candidateCount} candidates
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#94a3b8' }}>
                      Updated {batch.updatedAt ? format(new Date(batch.updatedAt), 'dd MMM, HH:mm') : 'recently'}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/batches/${batch.id}`);
                      }}
                    >
                      Review & Decide <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
