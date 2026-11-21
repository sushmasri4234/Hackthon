import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { FileText, Search, Filter, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

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

export default function BatchListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    fetchBatches();
  }, [page, statusFilter]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter) params.status = statusFilter;
      const { data } = await API.get('/batches', { params });
      setBatches(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  };

  const filtered = batches.filter((b) =>
    !search || b.batchName?.toLowerCase().includes(search.toLowerCase()) || b.courseName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Batches</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {user?.role === 'TRAINING_CENTRE' ? 'Your submitted candidate batches' : 'All candidate batches in the system'}
          </p>
        </div>
        {user?.role === 'TRAINING_CENTRE' && (
          <button className="btn btn-primary" onClick={() => navigate('/batches/new')}>
            <FileText size={14} /> New Batch
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input" style={{ width: '180px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
            <div style={{ color: 'var(--text-muted)' }}>No batches found</div>
            {user?.role === 'TRAINING_CENTRE' && (
              <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/batches/new')}>
                Create First Batch
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Batch Name</th>
                <th>Training Centre</th>
                <th>District</th>
                <th>Candidates</th>
                <th>Status</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/batches/${b.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.batchName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.courseName}</div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{b.trainingCentre?.name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{b.district?.name}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{b._count?.candidates ?? b.totalCandidates}</span>
                    {b.isLargeBatch && <span className="badge badge-warning" style={{ marginLeft: '6px', fontSize: '9px' }}>LARGE</span>}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE_MAP[b.status] || 'badge-draft'}`}>{STATUS_LABELS[b.status] || b.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {b.updatedAt ? format(new Date(b.updatedAt), 'dd MMM yyyy, HH:mm') : '—'}
                  </td>
                  <td><ChevronRight size={14} color="var(--text-dim)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>Page {page} of {pagination.totalPages}</span>
          <button className="btn btn-ghost" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
