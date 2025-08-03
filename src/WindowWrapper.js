import React from 'react';

function WindowWrapper({ children, onMouseDown, onMouseUp }) {
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{ WebkitAppRegion: 'drag', position: 'relative', width: '100%', height: '100%' }}
    >
      {children}
    </div>
  );
}

export default WindowWrapper;
