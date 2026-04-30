import { useRef, useEffect, useCallback } from 'react';
import { PlaybackController } from '@/engine/playbackController';
import { useReaderStore } from '@/store/readerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useEffectiveProfile } from '@/billing/useEffectiveProfile';
import type { WordToken, SpeedProfile } from '@/types/rsvp';

export function useRsvpPlayback() {
  const controllerRef = useRef<PlaybackController | null>(null);
  const { setCurrentToken, setPlaying, tokens, currentBookId, currentChapterIndex } = useReaderStore();
  const updateProgress = useLibraryStore(s => s.updateProgress);

  // Pro-gated profile: Free users get base WPM only (no rules, no transition).
  const activeProfile = useEffectiveProfile();

  useEffect(() => {
    const controller = new PlaybackController(activeProfile, {
      onWord: (token: WordToken, index: number, effectiveWpm: number) => {
        setCurrentToken(token, index, effectiveWpm);
      },
      onComplete: () => {
        setPlaying(false);
      },
      onStateChange: (playing: boolean) => {
        setPlaying(playing);
      },
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
    };
  // Only recreate controller on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync profile to controller whenever WPM or rules change (works while paused too)
  useEffect(() => {
    if (controllerRef.current && activeProfile) {
      controllerRef.current.setProfile(activeProfile);
    }
  }, [activeProfile]);

  // Load tokens when they change
  useEffect(() => {
    if (controllerRef.current && tokens.length > 0) {
      controllerRef.current.loadTokens(tokens);
    }
  }, [tokens]);

  const play = useCallback(() => controllerRef.current?.play(), []);
  const pause = useCallback(() => {
    controllerRef.current?.pause();
    // Auto-save progress
    if (currentBookId && controllerRef.current) {
      const pos = controllerRef.current.getPosition();
      const token = tokens[pos];
      if (token) {
        updateProgress(currentBookId, {
          chapterIndex: currentChapterIndex,
          wordIndex: pos,
          globalWordIndex: token.globalIndex,
        });
      }
    }
  }, [currentBookId, currentChapterIndex, tokens, updateProgress]);

  const toggle = useCallback(() => {
    if (controllerRef.current?.isPlaying()) {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  const markSeek = useReaderStore(s => s.markSeek);
  const seekTo = useCallback((index: number) => {
    markSeek();
    controllerRef.current?.seekTo(index);
  }, [markSeek]);
  const skipForward = useCallback((count = 1) => {
    markSeek();
    controllerRef.current?.skipForward(count);
  }, [markSeek]);
  const skipBack = useCallback((count = 1) => {
    markSeek();
    controllerRef.current?.skipBack(count);
  }, [markSeek]);

  const updateProfile = useCallback((profile: SpeedProfile) => {
    controllerRef.current?.setProfile(profile);
  }, []);

  return {
    play,
    pause,
    toggle,
    seekTo,
    skipForward,
    skipBack,
    updateProfile,
    getPosition: () => controllerRef.current?.getPosition() ?? 0,
    getTokenCount: () => controllerRef.current?.getTokenCount() ?? 0,
  };
}
