import React from 'react';
import PageContainer from '../components/PageContainer';

export default function HelpPage() {
  return (
    <PageContainer>
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <h1 style={{ marginBottom: '24px' }}>Help & Instructions</h1>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>Getting Started</h2>
          <ol style={{ marginLeft: '20px', marginTop: '12px' }}>
            <li>Enter the 6-character project code from your instructor on the Home page.</li>
            <li>Type your name and start drafting your essay.</li>
            <li>Submit for AI review to receive feedback and scores.</li>
            <li>Revise and repeat until you’re ready to submit your final essay.</li>
          </ol>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>AI Review Categories</h2>
          <p>Your essay is evaluated in three categories:</p>
          <ul style={{ marginLeft: '24px', marginTop: '12px' }}>
            <li><strong>Content:</strong> Ideas, evidence, and relevance</li>
            <li><strong>Structure:</strong> Organization and logical flow</li>
            <li><strong>Mechanics:</strong> Grammar, spelling, and punctuation</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            Each review returns a score and specific suggestions you can apply right away.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>Attempts & Cooldown</h2>
          <ul style={{ marginLeft: '24px', marginTop: '12px' }}>
            <li>Each project has a limited number of review attempts.</li>
            <li>After a review, there is a short cooldown before you can submit again.</li>
            <li>If you run out of review tokens, you must regain them via gameplay.</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>Game Rules (Tokens & Attacks)</h2>
          <p>There are three token types:</p>
          <ul style={{ marginLeft: '24px', marginTop: '12px' }}>
            <li><strong>Review Tokens</strong> (🔵) — required to request AI feedback</li>
            <li><strong>Attack Tokens</strong> (⚔️) — used to attack other players</li>
            <li><strong>Shield Tokens</strong> (🛡️) — used to block attacks</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            Submitting a review spends 1 review token and grants 1 attack token. You can use an
            attack token to challenge another active player and steal 1 of their review tokens.
          </p>
          <ul style={{ marginLeft: '24px', marginTop: '12px' }}>
            <li>Attacks have a 15-second response window.</li>
            <li>If the target uses a shield, the attack is blocked.</li>
            <li>If the target accepts or times out, the attacker gains 1 review token.</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>Final Submission</h2>
          <p>
            Once you’re satisfied, click “Submit Final Essay.” You can only submit once per
            project, so make sure your essay is complete before submitting.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '12px' }}>Leaderboard</h2>
          <p>
            The leaderboard shows the top scores for the project. Improve your essay to climb
            the rankings.
          </p>
        </section>
        
        <section>
          <h2 style={{ marginBottom: '12px' }}>Need Help?</h2>
          <p>
            If you run into issues, contact your instructor or course administrator.
          </p>
        </section>
      </div>
    </PageContainer>
  );
}
