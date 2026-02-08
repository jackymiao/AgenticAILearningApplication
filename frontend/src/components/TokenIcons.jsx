// Gold bag icon for review tokens
export function ReviewTokenIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
      <path d="M5 9C5 7.89543 5.89543 7 7 7H17C18.1046 7 19 7.89543 19 9V10C19 10.5523 18.5523 11 18 11H6C5.44772 11 5 10.5523 5 10V9Z" fill="#FFD700"/>
      <path d="M6 11L7 19C7.13246 19.8483 7.89603 20.5 8.75 20.5H15.25C16.104 20.5 16.8675 19.8483 17 19L18 11H6Z" fill="#FFD700"/>
      <circle cx="12" cy="15" r="2" fill="#D4AF37"/>
      <path d="M8 7H16" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Shield icon for shield tokens
export function ShieldTokenIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L4 7V11C4 15.97 7.07 20.37 12 22C16.93 20.37 20 15.97 20 11V7L12 3Z" fill="#4A90E2"/>
      <path d="M12 3L4 7V11C4 15.97 7.07 20.37 12 22C16.93 20.37 20 15.97 20 11V7L12 3Z" stroke="#2E5C8A" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Sword icon for attack tokens
export function AttackTokenIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4L16 8M16 8L14 10L10 14M16 8L18 10M10 14L8 16L4 20M10 14L12 16M8 16L6 18" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 10L12 12L10 10L12 8L14 10Z" fill="#C0392B"/>
      <circle cx="6" cy="18" r="2" fill="#95A5A6" stroke="#7F8C8D" strokeWidth="1"/>
      <path d="M20 4L18 6L16 4L18 2L20 4Z" fill="#C0392B" stroke="#E74C3C" strokeWidth="1"/>
    </svg>
  );
}
