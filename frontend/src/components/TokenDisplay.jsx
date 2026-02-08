import { ReviewTokenIcon, ShieldTokenIcon, AttackTokenIcon } from './TokenIcons';

export default function TokenDisplay({ reviewTokens, attackTokens, shieldTokens }) {
  return (
    <div className="token-display">
      <div className="token-item">
        <ReviewTokenIcon size={28} />
        <span className="token-count" data-testid="my-review-tokens">{reviewTokens}</span>
        <span className="token-label">Review</span>
      </div>
      
      <div className="token-item">
        <AttackTokenIcon size={28} />
        <span className="token-count" data-testid="my-attack-tokens">{attackTokens}</span>
        <span className="token-label">Attack</span>
      </div>
      
      <div className="token-item">
        <ShieldTokenIcon size={28} />
        <span className="token-count" data-testid="my-shield-tokens">{shieldTokens}</span>
        <span className="token-label">Shield</span>
      </div>
    </div>
  );
}
