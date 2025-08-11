// src/App.js
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import VibrancyMask from "./VibrancyMask";
import WindowWrapper from "./WindowWrapper";
import SearchBar from "./SearchBar";
import ResultsWindow from "./ResultsWindow";
import DashboardView from "./DashboardView";
import "./App.css";

const messages = ["Type in a search", "Paste a link", "Drop in a file"];
const PANEL_HEIGHT = 540;
const DASHBOARD_HEIGHT = 1200;

export default function App() {
  const [results, setResults] = useState([]);
  const [msgIdx, setMsgIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rotate the helper text inside the pill
  useEffect(() => {
    const id = setInterval(
      () => setMsgIdx((i) => (i + 1) % messages.length),
      3000
    );
    return () => clearInterval(id);
  }, []);

  // Resize the Electron window based on what’s showing
  useEffect(() => {
    if (selected) {
      window.electronAPI?.resultsOpened(DASHBOARD_HEIGHT);
    } else if (results.length > 0) {
      window.electronAPI?.resultsOpened(PANEL_HEIGHT);
    } else {
      window.electronAPI?.resultsClosed();
    }
  }, [results.length, selected]);

  // YouTube Search
  const handleSearch = async (term) => {
    const q = term.trim();
    if (!q) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const key = process.env.REACT_APP_YT_API_KEY || "";
      const base = "https://www.googleapis.com/youtube/v3";

      const sURL = `${base}/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(
        q
      )}${key ? `&key=${key}` : ""}`;
      const { items } = await (await fetch(sURL)).json();
      if (!items?.length) {
        setResults([]);
        return;
      }

      const ids = items.map((i) => i.id.videoId).join(",");
      const dURL = `${base}/videos?part=contentDetails&id=${ids}${
        key ? `&key=${key}` : ""
      }`;
      const { items: details } = await (await fetch(dURL)).json();
      const dur = Object.fromEntries(
        details.map((d) => [d.id, d.contentDetails.duration])
      );

      setResults(
        items.map((i) => ({
          id: i.id.videoId,
          title: i.snippet.title,
          thumbnail: i.snippet.thumbnails.medium.url,
          channel: i.snippet.channelTitle,
          duration: dur[i.id.videoId] ?? "",
        }))
      );
    } catch (e) {
      console.error(e);
      setError("Search failed – please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Reveal OS blur ONLY inside the pill. Adjust inset to hide any edge bleed. */}
      <VibrancyMask targetSelector=".pill-window" radius={39} inset={8} />

      {/* If later you want the results panel blurred too, uncomment this: */}
      {/*
      <VibrancyMask targetSelector=".results-window" radius={28} inset={8} />
      */}

      <WindowWrapper>
        {selected ? (
          <DashboardView video={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            <SearchBar onSearch={handleSearch} loading={loading}>
              <span key={msgIdx} className="pill-text">
                {messages[msgIdx]}
              </span>
            </SearchBar>

            {error && <div className="error-banner">{error}</div>}

            <AnimatePresence initial={false}>
              {results.length > 0 && !loading && (
                <ResultsWindow
                  key="results"
                  results={results}
                  onSelect={setSelected}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </WindowWrapper>
    </>
  );
}
