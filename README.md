# RapidRead

RSVP (Rapid Serial Visual Presentation) speed reader with context-aware speed control.

## Features

- **RSVP Reading** - One word at a time, no eye movement needed
- **Adjustable Speed** - Base WPM in 25 WPM increments
- **Context-Aware Speed** - Automatic speed adjustments for:
  - Dialogue (text in quotes)
  - Unfamiliar/fictional words (detected via 275k-word English dictionary)
  - Sentence endings, paragraph breaks, punctuation, long words
- **Custom Known Words** - Add character names, places, etc. so they don't trigger slowdowns
- **EPUB & TXT Support** - Import books in either format
- **Progress Tracking** - Auto-saves reading position
- **Themes** - Dark, light, and sepia modes
- **PWA** - Installable, works offline

## Tech Stack

Vite + React 19 + TypeScript + Tailwind CSS 4 + Zustand 5

## Development

```bash
npm install
npm run dev
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Space | Play / Pause |
| Left/Right Arrow | Skip word (Shift = 10 words) |
| Up/Down Arrow | Speed +/- 25 WPM |
| [ / ] | Previous / Next chapter |
| Esc | Back to library |
