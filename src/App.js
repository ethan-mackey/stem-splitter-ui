// App.js
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

import WindowWrapper from "./WindowWrapper";
import SearchBar from "./SearchBar";
import ResultsWindow from "./ResultsWindow";
import "./App.css";

const messages = ["Type in a search", "Paste a link", "Drop in a file"];
const PANEL_HEIGHT = 540; // keep in one place

export default function App() {
  const [results, setResults] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      3000
    );
    return () => clearInterval(id);
  }, []);

  // Grow/shrink the outer Electron window when results appear/disappear
  useEffect(() => {
    if (results.length > 0) {
      window.electronAPI?.resultsOpened(PANEL_HEIGHT);
    } else {
      window.electronAPI?.resultsClosed();
    }
  }, [results.length]);

  const handleSearch = async (term) => {
    const apiKey = process.env.REACT_APP_YT_API_KEY; // CRA style
    if (!term) return;

    const base = "https://www.googleapis.com/youtube/v3";
    const searchUrl =
      `${base}/search?part=snippet&maxResults=8&type=video&q=${encodeURIComponent(
        term
      )}` + (apiKey ? `&key=${apiKey}` : "");
    const searchJson = await (await fetch(searchUrl)).json();
    const items = searchJson.items || [];
    if (items.length === 0) {
      setResults([]);
      return;
    }

    const ids = items.map((i) => i.id.videoId).join(",");
    const detailsUrl =
      `${base}/videos?part=contentDetails&id=${ids}` +
      (apiKey ? `&key=${apiKey}` : "");
    const { items: details = [] } = await (await fetch(detailsUrl)).json();
    const durationMap = Object.fromEntries(
      details.map((d) => [d.id, d.contentDetails.duration])
    );

    setResults(
      items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        duration: durationMap[item.id.videoId] ?? "",
      }))
    );
  };

  return (
    <WindowWrapper onMouseDown={() => setDragging(true)}>
      <SearchBar onSearch={handleSearch}>
        <span key={index} className="pill-text">
          {messages[index]}
        </span>
      </SearchBar>

      <AnimatePresence>
        {results.length > 0 && (
          <ResultsWindow
            results={results}
            disablePointerEvents={dragging}
            panelHeight={PANEL_HEIGHT}
          />
        )}
      </AnimatePresence>
    </WindowWrapper>
  );
}
