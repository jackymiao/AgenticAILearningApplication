import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import { adminApi } from '../../api/endpoints';

export default function SubmissionsList() {
  const { code } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [code, sort]);

  const loadSubmissions = async () => {
    try {
      const data = await adminApi.getSubmissions(code, sort);
      setSubmissions(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div style={{ padding: '24px 0' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1>Submissions for Project {code}</h1>
          <Link to="/admin" style={{ fontSize: '14px' }}>← Back to Dashboard</Link>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label style={{ marginRight: '8px' }}>Sort by:</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="high-to-low">Score: High to Low</option>
              <option value="low-to-high">Score: Low to High</option>
              <option value="unscored">Unscored First</option>
            </select>
          </div>
          <div style={{ color: '#666' }}>
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Student Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Essay Preview</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Submitted</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
                    No submissions yet
                  </td>
                </tr>
              ) : (
                submissions.map(submission => (
                  <tr key={submission.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>
                      {submission.user_name}
                    </td>
                    <td style={{ padding: '12px', maxWidth: '400px', color: '#666', fontSize: '14px' }}>
                      {submission.essay_preview}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                      {submission.admin_score !== null ? submission.admin_score : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {new Date(submission.submitted_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <Link to={`/admin/projects/${code}/submissions/${submission.id}`}>
                        <button className="primary">View Details</button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
