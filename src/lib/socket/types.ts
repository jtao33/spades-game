/**
 * @fileoverview Socket.io type definitions for multiplayer Spades.
 */

import { Card, PlayerPosition, GamePhase, Difficulty, Trick, TeamScore } from "../game/types";

/** Room status */
export type RoomStatus = "waiting" | "in_progress" | "completed";

/** Player in a room */
export interface RoomPlayer {
  id: string;
  name: string;
  seat: PlayerPosition | null;
  team: "player" | "opponent" | null;
  isReady: boolean;
  isConnected: boolean;
}

/** Room state */
export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  hostId: string;
  players: RoomPlayer[];
  spectators: string[];
  createdAt: number;
  difficulty: Difficulty;
}

/** Multiplayer game state synced across clients */
export interface MultiplayerGameState {
  roomId: string;
  phase: GamePhase;
  difficulty: Difficulty;
  players: Record<PlayerPosition, {
    id: string | null;
    name: string;
    hand: Card[];
    bid: number | null;
    tricksWon: number;
    isConnected: boolean;
  }>;
  round: {
    roundNumber: number;
    tricks: Trick[];
    currentTrick: Trick | null;
    currentPlayer: PlayerPosition;
    spadesBroken: boolean;
    bidsComplete: boolean;
  };
  playerTeamScore: TeamScore;
  opponentTeamScore: TeamScore;
  winner: "player" | "opponent" | null;
}

// ============ Client -> Server Events ============

export interface ClientToServerEvents {
  // Room management
  create_room: (data: { playerName: string; difficulty: Difficulty }) => void;
  join_room: (data: { roomCode: string; playerName: string }) => void;
  leave_room: () => void;
  select_seat: (data: { seat: PlayerPosition }) => void;
  set_ready: (data: { ready: boolean }) => void;
  start_game: () => void;

  // Gameplay
  place_bid: (data: { bid: number }) => void;
  play_card: (data: { cardId: string }) => void;

  // Reconnection
  rejoin_room: (data: { roomCode: string; playerId: string }) => void;
}

// ============ Server -> Client Events ============

export interface ServerToClientEvents {
  // Room events
  room_created: (data: { room: Room; playerId: string }) => void;
  room_joined: (data: { room: Room; playerId: string }) => void;
  room_updated: (data: { room: Room }) => void;
  player_joined: (data: { player: RoomPlayer }) => void;
  player_left: (data: { playerId: string }) => void;
  player_reconnected: (data: { playerId: string }) => void;

  // Game state events
  game_started: (data: { gameState: MultiplayerGameState }) => void;
  game_state: (data: { gameState: MultiplayerGameState; yourSeat: PlayerPosition }) => void;
  hand_dealt: (data: { hand: Card[] }) => void;
  bid_placed: (data: { seat: PlayerPosition; bid: number }) => void;
  card_played: (data: { seat: PlayerPosition; card: Card }) => void;
  trick_complete: (data: { winner: PlayerPosition; trick: Trick }) => void;
  round_end: (data: {
    playerTeamScore: TeamScore;
    opponentTeamScore: TeamScore;
    roundNumber: number;
  }) => void;
  game_over: (data: { winner: "player" | "opponent" }) => void;

  // Errors
  error: (data: { message: string; code?: string }) => void;
}

// ============ Inter-Server Events (for scaling) ============

export interface InterServerEvents {
  ping: () => void;
}

// ============ Socket Data ============

export interface SocketData {
  playerId: string;
  playerName: string;
  roomCode: string | null;
}
