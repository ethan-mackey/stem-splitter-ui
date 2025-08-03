// App.jsx
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

import WindowWrapper from "./WindowWrapper";
import SearchBar from "./SearchBar";
import ResultsWindow from "./ResultsWindow";

import "./App.css";

const messages = ["Type in a search", "Paste a link", "Drop in a file"];

export default function App() {
  /* ---------------- state ---------------- */
  const [results, setResults] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [index, setIndex] = useState(0); // rotating placeholder

  /* ---------- window-drag bookkeeping ---------- */
  useEffect(() => {
    const handleUp = () => setDragging(false);
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      3000
    );
    return () => clearInterval(id);
  }, []);

  /* ---------- YouTube search ---------- */
  const handleSearch = async (term) => {
    const apiKey = process.env.REACT_APP_YT_API_KEY; // ← CRA: process.env.REACT_APP_…
    if (!term || !apiKey) return;

    // 1) search for 8 videos
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet&maxResults=8&type=video&q=${encodeURIComponent(term)}` +
      `&key=${apiKey}`;
    const { items } = await (await fetch(searchUrl)).json();

    // 2) get their durations
    const ids = items.map((i) => i.id.videoId).join(",");
    const detailsUrl =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=contentDetails&id=${ids}&key=${apiKey}`;
    const { items: details } = await (await fetch(detailsUrl)).json();

    const durationMap = Object.fromEntries(
      details.map((d) => [d.id, d.contentDetails.duration])
    );

    // 3) map to UI-friendly objects
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

  /* ---------------- render ---------------- */
  return (
    <WindowWrapper onMouseDown={() => setDragging(true)}>
      {/* SEARCH BAR WITH CYCLING PLACEHOLDER */}
      <SearchBar onSearch={handleSearch}>
        <span key={index} className="pill-text">
          {messages[index]}
        </span>
      </SearchBar>

      {/* RESULTS */}
      <AnimatePresence>
        {results.length > 0 && (
          <ResultsWindow results={results} disablePointerEvents={dragging} />
        )}
      </AnimatePresence>
    </WindowWrapper>
  );
}
