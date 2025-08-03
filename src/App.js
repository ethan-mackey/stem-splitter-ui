import { useEffect, useState } from 'react';
import './App.css';

const messages = ['Type in a search', 'Paste a link', 'drop in a file'];

function App() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <div className="pill-window">
        <span key={index} className="pill-text">
          {messages[index]}
        </span>
      </div>
    </div>
  );
}

export default App;

