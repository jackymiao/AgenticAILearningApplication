import React from 'react';
import PageContainer from '../components/PageContainer';

export default function HelpPage() {
  return (
    <PageContainer>
      <div style={{ maxWidth: '900px', margin: '40px auto', lineHeight: '1.6' }}>
        <h1 style={{ marginBottom: '32px', fontSize: '32px' }}>
          Student Guide: How to Use This Application
        </h1>
        
        <section style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>🎯 Overview</h2>
          <p style={{ marginBottom: '12px' }}>
            This application helps you improve your essay writing through AI-powered feedback and 
            gamified peer interaction. You'll draft essays, receive detailed AI reviews, and compete 
            with classmates in a strategic token-based game system.
          </p>
          <p>
            <strong>Important:</strong> Your essay drafts are saved automatically to your browser 
            and are private to you. Each student's work is stored separately, even when using the 
            same computer.
          </p>
        </section>
        
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>🚀 Getting Started</h2>
          <ol style={{ marginLeft: '20px', marginTop: '12px', fontSize: '16px' }}>
            <li style={{ marginBottom: '12px' }}>
              <strong>Join a Project:</strong> Enter the 6-character project code provided by your 
              instructor on the Home page.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Enter Your Name:</strong> Type your full name to identify yourself. This ensures 
              your work and progress are tracked separately from other students.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Start Writing:</strong> Draft your essay in the text editor. Your work is 
              automatically saved to your browser as you type.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Request AI Review:</strong> Click "Submit for Review" to receive AI feedback 
              on your essay (requires 1 review token).
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Revise & Improve:</strong> Use the AI suggestions to enhance your essay, 
              then request another review to see your progress.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Final Submission:</strong> When satisfied with your essay, click "Submit Final 
              Essay" to complete the assignment.
            </li>
          </ol>
        </section>
        
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>📊 AI Review System</h2>
          <p style={{ marginBottom: '16px' }}>
            Your essay is evaluated by AI across three key categories, each scored out of 100:
          </p>
          <ul style={{ marginLeft: '24px', marginTop: '12px', fontSize: '16px' }}>
            <li style={{ marginBottom: '12px' }}>
              <strong>Content (Ideas & Evidence):</strong> Quality of your arguments, relevance 
              to the topic, use of evidence, and depth of analysis.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Structure (Organization):</strong> Logical flow, paragraph organization, 
              transitions, introduction and conclusion effectiveness.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Mechanics (Grammar & Style):</strong> Grammar correctness, spelling, 
              punctuation, sentence structure, and overall writing clarity.
            </li>
          </ul>
          <p style={{ marginTop: '16px' }}>
            Each review provides a detailed score breakdown and specific, actionable suggestions 
            you can apply immediately to improve your essay.
          </p>
        </section>
        
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>🎮 Token System & Game Mechanics</h2>
          
          <h3 style={{ marginTop: '20px', marginBottom: '12px', fontSize: '20px' }}>Three Types of Tokens:</h3>
          <ul style={{ marginLeft: '24px', marginTop: '12px', fontSize: '16px' }}>
            <li style={{ marginBottom: '12px' }}>
              <strong>🔵 Review Tokens:</strong> Required to request AI feedback on your essay. 
              You start with a limited number and must manage them strategically.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>⚔️ Attack Tokens:</strong> Used to challenge other students and attempt to 
              steal their review tokens. You earn 1 attack token each time you submit an essay 
              for review.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>🛡️ Shield Tokens:</strong> Used to defend against attacks from other students. 
              Shields are limited, so use them wisely!
            </li>
          </ul>
          
          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '20px' }}>How Token Exchange Works:</h3>
          <p style={{ marginBottom: '12px', fontSize: '16px' }}>
            <strong>Earning Tokens:</strong> When you submit your essay for AI review, you spend 
            1 review token but gain 1 attack token. This creates a strategic balance between 
            improving your essay and competing with peers.
          </p>
          
          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '20px' }}>Attack & Defense System:</h3>
          <div style={{ marginLeft: '24px', fontSize: '16px' }}>
            <p style={{ marginBottom: '12px' }}><strong>Launching an Attack:</strong></p>
            <ol style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Click on another student in the "Active Players" list</li>
              <li style={{ marginBottom: '8px' }}>Click the "Attack" button (costs 1 attack token)</li>
              <li style={{ marginBottom: '8px' }}>The target student receives an instant notification</li>
              <li style={{ marginBottom: '8px' }}>They have 15 seconds to choose: use a shield or accept the attack</li>
            </ol>
            
            <p style={{ marginBottom: '12px' }}><strong>When You're Attacked:</strong></p>
            <ol style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>
                You'll receive a <strong>real-time notification</strong> showing who attacked you
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Option 1 - Use Shield:</strong> Click "Use Shield" to block the attack. 
                This costs 1 shield token. <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                Important: Using a shield blocks the attack, but the attacker does NOT get their 
                attack token back—it's permanently spent.</span>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Option 2 - Accept:</strong> Click "Accept" to let the attack succeed. 
                You lose 1 review token, and the attacker gains 1 review token (capped at 3 total).
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Option 3 - Timeout:</strong> If you don't respond within 15 seconds, 
                the attack automatically succeeds (same as accepting).
              </li>
            </ol>
            
            <p style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800', borderRadius: '4px' }}>
              <strong>⚡ Strategic Note:</strong> Both attack and shield tokens are permanently consumed 
              when used, regardless of the outcome. Plan your moves carefully! If you run out of review 
              tokens, you must win them back through successful attacks.
            </p>
          </div>
        </section>
        
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>⏱️ Review Cooldown</h2>
          <ul style={{ marginLeft: '24px', marginTop: '12px', fontSize: '16px' }}>
            <li style={{ marginBottom: '12px' }}>
              After submitting for review, there's a short cooldown period before you can submit again.
            </li>
            <li style={{ marginBottom: '12px' }}>
              Use this time to carefully read the AI feedback and revise your essay.
            </li>
            <li style={{ marginBottom: '12px' }}>
              The cooldown encourages thoughtful revision rather than rapid, careless submissions.
            </li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>📤 Final Submission</h2>
          <p style={{ marginBottom: '12px', fontSize: '16px' }}>
            When you're confident your essay is ready, click <strong>"Submit Final Essay"</strong> 
            to complete the assignment.
          </p>
          <p style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '16px' }}>
            ⚠️ Warning: You can only submit your final essay once per project. Make sure it's 
            complete and polished before submitting!
          </p>
        </section>
        
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>🏆 Leaderboard</h2>
          <p style={{ marginBottom: '12px', fontSize: '16px' }}>
            The leaderboard displays the top-scoring essays in the project, ranked by overall AI 
            review scores. Keep improving your essay through revisions to climb the rankings and 
            compete with your classmates!
          </p>
        </section>
        
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>💾 Data Privacy & Storage</h2>
          <ul style={{ marginLeft: '24px', marginTop: '12px', fontSize: '16px' }}>
            <li style={{ marginBottom: '12px' }}>
              Your essay drafts are saved locally in your browser (not on a server).
            </li>
            <li style={{ marginBottom: '12px' }}>
              Each student's work is stored separately using their name, ensuring privacy even 
              when multiple students use the same computer.
            </li>
            <li style={{ marginBottom: '12px' }}>
              If you switch browsers or clear your browser data, your draft may be lost—submit 
              reviews regularly to save your progress on the server.
            </li>
          </ul>
        </section>
        
        <section style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>❓ Need Help?</h2>
          <p style={{ fontSize: '16px' }}>
            If you encounter technical issues, have questions about the assignment, or need 
            clarification on how the system works, please contact your instructor or course 
            administrator.
          </p>
        </section>
      </div>
    </PageContainer>
  );
}
