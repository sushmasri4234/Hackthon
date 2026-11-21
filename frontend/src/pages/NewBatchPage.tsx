import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import toast from 'react-hot-toast';
import { Upload, FileText, AlertCircle, CheckCircle, ChevronRight, X } from 'lucide-react';

interface District {
  id: string;
  name: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: string | number | undefined;
  error: string;
  suggestion: string;
}

export default function NewBatchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'info' | 'upload' | 'review'>('info');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [courseName, setCourseName] = useState('');
  const [batchName, setBatchName] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [notes, setNotes] = useState('');

  // Upload state
  const [uploadResult, setUploadResult] = useState<{
    valid: boolean;
    errors?: ValidationError[];
    candidateCount?: number;
    isLargeBatch?: boolean;
    message?: string;
  } | null>(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    API.get('/districts').then((r) => {
      setDistricts(r.data);
      if (r.data.length > 0 && !districtId) setDistrictId(r.data[0].id);
    }).catch(() => {});
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtId) { toast.error('Please select a district'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/batches', { courseName, batchName, districtId, notes });
      setBatchId(data.id);
      toast.success('Batch created! Now upload the candidate Excel file.');
      setStep('upload');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!batchId) return;
    if (!['xlsx', 'xls', 'csv'].includes(file.name.split('.').pop()?.toLowerCase() || '')) {
      toast.error('Only .xlsx, .xls, and .csv files are accepted');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await API.post(`/batches/${batchId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(data);
      if (data.valid) {
        toast.success(`${data.candidateCount} candidates uploaded successfully!`);
        setStep('review');
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) {
        setUploadResult(data);
      } else {
        toast.error(data?.error || 'Upload failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      await API.post(`/batches/${batchId}/submit`);
      toast.success('Batch submitted for district review!');
      navigate(`/batches/${batchId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => navigate('/batches')}>Batches</span>
          <ChevronRight size={12} />
          <span>New Batch</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Create New Batch</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Upload a candidate list for approval and certification.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '32px' }}>
        {(['info', 'upload', 'review'] as const).map((s, i) => (
          <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', flex: 1,
              paddingBottom: '12px',
              borderBottom: `2px solid ${step === s ? 'var(--primary)' : i < ['info', 'upload', 'review'].indexOf(step) ? 'var(--success)' : 'var(--border)'}`
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: step === s ? 'var(--primary)' : i < ['info', 'upload', 'review'].indexOf(step) ? 'var(--success)' : 'var(--bg-card)',
                border: `2px solid ${step === s ? 'var(--primary)' : i < ['info', 'upload', 'review'].indexOf(step) ? 'var(--success)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: step === s || i < ['info', 'upload', 'review'].indexOf(step) ? 'white' : 'var(--text-muted)'
              }}>
                {i < ['info', 'upload', 'review'].indexOf(step) ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '13px', fontWeight: step === s ? 600 : 400, color: step === s ? 'var(--text)' : 'var(--text-muted)' }}>
                {s === 'info' ? 'Batch Info' : s === 'upload' ? 'Upload File' : 'Review & Submit'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Batch Info */}
      {step === 'info' && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <form onSubmit={handleCreateBatch}>
            <div className="form-group">
              <label className="form-label">Batch Name *</label>
              <input className="form-input" placeholder="e.g., Basic IT Skills – Batch 2024-01" value={batchName} onChange={(e) => setBatchName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Course Name *</label>
              <input className="form-input" placeholder="e.g., Basic Computer Skills" value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">District *</label>
              <select className="form-input" value={districtId} onChange={(e) => setDistrictId(e.target.value)} required>
                <option value="">Select district...</option>
                {districts.map((d: District) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {districts.length === 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Loading districts...
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-input" placeholder="Any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/batches')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '...' : 'Create Batch & Continue →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 'upload' && (
        <div>
          {/* Upload dropzone */}
          <div
            className="glass-card"
            style={{ padding: '48px', textAlign: 'center', marginBottom: '24px', cursor: 'pointer', borderColor: isDragging ? 'var(--primary)' : undefined }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            <Upload size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Drop your Excel/CSV file here</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>or click to browse · .xlsx, .xls, .csv accepted</div>
            {fileName && <div style={{ marginTop: '12px', color: 'var(--accent)', fontSize: '13px' }}>📄 {fileName}</div>}
          </div>

          {/* Loading */}
          {loading && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <span className="animate-spin">⟳</span>
              <span>Validating {fileName}...</span>
            </div>
          )}

          {/* Validation Results */}
          {uploadResult && !uploadResult.valid && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={20} color="#ef4444" />
                <h3 style={{ color: '#ef4444', fontSize: '16px', fontWeight: 700 }}>
                  Upload Rejected – {uploadResult.errors?.length} Error(s) Found
                </h3>
              </div>
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                All errors must be corrected before the batch can be accepted. Fix the spreadsheet and re-upload.
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Field</th>
                      <th>Value</th>
                      <th>Error</th>
                      <th>Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.errors?.map((err, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#ef4444' }}>{err.row}</td>
                        <td style={{ fontWeight: 600 }}>{err.field}</td>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>{String(err.value ?? '—')}</td>
                        <td style={{ color: '#f87171', fontSize: '12px' }}>{err.error}</td>
                        <td style={{ color: '#34d399', fontSize: '12px' }}>{err.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '16px' }}>
                <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                  <Upload size={14} /> Re-upload Corrected File
                </button>
              </div>
            </div>
          )}

          {uploadResult?.valid && (
            <div className="alert alert-success">
              <CheckCircle size={16} />
              <span><strong>{uploadResult.candidateCount} candidates</strong> validated successfully. {uploadResult.isLargeBatch ? '⚠ Large batch – quality review required.' : ''} Click Continue to review.</span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 'review' && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CheckCircle size={24} color="#10b981" />
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Ready to Submit</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(15,23,42,0.5)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Batch Name</div>
                <div style={{ fontWeight: 600 }}>{batchName}</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(15,23,42,0.5)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Candidates</div>
                <div style={{ fontWeight: 600 }}>{uploadResult?.candidateCount}</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(15,23,42,0.5)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Course</div>
                <div style={{ fontWeight: 600 }}>{courseName}</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(15,23,42,0.5)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Large Batch?</div>
                <div style={{ fontWeight: 600 }}>{uploadResult?.isLargeBatch ? 'Yes (Quality review required)' : 'No'}</div>
              </div>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '24px' }}>
            <FileText size={14} />
            <span>Submitting will start the district officer approval process. Two district officers must approve before the batch advances.</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setStep('upload')}>← Re-upload</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '...' : '✓ Submit for Approval'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
