/**
 * @fileoverview Global state management for the Spades game.
 * 
 * Uses Zustand for lightweight, performant state management with:
 * - Full TypeScript support
 * - Minimal re-renders via selectors
 * - Direct access for non-React code
 * 
 * The store manages:
 * - Game lifecycle (start, play, end)
 * - Player states and hands
 * - Round progression and scoring
 * - AI turn processing
 * 
 * @module lib/store
 * @see {@link ../doc/STATE_MANAGEMENT.md} for detailed documentation
 */

"use client";

import { create } from "zustand";
import {
  GameState,
  Difficulty,
  PlayerPosition,
  Player,
  Card,
  TeamScore,
  PLAYER_ORDER,
  getNextPlayer,
  getPartner,
} from "./game/types";
import { dealCards } from "./game/deck";
import { determineTrickWinner, getValidPlays, wouldBreakSpades } from "./game/rules";
import { calculateRoundScore, updateTeamScore, checkWinner } from "./game/scoring";
import { calculateAIBid, selectAICard, getAIThinkingDelay } from "./game/ai";
import { ANIMATION_DELAYS, GAME_CONSTANTS, PLAYER_POSITIONS } from "./game/constants";
import { useScoringHistoryStore } from "./scoringHistory";

/**
 * Default team score state for new games.
 * @constant
 */
const initialTeamScore: TeamScore = {
  score: 0,
  bags: 0,
  roundScore: 0,
  roundBags: 0,
};

/**
 * Creates the initial player configuration.
 * Human player at south, AI partner at north, AI opponents at east/west.
 * 
 * @returns {Record<PlayerPosition, Player>} Initial player states
 */
const createInitialPlayers = (): Record<PlayerPosition, Player> => ({
  [PLAYER_POSITIONS.SOUTH]: {
    position: PLAYER_POSITIONS.SOUTH,
    name: "You",
    isHuman: true,
    team: "player",
    hand: [],
    bid: null,
    tricksWon: 0,
  },
  [PLAYER_POSITIONS.WEST]: {
    position: PLAYER_POSITIONS.WEST,
    name: "West",
    isHuman: false,
    team: "opponent",
    hand: [],
    bid: null,
    tricksWon: 0,
  },
  [PLAYER_POSITIONS.NORTH]: {
    position: PLAYER_POSITIONS.NORTH,
    name: "Partner",
    isHuman: false,
    team: "player",
    hand: [],
    bid: null,
    tricksWon: 0,
  },
  [PLAYER_POSITIONS.EAST]: {
    position: PLAYER_POSITIONS.EAST,
    name: "East",
    isHuman: false,
    team: "opponent",
    hand: [],
    bid: null,
    tricksWon: 0,
  },
});

const createInitialState = (): GameState => ({
  id: null,
  phase: "waiting",
  difficulty: "medium",
  players: createInitialPlayers(),
  round: {
    roundNumber: 1,
    tricks: [],
    currentTrick: null,
    currentPlayer: PLAYER_POSITIONS.WEST, // Left of dealer (south)
    spadesBroken: false,
    bidsComplete: false,
  },
  playerTeamScore: { ...initialTeamScore },
  opponentTeamScore: { ...initialTeamScore },
  winner: null,
  isAnimating: false,
});

/**
 * Complete store interface extending GameState with actions.
 * 
 * @interface GameStore
 * @extends GameState
 */
interface GameStore extends GameState {
  /** Initializes a new game with specified difficulty */
  startNewGame: (difficulty: Difficulty) => void;
  
  /** Loads a saved game state */
  loadGame: (state: Partial<GameState>) => void;
  
  /** Deals cards to all players and starts bidding */
  dealHands: () => void;
  
  /** Records a player's bid */
  placeBid: (position: PlayerPosition, bid: number) => void;
  
  /** Plays a card from a player's hand */
  playCard: (position: PlayerPosition, card: Card) => void;
  
  /** Processes AI player's turn (bid or play) */
  processAITurn: () => Promise<void>;
  
  /** Completes current trick and awards to winner */
  finishTrick: () => void;
  
  /** Calculates and applies round scores */
  finishRound: () => void;
  
  /** Starts the next round */
  nextRound: () => void;
  
