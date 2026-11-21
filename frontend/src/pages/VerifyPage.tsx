import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { Shield, Search, CheckCircle, XCircle, AlertCircle, ArrowLeft, Award, Calendar, Building, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function VerifyPage() {
  const navigate = useNavigate();
  const [certNumber, setCertNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e?: React.FormEvent, customId?: string) => {
    if (e) e.preventDefault();
    const idToVerify = (customId || certNumber).trim().toUpperCase();
    if (!idToVerify) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const { data } = await API.get(`/verify/${idToVerify}`);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification query failed. Please check the ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 20px', background: '#f8fafc',
      backgroundImage: 'radial-gradient(circle at 50% 10%, #eff6ff 0%, #f8fafc 70%)'
    }}>
      {/* Return Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="btn btn-secondary"
        style={{ position: 'fixed', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px', maxWidth: '600px' }}>
        <div style={{
          width: '68px', height: '68px', borderRadius: '18px', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)'
        }}>
          <Shield size={34} color="#ffffff" />
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
          Pragati Skills Mission · Government of India
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Official Certificate Verification
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.5 }}>
          Verify the authenticity and current active status of candidate skilling certificates issued under the Mission.
        </p>
      </div>

      {/* Verification Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '560px',
        padding: '36px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)'
      }}>
        <form onSubmit={handleVerify}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
              Certificate ID / QR Code Number
            </label>
            <input
              className="form-input"
              style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '14px 16px', fontWeight: 600 }}
              placeholder="e.g., PSM-2026-XXXXXXXX"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !certNumber.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', fontWeight: 700 }}
          >
            {loading ? <span className="animate-spin">⟳</span> : <Search size={18} />}
            {loading ? 'Querying Blockchain Registry...' : 'Verify Certificate Authenticity'}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div className="alert alert-error" style={{ marginTop: '20px' }}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        {/* Verification Results */}
        {result && (
          <div style={{ marginTop: '28px' }}>
            {result.status === 'VALID' && (
              <div>
                {/* Valid Banner */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px',
                  padding: '16px 20px', marginBottom: '20px'
                }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={24} color="#059669" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: '#065f46' }}>✓ Authentic &amp; Active Certificate</div>
                    <div style={{ fontSize: '12px', color: '#047857' }}>This credential is valid and registered with the state skills registry</div>
                  </div>
                </div>

                {/* Candidate Credential Info Card (Privacy Preserving: No phone, no email) */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Certificate Number</span>
                    <span style={{ fontWeight: 800, color: '#1e40af', fontFamily: 'monospace', fontSize: '14px' }}>
                      {result.certificateNumber}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Certificate Holder</span>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                      {result.holder}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Course / Qualification</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                      {result.course}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Training Centre</span>
                    <span style={{ fontWeight: 500, color: '#334155', fontSize: '13px' }}>
                      {result.trainingCentre}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>District</span>
                    <span style={{ fontWeight: 500, color: '#334155', fontSize: '13px' }}>
                      {result.district}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Completion Date</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                      {result.completionDate ? format(new Date(result.completionDate), 'dd MMMM yyyy') : '—'}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                  🔒 Verified via SHA-256 digital signature · Candidate contact data withheld per Digital Personal Data Protection Act
                </div>
              </div>
            )}

            {result.status === 'CANCELLED' && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px',
                padding: '24px', textAlign: 'center'
              }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <XCircle size={30} color="#dc2626" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', marginBottom: '6px' }}>
                  Certificate Revoked / Cancelled
                </h3>
                <p style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
                  {result.message}
                </p>
                {result.reason && (
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fca5a5', color: '#7f1d1d', fontSize: '12px', fontStyle: 'italic', marginBottom: '12px' }}>
                    Revocation Reason: "{result.reason}"
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Revoked on: {result.cancelledAt ? format(new Date(result.cancelledAt), 'dd MMM yyyy, HH:mm') : '—'}
                </div>
              </div>
            )}

            {result.status === 'INVALID' && (
              <div style={{
                background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px',
                padding: '24px', textAlign: 'center'
              }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <AlertCircle size={30} color="#ea580c" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#9a3412', marginBottom: '6px' }}>
                  Certificate Not Found
                </h3>
                <p style={{ color: '#c2410c', fontSize: '13px' }}>
                  No matching record exists for this Certificate ID in the Pragati Skills Mission registry.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
