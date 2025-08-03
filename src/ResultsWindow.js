import { motion } from 'framer-motion';
import VideoCard from './VideoCard';
import './App.css';

function ResultsWindow({ results, disablePointerEvents }) {
  return (
    <motion.div
      className="results-window"
      style={{ pointerEvents: disablePointerEvents ? 'none' : 'auto' }}
      initial={{ y: -20, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -20, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.8 }}
    >
      <div className="results-grid" style={{ WebkitAppRegion: 'no-drag' }}>
        {results.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </motion.div>
  );
}

export default ResultsWindow;
