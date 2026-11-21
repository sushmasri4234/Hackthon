import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, RotateCcw, Download, AlertCircle, ChevronRight, Users, Clock, FileText } from 'lucide-react';

const STATUS_BADGE_MAP: Record<string, string> = {
  DRAFT: 'badge-draft', SUBMITTED: 'badge-submitted', DISTRICT_REVIEW: 'badge-district',
  QUALITY_REVIEW: 'badge-quality', STATE_REVIEW: 'badge-state', APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected', RETURNED: 'badge-returned', CANCELLED: 'badge-cancelled',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', DISTRICT_REVIEW: 'District Review',
  QUALITY_REVIEW: 'Quality Review', STATE_REVIEW: 'State Review', APPROVED: 'Approved',
  REJECTED: 'Rejected', RETURNED: 'Returned', CANCELLED: 'Cancelled',
};

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Decision state
  const [showDecisionModal, setShowDecisionModal] = useState<null | 'district' | 'quality' | 'state'>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'RETURNED'>('APPROVED');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      API.get(`/batches/${id}`),
      API.get(`/batches/${id}/audit`),
    ]).then(([batchRes, auditRes]) => {
      setBatch(batchRes.data);
      setAudit(auditRes.data);
    }).catch(() => toast.error('Failed to load batch'))
      .finally(() => setLoading(false));
  }, [id]);

  const submitDecision = async () => {
    if (!id || !showDecisionModal) return;
    if ((decision === 'REJECTED' || decision === 'RETURNED') && !reason) {
      toast.error('Please provide a reason');
      return;
    }
    setActionLoading(true);
    try {
      const endpoint = showDecisionModal === 'district' ? 'district-approve'
        : showDecisionModal === 'quality' ? 'quality-review'
        : 'state-approve';
      const { data } = await API.post(`/batches/${id}/${endpoint}`, { decision, reason: reason || undefined });
      toast.success(data.message || 'Decision recorded');
      setShowDecisionModal(null);
      setReason('');
      // Reload
      const batchRes = await API.get(`/batches/${id}`);
      setBatch(batchRes.data);
      const auditRes = await API.get(`/batches/${id}/audit`);
      setAudit(auditRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!batch) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Batch not found</div>;

  const latestSubmission = batch.submissions?.[0];
  const districtApprovals = latestSubmission?.districtApprovals || [];
  const hasUserApproved = districtApprovals.some((a: any) => a.officerId === user?.id);

  const canDistrictApprove = user?.role === 'DISTRICT_OFFICER' && batch.status === 'DISTRICT_REVIEW' && !hasUserApproved;
  const canQualityReview = user?.role === 'QUALITY_TEAM' && batch.status === 'QUALITY_REVIEW' && !latestSubmission?.qualityReview;
  const canStateApprove = user?.role === 'STATE_OFFICE' && batch.status === 'STATE_REVIEW' && !latestSubmission?.stateApproval;

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
        <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => navigate('/batches')}>Batches</span>
        <ChevronRight size={12} />
        <span>{batch.batchName}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>{batch.batchName}</h1>
            <span className={`badge ${STATUS_BADGE_MAP[batch.status] || 'badge-draft'}`}>
              {STATUS_LABELS[batch.status] || batch.status}
            </span>
            {batch.isLargeBatch && <span className="badge badge-warning">LARGE BATCH</span>}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {batch.courseName} · {batch.trainingCentre?.name} · {batch.district?.name}
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {canDistrictApprove && (
            <button className="btn btn-primary" onClick={() => setShowDecisionModal('district')}>
              <CheckCircle size={14} /> Review Batch
            </button>
          )}
          {canQualityReview && (
            <button className="btn btn-warning" onClick={() => setShowDecisionModal('quality')}>
              <CheckCircle size={14} /> Submit Quality Review
            </button>
          )}
          {canStateApprove && (
            <button className="btn btn-success" onClick={() => setShowDecisionModal('state')}>
              <CheckCircle size={14} /> Final Approval
            </button>
          )}
          {user?.role === 'TRAINING_CENTRE' && batch.status === 'RETURNED' && (
            <button className="btn btn-primary" onClick={() => navigate(`/batches/${id}/resubmit`)}>
              <RotateCcw size={14} /> Resubmit
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        {/* Left Column */}
        <div>
          {/* Approval Timeline */}
          <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} /> Approval Timeline
            </h3>
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              {/* Timeline steps */}
              {[
                { label: 'Batch Created', done: true, actor: batch.uploadedBy?.name, time: batch.createdAt },
                { label: 'Submitted for Review', done: !!latestSubmission, actor: latestSubmission?.submittedBy?.name, time: latestSubmission?.submittedAt },
                { label: 'District Officer 1', done: districtApprovals.length >= 1, actor: districtApprovals[0]?.officer?.name, decision: districtApprovals[0]?.decision },
                { label: 'District Officer 2', done: districtApprovals.length >= 2, actor: districtApprovals[1]?.officer?.name, decision: districtApprovals[1]?.decision },
                ...(batch.isLargeBatch ? [{ label: 'Quality Review', done: !!latestSubmission?.qualityReview, actor: latestSubmission?.qualityReview?.reviewer?.name, decision: latestSubmission?.qualityReview?.decision }] : []),
                { label: 'State Final Approval', done: !!latestSubmission?.stateApproval, actor: latestSubmission?.stateApproval?.approvedBy?.name, decision: latestSubmission?.stateApproval?.decision },
                { label: 'Certificates Generated', done: batch._count?.certificates > 0, actor: null },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '20px', position: 'relative' }}>
                  {/* Timeline line */}
                  {i < 6 && <div style={{ position: 'absolute', left: '-15px', top: '24px', bottom: '-20px', width: '2px', background: step.done ? 'var(--success)' : 'var(--border)' }} />}
                  {/* Dot */}
                  <div style={{
                    position: 'absolute', left: '-20px', width: '12px', height: '12px', borderRadius: '50%', top: '4px',
                    background: step.done ? '#10b981' : 'var(--border)',
                    border: `2px solid ${step.done ? '#10b981' : 'var(--border)'}`,
                    boxShadow: step.done ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: step.done ? 'var(--text)' : 'var(--text-muted)' }}>{step.label}</div>
                    {step.actor && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{step.actor}</div>}
                    {(step as any).decision && (
                      <span className={`badge ${(step as any).decision === 'APPROVED' ? 'badge-approved' : (step as any).decision === 'REJECTED' ? 'badge-rejected' : 'badge-returned'}`} style={{ marginTop: '4px' }}>
                        {(step as any).decision}
                      </span>
                    )}
                    {!step.done && i === [true, !!latestSubmission, districtApprovals.length >= 1, districtApprovals.length >= 2, !!latestSubmission?.qualityReview, !!latestSubmission?.stateApproval, batch._count?.certificates > 0].lastIndexOf(true) + 1 && (
                      <span className="badge badge-state" style={{ marginTop: '4px' }}>Awaiting</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Candidates Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} /> Candidates ({batch.candidates?.length ?? 0})
            </h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Course</th><th>Marks</th><th>Status</th><th>Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.candidates?.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{c.candidateExtId}</td>
                      <td style={{ fontWeight: 600 }}>{c.fullName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.courseName}</td>
                      <td>{c.marks}</td>
                      <td><span className={`badge ${c.status === 'CERTIFIED' ? 'badge-approved' : 'badge-pending'}`}>{c.status}</span></td>
                      <td style={{ fontSize: '12px' }}>
                        {c.certificate ? (
                          <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{c.certificate.certificateNumber}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Batch Info */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch Details</h3>
            {[
              { label: 'Course', value: batch.courseName },
              { label: 'Training Centre', value: batch.trainingCentre?.name },
              { label: 'District', value: batch.district?.name },
              { label: 'Uploaded By', value: batch.uploadedBy?.name },
              { label: 'Total Candidates', value: batch.totalCandidates },
              { label: 'Submissions', value: batch.submissionCount },
              { label: 'Created', value: batch.createdAt ? format(new Date(batch.createdAt), 'dd MMM yyyy') : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{String(value ?? '—')}</span>
              </div>
            ))}
          </div>

          {/* Audit Summary */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Audit History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {audit.map((a: any) => (
                <div key={a.id} style={{ padding: '8px', borderRadius: '6px', background: 'rgba(15,23,42,0.4)', borderLeft: '3px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>{a.action.replace(/_/g, ' ')}</div>
                  {a.user && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.user.name} ({a.userRole})</div>}
                  {a.reason && <div style={{ fontSize: '11px', color: '#fcd34d', fontStyle: 'italic' }}>"{a.reason}"</div>}
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {a.createdAt ? format(new Date(a.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {showDecisionModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '480px', padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
              {showDecisionModal === 'district' ? 'District Officer Decision'
                : showDecisionModal === 'quality' ? 'Quality Review Decision'
                : 'State Office Final Decision'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Your decision will be recorded in the audit log.
            </p>

            <div className="form-group">
              <label className="form-label">Decision</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['APPROVED', 'REJECTED', 'RETURNED'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDecision(d)}
                    className={`btn ${decision === d ? (d === 'APPROVED' ? 'btn-success' : d === 'REJECTED' ? 'btn-danger' : 'btn-warning') : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                  >
                    {d === 'APPROVED' ? '✓ Approve' : d === 'REJECTED' ? '✗ Reject' : '↩ Return'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Reason {(decision === 'REJECTED' || decision === 'RETURNED') ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                className="form-input"
                placeholder="Provide a reason for your decision..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setShowDecisionModal(null); setReason(''); }}>Cancel</button>
              <button
                className={`btn ${decision === 'APPROVED' ? 'btn-success' : decision === 'REJECTED' ? 'btn-danger' : 'btn-warning'}`}
                onClick={submitDecision}
                disabled={actionLoading}
              >
                {actionLoading ? '...' : `Confirm ${decision}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
