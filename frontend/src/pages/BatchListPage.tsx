import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import { FileText, Search, Filter, ChevronRight, Plus } from 'lucide-react';
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
      setBatches(data.data || data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  };

  const filtered = batches.filter((b) =>
    !search || b.batchName?.toLowerCase().includes(search.toLowerCase()) || b.courseName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Batches Directory</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {user?.role === 'TRAINING_CENTRE' ? 'Your centre’s uploaded and tracked candidate batches' : 'All skilling batches across Pragati Skills Mission'}
          </p>
        </div>
        {user?.role === 'TRAINING_CENTRE' && (
          <button className="btn btn-primary" onClick={() => navigate('/batches/new')}>
            <Plus size={16} /> Create New Batch
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '40px' }}
            placeholder="Search by batch title, course name or centre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input" style={{ width: '200px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading batches...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <FileText size={48} style={{ opacity: 0.25, color: '#94a3b8', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ color: '#64748b', fontWeight: 500 }}>No batches found</div>
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
                <th>Batch Information</th>
                <th>Training Centre</th>
                <th>District</th>
                <th>Candidates</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.batchName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{b.courseName}</div>
                  </td>
                  <td style={{ fontSize: '13px', color: '#334155' }}>
                    {b.trainingCentre?.name || 'Skill Centre'}
                  </td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>
                    {b.district?.name || 'Pune'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{b.totalCandidates}</span>
                      {b.isLargeBatch && (
                        <span className="badge badge-warning" style={{ fontSize: '10px' }}>&gt;50</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE_MAP[b.status] || 'badge-draft'}`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>
                    {b.createdAt ? format(new Date(b.createdAt), 'dd MMM yyyy') : '—'}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => navigate(`/batches/${b.id}`)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
