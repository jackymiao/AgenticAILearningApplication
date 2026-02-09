import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import { adminApi } from '../../api/endpoints';

export default function ProjectFeedback() {
  const { code } = useParams();
  const [project, setProject] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('newest');

  useEffect(() => {
    loadData();
  }, [code, sortOption]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [projectData, feedbackResponse] = await Promise.all([
        adminApi.getProject(code),
        adminApi.getFeedback(code, sortOption)
      ]);
      
      setProject(projectData);
      setFeedbackData(feedbackResponse);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>Loading feedback data...</p>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{ padding: '24px' }}>
          <div style={{ backgroundColor: '#fee', padding: '16px', borderRadius: '8px', color: '#c00' }}>
            {error}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>Project not found</p>
        </div>
      </PageContainer>
    );
  }

  if (!project.enable_feedback) {
    return (
      <PageContainer>
        <div style={{ padding: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '16px' }}>Feedback Not Enabled</h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Feedback collection is not enabled for this project.
            </p>
            <Link 
              to={`/admin/projects/${code}/submissions`}
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: '#0066cc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px'
              }}
            >
              Back to Submissions
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const { aggregate, feedback } = feedbackData;

  return (
    <PageContainer>
      <div style={{ padding: '24px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ marginBottom: '8px' }}>{project.title} - Feedback</h1>
            <div style={{ color: '#666' }}>
              Project Code: <strong>{code}</strong>
            </div>
          </div>
          <Link 
            to={`/admin/projects/${code}/submissions`}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Back to Submissions
          </Link>
        </div>

        {/* Aggregate Stats */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Aggregate Statistics</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {/* Total Responses */}
            <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Responses</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc' }}>
                {aggregate.totalResponses}
              </div>
            </div>

            {/* Content Rating */}
            <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Avg Content Rating</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                {aggregate.avgContentRating}
              </div>
              <div style={{ fontSize: '20px' }}>{renderStars(Math.round(aggregate.avgContentRating))}</div>
            </div>

            {/* System Design Rating */}
            <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Avg System Design Rating</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                {aggregate.avgSystemDesignRating}
              </div>
              <div style={{ fontSize: '20px' }}>{renderStars(Math.round(aggregate.avgSystemDesignRating))}</div>
            </div>

            {/* Response Quality Rating */}
            <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Avg Response Quality Rating</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                {aggregate.avgResponseQualityRating}
              </div>
              <div style={{ fontSize: '20px' }}>{renderStars(Math.round(aggregate.avgResponseQualityRating))}</div>
            </div>
          </div>
        </div>

        {/* Individual Feedback */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px' }}>Individual Responses ({feedback.length})</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="sort" style={{ fontSize: '14px', color: '#666' }}>Sort by:</label>
              <select
                id="sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="content-high">Content Rating (High-Low)</option>
                <option value="content-low">Content Rating (Low-High)</option>
                <option value="system-high">System Design (High-Low)</option>
                <option value="system-low">System Design (Low-High)</option>
                <option value="response-high">Response Quality (High-Low)</option>
                <option value="response-low">Response Quality (Low-High)</option>
              </select>
            </div>
          </div>

          {feedback.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No feedback responses yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {feedback.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Response #{feedback.length - index}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {formatDate(item.submitted_at)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                        Content
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{item.content_rating}</span>
                        <span style={{ fontSize: '16px' }}>{renderStars(item.content_rating)}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                        System Design
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{item.system_design_rating}</span>
                        <span style={{ fontSize: '16px' }}>{renderStars(item.system_design_rating)}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                        Response Quality
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{item.response_quality_rating}</span>
                        <span style={{ fontSize: '16px' }}>{renderStars(item.response_quality_rating)}</span>
                      </div>
                    </div>
                  </div>

                  {item.comment && (
                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '4px' }}>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>
                        Comment:
                      </div>
                      <div style={{ fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap' }}>
                        {item.comment}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
