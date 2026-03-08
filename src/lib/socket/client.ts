/**
 * @fileoverview Socket.io client hook for multiplayer Spades.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  MultiplayerGameState,
} from "./types";
import type { Card, PlayerPosition, Difficulty } from "../game/types";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketReturn {
  socket: TypedSocket | null;
  isConnected: boolean;
  playerId: string | null;
  room: Room | null;
  gameState: MultiplayerGameState | null;
  mySeat: PlayerPosition | null;
  myHand: Card[];
  error: string | null;

  // Actions
  createRoom: (playerName: string, difficulty: Difficulty) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  selectSeat: (seat: PlayerPosition) => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  placeBid: (bid: number) => void;
  playCard: (cardId: string) => void;
  clearError: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [mySeat, setMySeat] = useState<PlayerPosition | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to socket server (runs on separate port or subdomain)
    const getSocketUrl = () => {
      if (typeof window === "undefined") return "http://localhost:3001";

      // Check for explicit socket URL from environment
      const envSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (envSocketUrl) return envSocketUrl;

      const host = window.location.hostname;

      // For production with reverse proxy (e.g., spades.example.com -> socket-spades.example.com)
      if (window.location.port === "" || window.location.port === "443" || window.location.port === "80") {
        // Production mode - use spades-ws subdomain
        const parts = host.split(".");
        if (parts.length >= 2 && parts[0] === "spades") {
          parts[0] = "spades-ws";
          return `${window.location.protocol}//${parts.join(".")}`;
        }
      }

      // Development mode - use separate port
      const socketPort = "3001";
      return `${window.location.protocol}//${host}:${socketPort}`;
    };

    const socketUrl = getSocketUrl();
    console.log("Connecting to socket server:", socketUrl);

    const socket: TypedSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);

      // Try to rejoin if we have saved session
      const savedPlayerId = sessionStorage.getItem("spades_player_id");
      const savedRoomCode = sessionStorage.getItem("spades_room_code");
      if (savedPlayerId && savedRoomCode) {
        socket.emit("rejoin_room", { roomCode: savedRoomCode, playerId: savedPlayerId });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("room_created", ({ room: newRoom, playerId: newPlayerId }) => {
      setRoom(newRoom);
      setPlayerId(newPlayerId);
      sessionStorage.setItem("spades_player_id", newPlayerId);
      sessionStorage.setItem("spades_room_code", newRoom.code);
    });

    socket.on("room_joined", ({ room: joinedRoom, playerId: joinedPlayerId }) => {
      setRoom(joinedRoom);
      setPlayerId(joinedPlayerId);
      sessionStorage.setItem("spades_player_id", joinedPlayerId);
      sessionStorage.setItem("spades_room_code", joinedRoom.code);
    });

    socket.on("room_updated", ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
    });

    socket.on("player_joined", () => {
      // Room will be updated via room_updated
    });

    socket.on("player_left", () => {
      // Room will be updated via room_updated
    });

    socket.on("game_state", ({ gameState: newGameState, yourSeat }) => {
      setGameState(newGameState);
      setMySeat(yourSeat);
      if (newGameState.players[yourSeat]) {
        setMyHand(newGameState.players[yourSeat].hand);
      }
    });

    socket.on("hand_dealt", ({ hand }) => {
      setMyHand(hand);
    });

    socket.on("bid_placed", ({ seat, bid }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [seat]: { ...prev.players[seat], bid },
          },
        };
      });
    });

    socket.on("card_played", ({ seat, card }) => {
      setGameState(prev => {
        if (!prev) return prev;

        const newTrick = prev.round.currentTrick
          ? {
              ...prev.round.currentTrick,
              cards: [...prev.round.currentTrick.cards, { card, player: seat }],
            }
          : {
              cards: [{ card, player: seat }],
              leadSuit: card.suit,
            };

        return {
          ...prev,
          round: {
            ...prev.round,
            currentTrick: newTrick,
          },
        };
      });
    });

    socket.on("trick_complete", ({ winner }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [winner]: {
              ...prev.players[winner],
              tricksWon: prev.players[winner].tricksWon + 1,
            },
          },
        };
      });
    });

    socket.on("round_end", ({ playerTeamScore, opponentTeamScore }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: "round_end",
          playerTeamScore,
          opponentTeamScore,
        };
      });
    });

    socket.on("game_over", ({ winner }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: "game_over",
          winner,
        };
      });
    });

    socket.on("error", ({ message }) => {
      setError(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string, difficulty: Difficulty) => {
    socketRef.current?.emit("create_room", { playerName, difficulty });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    socketRef.current?.emit("join_room", { roomCode, playerName });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("leave_room");
    setRoom(null);
    setGameState(null);
    setMySeat(null);
    setMyHand([]);
    sessionStorage.removeItem("spades_player_id");
    sessionStorage.removeItem("spades_room_code");
  }, []);

  const selectSeat = useCallback((seat: PlayerPosition) => {
    socketRef.current?.emit("select_seat", { seat });
  }, []);

  const setReady = useCallback((ready: boolean) => {
    socketRef.current?.emit("set_ready", { ready });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit("start_game");
  }, []);

  const placeBid = useCallback((bid: number) => {
    socketRef.current?.emit("place_bid", { bid });
  }, []);

  const playCard = useCallback((cardId: string) => {
    socketRef.current?.emit("play_card", { cardId });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    playerId,
    room,
    gameState,
    mySeat,
    myHand,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    selectSeat,
    setReady,
    startGame,
    placeBid,
    playCard,
    clearError,
  };
}
