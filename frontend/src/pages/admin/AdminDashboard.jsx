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
  const [toggling, setToggling] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleToggleStatus = async (project) => {
    setError('');
    setToggling(prev => ({ ...prev, [project.code]: true }));
    try {
      const updated = await adminApi.updateProjectStatus(project.code, !project.enabled);
      setProjects(prev => prev.map(p => (p.code === project.code ? { ...p, enabled: updated.enabled } : p)));
    } catch (err) {
      setError(err.message || 'Failed to update project status');
    } finally {
      setToggling(prev => ({ ...prev, [project.code]: false }));
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

        {/* Desktop Table View */}
        {!isMobile && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
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
                <th style={{ padding: '12px', textAlign: 'left', width: '10%' }}>Code</th>
                <th style={{ padding: '12px', textAlign: 'left', width: '25%' }}>Title</th>
                <th style={{ padding: '12px', textAlign: 'left', width: '12%' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', width: '15%' }}>Created By</th>
                <th style={{ padding: '12px', textAlign: 'left', width: '12%' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'right', width: '26%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
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
                    <td style={{ padding: '12px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={project.enabled !== false}
                          onChange={() => handleToggleStatus(project)}
                          disabled={toggling[project.code]}
                          style={{ cursor: toggling[project.code] ? 'not-allowed' : 'pointer' }}
                        />
                        <span style={{ fontSize: '12px', color: project.enabled !== false ? '#28a745' : '#dc3545' }}>
                          {project.enabled !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </td>
                    <td style={{ padding: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.created_by || 'N/A'}</td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
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
        )}

        {/* Mobile Card View */}
        {isMobile && (
        <div>
          {projects.length === 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#666', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              No projects yet. Create your first project!
            </div>
          ) : (
            projects.map(project => (
              <div 
                key={project.code} 
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px', 
                  padding: '16px', 
                  marginBottom: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                      {project.code}
                    </div>
                    <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>
                      {project.title}
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={selectedProjects.includes(project.code)}
                    onChange={() => handleSelectProject(project.code)}
                    style={{ cursor: 'pointer', marginLeft: '12px' }}
                  />
                </div>

                <div style={{ display: 'grid', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666' }}>Status:</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={project.enabled !== false}
                        onChange={() => handleToggleStatus(project)}
                        disabled={toggling[project.code]}
                        style={{ cursor: toggling[project.code] ? 'not-allowed' : 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', color: project.enabled !== false ? '#28a745' : '#dc3545' }}>
                        {project.enabled !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666' }}>Created By:</span>
                    <span>{project.created_by || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666' }}>Created:</span>
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link to={`/admin/projects/${project.code}`} style={{ flex: '1', minWidth: '120px' }}>
                    <button className="secondary" style={{ width: '100%' }}>
                      View Submissions
                    </button>
                  </Link>
                  <Link to={`/admin/projects/${project.code}/edit`} style={{ flex: '1', minWidth: '120px' }}>
                    <button className="secondary" style={{ width: '100%' }}>Edit</button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        )}
      </div>
    </PageContainer>
  );
}
