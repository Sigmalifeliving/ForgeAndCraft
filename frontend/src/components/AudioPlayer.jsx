import { useRef, useState } from 'react';
import { Play, Pause, Download, SkipBack, SkipForward } from 'lucide-react';

export default function AudioPlayer({ src, title }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />
      <div className="audio-info">
        <span className="audio-title">{title || 'Audio'}</span>
        <span className="audio-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <div className="audio-waveform">
        <div
          className="audio-progress"
          style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
        />
      </div>
      <div className="audio-controls">
        <button className="viewer-btn" onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)}>
          <SkipBack size={16} />
        </button>
        <button className="btn btn-primary btn-sm" onClick={togglePlay}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="viewer-btn" onClick={() => audioRef.current && (audioRef.current.currentTime += 10)}>
          <SkipForward size={16} />
        </button>
        {src && (
          <a href={src} download={title || 'audio.wav'} className="viewer-btn">
            <Download size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
