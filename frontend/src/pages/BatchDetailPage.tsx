import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, RotateCcw, Download, AlertCircle, ChevronRight, Users, Clock, FileText, Shield } from 'lucide-react';

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
    if ((decision === 'REJECTED' || decision === 'RETURNED') && !reason.trim()) {
      toast.error('Please provide a mandatory reason for rejection/return');
      return;
    }
    setActionLoading(true);
    try {
      const endpoint = showDecisionModal === 'district' ? 'district-approve'
        : showDecisionModal === 'quality' ? 'quality-review'
        : 'state-approve';
      const { data } = await API.post(`/batches/${id}/${endpoint}`, { decision, reason: reason || undefined });
      toast.success(data.message || 'Decision recorded successfully');
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

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading batch details...</div>;
  if (!batch) return <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Batch not found</div>;

  const latestSubmission = batch.submissions?.[0];
  const districtApprovals = latestSubmission?.districtApprovals || [];
  const hasUserApproved = districtApprovals.some((a: any) => a.officerId === user?.id);

  const canDistrictApprove = user?.role === 'DISTRICT_OFFICER' && batch.status === 'DISTRICT_REVIEW' && !hasUserApproved;
  const canQualityReview = user?.role === 'QUALITY_TEAM' && batch.status === 'QUALITY_REVIEW' && !latestSubmission?.qualityReview;
  const canStateApprove = user?.role === 'STATE_OFFICE' && batch.status === 'STATE_REVIEW' && !latestSubmission?.stateApproval;

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
        <span style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 500 }} onClick={() => navigate('/batches')}>Batches</span>
        <ChevronRight size={14} />
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{batch.batchName}</span>
      </div>

      {/* Header Banner */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{batch.batchName}</h1>
            <span className={`badge ${STATUS_BADGE_MAP[batch.status] || 'badge-draft'}`}>
              {STATUS_LABELS[batch.status] || batch.status}
            </span>
            {batch.isLargeBatch && (
              <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                LARGE BATCH (&gt;50)
              </span>
            )}
          </div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>
            {batch.courseName} · {batch.trainingCentre?.name || 'Skill Centre'} · {batch.district?.name || 'District'}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {canDistrictApprove && (
            <button className="btn btn-primary" onClick={() => setShowDecisionModal('district')}>
              <CheckCircle size={15} /> District Review &amp; Decision
            </button>
          )}
          {canQualityReview && (
            <button className="btn btn-warning" onClick={() => setShowDecisionModal('quality')}>
              <Shield size={15} /> Submit Quality Review
            </button>
          )}
          {canStateApprove && (
            <button className="btn btn-success" onClick={() => setShowDecisionModal('state')}>
              <CheckCircle size={15} /> State Final Approval
            </button>
          )}
          {user?.role === 'TRAINING_CENTRE' && batch.status === 'RETURNED' && (
            <button className="btn btn-primary" onClick={() => navigate(`/batches/${id}/resubmit`)}>
              <RotateCcw size={15} /> Resubmit Corrected Batch
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Left Column: Timeline & Candidates */}
        <div>
          {/* Approval Timeline */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#2563eb" /> Multi-Tier Approval Workflow Timeline
            </h3>
            <div style={{ position: 'relative', paddingLeft: '28px' }}>
              {[
                { label: 'Batch Uploaded', done: true, actor: batch.uploadedBy?.name, time: batch.createdAt },
                { label: 'Submitted for Review', done: !!latestSubmission, actor: latestSubmission?.submittedBy?.name, time: latestSubmission?.submittedAt },
                { label: 'District Officer 1 Approval', done: districtApprovals.length >= 1, actor: districtApprovals[0]?.officer?.name, decision: districtApprovals[0]?.decision },
                { label: 'District Officer 2 Approval (Consensus)', done: districtApprovals.length >= 2, actor: districtApprovals[1]?.officer?.name, decision: districtApprovals[1]?.decision },
                ...(batch.isLargeBatch ? [{ label: 'Quality Team Scrutiny', done: !!latestSubmission?.qualityReview, actor: latestSubmission?.qualityReview?.reviewer?.name, decision: latestSubmission?.qualityReview?.decision }] : []),
                { label: 'State Office Final Authorization', done: !!latestSubmission?.stateApproval, actor: latestSubmission?.stateApproval?.approvedBy?.name, decision: latestSubmission?.stateApproval?.decision },
                { label: 'Digital Certificates Issued', done: batch.status === 'APPROVED' || (batch.certificates && batch.certificates.length > 0), actor: 'CertiFlow Engine' },
              ].map((step, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: i === arr.length - 1 ? '0' : '20px', position: 'relative' }}>
                  {/* Line */}
                  {i < arr.length - 1 && (
                    <div style={{
                      position: 'absolute', left: '-19px', top: '22px', bottom: '-20px', width: '2px',
                      background: step.done ? '#10b981' : '#e2e8f0'
                    }} />
                  )}
                  {/* Dot */}
                  <div style={{
                    position: 'absolute', left: '-25px', width: '14px', height: '14px', borderRadius: '50%', top: '4px',
                    background: step.done ? '#10b981' : '#f1f5f9',
                    border: `2px solid ${step.done ? '#059669' : '#cbd5e1'}`,
                    boxShadow: step.done ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none'
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: step.done ? '#0f172a' : '#64748b' }}>
                      {step.label}
                    </div>
                    {step.actor && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        by {step.actor} {step.time ? `· ${format(new Date(step.time), 'dd MMM yyyy, HH:mm')}` : ''}
                      </div>
                    )}
                    {(step as any).decision && (
                      <span className={`badge ${(step as any).decision === 'APPROVED' ? 'badge-approved' : (step as any).decision === 'REJECTED' ? 'badge-rejected' : 'badge-returned'}`} style={{ marginTop: '4px' }}>
                        {(step as any).decision}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Candidates Table */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#2563eb" /> Candidate Records ({batch.candidates?.length ?? batch.totalCandidates ?? 0})
            </h3>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate ID</th>
                    <th>Full Name</th>
                    <th>Course</th>
                    <th>Marks</th>
                    <th>Status</th>
                    <th>Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.candidates?.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{c.candidateExtId}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{c.fullName}</td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{c.courseName || batch.courseName}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: c.marks >= 75 ? '#059669' : '#d97706' }}>
                          {c.marks}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'CERTIFIED' ? 'badge-approved' : 'badge-submitted'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {c.certificate ? (
                          <span style={{ color: '#2563eb', fontWeight: 600, fontFamily: 'monospace' }}>
                            {c.certificate.certificateNumber}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Batch Details & Audit History */}
        <div>
          {/* Batch Details Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Batch Metadata
            </h3>
            {[
              { label: 'Course', value: batch.courseName },
              { label: 'Training Centre', value: batch.trainingCentre?.name },
              { label: 'District', value: batch.district?.name },
              { label: 'Uploaded By', value: batch.uploadedBy?.name },
              { label: 'Total Candidates', value: batch.totalCandidates },
              { label: 'Submissions', value: batch.submissionCount || 1 },
              { label: 'Created On', value: batch.createdAt ? format(new Date(batch.createdAt), 'dd MMM yyyy') : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{String(value ?? '—')}</span>
              </div>
            ))}
          </div>

          {/* Audit History Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Immutable Audit Trail
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {audit.map((a: any) => (
                <div key={a.id} style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', borderLeft: '3px solid #2563eb' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                    {a.action.replace(/_/g, ' ')}
                  </div>
                  {a.user && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {a.user.name} ({a.userRole?.replace(/_/g, ' ')})
                    </div>
                  )}
                  {a.reason && (
                    <div style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px', marginTop: '4px', fontStyle: 'italic' }}>
                      "{a.reason}"
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
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
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '18px',
            width: '500px',
            padding: '32px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              {showDecisionModal === 'district' ? 'District Officer Decision'
                : showDecisionModal === 'quality' ? 'Quality Team Review'
                : 'State Office Final Authorization'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
              Your decision will be cryptographically appended to the immutable audit trail.
            </p>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Decision</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['APPROVED', 'REJECTED', 'RETURNED'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDecision(d)}
                    className={`btn ${decision === d ? (d === 'APPROVED' ? 'btn-success' : d === 'REJECTED' ? 'btn-danger' : 'btn-warning') : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {d === 'APPROVED' ? '✓ Approve' : d === 'REJECTED' ? '✗ Reject' : '↩ Return'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Reason {(decision === 'REJECTED' || decision === 'RETURNED') ? '(Required)' : '(Optional Notes)'}
              </label>
              <textarea
                className="form-input"
                placeholder={decision === 'APPROVED' ? 'Optional remarks for approval...' : 'Explain the reason for return or rejection...'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowDecisionModal(null); setReason(''); }}>
                Cancel
              </button>
              <button
                className={`btn ${decision === 'APPROVED' ? 'btn-success' : decision === 'REJECTED' ? 'btn-danger' : 'btn-warning'}`}
                onClick={submitDecision}
                disabled={actionLoading}
              >
                {actionLoading ? 'Recording...' : `Confirm ${decision}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
