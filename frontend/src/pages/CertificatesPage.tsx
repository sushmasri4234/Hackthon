import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { format } from 'date-fns';
import {
  Award, Download, XCircle, ExternalLink, ChevronLeft, ChevronRight, FileText, Shield
} from 'lucide-react';

interface Certificate {
  id: string;
  certificateNumber: string;
  candidateName: string;
  course: string;
  trainingCentre: { name: string };
  status: 'ACTIVE' | 'CANCELLED';
  issuedDate: string;
}

interface CancelModalState {
  open: boolean;
  certId: string;
  certNo: string;
  reason: string;
  submitting: boolean;
  error: string;
}

const LIMIT = 20;

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<CancelModalState>({
    open: false, certId: '', certNo: '', reason: '', submitting: false, error: ''
  });

  const fetchCerts = useCallback(() => {
    setLoading(true);
    API.get('/certificates', { params: { page, limit: LIMIT } })
      .then((r) => {
        setCertificates(r.data?.certificates ?? r.data?.data ?? r.data ?? []);
        setTotal(r.data?.total ?? r.data?.count ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDownload = async (id: string, certNo: string) => {
    try {
      const res = await API.get(`/certificates/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to download certificate.');
    }
  };

  const openCancelModal = (cert: Certificate) => {
    setModal({ open: true, certId: cert.id, certNo: cert.certificateNumber, reason: '', submitting: false, error: '' });
  };

  const handleCancel = async () => {
    if (modal.reason.trim().length < 10) {
      setModal((m) => ({ ...m, error: 'Reason must be at least 10 characters.' }));
      return;
    }
    setModal((m) => ({ ...m, submitting: true, error: '' }));
    try {
      await API.post(`/certificates/${modal.certId}/cancel`, { reason: modal.reason });
      setModal((m) => ({ ...m, open: false }));
      showToast('Certificate cancelled successfully.');
      fetchCerts();
    } catch {
      setModal((m) => ({ ...m, submitting: false, error: 'Failed to cancel. Please try again.' }));
    }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
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
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Records
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
          Certificates
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {user.role === 'STATE_OFFICE' ? 'All issued certificates' : 'Certificates for your training centre'}
        </div>
      </div>

      {/* Table card */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
        ) : certificates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <Award size={40} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>No certificates found</div>
            <div style={{ fontSize: '13px' }}>Certificates will appear here once batches are approved.</div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Certificate No.', 'Candidate Name', 'Course', 'Training Centre', 'Status', 'Issued Date', 'Actions'].map((h) => (
                      <th key={h} style={{
                        padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
                        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px',
                        whiteSpace: 'nowrap'
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert, idx) => (
                    <tr
                      key={cert.id}
                      style={{
                        borderBottom: idx < certificates.length - 1 ? '1px solid rgba(51,65,85,0.3)' : 'none',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        {cert.certificateNumber}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>{cert.candidateName}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{cert.course}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{cert.trainingCentre?.name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={cert.status === 'ACTIVE' ? 'badge badge-approved' : 'badge badge-cancelled'}>
                          {cert.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {cert.issuedDate ? format(new Date(cert.issuedDate), 'dd MMM yyyy') : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {/* Download */}
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            title="Download PDF"
                            onClick={() => handleDownload(cert.id, cert.certificateNumber)}
                          >
                            <Download size={13} />
                          </button>

                          {/* Verify */}
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            title="Public verify"
                            onClick={() => window.open(`/verify/${cert.certificateNumber}`, '_blank')}
                          >
                            <ExternalLink size={13} />
                          </button>

                          {/* Cancel (STATE_OFFICE only, ACTIVE only) */}
                          {user.role === 'STATE_OFFICE' && cert.status === 'ACTIVE' && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '5px 10px', fontSize: '12px', color: '#ef4444' }}
                              title="Cancel certificate"
                              onClick={() => openCancelModal(cert)}
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderTop: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Page {page} of {totalPages} · {total} certificates
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px' }}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px' }}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel Modal */}
      {modal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal((m) => ({ ...m, open: false })); }}
        >
          <div className="glass-card" style={{ width: '480px', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={18} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Cancel Certificate</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{modal.certNo}</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Reason for Cancellation *
              </label>
              <textarea
                value={modal.reason}
                onChange={(e) => setModal((m) => ({ ...m, reason: e.target.value, error: '' }))}
                rows={4}
                placeholder="Provide a detailed reason (minimum 10 characters)…"
                style={{
                  width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text)', padding: '10px 12px', fontSize: '13px',
                  resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit'
                }}
              />
              {modal.error && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{modal.error}</div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {modal.reason.length} / 10 min chars
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setModal((m) => ({ ...m, open: false }))}
                disabled={modal.submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleCancel}
                disabled={modal.submitting}
              >
                {modal.submitting ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
