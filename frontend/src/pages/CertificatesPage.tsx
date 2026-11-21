import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { format } from 'date-fns';
import {
  Award, Download, XCircle, ExternalLink, ChevronLeft, ChevronRight, FileText, CheckCircle, Shield, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Certificate {
  id: string;
  certificateNumber: string;
  candidateName?: string;
  course?: string;
  trainingCentre?: { name: string } | string;
  status: 'ACTIVE' | 'CANCELLED';
  generatedAt?: string;
  issuedDate?: string;
  candidate?: {
    fullName?: string;
    courseName?: string;
    trainingCentre?: string;
    district?: string;
  };
  batch?: {
    batchName?: string;
    courseName?: string;
    trainingCentre?: { name: string };
  };
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cancelModal, setCancelModal] = useState<{ open: boolean; cert: Certificate | null; reason: string; submitting: boolean }>({
    open: false, cert: null, reason: '', submitting: false
  });

  const fetchCerts = useCallback(() => {
    setLoading(true);
    API.get('/certificates')
      .then((r) => {
        const raw = r.data?.data || r.data?.certificates || (Array.isArray(r.data) ? r.data : []);
        setCertificates(raw);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCerts();
  }, [fetchCerts]);

  const handleDownload = async (id: string, certNo: string) => {
    try {
      const res = await API.get(`/certificates/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${certNo}.pdf`);
    } catch {
      toast.error('Failed to download certificate PDF.');
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelModal.cert) return;
    if (cancelModal.reason.trim().length < 10) {
      toast.error('Please enter a cancellation reason of at least 10 characters.');
      return;
    }
    setCancelModal(m => ({ ...m, submitting: true }));
    try {
      await API.post(`/certificates/${cancelModal.cert.id}/cancel`, { reason: cancelModal.reason });
      toast.success(`Certificate ${cancelModal.cert.certificateNumber} has been revoked.`);
      setCancelModal({ open: false, cert: null, reason: '', submitting: false });
      fetchCerts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Cancellation failed');
      setCancelModal(m => ({ ...m, submitting: false }));
    }
  };

  const filtered = certificates.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const certNo = c.certificateNumber?.toLowerCase() || '';
    const name = (c.candidateName || c.candidate?.fullName || '').toLowerCase();
    const course = (c.course || c.candidate?.courseName || '').toLowerCase();
    return certNo.includes(q) || name.includes(q) || course.includes(q);
  });

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
            Issued Credentials
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Issued Certificates
          </h1>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Authentic, tamper-evident digital certificates verified by the Pragati Skills Mission.
          </div>
        </div>

        <button
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px' }}
          onClick={() => window.open('/verify', '_blank')}
        >
          <Shield size={16} color="#2563eb" /> Public Verification Portal
        </button>
      </div>

      {/* Stats summary banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{certificates.length}</div>
            <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Total Certificates Issued</div>
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              {certificates.filter(c => c.status === 'ACTIVE').length}
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Active & Valid</div>
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={22} color="#e11d48" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
              {certificates.filter(c => c.status === 'CANCELLED').length}
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Revoked / Cancelled</div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '18px', display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '40px' }}
            placeholder="Search by Certificate ID (e.g. PSM-2024-...), candidate name, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Certificates Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
            <span className="animate-spin" style={{ display: 'inline-block', fontSize: '20px', marginBottom: '8px' }}>⟳</span>
            <div>Loading certificates...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: '#64748b' }}>
            <Award size={48} style={{ opacity: 0.25, margin: '0 auto 14px' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>No Certificates Found</div>
            <div style={{ fontSize: '13.5px' }}>
              {search ? 'Try adjusting your search query.' : 'Once a batch receives final State Office approval, certificates appear here immediately.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Certificate No.</th>
                  <th>Candidate Name</th>
                  <th>Course Name</th>
                  <th>Training Centre</th>
                  <th>Status</th>
                  <th>Issued Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cert) => {
                  const candidateName = cert.candidateName || cert.candidate?.fullName || 'Candidate';
                  const courseName = cert.course || cert.candidate?.courseName || cert.batch?.courseName || 'Vocational Training';
                  const tcName = typeof cert.trainingCentre === 'string'
                    ? cert.trainingCentre
                    : cert.trainingCentre?.name || cert.candidate?.trainingCentre || cert.batch?.trainingCentre?.name || 'Skill Centre';
                  const dateStr = cert.generatedAt || cert.issuedDate;

                  return (
                    <tr key={cert.id}>
                      <td style={{ fontWeight: 700, color: '#1d4ed8', fontFamily: 'monospace', fontSize: '13px' }}>
                        {cert.certificateNumber}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {candidateName}
                      </td>
                      <td style={{ color: '#475569' }}>
                        {courseName}
                      </td>
                      <td style={{ color: '#64748b', fontSize: '13px' }}>
                        {tcName}
                      </td>
                      <td>
                        <span className={`badge ${cert.status === 'ACTIVE' ? 'badge-approved' : 'badge-cancelled'}`}>
                          {cert.status}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '12.5px' }}>
                        {dateStr ? format(new Date(dateStr), 'dd MMM yyyy') : 'Recently'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {/* Download PDF */}
                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title="Download Vector PDF Certificate"
                            onClick={() => handleDownload(cert.id, cert.certificateNumber)}
                          >
                            <Download size={13} /> PDF
                          </button>

                          {/* Verify Link */}
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title="Open public verification page"
                            onClick={() => window.open(`/verify/${cert.certificateNumber}`, '_blank')}
                          >
                            <ExternalLink size={13} /> Verify
                          </button>

                          {/* State Office Cancel Action */}
                          {user.role === 'STATE_OFFICE' && cert.status === 'ACTIVE' && (
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              title="Cancel / Revoke Certificate"
                              onClick={() => setCancelModal({ open: true, cert, reason: '', submitting: false })}
                            >
                              <XCircle size={13} /> Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Modal (State Office) */}
      {cancelModal.open && cancelModal.cert && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: '480px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={22} color="#e11d48" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Revoke Certificate</h3>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>Certificate No: {cancelModal.cert.certificateNumber}</div>
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '13.5px', lineHeight: 1.5, marginBottom: '20px' }}>
              Revoking this certificate immediately invalidates it across all public verification scans. This action is permanently recorded in the audit history.
            </p>

            <div className="form-group">
              <label className="form-label">Official Revocation Reason *</label>
              <textarea
                className="form-input"
                placeholder="State reason (e.g. Assessment score falsification verified during audit, minimum 10 characters)..."
                rows={3}
                value={cancelModal.reason}
                onChange={(e) => setCancelModal(m => ({ ...m, reason: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setCancelModal({ open: false, cert: null, reason: '', submitting: false })}
                disabled={cancelModal.submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancelSubmit}
                disabled={cancelModal.submitting}
              >
                {cancelModal.submitting ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
