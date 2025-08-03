import { useEffect, useState } from 'react';
import './App.css';

const messages = ['Type in a search', 'Paste a link', 'drop in a file'];

function SearchBar({ onSearch }) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch(value);
    }
  };

  return (
    <div className="pill-window" style={{ WebkitAppRegion: 'no-drag' }}>
      {!value && !focused && (
        <span key={index} className="pill-text">
          {messages[index]}
        </span>
      )}
      <input
        className="pill-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ WebkitAppRegion: 'no-drag' }}
      />
    </div>
  );
}

export default SearchBar;
