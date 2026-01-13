import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import { adminApi } from '../../api/endpoints';

export default function AdminDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await adminApi.getProjects();
      setProjects(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProjects(projects.map(p => p.code));
    } else {
      setSelectedProjects([]);
    }
  };

  const handleSelectProject = (code) => {
    setSelectedProjects(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleDelete = async () => {
    if (selectedProjects.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedProjects.length} project(s)? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await adminApi.deleteProjects(selectedProjects);
      setSelectedProjects([]);
      await loadProjects();
    } catch (err) {
      setError(err.message || 'Failed to delete projects');
    } finally {
      setDeleting(false);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Admin Dashboard</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedProjects.length > 0 && (
              <button 
                className="secondary" 
                onClick={handleDelete}
                disabled={deleting}
                style={{ 
                  backgroundColor: '#dc3545', 
                  color: 'white',
                  border: 'none'
                }}
              >
                {deleting ? 'Deleting...' : `Delete (${selectedProjects.length})`}
              </button>
            )}
            <Link to="/admin/projects/new">
              <button className="primary">Create Project</button>
            </Link>
          </div>
        </div>

        {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', width: '40px' }}>
                  <input 
                    type="checkbox"
                    checked={projects.length > 0 && selectedProjects.length === projects.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Code</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Created By</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
                    No projects yet. Create your first project!
                  </td>
                </tr>
              ) : (
                projects.map(project => (
                  <tr key={project.code} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <input 
                        type="checkbox"
                        checked={selectedProjects.includes(project.code)}
                        onChange={() => handleSelectProject(project.code)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {project.code}
                    </td>
                    <td style={{ padding: '12px' }}>{project.title}</td>
                    <td style={{ padding: '12px' }}>{project.created_by || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      {new Date(project.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <Link to={`/admin/projects/${project.code}`}>
                        <button className="secondary" style={{ marginRight: '8px' }}>
                          View Submissions
                        </button>
                      </Link>
                      <Link to={`/admin/projects/${project.code}/edit`}>
                        <button className="secondary">Edit</button>
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
