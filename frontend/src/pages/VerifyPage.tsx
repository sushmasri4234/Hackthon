import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { Shield, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function VerifyPage() {
  const navigate = useNavigate();
  const [certNumber, setCertNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certNumber.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const { data } = await API.get(`/verify/${certNumber.trim().toUpperCase()}`);
      setResult(data);
      navigate(`/verify/${certNumber.trim().toUpperCase()}`, { state: data });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px', background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at top, rgba(26,86,219,0.1) 0%, transparent 50%)'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #1a56db, #0ea5e9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(26,86,219,0.4)'
        }}>
          <Shield size={32} color="white" />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Certificate Verification</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Pragati Skills Mission · Verify certificate authenticity instantly
        </p>
      </div>

      {/* Search Box */}
      <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '14px' }}>Certificate Number</label>
            <input
              className="form-input"
              style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px', padding: '14px 16px' }}
              placeholder="e.g., PSM-2024-12345678"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !certNumber.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
          >
            {loading ? <span className="animate-spin">⟳</span> : <Search size={16} />}
            {loading ? 'Verifying...' : 'Verify Certificate'}
          </button>
        </form>

        {error && (
          <div className="alert alert-error" style={{ marginTop: '16px' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '24px' }}>
            {result.status === 'VALID' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(5,150,105,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={24} color="#10b981" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#10b981' }}>✓ Certificate is Valid</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This certificate is authentic and currently active</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: '8px', padding: '16px' }}>
                  {[
                    { label: 'Certificate No.', value: result.certificateNumber },
                    { label: 'Holder', value: result.holder },
                    { label: 'Course', value: result.course },
                    { label: 'Training Centre', value: result.trainingCentre },
                    { label: 'District', value: result.district },
                    { label: 'Completion Date', value: result.completionDate ? new Date(result.completionDate).toLocaleDateString('en-IN') : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(5,150,105,0.1)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.status === 'CANCELLED' && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <XCircle size={24} color="#ef4444" />
                  <span style={{ fontWeight: 700, fontSize: '16px', color: '#ef4444' }}>Certificate Cancelled</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>This certificate was previously issued but has been revoked by the state office.</p>
              </div>
            )}
            {result.status === 'INVALID' && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <AlertCircle size={24} color="#ef4444" />
                  <span style={{ fontWeight: 700, fontSize: '16px', color: '#ef4444' }}>Certificate Not Found</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>This certificate ID does not exist in our records. It may be forged or incorrectly entered.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ marginTop: '24px', color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center' }}>
        No login required · Your certificate ID is printed on the certificate · Scan the QR code for instant verification
      </p>
    </div>
  );
}
