"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSocket } from "@/lib/socket";
import { PlayerPosition, Difficulty } from "@/lib/game/types";
import { Button } from "@/components/ui";
import { Logo } from "@/components/svg";

const SEATS: { position: PlayerPosition; label: string; team: string }[] = [
  { position: "south", label: "South", team: "Team 1" },
  { position: "north", label: "North", team: "Team 1" },
  { position: "west", label: "West", team: "Team 2" },
  { position: "east", label: "East", team: "Team 2" },
];

export default function MultiplayerPage() {
  const router = useRouter();
  const {
    isConnected,
    playerId,
    room,
    gameState,
    mySeat,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    selectSeat,
    setReady,
    startGame,
    clearError,
  } = useSocket();

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [view, setView] = useState<"menu" | "create" | "join" | "lobby">("menu");

  // Check if game has started
  useEffect(() => {
    if (gameState && gameState.phase !== "waiting") {
      router.push("/multiplayer/game");
    }
  }, [gameState, router]);

  // Update view when room is created/joined
  useEffect(() => {
    if (room) {
      setView("lobby");
    }
  }, [room]);

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      createRoom(playerName.trim(), difficulty);
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCode.trim()) {
      joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setView("menu");
  };

  const isHost = room?.hostId === playerId;
  const myPlayer = room?.players.find(p => p.id === playerId);
  const isReadyState = myPlayer?.isReady ?? false;
  const allPlayersReady = room?.players.length === 4 &&
    room.players.every(p => p.isReady && p.seat !== null);

  const getSeatPlayer = (seat: PlayerPosition) => {
    return room?.players.find(p => p.seat === seat);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Logo size={80} />
        <div className="mt-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Connecting to server...</p>
        </div>
      </div>
    );
  }

  // Menu view
  if (view === "menu") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Logo size={100} />
        </motion.div>

        <motion.h1
          className="text-3xl font-display mt-6 mb-8 tracking-wider"
          style={{ color: "#ffd700" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          MULTIPLAYER
        </motion.h1>

        <motion.div
          className="max-w-md w-full space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button onClick={() => setView("create")} size="lg" className="w-full">
            Create Room
          </Button>
          <Button onClick={() => setView("join")} variant="secondary" size="lg" className="w-full">
            Join Room
          </Button>
          <Link href="/" className="block">
            <Button variant="ghost" size="lg" className="w-full">
              Back to Menu
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // Create room view
  if (view === "create") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.h1
          className="text-2xl font-display mb-8 tracking-wider"
          style={{ color: "#ffd700" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          CREATE ROOM
        </motion.h1>

        <motion.div
          className="max-w-md w-full bg-gray-800/50 rounded-xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Difficulty (for AI fill-ins)</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => setView("menu")} variant="secondary" className="flex-1">
              Back
            </Button>
            <Button onClick={handleCreateRoom} disabled={!playerName.trim()} className="flex-1">
              Create
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Join room view
  if (view === "join") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.h1
          className="text-2xl font-display mb-8 tracking-wider"
          style={{ color: "#ffd700" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          JOIN ROOM
        </motion.h1>

        {error && (
          <motion.div
            className="max-w-md w-full mb-4 bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
            <button onClick={clearError} className="float-right text-red-300 hover:text-white">
              &times;
            </button>
          </motion.div>
        )}

        <motion.div
          className="max-w-md w-full bg-gray-800/50 rounded-xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white uppercase tracking-widest text-center text-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              maxLength={6}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => setView("menu")} variant="secondary" className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleJoinRoom}
              disabled={!playerName.trim() || roomCode.length !== 6}
              className="flex-1"
            >
              Join
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Lobby view
  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-8">
      <motion.h1
        className="text-2xl font-display mb-6 tracking-wider"
        style={{ color: "#ffd700" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        GAME LOBBY
      </motion.h1>

      {error && (
        <motion.div
          className="max-w-2xl w-full mb-4 bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
          <button onClick={clearError} className="float-right text-red-300 hover:text-white">
            &times;
          </button>
        </motion.div>
      )}

      <div className="max-w-2xl w-full space-y-6">
        {/* Room Code */}
        <motion.div
          className="bg-gray-800/50 rounded-xl p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-gray-400 mb-2">Room Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest" style={{ color: "#ffd700" }}>
            {room?.code}
          </p>
          <p className="text-sm text-gray-500 mt-2">Share this code with your friends</p>
        </motion.div>

        {/* Seat Selection */}
        <motion.div
          className="bg-gray-800/50 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "#ffd700" }}>
            Select Your Seat
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {SEATS.map(({ position, label, team }) => {
              const seatPlayer = getSeatPlayer(position);
              const isMySelection = mySeat === position;
              const isTaken = seatPlayer && seatPlayer.id !== playerId;

              return (
                <button
                  key={position}
                  onClick={() => !isTaken && selectSeat(position)}
                  disabled={isTaken}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-left
                    ${isMySelection
                      ? "border-amber-400 bg-amber-400/20"
                      : isTaken
                        ? "border-gray-600 bg-gray-700/50 cursor-not-allowed"
                        : "border-gray-600 hover:border-gray-500 bg-gray-700/30"
                    }
                  `}
                >
                  <div className="text-sm text-gray-400">{team}</div>
                  <div className="text-lg font-semibold text-white">{label}</div>
                  {seatPlayer ? (
                    <div className={`text-sm mt-1 ${isMySelection ? "text-amber-400" : "text-green-400"}`}>
                      {seatPlayer.name}
                      {seatPlayer.isReady && " ✓"}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-1">Empty</div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Players List */}
        <motion.div
          className="bg-gray-800/50 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "#ffd700" }}>
            Players ({room?.players.length}/4)
          </h3>
          <div className="space-y-2">
            {room?.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className={player.isConnected ? "text-green-400" : "text-red-400"}>
                    {player.isConnected ? "●" : "○"}
                  </span>
                  <span className="text-white">{player.name}</span>
                  {player.id === room.hostId && (
                    <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded">
                      Host
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {player.seat && (
                    <span className="text-sm text-gray-400 capitalize">{player.seat}</span>
                  )}
                  {player.isReady && (
                    <span className="text-green-400 text-sm">Ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button onClick={handleLeaveRoom} variant="secondary" className="flex-1">
            Leave Room
          </Button>
          {mySeat && (
            <Button
              onClick={() => setReady(!isReadyState)}
              variant={isReadyState ? "secondary" : "primary"}
              className="flex-1"
            >
              {isReadyState ? "Not Ready" : "Ready"}
            </Button>
          )}
          {isHost && (
            <Button
              onClick={startGame}
              disabled={!allPlayersReady}
              className="flex-1"
            >
              Start Game
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
