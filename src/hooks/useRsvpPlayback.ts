import { useRef, useEffect, useCallback } from 'react';
import { PlaybackController } from '@/engine/playbackController';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useLibraryStore } from '@/store/libraryStore';
import type { WordToken, SpeedProfile } from '@/types/rsvp';

export function useRsvpPlayback() {
  const controllerRef = useRef<PlaybackController | null>(null);
  const { setCurrentToken, setPlaying, tokens, currentBookId, currentChapterIndex } = useReaderStore();
  const getActiveProfile = useSettingsStore(s => s.getActiveProfile);
  const updateProgress = useLibraryStore(s => s.updateProgress);

  useEffect(() => {
    const profile = getActiveProfile();
    const controller = new PlaybackController(profile, {
      onWord: (token: WordToken, index: number) => {
        setCurrentToken(token, index);
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
  }, [getActiveProfile, setCurrentToken, setPlaying]);

  // Update controller's profile when it changes
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setProfile(getActiveProfile());
    }
  }, [getActiveProfile]);

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

  const seekTo = useCallback((index: number) => controllerRef.current?.seekTo(index), []);
  const skipForward = useCallback((count = 1) => controllerRef.current?.skipForward(count), []);
  const skipBack = useCallback((count = 1) => controllerRef.current?.skipBack(count), []);

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
