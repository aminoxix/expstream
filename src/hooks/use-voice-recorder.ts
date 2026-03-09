"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "try";

export type VoiceRecorderState = "idle" | "recording" | "paused" | "stopped";

export interface VoiceRecording {
  blob: Blob;
  durationMs: number;
  waveformData: number[];
  mimeType: string;
  title: string;
}

export interface VoiceRecorderResult {
  state: VoiceRecorderState;
  durationMs: number;
  amplitudes: number[];
  recording: VoiceRecording | undefined;
  error: string | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
}

function getPreferredMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of types) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(t)
    )
      return t;
  }
  return "audio/webm";
}

function generateTitle(mimeType: string): string {
  const ext = mimeType.includes("mp4")
    ? "mp4"
    : mimeType.includes("ogg")
      ? "ogg"
      : "webm";
  return `voice-recording-${Date.now()}.${ext}`;
}

export function useVoiceRecorder(): VoiceRecorderResult {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [recording, setRecording] = useState<VoiceRecording | undefined>();
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const amplitudeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const startTimeRef = useRef(0);
  const pausedDurationRef = useRef(0);
  const amplitudesRef = useRef<number[]>([]);
  const cancelledRef = useRef(false);

  const startAmplitudeSampling = useCallback(() => {
    if (amplitudeIntervalRef.current)
      clearInterval(amplitudeIntervalRef.current);

    amplitudeIntervalRef.current = setInterval(() => {
      const analyser = analyserRef.current;
      if (!analyser) return;

      const dataArray = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i]! - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalized = Math.min(1, rms * 2.5);

      amplitudesRef.current = [...amplitudesRef.current.slice(-59), normalized];
      setAmplitudes([...amplitudesRef.current]);
    }, 100);
  }, []);

  const stopAmplitudeSampling = useCallback(() => {
    if (amplitudeIntervalRef.current) {
      clearInterval(amplitudeIntervalRef.current);
      amplitudeIntervalRef.current = null;
    }
  }, []);

  const startDurationTracking = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

    durationIntervalRef.current = setInterval(() => {
      const elapsed =
        Date.now() - startTimeRef.current + pausedDurationRef.current;
      setDurationMs(elapsed);
    }, 100);
  }, []);

  const stopDurationTracking = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const cleanupResources = useCallback(() => {
    stopDurationTracking();
    stopAmplitudeSampling();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      const [ok, err] = t(() => mediaRecorderRef.current!.stop());
      if (!ok) console.debug("[VoiceRecorder] Failed to stop recorder:", err);
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch((e) => {
        console.debug("[VoiceRecorder] Failed to close AudioContext:", e);
      });
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
  }, [stopDurationTracking, stopAmplitudeSampling]);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecording(undefined);
    cancelledRef.current = false;

    const [ok, err] = await t(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = getPreferredMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      amplitudesRef.current = [];
      pausedDurationRef.current = 0;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (cancelledRef.current) return;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const finalDuration =
          Date.now() - startTimeRef.current + pausedDurationRef.current;

        const rec: VoiceRecording = {
          blob,
          durationMs: finalDuration,
          waveformData: [...amplitudesRef.current],
          mimeType,
          title: generateTitle(mimeType),
        };

        setRecording(rec);
        setDurationMs(finalDuration);
        setState("stopped");
        stopDurationTracking();
        stopAmplitudeSampling();

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (
          audioContextRef.current &&
          audioContextRef.current.state !== "closed"
        ) {
          audioContextRef.current.close().catch((e) => {
            console.debug("[VoiceRecorder] Failed to close AudioContext:", e);
          });
        }
      };

      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        cleanupResources();
        setState("idle");
      };

      recorder.start(250);
      startTimeRef.current = Date.now();
      setState("recording");
      startDurationTracking();
      startAmplitudeSampling();
    });

    if (!ok) {
      const errorName = err instanceof Error ? err.name : "";
      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError"
      ) {
        setError(
          "Microphone access denied. Please allow microphone access in your browser settings.",
        );
      } else if (errorName === "NotFoundError") {
        setError(
          "No microphone found. Please connect a microphone and try again.",
        );
      } else {
        setError("Failed to start recording. Please try again.");
      }
      cleanupResources();
      setState("idle");
    }
  }, [
    cleanupResources,
    startDurationTracking,
    startAmplitudeSampling,
    stopDurationTracking,
    stopAmplitudeSampling,
  ]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.pause();
    pausedDurationRef.current += Date.now() - startTimeRef.current;
    stopDurationTracking();
    stopAmplitudeSampling();
    setState("paused");
  }, [stopDurationTracking, stopAmplitudeSampling]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;

    recorder.resume();
    startTimeRef.current = Date.now();
    startDurationTracking();
    startAmplitudeSampling();
    setState("recording");
  }, [startDurationTracking, startAmplitudeSampling]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (recorder.state === "paused") {
      startTimeRef.current = Date.now();
    }

    recorder.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    cleanupResources();
    setState("idle");
    setDurationMs(0);
    setAmplitudes([]);
    setRecording(undefined);
    amplitudesRef.current = [];
    pausedDurationRef.current = 0;
  }, [cleanupResources]);

  const cleanupRef = useRef(cleanupResources);
  cleanupRef.current = cleanupResources;

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);

  return {
    state,
    durationMs,
    amplitudes,
    recording,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}
