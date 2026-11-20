import React from 'react';

export default function Mascot({ name = 'justice', size = 64 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#23252B',
      border: '2px solid #FB8A4F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.5
    }}>
      ⚖️
    </div>
  );
}
