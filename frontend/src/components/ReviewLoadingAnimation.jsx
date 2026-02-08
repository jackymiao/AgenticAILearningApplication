export default function ReviewLoadingAnimation() {
  return (
    <div className="review-loading-overlay">
      <div className="review-loading-container">
        <div className="paper-stack">
          <div className="paper"></div>
          <div className="paper-lines">
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
          </div>
        </div>
        <div className="magnifier">
          <div className="magnifier-glass">
            <div className="magnifier-handle"></div>
          </div>
        </div>
        <p className="loading-text">Analyzing your essay...</p>
      </div>
    </div>
  );
}
