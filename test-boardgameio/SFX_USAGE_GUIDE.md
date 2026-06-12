# Sound Effects (SFX) System - Usage Guide

## Overview

Your Hearthstone clone now has a complete sound effects system built on Web Audio API, integrated with your existing audio infrastructure. The system supports:

- **Preloaded sounds** for instant playback (UI interactions)
- **On-demand loading with LRU caching** (gameplay effects)
- **Independent volume control** separate from music
- **Mute toggle** that affects all audio
- **Future-ready** for animation event integration

## Quick Start

### 1. Initialize Audio (One-time setup)

In your main App component or game initialization:

```typescript
import { useAudioStore } from '@/stores/audioStore';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const { initAudio, preloadSfxSounds } = useAudioStore.getState();

    // Initialize audio context and gain nodes
    initAudio();

    // Preload critical SFX (button clicks, card sounds, etc.)
    preloadSfxSounds();
  }, []);

  return <YourGame />;
}
```

### 2. Play Sounds in Components

#### Basic Usage (Direct Store Access)

```typescript
import { useAudioStore } from '@/stores/audioStore';

function Button() {
  const handleClick = () => {
    // Play a preloaded sound
    useAudioStore.getState().playSfx('button-click');

    // Your button logic...
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

#### With Custom Volume

```typescript
function Card() {
  const handlePlay = () => {
    // Play at 80% volume
    useAudioStore.getState().playSfx('card-play', 0.8);
  };

  return <div onClick={handlePlay}>Play Card</div>;
}
```

#### With Custom Paths

```typescript
function SpecialAbility() {
  const handleActivate = () => {
    // Use a custom sound file path
    useAudioStore.getState().playSfx('/abilities/fireball.ogg');
  };

  return <button onClick={handleActivate}>Fireball!</button>;
}
```

### 3. Volume Control

```typescript
import { useAudioStore } from '@/stores/audioStore';

function SettingsPanel() {
  const sfxVolume = useAudioStore((state) => state.sfxVolume);
  const setSfxVolume = useAudioStore((state) => state.setSfxVolume);

  return (
    <div>
      <label>SFX Volume</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={sfxVolume}
        onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
      />
    </div>
  );
}
```

## Sound Manifest

All sounds are defined in `src/utils/sfxManager.ts`:

### Preloaded Sounds (Instant Playback)

- `button-click` - UI button clicks
- `button-hover` - UI button hovers
- `card-select` - Card selection
- `card-play` - Playing a card
- `card-draw` - Drawing a card
- `end-turn` - End turn button

### On-Demand Sounds (Loaded & Cached on First Use)

- `attack-melee` - Melee attack
- `attack-spell` - Spell attack
- `damage-taken` - Taking damage
- `heal` - Healing effect
- `death` - Unit death
- `victory` - Victory condition
- `defeat` - Defeat condition

## Adding New Sounds

### Option 1: Add to Manifest (Recommended)

Edit `src/utils/sfxManager.ts`:

```typescript
export const SFX_MANIFEST = {
  // ... existing sounds ...

  // Add your new sound
  "spell-cast": { path: "/abilities/spell-cast.ogg", preload: false },
  "coin-collect": { path: "/ui/coin.ogg", preload: true },
} as const;
```

Then use it:

```typescript
useAudioStore.getState().playSfx("spell-cast");
```

### Option 2: Use Custom Path

No manifest changes needed:

```typescript
useAudioStore.getState().playSfx("/custom/mysound.ogg");
```

## File Structure

Place your audio files in:

```
public/assets/audio/sfx/
├── ui/
│   ├── click.ogg
│   ├── hover.ogg
│   └── card-select.ogg
├── gameplay/
│   ├── card-play.ogg
│   ├── card-draw.ogg
│   ├── attack-melee.ogg
│   └── ...
└── abilities/
    └── custom-sounds.ogg
```

## Future: Animation Integration

When you're ready to trigger sounds from animations:

### In animationStore.ts

```typescript
// Inside playAnimations method, when adding active animations:
import { useAudioStore } from "@/stores/audioStore";

// After: get().addActiveAnimation(animation);
if (animation.type === "attack") {
  useAudioStore.getState().playSfx("attack-melee");
} else if (animation.type === "death") {
  useAudioStore.getState().playSfx("death");
} else if (animation.type === "hitNumber") {
  useAudioStore.getState().playSfx("damage-taken", 0.7);
}
```

### Event-to-Sound Mapping

You can create a mapping object:

```typescript
const ANIMATION_SOUNDS: Record<string, string> = {
  attack: "attack-melee",
  death: "death",
  hitNumber: "damage-taken",
  // ... more mappings
};

