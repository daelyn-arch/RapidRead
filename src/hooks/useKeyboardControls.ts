import { useEffect } from 'react';

interface KeyboardActions {
  toggle: () => void;
  skipForward: (count?: number) => void;
  skipBack: (count?: number) => void;
  speedUp: () => void;
  speedDown: () => void;
  prevChapter: () => void;
  nextChapter: () => void;
  goBack: () => void;
}

export function useKeyboardControls(actions: KeyboardActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          actions.toggle();
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.skipForward(e.shiftKey ? 10 : 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.skipBack(e.shiftKey ? 10 : 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          actions.speedUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          actions.speedDown();
          break;
        case 'BracketLeft':
          e.preventDefault();
          actions.prevChapter();
          break;
        case 'BracketRight':
          e.preventDefault();
          actions.nextChapter();
          break;
        case 'Escape':
          e.preventDefault();
          actions.goBack();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions]);
}
