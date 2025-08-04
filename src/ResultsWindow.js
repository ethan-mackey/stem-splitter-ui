import { motion } from "framer-motion";
import VideoCard from "./VideoCard";
import "./App.css";

const spring = { type: "spring", stiffness: 260, damping: 22, mass: 0.8 };

function ResultsWindow({ results, disablePointerEvents }) {
  return (
    <motion.div
      className="results-window"
      initial={{ height: 0, opacity: 0, y: -20 }}
      animate={{ height: 540, opacity: 1, y: 0 }}
      exit={{ height: 0, opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.8 }}
    >
      <motion.div
        className="results-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ WebkitAppRegion: "no-drag" }}
      >
        {results.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </motion.div>
    </motion.div>
  );
}

export default ResultsWindow;
