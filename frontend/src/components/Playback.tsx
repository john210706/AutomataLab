import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type { PlaybackState } from "../hooks";

export function Playback({
  player,
  title,
}: {
  player: PlaybackState;
  title?: string;
}) {
  return (
    <div className="playback" aria-label="Algorithm playback">
      <div className="playback-top">
        <div className="playback-buttons">
          <button
            className="icon-button"
            aria-label="First step"
            title="First step"
            disabled={!player.count || player.index === 0}
            onClick={() => player.seek(0)}
          >
            <ChevronFirst size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Previous step"
            title="Previous step"
            disabled={!player.count || player.index === 0}
            onClick={() => player.seek(player.index - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="play-button"
            aria-label={player.playing ? "Pause playback" : "Play steps"}
            disabled={player.count < 2}
            onClick={player.toggle}
          >
            {player.playing ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Next step"
            title="Next step"
            disabled={!player.count || player.index === player.count - 1}
            onClick={() => player.seek(player.index + 1)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Last step"
            title="Last step"
            disabled={!player.count || player.index === player.count - 1}
            onClick={() => player.seek(player.count - 1)}
          >
            <ChevronLast size={17} />
          </button>
          <span className="divider" />
          <button
            className="icon-button"
            aria-label="Restart playback"
            title="Restart playback"
            onClick={() => player.seek(0)}
          >
            <RotateCcw size={15} />
          </button>
        </div>
        <span className="step-count" data-testid="step-count">
          Step <b>{player.count ? player.index + 1 : 0}</b> / {player.count}
        </span>
        <label className="speed-label">
          <span>Speed</span>
          <select
            aria-label="Playback speed"
            value={player.speed}
            onChange={(e) => player.setSpeed(Number(e.target.value))}
          >
            {[0.5, 1, 1.5, 2].map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        className="timeline"
        type="range"
        aria-label="Algorithm step"
        min={0}
        max={Math.max(0, player.count - 1)}
        value={player.index}
        onPointerDown={() => player.seek(player.index)}
        onInput={(e) => player.seek(Number(e.currentTarget.value))}
        onChange={(e) => player.seek(Number(e.target.value))}
        disabled={!player.count}
        style={
          {
            "--progress": `${player.count > 1 ? (player.index / (player.count - 1)) * 100 : 0}%`,
          } as React.CSSProperties
        }
      />
      {title && (
        <p className="playback-caption">
          <span
            className={player.playing ? "status-dot pulsing" : "status-dot"}
          />
          {title}
          <span>
            {player.playing ? "Playing" : "Paused · explore at your pace"}
          </span>
        </p>
      )}
    </div>
  );
}