  /** Sets animation lock state */
  setAnimating: (isAnimating: boolean) => void;
  
  /** Gets valid plays for a player */
  getValidPlaysForPlayer: (position: PlayerPosition) => Card[];

  /** Central game loop that triggers next actions based on state */
  checkGameLoop: () => void;
  
  /** Resets to initial state */
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  startNewGame: (difficulty: Difficulty) => {
    const state = createInitialState();
    state.difficulty = difficulty;
    state.phase = "dealing";
    // Use crypto.randomUUID() for unpredictable game IDs
    state.id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `game-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    set(state);

    // Clear scoring history for new game
    useScoringHistoryStore.getState().clearHistory();

    // Deal cards after a short delay for animation
    setTimeout(() => {
      get().dealHands();
    }, ANIMATION_DELAYS.DEAL_DELAY);
  },

  loadGame: (loadedState: Partial<GameState>) => {
    set((state) => ({
      ...state,
      ...loadedState,
    }));
    // After loading, check if we need to resume logic
    get().checkGameLoop();
  },

  dealHands: () => {
    const hands = dealCards();
    
    set((state) => ({
      ...state,
      phase: "bidding",
      players: {
        [PLAYER_POSITIONS.SOUTH]: { ...state.players.south, hand: hands.south, bid: null, tricksWon: 0 },
        [PLAYER_POSITIONS.WEST]: { ...state.players.west, hand: hands.west, bid: null, tricksWon: 0 },
        [PLAYER_POSITIONS.NORTH]: { ...state.players.north, hand: hands.north, bid: null, tricksWon: 0 },
        [PLAYER_POSITIONS.EAST]: { ...state.players.east, hand: hands.east, bid: null, tricksWon: 0 },
      },
      round: {
        ...state.round,
        currentPlayer: PLAYER_POSITIONS.WEST, // Left of dealer starts
        bidsComplete: false,
        spadesBroken: false,
        tricks: [],
        currentTrick: null,
      },
    }));
    
    get().checkGameLoop();
  },

  placeBid: (position: PlayerPosition, bid: number) => {
    set((state) => {
      const newPlayers = { ...state.players };
      newPlayers[position] = { ...newPlayers[position], bid };
      
      // Check if all bids are complete
      const allBidsIn = PLAYER_ORDER.every(
        (pos) => newPlayers[pos].bid !== null
      ) && PLAYER_ORDER.length === GAME_CONSTANTS.PLAYER_COUNT;
      
      // Move to next player or start playing
      const nextPlayer = getNextPlayer(position);
      
      return {
        ...state,
        players: newPlayers,
        phase: allBidsIn ? "playing" : "bidding",
        round: {
          ...state.round,
          currentPlayer: allBidsIn ? PLAYER_POSITIONS.WEST : nextPlayer,
          bidsComplete: allBidsIn,
        },
      };
    });
    
    get().checkGameLoop();
  },

  playCard: (position: PlayerPosition, card: Card) => {
    set((state) => {
      const player = state.players[position];
      
      // Remove card from hand
      const newHand = player.hand.filter((c) => c.id !== card.id);
      
      // Update or create current trick
      let currentTrick = state.round.currentTrick;
      const isLeading = !currentTrick || currentTrick.cards.length === 0;
      
      if (isLeading) {
        currentTrick = {
          cards: [{ card, player: position }],
          leadSuit: card.suit,
        };
      } else {
        currentTrick = {
          ...currentTrick!,
          cards: [...currentTrick!.cards, { card, player: position }],
        };
      }
      
      // Check if spades are broken
      const spadesBroken =
        state.round.spadesBroken ||
        wouldBreakSpades(card, state.round.currentTrick, state.round.spadesBroken);
      
      // Check if trick is complete
      const trickComplete = currentTrick.cards.length === GAME_CONSTANTS.CARDS_PER_TRICK;
      
      return {
        ...state,
        players: {
          ...state.players,
          [position]: { ...player, hand: newHand },
        },
        round: {
          ...state.round,
          currentTrick,
          spadesBroken,
          currentPlayer: trickComplete ? position : getNextPlayer(position),
        },
      };
    });
    
    get().checkGameLoop();
  },

  processAITurn: async () => {
    const initialState = get();
    const { phase: initialPhase, round: initialRound, players: initialPlayers, difficulty, id: gameId } = initialState;
    const initialCurrentPlayer = initialPlayers[initialRound.currentPlayer];
    
    // Early exit checks
    if (initialCurrentPlayer.isHuman) return;
    if (initialPhase !== "bidding" && initialPhase !== "playing") return;
    
    // Note: Thinking delay is now handled by checkGameLoop calling us inside a timeout/async flow
    // But we still want to simulate "thinking" time here if it wasn't done externally
    // For now, we assume the caller sets isAnimating=true and waits, OR we wait here.
    // To keep logic clean, let's wait here.
    
    const delay = getAIThinkingDelay(difficulty);
    await new Promise((resolve) => setTimeout(resolve, delay));
    
    // Re-check state after delay
    const state = get();
    const { phase, round, players, id: currentGameId } = state;
    
    if (currentGameId !== gameId) return;
    const currentPlayer = players[round.currentPlayer];
    if (currentPlayer.isHuman) return;
    if (phase !== "bidding" && phase !== "playing") return;
    
    if (phase === "bidding") {
      if (currentPlayer.hand.length === 0) return;
      
      const partnerPos = getPartner(round.currentPlayer);
      const partnerBid = players[partnerPos].bid;
      const bid = calculateAIBid(currentPlayer.hand, partnerBid, difficulty);
      get().placeBid(round.currentPlayer, bid);
    } else if (phase === "playing") {
      if (currentPlayer.hand.length === 0) return;
      
      const partner = players[getPartner(round.currentPlayer)];
      const context = {
        player: currentPlayer,
        partner,
        currentTrick: round.currentTrick,
        spadesBroken: round.spadesBroken,
        difficulty,
        cardsPlayed: round.tricks.flatMap((t) => t.cards.map((c) => c.card)),
        roundTricks: round.tricks.length,
      };
      
      const card = selectAICard(context);
      get().playCard(round.currentPlayer, card);
    }
  },

  finishTrick: () => {
    set((state) => {
      const trick = state.round.currentTrick;
      if (!trick || trick.cards.length !== GAME_CONSTANTS.CARDS_PER_TRICK) return state;
      
      const trickWinner = determineTrickWinner(trick);
      const completedTrick = { ...trick, winner: trickWinner };
      
      // Update winner's trick count
      const newPlayers = { ...state.players };
      newPlayers[trickWinner] = {
        ...newPlayers[trickWinner],
        tricksWon: newPlayers[trickWinner].tricksWon + 1,
      };
      
      const newTricks = [...state.round.tricks, completedTrick];
      const roundComplete = newTricks.length === GAME_CONSTANTS.TRICKS_PER_ROUND;
      
      // If round is complete, calculate scores immediately
      let playerTeamScore = state.playerTeamScore;
      let opponentTeamScore = state.opponentTeamScore;
      let phase: import("./game/types").GamePhase = roundComplete ? "round_end" : "playing";
      let gameWinner = state.winner;

      if (roundComplete) {
        // Calculate player team score (south + north)
        const playerResult = calculateRoundScore(
          newPlayers.south.bid ?? 0,
          newPlayers.south.tricksWon,
          newPlayers.north.bid ?? 0,
          newPlayers.north.tricksWon,
          playerTeamScore.bags
        );
        
        // Calculate opponent team score (west + east)
        const opponentResult = calculateRoundScore(
          newPlayers.west.bid ?? 0,
          newPlayers.west.tricksWon,
          newPlayers.east.bid ?? 0,
          newPlayers.east.tricksWon,
          opponentTeamScore.bags
        );
        
        playerTeamScore = updateTeamScore(playerTeamScore, playerResult);
        opponentTeamScore = updateTeamScore(opponentTeamScore, opponentResult);
        
        // Check for winner
        gameWinner = checkWinner(playerTeamScore.score, opponentTeamScore.score);
        if (gameWinner) {
          phase = "game_over";
        }
      }

      return {
        ...state,
        players: newPlayers,
        phase,
        playerTeamScore,
        opponentTeamScore,
        winner: gameWinner,
        round: {
          ...state.round,
          tricks: newTricks,
          currentTrick: null,
          currentPlayer: trickWinner, // Winner leads next trick
        },
      };
    });
    
    get().checkGameLoop();
  },

  finishRound: () => {
    // Deprecated: logic moved to finishTrick for atomic updates
    // Keeping for potential manual overrides or edge cases
    get().checkGameLoop();
  },

  nextRound: () => {
    set((state) => ({
      ...state,
      phase: "dealing",
      round: {
        ...state.round,
        roundNumber: state.round.roundNumber + 1,
        tricks: [],
        currentTrick: null,
        spadesBroken: false,
        bidsComplete: false,
      },
    }));
    
    setTimeout(() => get().dealHands(), ANIMATION_DELAYS.NEXT_ROUND_DELAY);
  },

  checkGameLoop: () => {
    const state = get();
    if (state.isAnimating) return;

    // 1. Trick Complete -> Finish Trick
    if (
      state.phase === "playing" &&
      state.round.currentTrick?.cards.length === GAME_CONSTANTS.CARDS_PER_TRICK
    ) {
      set({ isAnimating: true });
      setTimeout(() => {
        get().finishTrick();
        set({ isAnimating: false });
        get().checkGameLoop(); // Re-check after finish
      }, ANIMATION_DELAYS.TRICK_COMPLETE_DELAY);
      return;
    }

    // 2. Round End -> Calculate Scores
    // If we just entered round_end from finishTrick, scores might not be updated yet.
    // However, finishRound is idempotent if called multiple times (it uses current state).
    // But we only want to call it once per round end.
    // We can rely on the fact that finishTrick sets phase to round_end.
    // We need a way to know if scores are calculated.
    // Actually, simply: finishTrick sets phase round_end.
    // We want to immediately calculate scores? 
    // If we do it here, there is a delay between last card and score show? 
    // No, finishTrick happens. Then this runs.
    // If we want the modal to show, we should probably run finishRound immediately if needed.
    // But let's stick to the previous behavior: finishTrick -> Wait -> finishRound (or nextRound).
    
    // Let's look at the previous impl:
    // finishTrick -> setTimeout(finishRound)
    // finishRound updates scores.
    // GameTable -> setTimeout(nextRound).
    
    if (state.phase === "round_end" && !state.winner) {
        // We need to differentiate "just finished trick" vs "showing scores".
        // Current Store impl doesn't have a sub-state.
        // But checkGameLoop is called after finishTrick.
        // If we are in round_end, and we haven't animated the transition to next round...
        
        // Let's assume finishTrick DOES NOT calculate scores yet.
        // We will call finishRound here immediately to update scores so the Modal is correct?
        // But we want a delay for the user to see the last trick winner.
        // The last trick winner is shown during TRICK_COMPLETE_DELAY.
        // After that, finishTrick() runs.
        // So when we are here, the trick is cleared.
        // So we should calculate scores NOW.
        
        // But if we calculate scores now, we need to know if we already did it to avoid loop?
        // We can check if roundScore > 0? No, could be 0.
        // Let's add a hack: We will execute finishRound logic inside finishTrick OR here.
        // Actually, let's call finishRound inside finishTrick to be atomic.
        // Then here we just handle the nextRound transition.
    }

    // 3. Round End -> Wait for user to click continue (handled by UI)
    // Do NOT auto-continue here - let the RoundEndModal handle it
    if (state.phase === "round_end" && !state.winner) {
       return;
    }

    // 4. AI Turn
    const currentPlayer = state.players[state.round.currentPlayer];
    if (
      (state.phase === "bidding" || state.phase === "playing") &&
      !currentPlayer.isHuman
    ) {
      set({ isAnimating: true });
      get().processAITurn().finally(() => {
        set({ isAnimating: false });
        get().checkGameLoop();
      });
    }
  },

  setAnimating: (isAnimating: boolean) => {
    set({ isAnimating });
  },

  getValidPlaysForPlayer: (position: PlayerPosition) => {
    const state = get();
    const player = state.players[position];
    const isLeading =
      !state.round.currentTrick ||
      state.round.currentTrick.cards.length === 0;
    
    return getValidPlays(
      player.hand,
      state.round.currentTrick,
      state.round.spadesBroken,
      isLeading
    );
  },

  reset: () => {
    set(createInitialState());
  },
}));

export default useGameStore;
