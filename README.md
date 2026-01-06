# Palabra Impostora - Discord Voice Companion Game

A production-ready social deduction game built with Next.js 16, Supabase, and TypeScript. Designed as a **visual companion for Discord voice chat** where players verbally say their clue words and the web app tracks game state, turn order, and scoring.

## Features

- **Discord Voice Companion**: Players speak their clues in Discord, app shows words and manages turns
- **Real-time Multiplayer**: Built on Supabase real-time subscriptions for instant updates across all players
- **No Login Required**: Just enter your name and start playing
- **Room System**: Create or join game rooms with 6-character codes
- **Turn-Based Gameplay**: Fixed random turn order with automatic progression
- **Word Bank**: 50+ pre-seeded Spanish word pairs across 10 categories
- **Impostor Guess Phase**: If caught, impostor can guess the common word to win
- **Responsive Design**: Works on desktop and mobile devices
- **Spanish UI**: Full Spanish language support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Subscriptions
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with Radix UI
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase project
- Discord server for voice chat

### Installation

1. The project is pre-configured with environment variables in the v0 workspace

2. Run the database migration scripts in order:
   - Execute `scripts/001_setup_database.sql` to create tables, RLS policies, and seed initial word pairs
   - Execute `scripts/002_add_turn_system.sql` to add turn-based gameplay features

3. The app is ready to use!

### Project Structure

```
app/
├── game/               # Main game pages
│   ├── page.tsx        # Create/join room
│   └── room/[id]/      # Game room with all phases
└── page.tsx            # Landing page with name entry

components/
└── game/               # Game-specific components
    ├── lobby-screen.tsx      # Room setup & config
    ├── game-screen.tsx       # Turn-based gameplay
    ├── voting-screen.tsx     # Vote for impostor
    ├── guess-screen.tsx      # Impostor guess phase
    ├── results-screen.tsx    # Round results
    └── final-results-screen.tsx  # Game winner

lib/
├── supabase/           # Supabase client utilities
├── game-actions.ts     # Server actions for game logic
├── hooks/              # Custom React hooks
└── types.ts            # TypeScript type definitions

scripts/
├── 001_setup_database.sql     # Initial schema and seed data
└── 002_add_turn_system.sql    # Turn-based features
```

## How to Play

### Setup
1. **Join Discord Voice**: All players join a Discord voice channel
2. **Enter Your Name**: Type your name on the web app home page
3. **Create/Join Room**: Host creates a room and shares the 6-character code
4. **Configure Game**: Host can adjust settings (rounds, turn time, categories, difficulty)
5. **Ready Up**: All players mark themselves as ready (minimum 3 players)

### Gameplay
6. **Get Your Word**: Each player sees their word on screen - one player gets a different word (the impostor)
7. **Turn Order**: A random turn order is generated and stays fixed for the entire game
8. **Take Turns**: 
   - When it's your turn, the app shows "ES TU TURNO"
   - Say a clue word related to your word **verbally in Discord**
   - Press the button or spacebar to end your turn
   - Other players watch and listen
9. **Rounds**: The turn order repeats for multiple rounds (e.g., 3 rounds = everyone speaks 3 times)
10. **Vote**: After all rounds, everyone votes for who they think is the impostor
11. **Elimination**:
    - If an innocent player is eliminated, they're out and the game continues
    - If the impostor is eliminated, they get one chance to guess the common word
12. **Impostor Guess**: 
    - Impostor types their guess for the common word
    - If correct: Impostor wins
    - If incorrect: Group wins
13. **Next Round**: Continue for configured number of game rounds
14. **Winner**: Player with most points wins!

### Example Game Flow

**Players**: Ana, Bob, Carlos  
**Impostor**: Carlos  
**Common Word**: "perro" (dog)  
**Impostor Word**: "gato" (cat)  
**Rounds**: 3

