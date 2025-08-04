import { useRef, useState } from "react";
import { motion } from "framer-motion";
import YouTubePlayer from "./YoutubePlayer";
import Waveform from "./Waveform";
import "./App.css";

const spring = { type: "spring", stiffness: 260, damping: 22, mass: 0.8 };

export default function DashboardView({ video, onBack }) {
  const ytRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(null); // {a, b}
  const [markers, setMarkers] = useState([
    { id: "m1", t: 10, label: "Cue A" },
    { id: "m2", t: 22, label: "Drop" },
  ]);
  const [stems, setStems] = useState({
    vocals: true,
    drums: true,
    bass: true,
    other: true,
  });

  const videoId = video.id;
  const progress = duration ? Math.min(1, current / duration) : 0;

  const togglePlay = () => {
    if (!isReady) return;
    setPlaying((p) => {
      const next = !p;
      if (next) ytRef.current?.play();
      else ytRef.current?.pause();
      return next;
    });
  };

  const onPlayerReady = (_e, info) => {
    setDuration(info.duration || ytRef.current?.getDuration() || 0);
    setIsReady(true);
  };

  const onPlayerState = (e) => {
    // 1: playing, 2: paused, 0: ended
    if (e.data === 1) setPlaying(true);
    if (e.data === 2 || e.data === 0) setPlaying(false);
  };

  const onTime = (t, d) => {
    setCurrent(t);
    if (d && d !== duration) setDuration(d);
    // loop: when playhead reaches the end of loop, jump back to A
    if (loop?.a != null && loop?.b != null) {
      const a = Math.min(loop.a, loop.b);
      const b = Math.max(loop.a, loop.b);
      if (t >= b) ytRef.current?.seek(a);
    }
  };

  const handleScrub = (ratio) => {
    const t = ratio * duration;
    ytRef.current?.seek(t);
    setCurrent(t);
  };

  const addMarker = (t) => {
    const id = Math.random().toString(36).slice(2, 9);
    setMarkers((m) => [...m, { id, t, label: `M${m.length + 1}` }]);
  };

  const moveMarker = (id, t) => {
    setMarkers((m) => m.map((mk) => (mk.id === id ? { ...mk, t } : mk)));
  };

  const removeMarker = (id) => {
    setMarkers((m) => m.filter((mk) => mk.id !== id));
  };

  const setLoopAroundCurrent = () => {
    const span = 4;
    setLoop({
      a: Math.max(0, current - span / 2),
      b: Math.min(duration, current + span / 2),
    });
  };

  const clearLoop = () => setLoop(null);

  const toggleStem = (key) => setStems((s) => ({ ...s, [key]: !s[key] }));

  const exportMix = (type) => {
    // Stubs for now. Replace with your export pipeline/IPC.
    console.log("Export:", type, { stems, markers, loop, rate });
    alert(`Export queued: ${type}`);
  };

  return (
    <motion.div
      className="dashboard"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={spring}
      style={{ WebkitAppRegion: "no-drag" }}
    >
      {/* Hidden controller for YouTube audio */}
      <YouTubePlayer
        ref={ytRef}
        videoId={videoId}
        onReady={onPlayerReady}
        onStateChange={onPlayerState}
        onTime={onTime}
        volume={volume}
        playbackRate={rate}
      />

      {/* Left rail */}
      <div className="dash-rail">
        <button className="rail-item active" title="Project">
          🏠
        </button>
        <button
          className={`rail-item ${stems.vocals ? "on" : ""}`}
          onClick={() => toggleStem("vocals")}
          title="Vocals"
        >
          🎤
        </button>
        <button
          className={`rail-item ${stems.drums ? "on" : ""}`}
          onClick={() => toggleStem("drums")}
          title="Drums"
        >
          🥁
        </button>
        <button
          className={`rail-item ${stems.bass ? "on" : ""}`}
          onClick={() => toggleStem("bass")}
          title="Bass"
        >
          🎸
        </button>
        <button
          className={`rail-item ${stems.other ? "on" : ""}`}
          onClick={() => toggleStem("other")}
          title="Other"
        >
          🎛️
        </button>
        <div className="rail-spacer" />
        <button
          className="rail-item"
          title="Export"
          onClick={() => exportMix("mixdown")}
        >
          📤
        </button>
      </div>

      {/* Header */}
      <div className="dash-header">
        <button className="ghost" onClick={onBack}>
          ← Results
        </button>
        <div className="dash-title">
          <img src={video.thumbnail} alt="" className="dash-thumb" />
          <div className="dash-title-text">
            <div className="dash-title-name" title={video.title}>
              {video.title}
            </div>
            <div className="dash-title-sub">
              {formatDurationIso(video.duration)} • YouTube
            </div>
          </div>
        </div>
        <div className="dash-header-actions">
          <select
            className="ghost"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            title="Playback rate"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>
          <input
            className="vol"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            title="Volume"
          />
        </div>
      </div>

      {/* Waveform + callouts */}
      <div className="dash-main">
        <Waveform
          progress={progress}
          markers={markers}
          duration={duration}
          loop={loop}
          onScrub={handleScrub}
          onMarkerAdd={addMarker}
          onMarkerMove={moveMarker}
          onMarkerRemove={removeMarker}
          onLoopChange={setLoop}
        />
        <div className="callouts">
          <Callout text="Drag markers to refine cues. Double-click to add/remove." />
          <Callout text="Use A/B handles to loop a region." />
          <Callout text="Playback speed and volume are in the header." />
        </div>
      </div>

      {/* Transport */}
      <div className="dash-transport">
        <div className="transport-left">
          <button
            className="circle"
            onClick={() => ytRef.current?.seek(Math.max(0, current - 5))}
            title="Back 5s"
          >
            ⏪
          </button>
          <button
            className="primary circle"
            onClick={togglePlay}
            title="Space to toggle"
          >
            {playing ? "⏸" : "▶️"}
          </button>
          <button
            className="circle"
            onClick={() => ytRef.current?.seek(Math.min(duration, current + 5))}
            title="Forward 5s"
          >
            ⏩
          </button>
          <button
            className="ghost"
            onClick={setLoopAroundCurrent}
            title="Set loop around playhead"
          >
            A/B
          </button>
          <button className="ghost" onClick={clearLoop} title="Clear loop">
            Clear
          </button>
        </div>
        <div className="timecode">
          {formatTime(current)} / {formatTime(duration)}
        </div>
        <div className="transport-right">
          <button className="ghost" onClick={() => exportMix("markers-json")}>
            Export Markers
          </button>
          <button
            className="ghost"
            onClick={() => exportMix("audio-selection")}
          >
            Export Loop
          </button>
        </div>
      </div>

      {/* Right info */}
      <div className="dash-right">
        <Info title="Detected Sources" body={listFromStems(stems)} />
        <Info
          title="Hints"
          body="Click the waveform to seek. Use A/B to loop a tricky passage."
        />
        <Info
          title="Shortcuts"
          body="Space: Play/Pause • A/B: Loop • ←/→: Seek 5s"
        />
      </div>
    </motion.div>
  );
}

function Callout({ text }) {
  return <div className="note tiny">{text}</div>;
}

function Info({ title, body }) {
  return (
    <div className="note">
      <div className="note-title">{title}</div>
      <div className="note-body">{body}</div>
    </div>
  );
}

function listFromStems(s) {
  const on = Object.entries(s)
    .filter(([, v]) => v)
    .map(([k]) => k[0].toUpperCase() + k.slice(1))
    .join(", ");
  return on || "None selected";
}

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(sec / 60);
  return `${m}:${s}`;
}

function formatDurationIso(iso) {
  if (!iso) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] || 0, 10);
  const mm = parseInt(m[2] || 0, 10);
  const s = parseInt(m[3] || 0, 10);
  const parts = [];
  if (h) parts.push(h);
  parts.push(h ? String(mm).padStart(2, "0") : mm);
  parts.push(String(s).padStart(2, "0"));
  return parts.join(":");
}
