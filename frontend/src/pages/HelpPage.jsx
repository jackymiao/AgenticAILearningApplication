import React from 'react';
import PageContainer from '../components/PageContainer';

export default function HelpPage() {
  return (
    <PageContainer>
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <h1 style={{ marginBottom: '24px' }}>Help & Instructions</h1>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>Getting Started</h2>
          <p>
            To submit your essay for grading, you'll need a 6-character project code 
            provided by your instructor. Enter this code on the home page to access 
            your project.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>AI Review Categories</h2>
          <p>Your essay will be evaluated in four categories:</p>
          <ul style={{ marginLeft: '24px', marginTop: '12px' }}>
            <li><strong>Grammar:</strong> Spelling, punctuation, and grammatical correctness</li>
            <li><strong>Structure:</strong> Organization, flow, and logical progression</li>
            <li><strong>Style:</strong> Tone, voice, and writing effectiveness</li>
            <li><strong>Content:</strong> Relevance, depth, and quality of ideas</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>Attempt Limits</h2>
          <p>
            Each project has a limit on how many times you can request AI reviews 
            for each category. Use your attempts wisely to improve your essay before 
            final submission.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>Final Submission</h2>
          <p>
            Once you're satisfied with your essay, click the "Submit Final Essay" button. 
            You can only submit once per project, so make sure your essay is complete 
            before submitting.
          </p>
        </section>
        
        <section>
          <h2 style={{ marginBottom: '12px' }}>Questions?</h2>
          <p>
            If you have any questions or encounter issues, please contact your instructor 
            or course administrator.
          </p>
        </section>
      </div>
    </PageContainer>
  );
}