**Round 1**:
- Bob: "ladra" (barks) 
- Carlos: "maúlla" (meows) - trying to blend in
- Ana: "pastor" (shepherd)

**Round 2**:
- Bob: "Labrador"
- Carlos: "bigotes" (whiskers)
- Ana: "correa" (leash)

**Round 3**:
- Bob: "cachorro" (puppy)
- Carlos: "felino" (feline)
- Ana: "guardián" (guardian)

**Voting**: Everyone votes → Carlos is eliminated (caught!)

**Guess Phase**: Carlos types "perro"
- Correct → Carlos wins 3 points
- Incorrect → Ana and Bob each win 1 point

## Scoring System

- **Regular Players**: Earn 1 point if impostor is caught AND guesses wrong
- **Impostor**: Earns 3 points if they're caught but guess correctly
- **Eliminated Innocent Players**: Cannot vote or earn points

## Game Configuration

Hosts can configure:
- **Max Players**: 3-12
- **Rounds** (vueltas completas): 1-10 full cycles through all players
- **Turn Time**: 30-300 seconds per turn
- **Categories**: Choose which word categories to include
- **Difficulty**: Easy, Medium, Hard

## Database Schema

### Key Tables

- **players**: Player profiles with session tracking
- **word_pairs**: Bank of words for the game
- **rooms**: Game sessions with settings
- **room_players**: Players in each room (includes is_eliminated)
- **rounds**: Game rounds with turn order and impostor assignment
- **player_turns**: Tracks turn completions
- **votes**: Player votes during voting phase
- **impostor_guess**: Impostor's guess attempt
- **player_scores**: Accumulated scores per player
- **round_results**: Results of each round

All tables include Row Level Security policies (currently set to allow all operations for simplicity).

## Real-time Features

The app uses Supabase real-time subscriptions to keep all players synchronized:
- Player joins/leaves
- Ready status changes
- Turn progression
- Turn completions
- Vote updates
- Impostor guess
- Score changes
- Game state transitions

All players see the same state at the same time - no manual host triggers needed.

## Security

- Database tables have RLS policies
- Host-only actions (start game, kick players, change settings)
- Impostor word hidden until results phase
- Vote secrecy maintained until results
- Turn validation (only active player can complete turn)

## Server Actions

The app uses Next.js Server Actions in `lib/game-actions.ts`:

- `startGame()`: Initialize game with turn order
- `completeTurn()`: Advance to next player's turn
- `submitVote()`: Cast vote for suspected impostor
- `submitImpostorGuess()`: Impostor guesses common word
- `updateRoomSettings()`: Host configures game
- `kickPlayer()`: Host removes player
- `toggleReady()`: Mark player as ready
- `leaveRoom()`: Exit current room

## Development Notes

- Uses Next.js 16 with React 19.2
- Supabase client pattern (client.ts for browser, server.ts for server)
- Real-time hook (`use-realtime.ts`) manages subscriptions
- Type-safe with comprehensive TypeScript definitions
- Player sessions tracked via localStorage + cookies
- Turn order uses Fisher-Yates shuffle for randomization
- Spacebar keyboard shortcut for quick turn completion
- Auto-return to lobby after game ends (10 second countdown)

## Design Philosophy

This app is designed as a **visual companion** for Discord voice chat:

- **NO text input for clues** - players speak verbally
- **Simple turn confirmation** - just click or press spacebar
- **Clear visual indicators** - whose turn it is, timer, turn order
- **Automatic state transitions** - no manual host control needed
- **Mobile-friendly** - thumb-accessible buttons
- **Real-time sync** - everyone sees the same thing

## Future Enhancements

- Multiple language support (English, French, etc.)
- Player avatars and profiles
- In-app voice chat (alternative to Discord)
- Game history and statistics
- Custom word packs
- Team mode
- Special roles (detective, jester, etc.)
- Leaderboards
- Replay system
- Tournament mode

## License

This project was built with v0 by Vercel.
