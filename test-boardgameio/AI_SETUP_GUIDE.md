# Hearthstone Clone - AI Opponent Setup Guide

## Overview

Your Hearthstone Clone now includes an intelligent AI opponent that uses rule-based heuristics to make strategic decisions. The AI can:

- Play cards efficiently based on mana cost
- Make intelligent trades on the board
- Use battlecries effectively with smart target selection
- Go for lethal when possible
- Manage resources strategically

## How the AI Works

The AI uses a **heuristic scoring system** that evaluates every possible move and selects the best one based on:

### Card Play Heuristics

- **Mana Efficiency**: Prefers to use available mana (5 points per mana)
- **Board Presence**: Values having minions on board (20 base points)
- **Stats Value**: Attack worth 8 points each, Health worth 6 points each
- **Taunt Value**: Taunt minions worth extra 15 points

### Attack Heuristics

- **Favorable Trades**: Prefers trades that kill enemy minions
- **Lethal Detection**: Always goes for lethal (1000 points!)
- **Face Damage**: Values attacking the hero (10 points per attack)
- **Taunt Priority**: Must attack taunts before face
- **Trade Evaluation**: Considers counter-attack damage

### Effect Evaluation

- **Damage**: 8 points per damage to enemy hero, higher for killing minions
- **Healing**: 3 points per HP healed
- **Card Draw**: 12 points per card (very valuable!)
- **Summon**: 25 points for summoning minions

## How to Play Against the AI

### Method 1: Using boardgame.io Local Mode

The AI is already configured in your game! To play against it locally:

```typescript
import { Local } from "boardgame.io/multiplayer";
import { Client } from "boardgame.io/react";
import { HeathStoneGame } from "./game";
import Board from "./components/Board";

// Create a client with AI opponent
const HearthstoneWithAI = Client({
  board: Board,
  game: HeathStoneGame,
  numPlayers: 2,
  multiplayer: Local({
    bots: {
      "1": {
        // Player 1 will be controlled by AI
        // The AI will automatically use the enumerate function
      },
    },
  }),
  debug: { collapseOnLoad: true, hideToggleButton: false },
});

export default HearthstoneWithAI;
```

### Method 2: Using boardgame.io Server (Recommended for Production)

1. **Install boardgame.io server** (if not already installed):

```bash
npm install @boardgame.io/server
```

2. **Create a server file** (`server.js`):

```javascript
const { Server } = require("boardgame.io/server");
const { HeathStoneGame } = require("./dist/game");

const server = Server({
  games: [HeathStoneGame],

  // Configure AI bots
  bots: {
    1: {
      // AI opponent configuration
    },
  },
});

const PORT = process.env.PORT || 8000;
server.run(PORT, () => {
  console.log(`Hearthstone server running on port ${PORT}`);
});
```

3. **Update client to connect to server**:

```typescript
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";

const HearthstoneClient = Client({
  board: Board,
  game: HeathStoneGame,
  multiplayer: SocketIO({ server: "localhost:8000" }),
  debug: { collapseOnLoad: true },
});
```

## AI Deck Setup

The AI currently starts with a default deck (defined in `p1` player in `game/index.ts`). To customize the AI's deck:

1. **Automatic Deck Selection**: The AI needs a deck selected during the `setDeck` phase
2. **You can either**:
   - Have the AI automatically select a predefined deck
   - Manually select a deck for the AI opponent before starting

## Testing the AI

Run your development server:

```bash
npm run dev
```

The AI will:

1. Automatically select its deck (if configured)
2. Make moves during its turns
3. Consider all legal moves and pick the best one
4. End its turn when no better moves are available

## Expected AI Behavior

### Early Game

- Plays minions to establish board presence
- Uses mana efficiently
- Makes favorable trades

### Mid Game

- Maintains board control
- Uses removal spells on high-value targets
- Continues to play for value

### Late Game

- Calculates lethal damage
- Goes face when ahead
- Uses resources to finish the game

## Debugging AI Decisions

Enable debug mode to see AI thinking:

```typescript
const Hearthstone = Client({
  board: Board,
  game: HeathStoneGame,
  debug: {
    collapseOnLoad: false, // Keep debug panel open
    hideToggleButton: false, // Show debug controls
  },
});
```

Each AI move includes a `description` field (visible in console) showing what it's trying to do!

## Customizing AI Behavior

### Adjust Heuristic Weights

Edit `src/game/ai.ts` and modify the scoring values:

```typescript
// Example: Make AI more aggressive (prefer face damage)
if (effect.target === "enemy-hero") {
  score += damage * 15; // Changed from 8 to 15
}
```

### Add New Strategies

You can add new evaluation functions in `ai.ts`:

```typescript
function evaluateGameState(G: GameState, ctx: Ctx): number {
  let score = 0;
  // Add your custom evaluation logic here
  // e.g., bonus for having more cards than opponent
  const handAdvantage = player.hand.length - enemyPlayer.hand.length;
  score += handAdvantage * 5;
  return score;
}
```

## Difficulty Levels (Future Enhancement)

To implement difficulty levels, you can scale the heuristic scores:

```typescript
const DIFFICULTY = {
  EASY: 0.5, // AI makes suboptimal choices
  MEDIUM: 1.0, // Standard AI
  HARD: 1.5, // AI heavily optimizes
};

// In scoring functions:
score = baseScore * DIFFICULTY.MEDIUM;
```

## Troubleshooting

### AI Not Moving

- Check console for errors
- Verify `enumerateAIMoves` is returning valid moves
- Ensure AI player has a valid deck

### AI Making Bad Moves

- Review the heuristic scores in `ai.ts`
- Add console.log to see move evaluations
- Adjust weights based on game testing

### Performance Issues

- AI evaluation is very fast for card games
- If slow, consider reducing lookahead depth (not implemented yet)

## Next Steps

Consider enhancing the AI with:

1. **Monte Carlo Tree Search (MCTS)** for deeper strategic planning
2. **Difficulty levels** with different heuristic weights
3. **Opponent modeling** to predict enemy plays
4. **Machine learning** to train on game replays

## File Structure

```
src/
├── game/
│   ├── index.ts     # Main game logic with AI configuration
│   └── ai.ts        # AI enumeration and scoring logic
└── types/
    └── index.ts     # Type definitions
```

## Questions?

The AI system is fully functional and ready to play! Test it out and adjust the heuristics to match your desired difficulty level.
