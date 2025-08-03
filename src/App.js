import { useEffect, useState } from 'react';

import WindowWrapper from './WindowWrapper';
import SearchBar from './SearchBar';
import ResultsWindow from './ResultsWindow';
import { AnimatePresence } from 'framer-motion';

import './App.css';

const messages = ['Type in a search', 'Paste a link', 'drop in a file'];

function App() {

  const [results, setResults] = useState([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const handleUp = () => setDragging(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, []);

  const handleSearch = async (term) => {
    const apiKey = process.env.REACT_APP_YT_API_KEY;
    if (!term || !apiKey) return;
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&type=video&q=${encodeURIComponent(term)}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const ids = searchData.items.map((i) => i.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    const durationMap = {};
    detailsData.items.forEach((item) => {
      durationMap[item.id] = item.contentDetails.duration;
    });
    const mapped = searchData.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      duration: durationMap[item.id.videoId] || '',
    }));
    setResults(mapped);
  };

  return (
    <WindowWrapper onMouseDown={() => setDragging(true)}>
      <SearchBar onSearch={handleSearch} />
      <AnimatePresence>
        {results.length > 0 && (
          <ResultsWindow results={results} disablePointerEvents={dragging} />
        )}
      </AnimatePresence>
    </WindowWrapper>

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

