import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import toast from 'react-hot-toast';
import { Upload, FileText, AlertCircle, CheckCircle, ChevronRight, X, ArrowRight } from 'lucide-react';

interface District {
  id: string;
  name: string;
  stateCode?: string;
  stateName?: string;
}

interface StateOption {
  code: string;
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
  const [statesList, setStatesList] = useState<StateOption[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedState, setSelectedState] = useState('MH');
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
    API.get('/states').then((r) => {
      setStatesList(r.data);
      if (r.data.length > 0) setSelectedState(r.data[0].code);
    }).catch(() => {});

    API.get('/districts').then((r) => {
      setDistricts(r.data);
      if (r.data.length > 0 && !districtId) setDistrictId(r.data[0].id);
    }).catch(() => {});
  }, []);

  const filteredDistricts = districts.filter(d => !selectedState || d.stateCode === selectedState);

  useEffect(() => {
    if (filteredDistricts.length > 0) {
      setDistrictId(filteredDistricts[0].id);
    }
  }, [selectedState, districts]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtId) { toast.error('Please select a district'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/batches', { courseName, batchName, districtId, notes });
      setBatchId(data.id);
      toast.success('Batch registered! Now upload the candidate Excel file.');
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
        toast.success(`${data.candidateCount} candidates validated successfully!`);
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
    <div className="animate-fade-in" style={{ padding: '24px 32px', maxWidth: '880px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 500 }} onClick={() => navigate('/batches')}>Batches</span>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: 600 }}>New Batch Creation</span>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>Upload Candidate Batch</h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Pragati Skills Mission · Multi-tier validated candidate submission
        </p>
      </div>

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        {(['info', 'upload', 'review'] as const).map((s, i) => {
          const isActive = step === s;
          const isPassed = ['info', 'upload', 'review'].indexOf(step) > i;
          return (
            <div key={s} style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              background: isActive ? '#eff6ff' : isPassed ? '#ecfdf5' : '#f8fafc',
              border: `1px solid ${isActive ? '#bfdbfe' : isPassed ? '#a7f3d0' : '#e2e8f0'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: isActive ? '#2563eb' : isPassed ? '#059669' : '#cbd5e1',
                color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700
              }}>
                {isPassed ? '✓' : i + 1}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Step {i + 1}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isActive ? '#1e40af' : isPassed ? '#065f46' : '#64748b' }}>
                  {s === 'info' ? 'Batch Details' : s === 'upload' ? 'Upload Spreadsheet' : 'Review & Submit'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Batch Info */}
      {step === 'info' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <form onSubmit={handleCreateBatch}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Batch Name *</label>
              <input
                className="form-input"
                placeholder="e.g., Solar PV Installation &amp; Maintenance – Batch 2024-06"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Course Name *</label>
              <input
                className="form-input"
                placeholder="e.g., Solar PV Technician (NSQF Level 4)"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>State / UT *</label>
                <select
                  className="form-input"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  required
                >
                  {statesList.map((st) => (
                    <option key={st.code} value={st.code}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>District Jurisdiction *</label>
                <select
                  className="form-input"
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  required
                >
                  {filteredDistricts.length === 0 ? (
                    <option value="">No districts listed</option>
                  ) : (
                    filteredDistricts.map((d: District) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Notes / Remarks (Optional)</label>
              <textarea
                className="form-input"
                placeholder="Additional instructions or training batch batch notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '28px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/batches')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating Batch...' : 'Proceed to Candidate Upload →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 'upload' && (
        <div>
          {/* Dropzone Card */}
          <div
            style={{
              background: isDragging ? '#eff6ff' : '#ffffff',
              border: `2px dashed ${isDragging ? '#2563eb' : '#bfdbfe'}`,
              borderRadius: '16px',
              padding: '48px 32px',
              textAlign: 'center',
              marginBottom: '24px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Upload size={32} color="#2563eb" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Upload Candidate Spreadsheet
            </div>
            <div style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
              Drag and drop your Excel (.xlsx, .xls) or CSV file here, or click to browse
            </div>
            {fileName && (
              <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>
                📄 {fileName}
              </div>
            )}
          </div>

          {/* Validating indicator */}
          {loading && (
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              <span className="animate-spin">⟳</span>
              <span>Running atomic validation on {fileName}... Verifying duplicate IDs, phone formats, and marks.</span>
            </div>
          )}

          {/* Validation Errors Table */}
          {uploadResult && !uploadResult.valid && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #fecaca',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <AlertCircle size={22} color="#dc2626" />
                <div>
                  <h3 style={{ color: '#991b1b', fontSize: '16px', fontWeight: 800 }}>
                    Upload Rejected: {uploadResult.errors?.length} Error(s) Found
                  </h3>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>
                    Every candidate record must pass strict validation before the batch can be submitted.
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Field</th>
                      <th>Provided Value</th>
                      <th>Validation Failure</th>
                      <th>Recommended Fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.errors?.map((err, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800, color: '#dc2626' }}>{err.row}</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{err.field}</td>
                        <td style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{String(err.value ?? '—')}</td>
                        <td style={{ color: '#dc2626', fontSize: '12px', fontWeight: 500 }}>{err.error}</td>
                        <td style={{ color: '#059669', fontSize: '12px', fontWeight: 500 }}>{err.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                  <Upload size={14} /> Re-upload Corrected Spreadsheet
                </button>
              </div>
            </div>
          )}

          {/* Validation Success Banner */}
          {uploadResult?.valid && (
            <div className="alert alert-success" style={{ marginBottom: '20px' }}>
              <CheckCircle size={18} />
              <span>
                <strong>{uploadResult.candidateCount} candidate records</strong> validated successfully!
                {uploadResult.isLargeBatch ? ' ⚠ Large batch (&gt;50) detected – requires mandatory Quality Team review.' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 'review' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <CheckCircle size={24} color="#059669" />
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Ready to Submit for Approval</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Batch Name</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{batchName}</div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Candidate Count</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{uploadResult?.candidateCount} candidates</div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Course</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{courseName}</div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Batch Scale</div>
              <div style={{ fontWeight: 700, color: uploadResult?.isLargeBatch ? '#b45309' : '#059669' }}>
                {uploadResult?.isLargeBatch ? 'Large Batch (Quality Review Needed)' : 'Standard Batch'}
              </div>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '24px' }}>
            <FileText size={16} />
            <span>
              Submitting this batch locks candidate records and dispatches it to the District Officer pool. <strong>Dual officer consensus</strong> is required before advancing.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setStep('upload')}>
              ← Back to File
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : '✓ Submit Batch to District Pool'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
