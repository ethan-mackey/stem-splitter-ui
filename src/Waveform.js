import { useRef, useState, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import "./App.css";

// Utility function to convert AudioBuffer to WAV blob
function audioBufferToWav(buffer) {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Convert float samples to 16-bit PCM
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export default function Waveform({
  progress = 0,
  duration = 0,
  loop = null,
  onScrub,
  onLoopChange,
  videoId = null,
}) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  console.log('🎯 Waveform component rendered with:', { videoId, duration, progress });
  console.log('🎯 Container ref current:', !!containerRef.current);
  console.log('🎯 WaveSurfer ref current:', !!wavesurferRef.current);

  // Initialize WaveSurfer when component mounts
  useEffect(() => {
    if (!containerRef.current) {
      console.log('Container not ready yet');
      return;
    }
    
    if (wavesurferRef.current) {
      console.log('WaveSurfer already exists');
      return;
    }

    console.log('Initializing WaveSurfer...');
    console.log('Container element:', containerRef.current);
    
    try {
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#ff0a9c",
        progressColor: "#ff1aac",
        height: 180,
        normalize: true,
        interact: true,
        dragToSeek: true,
      });

      console.log('WaveSurfer created:', wavesurfer);
      wavesurferRef.current = wavesurfer;

      // Set ready immediately since WaveSurfer is initialized
      console.log('✅ Setting WaveSurfer as ready immediately');
      setIsReady(true);

      wavesurfer.on('ready', () => {
        console.log('✅ WaveSurfer ready event fired!');
        console.log('Container contents:', containerRef.current?.innerHTML);
        console.log('Container children:', containerRef.current?.children);
      });

      wavesurfer.on('error', (error) => {
        console.error('❌ WaveSurfer error:', error);
      });
      
      wavesurfer.on('load', () => {
        console.log('🎵 WaveSurfer audio loaded');
      });
      
      wavesurfer.on('waveform-ready', () => {
        console.log('🌊 WaveSurfer waveform ready');
      });

      // Load a real, working audio file immediately
      console.log('Loading real audio file to trigger waveform...');
      
      // Try multiple reliable audio sources
      const testUrls = [
        'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
        'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
        'https://file-examples.com/storage/fe86a1f2d4c3b2b5d5f4b2b/2017/11/file_example_WAV_1MG.wav'
      ];
      
      const tryLoadAudio = async (urls) => {
        for (const url of urls) {
          try {
            console.log(`🎵 Trying to load: ${url}`);
            await wavesurfer.load(url);
            console.log(`✅ Successfully loaded: ${url}`);
            return true;
          } catch (error) {
            console.warn(`❌ Failed to load ${url}:`, error);
          }
        }
        return false;
      };
      
      tryLoadAudio(testUrls).then((success) => {
        if (!success) {
          console.error('❌ All audio URLs failed to load');
        }
      });

    } catch (createError) {
      console.error('❌ Failed to create WaveSurfer:', createError);
    }

    return () => {
      if (wavesurferRef.current) {
        console.log('Destroying WaveSurfer...');
        try {
          wavesurferRef.current.destroy();
        } catch (destroyError) {
          console.warn('Error destroying WaveSurfer:', destroyError);
        }
        wavesurferRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  console.log('WaveSurfer state:', { wavesurfer: !!wavesurferRef.current, isReady });


  // This useEffect is now disabled since we load audio immediately on initialization
  // useEffect(() => {
  //   // Audio loading is now handled in the initialization useEffect
  // }, [videoId, isReady]);

  // Sync playback position
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;

    const currentTime = progress * duration;
    if (Math.abs(wavesurferRef.current.getCurrentTime() - currentTime) > 0.5) {
      wavesurferRef.current.setTime(currentTime);
    }
  }, [progress, duration, isReady]);

  // Handle wavesurfer events
  useEffect(() => {
    if (!wavesurferRef.current) return;

    const onSeek = (currentTime) => {
      if (duration > 0) {
        const ratio = currentTime / duration;
        onScrub?.(ratio);
      }
    };

    wavesurferRef.current.on('seek', onSeek);
    wavesurferRef.current.on('click', onSeek);

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.un('seek', onSeek);
        wavesurferRef.current.un('click', onSeek);
      }
    };
  }, [duration, onScrub, isReady]);

  const toRatio = useCallback((clientX) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return 0;
    const x = Math.min(Math.max(clientX - box.left, 0), box.width);
    return x / box.width;
  }, []);

  const handleMouseDown = useCallback((e, type) => {
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);

    if (type === "scrub") {
      const r = toRatio(e.clientX);
      onScrub?.(r);
    }
  }, [toRatio, onScrub]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const r = toRatio(e.clientX);

    if (dragType === "scrub") {
      onScrub?.(r);
    } else if (dragType === "start" || dragType === "end") {
      const t = r * duration;
      if (dragType === "start") {
        onLoopChange?.({ ...loop, a: t });
      } else {
        onLoopChange?.({ ...loop, b: t });
      }
    }
  }, [isDragging, dragType, toRatio, duration, loop, onScrub, onLoopChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  const startPos = (loop?.a ?? 0) / duration;
  const endPos = (loop?.b ?? 1) / duration;

  return (
    <div
      className="waveform-wrapper"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ position: 'relative' }}
    >
      {/* WaveSurfer container */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '180px',
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          cursor: 'pointer',
        }}
        onClick={() => {
          console.log('🔍 DEBUGGING WaveSurfer state:');
          console.log('📦 Container element:', containerRef.current);
          console.log('📦 Container HTML:', containerRef.current?.innerHTML);
          console.log('📦 Container children count:', containerRef.current?.children?.length || 0);
          
          // List all child elements
          if (containerRef.current?.children) {
            console.log('👶 Container children:');
            for (let i = 0; i < containerRef.current.children.length; i++) {
              const child = containerRef.current.children[i];
              console.log(`   Child ${i}:`, child.tagName, child.className, child);
            }
          }
          
          console.log('🌊 WaveSurfer object:', wavesurferRef.current);
          
          if (wavesurferRef.current) {
            console.log('🌊 WaveSurfer methods available:', Object.keys(wavesurferRef.current));
            
            // Try to get current state
            try {
              console.log('📊 WaveSurfer isReady:', wavesurferRef.current.isReady);
            } catch (e) {
              console.log('❌ Could not check isReady:', e);
            }
            
            // Try to load a simple test file
            console.log('🎵 Attempting to load test audio...');
            wavesurferRef.current.loadBlob(new Blob([new ArrayBuffer(1024)], { type: 'audio/wav' }))
              .then(() => {
                console.log('✅ Blob loaded successfully!');
                console.log('📦 Container after blob load:', containerRef.current?.innerHTML);
              })
              .catch((error) => {
                console.error('❌ Blob load failed:', error);
              });
          }
        }} 
      />

      {/* Loading indicator */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          Loading waveform...
        </div>
      )}

      {/* Loop region overlay */}
      {loop && duration > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${startPos * 100}%`,
            width: `${(endPos - startPos) * 100}%`,
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: 5
          }}
        />
      )}

      {/* Clip handles */}
      <div
        className="waveform-clip-handle start"
        style={{ left: `${startPos * 100}%` }}
        onMouseDown={(e) => handleMouseDown(e, "start")}
      >
        <div className="clip-handle-cap" />
      </div>

      <div
        className="waveform-clip-handle end"
        style={{ left: `${endPos * 100}%` }}
        onMouseDown={(e) => handleMouseDown(e, "end")}
      >
        <div className="clip-handle-cap" />
      </div>
    </div>
  );
}
