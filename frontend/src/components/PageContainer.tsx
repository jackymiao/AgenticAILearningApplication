import React from 'react';

export default function PageContainer({ children }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 16px'
    }}>
      {children}
    </div>
  );
}
