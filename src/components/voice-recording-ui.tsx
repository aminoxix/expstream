"use client";

import { Button } from "@/components/ui/button";
import type {
  VoiceRecorderResult,
  VoiceRecording,
} from "@/hooks/use-voice-recorder";
import { getFileUrl } from "@/lib/utils";
import {
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function WaveformBars({
  amplitudes,
  barCount = 40,
  color = "bg-red-500",
  progress,
  onSeek,
}: {
  amplitudes: number[];
  barCount?: number;
  color?: string;
  progress?: number;
  onSeek?: (position: number) => void;
}) {
  const bars = resampleAmplitudes(amplitudes, barCount);

  return (
    <div
      className={`flex items-center gap-[2px] h-8 flex-1 ${onSeek ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        if (!onSeek) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(1, pos)));
      }}
    >
      {bars.map((amp, i) => {
        const height = Math.max(3, amp * 28);
        const isPlayed =
          progress !== undefined ? i / bars.length < progress : true;
        const barColor =
          progress !== undefined
            ? isPlayed
              ? "bg-blue-500"
              : "bg-gray-300"
            : color;

        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all ${barColor}`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}

function resampleAmplitudes(
  amplitudes: number[],
  targetCount: number,
): number[] {
  if (amplitudes.length === 0) return Array(targetCount).fill(0.05);
  if (amplitudes.length === targetCount) return amplitudes;

  const result: number[] = [];
  const step = amplitudes.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const idx = Math.floor(i * step);
    result.push(amplitudes[Math.min(idx, amplitudes.length - 1)]!);
  }
  return result;
}

export function VoiceRecordingInput({
  recorder,
  onSend,
  onCancel,
}: {
  recorder: VoiceRecorderResult;
  onSend: (recording: VoiceRecording) => void;
  onCancel: () => void;
}) {
  const { state, durationMs, amplitudes, recording } = recorder;

  const handleCancel = useCallback(() => {
    recorder.cancelRecording();
    onCancel();
  }, [recorder, onCancel]);

  if (state === "stopped" && recording) {
    return (
      <VoiceRecordingPreview
        recording={recording}
        onDiscard={handleCancel}
        onSend={() => onSend(recording)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-input bg-white">
      <div className="flex items-center gap-2 min-w-[90px]">
        <div
          className={`size-2.5 rounded-full ${
            state === "recording" ? "bg-red-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span className="text-xs font-medium text-gray-600">
          {state === "recording" ? "Recording" : "Paused"}
        </span>
      </div>

      <WaveformBars
        amplitudes={amplitudes}
        barCount={40}
        color={state === "recording" ? "bg-red-400" : "bg-gray-400"}
      />

      <span className="text-xs font-mono text-gray-500 min-w-[40px] text-right">
        {formatDuration(durationMs)}
      </span>

      <div className="flex items-center gap-1">
        {state === "recording" ? (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={recorder.pauseRecording}
            aria-label="Pause recording"
          >
            <PauseIcon className="size-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={recorder.resumeRecording}
            aria-label="Resume recording"
          >
            <PlayIcon className="size-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={recorder.stopRecording}
          aria-label="Stop recording"
        >
          <StopIcon className="size-4" weight="fill" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleCancel}
          aria-label="Cancel recording"
        >
          <TrashIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function VoiceRecordingPreview({
  recording,
  onDiscard,
  onSend,
}: {
  recording: VoiceRecording;
  onDiscard: () => void;
  onSend: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.durationMs / 1000);

  useEffect(() => {
    const url = URL.createObjectURL(recording.blob);
    objectUrlRef.current = url;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [recording.blob]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback(
    (position: number) => {
      const audio = audioRef.current;
      if (audio && isFinite(duration)) {
        audio.currentTime = position * duration;
        setCurrentTime(audio.currentTime);
      }
    },
    [duration],
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-input bg-white">
      <audio
        ref={audioRef}
        src={objectUrlRef.current || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />

      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={handlePlayPause}
        aria-label={isPlaying ? "Pause preview" : "Play preview"}
      >
        {isPlaying ? (
          <PauseIcon className="size-4" weight="fill" />
        ) : (
          <PlayIcon className="size-4" weight="fill" />
        )}
      </Button>

      <WaveformBars
        amplitudes={recording.waveformData}
        barCount={50}
        progress={progress}
        onSeek={handleSeek}
      />

      <span className="text-xs font-mono text-gray-500 min-w-[65px] text-right whitespace-nowrap">
        {formatDuration(currentTime * 1000)}/{formatDuration(duration * 1000)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={onDiscard}
        aria-label="Discard recording"
      >
        <TrashIcon className="size-4" />
      </Button>
    </div>
  );
}

export function VoiceRecordingPlayer({
  attachment,
}: {
  attachment: {
    asset_url?: string;
    duration?: number;
    waveform_data?: number[];
    mime_type?: string;
    file_size?: string | number;
    title?: string;
  };
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    attachment.duration ? attachment.duration / 1000 : 0,
  );
  const [playbackRate, setPlaybackRate] = useState(1);

  const playbackRates = [1, 1.5, 2];

  if (!attachment.asset_url) return null;

  const resolvedUrl = (() => {
    try {
      const u = new URL(attachment.asset_url);
      if (["http:", "https:", "blob:"].includes(u.protocol))
        return attachment.asset_url;
    } catch {}
    return getFileUrl(attachment.asset_url);
  })();

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (position: number) => {
    const audio = audioRef.current;
    if (audio && isFinite(duration)) {
      audio.currentTime = position * duration;
      setCurrentTime(audio.currentTime);
    }
  };

  const handlePlaybackRateToggle = () => {
    const currentIdx = playbackRates.indexOf(playbackRate);
    const nextRate = playbackRates[(currentIdx + 1) % playbackRates.length]!;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const waveform = attachment.waveform_data?.length
    ? attachment.waveform_data
    : Array(30).fill(0.3);

  return (
    <div className="flex items-center gap-2 max-w-xs border rounded-lg px-3 py-2 bg-white">
      <audio
        ref={audioRef}
        src={resolvedUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />

      <button
        type="button"
        onClick={handlePlayPause}
        className="flex-shrink-0 flex items-center justify-center size-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <PauseIcon className="size-3.5" weight="fill" />
        ) : (
          <PlayIcon className="size-3.5" weight="fill" />
        )}
      </button>

      <WaveformBars
        amplitudes={waveform}
        barCount={30}
        progress={progress}
        onSeek={handleSeek}
      />

      <span className="text-[11px] font-mono text-gray-500 min-w-[65px] text-right whitespace-nowrap">
        {formatDuration(currentTime * 1000)}/{formatDuration(duration * 1000)}
      </span>

      <button
        type="button"
        onClick={handlePlaybackRateToggle}
        className="flex-shrink-0 text-[11px] font-medium text-gray-500 hover:text-gray-700 min-w-[28px] text-center"
        aria-label={`Playback speed ${playbackRate}x`}
      >
        {playbackRate}x
      </button>
    </div>
  );
}
