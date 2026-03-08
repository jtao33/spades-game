/**
 * @fileoverview Socket.io server for multiplayer Spades.
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Room,
  RoomPlayer,
  MultiplayerGameState,
} from "./types";
import { Card, PlayerPosition, Difficulty, Trick, TeamScore, PLAYER_ORDER } from "../game/types";
import { dealCards } from "../game/deck";
import { determineTrickWinner, getValidPlays, wouldBreakSpades } from "../game/rules";
import { calculateRoundScore, updateTeamScore, checkWinner } from "../game/scoring";
import { GAME_CONSTANTS, PLAYER_POSITIONS } from "../game/constants";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// In-memory storage (use Redis for production scaling)
const rooms = new Map<string, Room>();
const games = new Map<string, MultiplayerGameState>();
const playerSockets = new Map<string, string>(); // playerId -> socketId

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getNextPlayer(current: PlayerPosition): PlayerPosition {
  const idx = PLAYER_ORDER.indexOf(current);
  return PLAYER_ORDER[(idx + 1) % 4];
}

function createInitialGameState(room: Room): MultiplayerGameState {
  const hands = dealCards();
  const positions: PlayerPosition[] = ["south", "west", "north", "east"];

  const players: MultiplayerGameState["players"] = {} as MultiplayerGameState["players"];

  for (const pos of positions) {
    const roomPlayer = room.players.find(p => p.seat === pos);
    players[pos] = {
      id: roomPlayer?.id ?? null,
      name: roomPlayer?.name ?? pos.charAt(0).toUpperCase() + pos.slice(1),
      hand: hands[pos],
      bid: null,
      tricksWon: 0,
      isConnected: roomPlayer?.isConnected ?? false,
    };
  }

  return {
    roomId: room.id,
    phase: "bidding",
    difficulty: room.difficulty,
    players,
    round: {
      roundNumber: 1,
      tricks: [],
      currentTrick: null,
      currentPlayer: PLAYER_POSITIONS.WEST, // Left of dealer starts
      spadesBroken: false,
      bidsComplete: false,
    },
    playerTeamScore: { score: 0, bags: 0, roundScore: 0, roundBags: 0 },
    opponentTeamScore: { score: 0, bags: 0, roundScore: 0, roundBags: 0 },
    winner: null,
  };
}

function getPlayerSeat(room: Room, playerId: string): PlayerPosition | null {
  const player = room.players.find(p => p.id === playerId);
  return player?.seat ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function broadcastToRoom(io: TypedServer, roomCode: string, event: string, data: any) {
  io.to(roomCode).emit(event as keyof ServerToClientEvents, data);
}

function sendGameStateToPlayer(
  io: TypedServer,
  socketId: string,
  game: MultiplayerGameState,
  seat: PlayerPosition
) {
  // Clone game state and hide other players' hands
  const playerState: MultiplayerGameState = JSON.parse(JSON.stringify(game));

  for (const pos of PLAYER_ORDER) {
    if (pos !== seat) {
      // Hide other players' cards (send count only)
      const cardCount = playerState.players[pos].hand.length;
      playerState.players[pos].hand = Array(cardCount).fill({ id: "hidden", suit: "spades", rank: "A" });
    }
  }

  io.to(socketId).emit("game_state", { gameState: playerState, yourSeat: seat });
}

export function initializeSocketServer(io: TypedServer): void {
  io.on("connection", (socket: TypedSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ========== Room Management ==========

    socket.on("create_room", ({ playerName, difficulty }) => {
      const playerId = generatePlayerId();
      const roomCode = generateRoomCode();

      const room: Room = {
        id: `room-${Date.now()}`,
        code: roomCode,
        status: "waiting",
        hostId: playerId,
        players: [{
          id: playerId,
          name: playerName,
          seat: null,
          team: null,
          isReady: false,
          isConnected: true,
        }],
        spectators: [],
        createdAt: Date.now(),
        difficulty,
      };

      rooms.set(roomCode, room);
      playerSockets.set(playerId, socket.id);
      socket.data.playerId = playerId;
      socket.data.playerName = playerName;
      socket.data.roomCode = roomCode;
      socket.join(roomCode);

      socket.emit("room_created", { room, playerId });
    });

    socket.on("join_room", ({ roomCode, playerName }) => {
      const room = rooms.get(roomCode.toUpperCase());

      if (!room) {
        socket.emit("error", { message: "Room not found", code: "ROOM_NOT_FOUND" });
        return;
      }

      if (room.status !== "waiting") {
        socket.emit("error", { message: "Game already in progress", code: "GAME_IN_PROGRESS" });
        return;
      }

      if (room.players.length >= 4) {
        socket.emit("error", { message: "Room is full", code: "ROOM_FULL" });
        return;
      }

      const playerId = generatePlayerId();
      const newPlayer: RoomPlayer = {
        id: playerId,
        name: playerName,
        seat: null,
        team: null,
        isReady: false,
        isConnected: true,
      };

      room.players.push(newPlayer);
      playerSockets.set(playerId, socket.id);
      socket.data.playerId = playerId;
      socket.data.playerName = playerName;
      socket.data.roomCode = roomCode;
      socket.join(roomCode);

      socket.emit("room_joined", { room, playerId });
      socket.to(roomCode).emit("player_joined", { player: newPlayer });
    });

    socket.on("select_seat", ({ seat }) => {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      // Check if seat is taken
      if (room.players.some(p => p.seat === seat && p.id !== playerId)) {
        socket.emit("error", { message: "Seat is already taken", code: "SEAT_TAKEN" });
        return;
      }

      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.seat = seat;
        player.team = (seat === "south" || seat === "north") ? "player" : "opponent";
        player.isReady = false; // Reset ready when changing seats
      }

      broadcastToRoom(io, roomCode, "room_updated", { room });
    });

    socket.on("set_ready", ({ ready }) => {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.isReady = ready;
      }

      broadcastToRoom(io, roomCode, "room_updated", { room });
    });

    socket.on("start_game", () => {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      // Verify host
      if (room.hostId !== playerId) {
        socket.emit("error", { message: "Only host can start the game", code: "NOT_HOST" });
        return;
      }

      // Check all seats filled and ready
      const allSeated = room.players.every(p => p.seat !== null);
      const allReady = room.players.every(p => p.isReady);

      if (room.players.length < 4) {
        socket.emit("error", { message: "Need 4 players to start", code: "NOT_ENOUGH_PLAYERS" });
        return;
      }

      if (!allSeated) {
        socket.emit("error", { message: "All players must select a seat", code: "NOT_ALL_SEATED" });
        return;
      }

      if (!allReady) {
        socket.emit("error", { message: "All players must be ready", code: "NOT_ALL_READY" });
        return;
      }

      // Start the game
      room.status = "in_progress";
      const gameState = createInitialGameState(room);
      games.set(roomCode, gameState);

      // Send game started event with individual hands
      room.players.forEach(p => {
        const socketId = playerSockets.get(p.id);
        if (socketId && p.seat) {
          sendGameStateToPlayer(io, socketId, gameState, p.seat);
        }
      });

      broadcastToRoom(io, roomCode, "room_updated", { room });
    });

    socket.on("leave_room", () => {
      handleDisconnect(socket, io);
    });

    // ========== Gameplay ==========

    socket.on("place_bid", ({ bid }) => {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      const game = games.get(roomCode);
      if (!room || !game) return;

      const seat = getPlayerSeat(room, playerId);
      if (!seat) return;

      // Verify it's this player's turn
      if (game.round.currentPlayer !== seat) {
        socket.emit("error", { message: "Not your turn", code: "NOT_YOUR_TURN" });
        return;
      }

      if (game.phase !== "bidding") {
        socket.emit("error", { message: "Not in bidding phase", code: "WRONG_PHASE" });
        return;
      }

      // Record bid
      game.players[seat].bid = bid;

      // Check if all bids complete
      const allBidsIn = PLAYER_ORDER.every(pos => game.players[pos].bid !== null);

      if (allBidsIn) {
        game.phase = "playing";
        game.round.bidsComplete = true;
        game.round.currentPlayer = PLAYER_POSITIONS.WEST;
      } else {
        game.round.currentPlayer = getNextPlayer(seat);
      }

      // Broadcast bid
      broadcastToRoom(io, roomCode, "bid_placed", { seat, bid });

      // Send updated state to all players
      room.players.forEach(p => {
        const socketId = playerSockets.get(p.id);
        if (socketId && p.seat) {
          sendGameStateToPlayer(io, socketId, game, p.seat);
        }
      });
    });

    socket.on("play_card", ({ cardId }) => {
      const roomCode = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      const game = games.get(roomCode);
      if (!room || !game) return;

      const seat = getPlayerSeat(room, playerId);
      if (!seat) return;

      // Verify turn
      if (game.round.currentPlayer !== seat) {
        socket.emit("error", { message: "Not your turn", code: "NOT_YOUR_TURN" });
        return;
      }

      if (game.phase !== "playing") {
        socket.emit("error", { message: "Not in playing phase", code: "WRONG_PHASE" });
        return;
      }

      // Find card in hand
      const player = game.players[seat];
      const cardIndex = player.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) {
        socket.emit("error", { message: "Card not in hand", code: "INVALID_CARD" });
        return;
      }

      const card = player.hand[cardIndex];

      // Validate play
      const isLeading = !game.round.currentTrick || game.round.currentTrick.cards.length === 0;
      const validPlays = getValidPlays(player.hand, game.round.currentTrick, game.round.spadesBroken, isLeading);
      if (!validPlays.some(c => c.id === cardId)) {
        socket.emit("error", { message: "Invalid play", code: "INVALID_PLAY" });
        return;
      }

      // Remove card from hand
      player.hand.splice(cardIndex, 1);

      // Add to trick
      if (isLeading) {
        game.round.currentTrick = {
          cards: [{ card, player: seat }],
          leadSuit: card.suit,
        };
      } else {
        game.round.currentTrick!.cards.push({ card, player: seat });
      }

      // Check spades broken
      if (wouldBreakSpades(card, game.round.currentTrick, game.round.spadesBroken)) {
        game.round.spadesBroken = true;
      }

      // Broadcast card played
      broadcastToRoom(io, roomCode, "card_played", { seat, card });

      // Check if trick complete
      if (game.round.currentTrick!.cards.length === 4) {
        const winner = determineTrickWinner(game.round.currentTrick!);
        game.round.currentTrick!.winner = winner;
        game.players[winner].tricksWon++;

        const completedTrick = game.round.currentTrick!;
        game.round.tricks.push(completedTrick);

        broadcastToRoom(io, roomCode, "trick_complete", { winner, trick: completedTrick });

        // Check if round complete
        if (game.round.tricks.length === 13) {
          // Calculate scores
          const playerResult = calculateRoundScore(
            game.players.south.bid ?? 0,
            game.players.south.tricksWon,
            game.players.north.bid ?? 0,
            game.players.north.tricksWon,
            game.playerTeamScore.bags
          );

          const opponentResult = calculateRoundScore(
            game.players.west.bid ?? 0,
            game.players.west.tricksWon,
            game.players.east.bid ?? 0,
            game.players.east.tricksWon,
            game.opponentTeamScore.bags
          );

          game.playerTeamScore = updateTeamScore(game.playerTeamScore, playerResult);
          game.opponentTeamScore = updateTeamScore(game.opponentTeamScore, opponentResult);

          game.phase = "round_end";

          broadcastToRoom(io, roomCode, "round_end", {
            playerTeamScore: game.playerTeamScore,
            opponentTeamScore: game.opponentTeamScore,
            roundNumber: game.round.roundNumber,
          });

          // Check winner
          const gameWinner = checkWinner(game.playerTeamScore.score, game.opponentTeamScore.score);
          if (gameWinner) {
            game.winner = gameWinner;
            game.phase = "game_over";
            room.status = "completed";
            broadcastToRoom(io, roomCode, "game_over", { winner: gameWinner });
          } else {
            // Start next round after delay
            setTimeout(() => {
              startNextRound(io, roomCode);
            }, 5000);
          }
        } else {
          // Next trick - winner leads
          game.round.currentTrick = null;
          game.round.currentPlayer = winner;
        }
      } else {
        // Next player
        game.round.currentPlayer = getNextPlayer(seat);
      }

      // Send updated state
      room.players.forEach(p => {
        const socketId = playerSockets.get(p.id);
        if (socketId && p.seat) {
          sendGameStateToPlayer(io, socketId, game, p.seat);
        }
      });
    });

    socket.on("rejoin_room", ({ roomCode, playerId: oldPlayerId }) => {
      const room = rooms.get(roomCode);
      if (!room) {
        socket.emit("error", { message: "Room not found", code: "ROOM_NOT_FOUND" });
        return;
      }

      const player = room.players.find(p => p.id === oldPlayerId);
      if (!player) {
        socket.emit("error", { message: "Player not found in room", code: "PLAYER_NOT_FOUND" });
        return;
      }

      // Update connection
      player.isConnected = true;
      playerSockets.set(oldPlayerId, socket.id);
      socket.data.playerId = oldPlayerId;
      socket.data.playerName = player.name;
      socket.data.roomCode = roomCode;
      socket.join(roomCode);

      socket.emit("room_joined", { room, playerId: oldPlayerId });
      socket.to(roomCode).emit("player_reconnected", { playerId: oldPlayerId });

      // If game in progress, send game state
      const game = games.get(roomCode);
      if (game && player.seat) {
        sendGameStateToPlayer(io, socket.id, game, player.seat);
      }
    });

    // ========== Disconnect ==========

    socket.on("disconnect", () => {
      handleDisconnect(socket, io);
    });
  });
}

function handleDisconnect(socket: TypedSocket, io: TypedServer): void {
  const roomCode = socket.data.roomCode;
  const playerId = socket.data.playerId;

  if (!roomCode || !playerId) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  if (room.status === "waiting") {
    // Remove player from room
    room.players.splice(playerIndex, 1);
    playerSockets.delete(playerId);

    if (room.players.length === 0) {
      rooms.delete(roomCode);
    } else {
      // Transfer host if needed
      if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
      }
      broadcastToRoom(io, roomCode, "player_left", { playerId });
      broadcastToRoom(io, roomCode, "room_updated", { room });
    }
  } else {
    // Game in progress - mark as disconnected
    room.players[playerIndex].isConnected = false;
    broadcastToRoom(io, roomCode, "player_left", { playerId });
  }

  socket.leave(roomCode);
  console.log(`Socket disconnected: ${socket.id}`);
}

function startNextRound(io: TypedServer, roomCode: string): void {
  const room = rooms.get(roomCode);
  const game = games.get(roomCode);
  if (!room || !game) return;

  // Deal new hands
  const hands = dealCards();

  for (const pos of PLAYER_ORDER) {
    game.players[pos].hand = hands[pos];
    game.players[pos].bid = null;
    game.players[pos].tricksWon = 0;
  }

  game.phase = "bidding";
  game.round = {
    roundNumber: game.round.roundNumber + 1,
    tricks: [],
    currentTrick: null,
    currentPlayer: PLAYER_POSITIONS.WEST,
    spadesBroken: false,
    bidsComplete: false,
  };

  // Send updated state with new hands
  room.players.forEach(p => {
    const socketId = playerSockets.get(p.id);
    if (socketId && p.seat) {
      sendGameStateToPlayer(io, socketId, game, p.seat);
    }
  });
}
