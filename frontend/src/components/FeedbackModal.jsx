import React, { useState } from 'react';

export default function FeedbackModal({ projectCode, userName, onClose }) {
  const [ratings, setRatings] = useState({
    contentRating: 0,
    systemDesignRating: 0,
    responseQualityRating: 0
  });
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { key: 'contentRating', label: 'Project Content' },
    { key: 'systemDesignRating', label: 'System Design' },
    { key: 'responseQualityRating', label: 'Response Quality' }
  ];

  const handleRatingClick = (category, rating) => {
    setRatings(prev => ({ ...prev, [category]: rating }));
  };

  const handleSubmit = async () => {
    // Validate all ratings are provided
    if (ratings.contentRating === 0 || ratings.systemDesignRating === 0 || ratings.responseQualityRating === 0) {
      setError('Please provide ratings for all three categories');
      return;
    }

    // Validate comment word count
    if (comment.trim()) {
      const wordCount = comment.trim().split(/\s+/).length;
      if (wordCount > 200) {
        setError(`Comment is too long (${wordCount} words). Maximum 200 words allowed.`);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/public/${projectCode}/feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          ...ratings,
          comment: comment.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      onClose(true); // true = feedback submitted
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose(false); // false = feedback skipped
  };

  const renderStars = (category) => {
    const currentRating = ratings[category];
    const hoveredValue = hoveredRating[category] || 0;

    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= (hoveredValue || currentRating);
          return (
            <span
              key={star}
              onClick={() => handleRatingClick(category, star)}
              onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [category]: star }))}
              onMouseLeave={() => setHoveredRating(prev => ({ ...prev, [category]: 0 }))}
              style={{
                fontSize: '32px',
                cursor: 'pointer',
                color: isActive ? '#FFD700' : '#ddd',
                transition: 'color 0.2s',
                userSelect: 'none'
              }}
            >
              {isActive ? '★' : '☆'}
            </span>
          );
        })}
      </div>
    );
  };

  const wordCount = comment.trim() ? comment.trim().split(/\s+/).length : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '8px' }}>Share Your Feedback</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
            🔒 Your feedback will be recorded <strong>anonymously</strong> to help improve the system.
          </p>

          {categories.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                {label} *
              </label>
              {renderStars(key)}
            </div>
          ))}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Additional Comments (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share any additional thoughts or suggestions..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ 
              fontSize: '12px', 
              color: wordCount > 200 ? '#f44336' : '#666', 
              marginTop: '4px',
              textAlign: 'right'
            }}>
              {wordCount} / 200 words
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fff5f5',
              color: '#f44336',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSkip}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: submitting ? 0.5 : 1
              }}
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: submitting ? 0.5 : 1
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
