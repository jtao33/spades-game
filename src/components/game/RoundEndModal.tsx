"use client";

import React, { memo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { TeamScore, Player, PlayerPosition } from "@/lib/game/types";
import { formatBid } from "@/lib/game/scoring";
import {
  getTeamScoringEvents,
  formatPlayerDetails,
  useScoringHistoryStore,
} from "@/lib/scoringHistory";

interface RoundEndModalProps {
  roundNumber: number;
  playerTeamScore: TeamScore;
  opponentTeamScore: TeamScore;
  players: Record<PlayerPosition, Player>;
  onContinue: () => void;
}

/**
 * Modal displayed at the end of each round showing the score summary.
 */
export const RoundEndModal = memo(function RoundEndModal({
  roundNumber,
  playerTeamScore,
  opponentTeamScore,
  players,
  onContinue,
}: RoundEndModalProps) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [hasClicked, setHasClicked] = useState(false);
  const onContinueRef = React.useRef(onContinue);
  onContinueRef.current = onContinue;

  const handleContinue = useCallback(() => {
    if (hasClicked) return;
    setHasClicked(true);
    onContinueRef.current();
  }, [hasClicked]);

  // Auto-continue after 10 seconds
  useEffect(() => {
    if (hasClicked) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasClicked]);

  // Trigger continue when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && !hasClicked) {
      handleContinue();
    }
  }, [timeLeft, hasClicked, handleContinue]);

  const addRound = useScoringHistoryStore((s) => s.addRound);

  const playerEvents = React.useMemo(() => getTeamScoringEvents(
    players.south,
    players.north,
    "You",
    "Partner"
  ), [players.south, players.north]);

  const opponentEvents = React.useMemo(() => getTeamScoringEvents(
    players.west,
    players.east,
    "West",
    "East"
  ), [players.west, players.east]);

  const playerDetails = React.useMemo(() => formatPlayerDetails(
    players.south,
    players.north,
    "You",
    "Partner"
  ), [players.south, players.north]);

  const opponentDetails = React.useMemo(() => formatPlayerDetails(
    players.west,
    players.east,
    "West",
    "East"
  ), [players.west, players.east]);

  // Save to history on mount
  useEffect(() => {
    addRound({
      roundNumber,
      playerTeamScore,
      opponentTeamScore,
      playerEvents,
      opponentEvents,
      playerDetails,
      opponentDetails,
    });
  }, []); // Only run once on mount

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-700 text-center max-w-2xl w-full mx-4">
        <h2 className="text-3xl font-bold mb-6" style={{ color: "#ffd700" }}>
          Round {roundNumber} Complete
        </h2>

        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Your Team */}
          <div className="text-left">
            <div className="text-center mb-4">
              <div className="text-gray-400 text-sm mb-1">Your Team</div>
              <div className="text-4xl font-bold" style={{ color: "#ffd700" }}>
                {playerTeamScore.score}
              </div>
              <div className={`text-lg ${playerTeamScore.roundScore >= 0 ? "text-green-400" : "text-red-400"}`}>
                {playerTeamScore.roundScore >= 0 ? "+" : ""}{playerTeamScore.roundScore}
              </div>
            </div>
            <div className="space-y-1 text-sm">
              {playerEvents.map((event, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-300">{event.text}</span>
                  <span className={event.points >= 0 ? "text-green-400" : "text-red-400"}>
                    {event.points >= 0 ? "+" : ""}{event.points}
                  </span>
                </div>
              ))}
              <div className="text-xs text-gray-500 mt-2">
                You: {formatBid(players.south.bid)} → {players.south.tricksWon} tricks |
                Partner: {formatBid(players.north.bid)} → {players.north.tricksWon} tricks
              </div>
            </div>
          </div>

          {/* Opponents */}
          <div className="text-left border-l border-gray-700 pl-8">
            <div className="text-center mb-4">
              <div className="text-gray-400 text-sm mb-1">Opponents</div>
              <div className="text-4xl font-bold text-white">
                {opponentTeamScore.score}
              </div>
              <div className={`text-lg ${opponentTeamScore.roundScore >= 0 ? "text-green-400" : "text-red-400"}`}>
                {opponentTeamScore.roundScore >= 0 ? "+" : ""}{opponentTeamScore.roundScore}
              </div>
            </div>
            <div className="space-y-1 text-sm">
              {opponentEvents.map((event, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-300">{event.text}</span>
                  <span className={event.points >= 0 ? "text-green-400" : "text-red-400"}>
                    {event.points >= 0 ? "+" : ""}{event.points}
                  </span>
                </div>
              ))}
              <div className="text-xs text-gray-500 mt-2">
                West: {formatBid(players.west.bid)} → {players.west.tricksWon} tricks |
                East: {formatBid(players.east.bid)} → {players.east.tricksWon} tricks
              </div>
            </div>
          </div>
        </div>

        {/* Continue button with timer */}
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
        >
          Continue ({timeLeft}s)
        </button>
      </div>
    </motion.div>
  );
});

export default RoundEndModal;
