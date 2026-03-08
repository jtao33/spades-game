"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSocket } from "@/lib/socket";
import { Card as CardType, PlayerPosition, PLAYER_ORDER } from "@/lib/game/types";
import { getValidPlays } from "@/lib/game/rules";
import { formatBid } from "@/lib/game/scoring";
import { Card } from "@/components/game/Card";
import { BidSelector } from "@/components/game/BidSelector";

const POSITION_STYLES: Record<PlayerPosition, string> = {
  south: "bottom-32 left-1/2 -translate-x-1/2",
  north: "top-20 left-1/2 -translate-x-1/2",
  west: "left-8 top-1/2 -translate-y-1/2",
  east: "right-8 top-1/2 -translate-y-1/2",
};

const TRICK_POSITION_STYLES: Record<PlayerPosition, string> = {
  south: "bottom-0 left-1/2 -translate-x-1/2 translate-y-[-20px]",
  north: "top-0 left-1/2 -translate-x-1/2 translate-y-[20px]",
  west: "left-0 top-1/2 -translate-y-1/2 translate-x-[20px]",
  east: "right-0 top-1/2 -translate-y-1/2 translate-x-[-20px]",
};

export default function MultiplayerGamePage() {
  const router = useRouter();
  const {
    isConnected,
    room,
    gameState,
    mySeat,
    myHand,
    error,
    placeBid,
    playCard,
    leaveRoom,
  } = useSocket();

  // Redirect if not in a game
  useEffect(() => {
    if (!room || !gameState) {
      router.push("/multiplayer");
    }
  }, [room, gameState, router]);

  if (!isConnected || !room || !gameState || !mySeat) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  const isMyTurn = gameState.round.currentPlayer === mySeat;
  const currentTrick = gameState.round.currentTrick;
  const isLeading = !currentTrick || currentTrick.cards.length === 0;

  // Calculate valid plays for my hand
  const validPlays = isMyTurn && gameState.phase === "playing"
    ? getValidPlays(myHand, currentTrick, gameState.round.spadesBroken, isLeading)
    : [];

  const handleCardClick = (card: CardType) => {
    if (!isMyTurn || gameState.phase !== "playing") return;
    if (!validPlays.some(c => c.id === card.id)) return;
    playCard(card.id);
  };

  const handleBid = (bid: number) => {
    if (!isMyTurn || gameState.phase !== "bidding") return;
    placeBid(bid);
  };

  const handleLeave = () => {
    leaveRoom();
    router.push("/multiplayer");
  };

  const partnerSeat: PlayerPosition = mySeat === "south" ? "north" : mySeat === "north" ? "south" : mySeat === "west" ? "east" : "west";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 relative overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-black/30">
        <div className="flex gap-4">
          <div className="text-white">
            <span className="text-gray-400">Room: </span>
            <span className="font-mono">{room.code}</span>
          </div>
          <div className="text-white">
            <span className="text-gray-400">Round: </span>
            {gameState.round.roundNumber}
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <div className="text-sm text-gray-400">Your Team</div>
            <div className="text-xl font-bold" style={{ color: "#ffd700" }}>
              {gameState.playerTeamScore.score}
              <span className="text-sm text-gray-400 ml-1">
                ({gameState.playerTeamScore.bags} bags)
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Opponents</div>
            <div className="text-xl font-bold text-red-400">
              {gameState.opponentTeamScore.score}
              <span className="text-sm text-gray-400 ml-1">
                ({gameState.opponentTeamScore.bags} bags)
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Leave
        </button>
      </div>

      {/* Game Table */}
      <div className="absolute inset-0 pt-16">
        {/* Player Labels */}
        {PLAYER_ORDER.map((position) => {
          const player = gameState.players[position];
          const isCurrentTurn = gameState.round.currentPlayer === position;
          const bid = player.bid;

          return (
            <div
              key={position}
              className={`absolute ${POSITION_STYLES[position]} text-center z-10`}
            >
              <div
                className={`
                  px-4 py-2 rounded-lg
                  ${isCurrentTurn ? "bg-amber-500/30 ring-2 ring-amber-400" : "bg-black/40"}
                  ${position === mySeat ? "border border-amber-400" : ""}
                `}
              >
                <div className="text-white font-semibold">{player.name}</div>
                <div className="text-sm text-gray-300">
                  {gameState.phase === "bidding" ? (
                    bid !== null ? (
                      <span style={{ color: "#ffd700" }}>Bid: {formatBid(bid)}</span>
                    ) : (
                      <span className="text-gray-500">Waiting...</span>
                    )
                  ) : (
                    <span>
                      {formatBid(bid)} | Won: {player.tricksWon}
                    </span>
                  )}
                </div>
                {!player.isConnected && (
                  <div className="text-xs text-red-400">Disconnected</div>
                )}
              </div>
            </div>
          );
        })}

        {/* Trick Area */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48">
          {currentTrick?.cards.map(({ card, player: pos }) => (
            <motion.div
              key={card.id}
              className={`absolute ${TRICK_POSITION_STYLES[pos]}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card suit={card.suit} rank={card.rank} size="md" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* My Hand */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-[-8px] z-20">
        {myHand.map((card, index) => {
          const isValid = validPlays.some(c => c.id === card.id);
          const canPlay = isMyTurn && gameState.phase === "playing" && isValid;

          return (
            <motion.div
              key={card.id}
              style={{
                marginLeft: index > 0 ? "-20px" : "0",
                zIndex: index,
              }}
              animate={{
                y: canPlay ? -8 : 0,
              }}
              whileHover={canPlay ? { y: -20, scale: 1.05 } : {}}
              className={`
                transition-all
                ${canPlay ? "cursor-pointer" : ""}
                ${!isValid && gameState.phase === "playing" ? "opacity-50" : ""}
              `}
              onClick={() => canPlay && handleCardClick(card)}
            >
              <Card
                suit={card.suit}
                rank={card.rank}
                size="lg"
                isPlayable={canPlay}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Bidding Modal */}
      {gameState.phase === "bidding" && isMyTurn && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            className="bg-gray-900 rounded-xl p-6 max-w-lg border border-gray-700"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2 className="text-xl font-bold mb-4 text-center" style={{ color: "#ffd700" }}>
              Your Turn to Bid
            </h2>
            <BidSelector
              playerHand={myHand}
              partnerBid={gameState.players[partnerSeat]?.bid ?? null}
              onBid={handleBid}
              disabled={false}
            />
          </motion.div>
        </div>
      )}

      {/* Round End Overlay */}
      {gameState.phase === "round_end" && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700 text-center max-w-lg">
            <h2 className="text-3xl font-bold mb-6" style={{ color: "#ffd700" }}>
              Round {gameState.round.roundNumber} Complete
            </h2>

            <div className="flex gap-12 justify-center mb-6">
              <div>
                <div className="text-gray-400 text-sm mb-1">Your Team</div>
                <div className="text-4xl font-bold" style={{ color: "#ffd700" }}>
                  {gameState.playerTeamScore.score}
                </div>
                <div className={`text-lg ${gameState.playerTeamScore.roundScore >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {gameState.playerTeamScore.roundScore >= 0 ? "+" : ""}{gameState.playerTeamScore.roundScore}
                </div>
              </div>
              <div className="w-px bg-gray-600" />
              <div>
                <div className="text-gray-400 text-sm mb-1">Opponents</div>
                <div className="text-4xl font-bold text-white">
                  {gameState.opponentTeamScore.score}
                </div>
                <div className={`text-lg ${gameState.opponentTeamScore.roundScore >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {gameState.opponentTeamScore.roundScore >= 0 ? "+" : ""}{gameState.opponentTeamScore.roundScore}
                </div>
              </div>
            </div>

            <p className="text-gray-400">Next round starting...</p>
          </div>
        </motion.div>
      )}

      {/* Game Over Overlay */}
      {gameState.phase === "game_over" && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700 text-center max-w-lg">
            <h2
              className="text-4xl font-bold mb-4"
              style={{ color: gameState.winner === "player" ? "#ffd700" : "#ef4444" }}
            >
              {gameState.winner === "player" ? "VICTORY!" : "DEFEAT"}
            </h2>

            <p className="text-gray-300 mb-6">
              {gameState.winner === "player"
                ? "Congratulations! Your team reached 500 points!"
                : "The opponents reached 500 points first."}
            </p>

            <div className="flex gap-12 justify-center mb-8">
              <div>
                <div className="text-gray-400 text-sm mb-1">Your Team</div>
                <div className="text-4xl font-bold" style={{ color: "#ffd700" }}>
                  {gameState.playerTeamScore.score}
                </div>
              </div>
              <div className="w-px bg-gray-600" />
              <div>
                <div className="text-gray-400 text-sm mb-1">Opponents</div>
                <div className="text-4xl font-bold text-white">
                  {gameState.opponentTeamScore.score}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/multiplayer"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
              >
                New Game
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Main Menu
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Turn Indicator */}
      {!isMyTurn && gameState.phase === "playing" && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/60 px-6 py-3 rounded-lg z-30">
          <p className="text-gray-300">
            Waiting for <span className="font-semibold" style={{ color: "#ffd700" }}>
              {gameState.players[gameState.round.currentPlayer].name}
            </span>
          </p>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <motion.div
          className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg z-50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
