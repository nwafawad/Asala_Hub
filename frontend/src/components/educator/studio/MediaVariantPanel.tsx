'use client';

import React from 'react';
import { Mic, Pause, Play } from 'lucide-react';

interface MediaVariantPanelProps {
  recordingSeconds: number;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  audioUrl: string;
  isPlayingAudio: boolean;
  toggleAudioPlayback: () => void;
  handleAudioFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  content: string;
  setContent: (val: string) => void;
  formatSecs: (sec: number) => string;
}

export const MediaVariantPanel: React.FC<MediaVariantPanelProps> = ({
  recordingSeconds,
  isRecording,
  startRecording,
  stopRecording,
  audioUrl,
  isPlayingAudio,
  toggleAudioPlayback,
  handleAudioFileUpload,
  content,
  setContent,
  formatSecs,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-5">
      <h3 className="text-sm font-bold font-heading flex items-center gap-2">
        <Mic className="w-4 h-4 text-purple-500" />
        <span>Audio Lecture & Voice Recorder</span>
      </h3>

      {/* Voice Recorder Block */}
      <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col items-center gap-4">
        <div className="text-center">
          <span className="text-2xl font-mono font-bold text-foreground">
            {formatSecs(recordingSeconds)}
          </span>
          <p className="text-xs text-muted-foreground">
            {isRecording ? 'Recording voice note...' : 'Record audio directly from your microphone'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer animate-pulse"
            >
              <Pause className="w-4 h-4" />
              <span>Stop Recording</span>
            </button>
          )}

          {audioUrl && (
            <button
              type="button"
              onClick={toggleAudioPlayback}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-colors cursor-pointer"
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 text-purple-500" />
              ) : (
                <Play className="w-4 h-4 text-purple-500" />
              )}
              <span>{isPlayingAudio ? 'Pause Preview' : 'Play Preview'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Or Audio File Upload */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">Or Upload Audio File (MP3 / WAV)</label>
        <input
          type="file"
          accept="audio/*"
          onChange={handleAudioFileUpload}
          className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">Lecture Notes / Transcript</label>
        <textarea
          rows={4}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add text summary or transcript for this audio lecture..."
          className="w-full p-3.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden"
        />
      </div>
    </div>
  );
};
