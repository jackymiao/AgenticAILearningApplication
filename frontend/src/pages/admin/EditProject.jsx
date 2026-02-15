import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import { adminApi } from '../../api/endpoints';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function EditProject() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [studentFile, setStudentFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState('');
  const [importing, setImporting] = useState(false);
  
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    loadProject();
    loadStudents();
  }, [code]);

  const loadProject = async () => {
    try {
      const data = await adminApi.getProject(code);
      setFormData({
        title: data.title,
        description: data.description,
        youtubeUrl: data.youtube_url || '',
        wordLimit: data.word_limit,
        attemptLimitPerCategory: data.attempt_limit_per_category,
        reviewCooldownSeconds: data.review_cooldown_seconds || 120,
        enableFeedback: data.enable_feedback || false
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const data = await adminApi.getStudents(code);
      setStudents(data);
      setStudentsError('');
      setStudentsLoading(false);
    } catch (err) {
      setStudentsError(err.message || 'Failed to load students');
      setStudentsLoading(false);
    }
  };

  const handleImportStudents = async () => {
    if (!studentFile) {
      setStudentsError('Please select a roster file to import');
      return;
    }
    setStudentsError('');
    setImporting(true);
    try {
      const result = await adminApi.importStudents(code, studentFile);
      setStudents(result.students || []);
      setStudentFile(null);
    } catch (err) {
      setStudentsError(err.message || 'Failed to import students');
    } finally {
      setImporting(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const header = 'name,id';
    const rows = students.map(student => `${student.student_name},${student.student_id}`);
    const csvContent = [header, ...rows].join('\n');
    downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `project_${code}_students.csv`);
  };

  const handleDownloadXlsx = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      students.map(student => ({ name: student.student_name, id: student.student_id }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadBlob(
      new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `project_${code}_students.xlsx`
    );
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Project ${code} Student Roster`, 10, 15);
    doc.setFontSize(11);
    let y = 25;
    students.forEach((student, index) => {
      doc.text(`${index + 1}. ${student.student_name} - ${student.student_id}`, 10, y);
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
    });
    doc.save(`project_${code}_students.pdf`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await adminApi.updateProject(code, formData);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </PageContainer>
    );
  }

  if (!formData) {
    return (
      <PageContainer>
        <div className="error" style={{ padding: '40px', textAlign: 'center' }}>{error}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div style={{ padding: '24px 0', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '24px' }}>Edit Project: {code}</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            
            <div style={{ marginBottom: '20px' }}>
              <label>Project Code</label>
              <input
                type="text"
                value={code}
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>YouTube URL</label>
              <input
                type="url"
                name="youtubeUrl"
                value={formData.youtubeUrl}
                onChange={handleChange}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label>Word Limit *</label>
                <input
                  type="number"
                  name="wordLimit"
                  value={formData.wordLimit}
                  onChange={handleChange}
                  min={1}
                  required
                />
              </div>

              <div>
                <label>Attempts per Category *</label>
                <input
                  type="number"
                  name="attemptLimitPerCategory"
                  value={formData.attemptLimitPerCategory}
                  onChange={handleChange}
                  min={1}
                  required
                />
              </div>

              <div>
                <label>Review Cooldown *</label>
                <select
                  name="reviewCooldownSeconds"
                  value={formData.reviewCooldownSeconds}
                  onChange={handleChange}
                  required
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={90}>90 seconds</option>
                  <option value={120}>120 seconds</option>
                  <option value={150}>150 seconds</option>
                  <option value={180}>180 seconds</option>
                </select>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Time between reviews
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  name="enableFeedback"
                  checked={formData.enableFeedback}
                  onChange={(e) => setFormData(prev => ({ ...prev, enableFeedback: e.target.checked }))}
                  style={{ width: '20px', height: '20px', marginRight: '12px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Enable Feedback</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Collect anonymous feedback from students after final submission
                  </div>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fdfdfd', borderRadius: '6px', border: '1px solid #eee' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Student Roster</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                Upload a CSV or Excel file with a single header: <strong>name</strong>. Importing replaces the existing roster.
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setStudentFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={handleImportStudents}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : 'Import Roster'}
                </button>
              </div>

              {studentsError && <div className="error" style={{ marginBottom: '12px' }}>{studentsError}</div>}

              {studentsLoading ? (
                <div style={{ color: '#666', fontSize: '14px' }}>Loading roster...</div>
              ) : students.length === 0 ? (
                <div style={{ color: '#666', fontSize: '14px' }}>No students imported yet.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button type="button" className="secondary" onClick={handleDownloadCsv}>Download CSV</button>
                    <button type="button" className="secondary" onClick={handleDownloadXlsx}>Download Excel</button>
                    <button type="button" className="secondary" onClick={handleDownloadPdf}>Download PDF</button>
                  </div>
                  <div style={{ maxHeight: '240px', overflow: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Student ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student.student_id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{student.student_name}</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>{student.student_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="secondary" 
                onClick={() => navigate('/admin')}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