// Then in your animation loop:
const soundId = ANIMATION_SOUNDS[animation.type];
if (soundId) {
  useAudioStore.getState().playSfx(soundId);
}
```

## Technical Details

### Memory Management

- **Preloaded sounds**: ~6 sounds, always in memory (~100-500KB)
- **Cache limit**: 30 sounds maximum (LRU eviction)
- **Typical cache size**: ~1-3MB for 20-30 cached sounds
- **Loading deduplication**: Prevents multiple simultaneous fetches of the same sound

### Audio Graph

```
Sound Source → Individual Gain (volume param)
  ↓
Master SFX Gain (sfxVolume setting)
  ↓
Destination (speakers)
```

### Error Handling

- Missing files: Console warned, game continues
- Failed loads: Console error, no crash
- Suspended context: Auto-resumes on play

## API Reference

### Methods

#### `preloadSfxSounds(): Promise<void>`

Loads all sounds marked with `preload: true`. Call once during initialization.

#### `playSfx(soundId: string, volume?: number): Promise<void>`

Plays a sound effect.

- `soundId`: Manifest ID or custom path
- `volume`: Optional multiplier (0.0-1.0), default 1.0

#### `clearSfxCache(): void`

Clears the runtime cache (keeps preloaded sounds). Useful for testing or memory management.

### State

#### `sfxVolume: number`

Global SFX volume (0.0-1.0)

#### `masterSfxGain: GainNode | null`

The Web Audio gain node controlling all SFX

#### `preloadedSounds: Map<string, AudioBuffer>`

Preloaded sound buffers (always in memory)

#### `cachedSounds: LRUCache<string, AudioBuffer>`

Runtime-loaded sounds (LRU cache with 30-sound limit)

## Examples

### Button with Hover Sound

```typescript
function InteractiveButton() {
  return (
    <button
      onMouseEnter={() => useAudioStore.getState().playSfx('button-hover', 0.3)}
      onClick={() => useAudioStore.getState().playSfx('button-click')}
    >
      Play Game
    </button>
  );
}
```

### Card Component

```typescript
function GameCard({ card }) {
  const handlePlay = () => {
    useAudioStore.getState().playSfx('card-play');
    // Play card logic...
  };

  const handleSelect = () => {
    useAudioStore.getState().playSfx('card-select', 0.5);
    // Selection logic...
  };

  return (
    <div onClick={handleSelect} onDoubleClick={handlePlay}>
      {card.name}
    </div>
  );
}
```

### End Turn Button

```typescript
function EndTurnButton() {
  const handleEndTurn = () => {
    useAudioStore.getState().playSfx('end-turn');
    // End turn logic...
  };

  return <button onClick={handleEndTurn}>End Turn</button>;
}
```

## Tips & Best Practices

1. **Preload Critical Sounds**: Mark frequently-used UI sounds as `preload: true`
2. **Use Reasonable Volumes**: UI sounds work well at 0.3-0.5, gameplay at 0.7-1.0
3. **Audio Formats**: OGG recommended for good compression and browser support
4. **File Sizes**: Keep individual SFX under 100KB when possible
5. **Testing**: Use `clearSfxCache()` to test on-demand loading behavior
6. **Animation Integration**: Wait until you're happy with animations, then add sounds

## Troubleshooting

### Sound not playing?

- Check browser console for errors
- Verify file path: `/assets/audio/sfx/your/path.ogg`
- Ensure `initAudio()` was called
- Check if browser blocked autoplay (user interaction required first)

### Sounds too quiet?

- Adjust `sfxVolume` (0.0-1.0)
- Use volume parameter: `playSfx('sound', 0.8)`
- Check system audio levels

### Memory concerns?

- Default 30-sound cache is ~1-3MB (very safe)
- Adjust MAX_CACHE_SIZE in sfxSlice.ts if needed
- Use `clearSfxCache()` manually if needed

## Architecture

```
sfxManager.ts
  ├── Sound manifest (IDs → paths)
  ├── Path resolution logic
  ├── Audio loading utilities
  └── LRU cache implementation

sfxSlice.ts
  ├── Zustand slice for SFX state
  ├── Preload management
  ├── Play logic
  └── Cache management

audioStore.ts
  ├── Combines music + SFX slices
  ├── Master audio context
  ├── Volume controls
  └── Mute toggle
```

This system is production-ready and scales well. Add sounds to the manifest, place files in the public folder, and you're good to go!
