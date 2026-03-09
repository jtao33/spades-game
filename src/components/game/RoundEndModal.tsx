"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { TeamScore, Player, PlayerPosition } from "@/lib/game/types";
import { formatBid } from "@/lib/game/scoring";
import { SCORING_CONSTANTS } from "@/lib/game/scoring";

interface RoundEndModalProps {
  roundNumber: number;
  playerTeamScore: TeamScore;
  opponentTeamScore: TeamScore;
  players: Record<PlayerPosition, Player>;
  onContinue: () => void;
}

interface ScoringEvent {
  text: string;
  points: number;
}

function getTeamScoringEvents(
  player1: Player,
  player2: Player,
  player1Name: string,
  player2Name: string
): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  const { POINTS_PER_BID, NIL_BONUS, NIL_PENALTY, BLIND_NIL_BONUS, BLIND_NIL_PENALTY, BAG_PENALTY_THRESHOLD, BAG_PENALTY } = SCORING_CONSTANTS;

  // Check nil bids
  const checkNil = (player: Player, name: string) => {
    const isBlindNil = player.bid === -1;
    const isNil = player.bid === 0 || isBlindNil;

    if (isNil) {
      const madeNil = player.tricksWon === 0;
      if (madeNil) {
        const bonus = isBlindNil ? BLIND_NIL_BONUS : NIL_BONUS;
        events.push({
          text: `${name} made ${isBlindNil ? "Blind Nil" : "Nil"}`,
          points: bonus,
        });
      } else {
        const penalty = isBlindNil ? BLIND_NIL_PENALTY : NIL_PENALTY;
        events.push({
          text: `${name} ${isBlindNil ? "Blind Nil" : "Nil"} broken (${player.tricksWon} tricks)`,
          points: penalty,
        });
      }
    }
  };

  checkNil(player1, player1Name);
  checkNil(player2, player2Name);

  // Calculate team bid (excluding nil bidders)
  const p1Bid = (player1.bid === 0 || player1.bid === -1) ? 0 : (player1.bid ?? 0);
  const p2Bid = (player2.bid === 0 || player2.bid === -1) ? 0 : (player2.bid ?? 0);
  const teamBid = p1Bid + p2Bid;

  // Calculate non-nil tricks
  const p1Tricks = (player1.bid === 0 || player1.bid === -1) ? 0 : player1.tricksWon;
  const p2Tricks = (player2.bid === 0 || player2.bid === -1) ? 0 : player2.tricksWon;
  const teamTricks = p1Tricks + p2Tricks;

  if (teamBid > 0) {
    if (teamTricks >= teamBid) {
      events.push({
        text: `Made bid of ${teamBid}`,
        points: teamBid * POINTS_PER_BID,
      });

      const bags = teamTricks - teamBid;
      if (bags > 0) {
        events.push({
          text: `Took ${bags} bag${bags > 1 ? "s" : ""}`,
          points: bags,
        });
      }
    } else {
      events.push({
        text: `Set! Bid ${teamBid}, made ${teamTricks}`,
        points: -(teamBid * POINTS_PER_BID),
      });
    }
  }

  return events;
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
  const [timeLeft, setTimeLeft] = useState(10);

  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

  // Auto-continue after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleContinue]);

  const playerEvents = getTeamScoringEvents(
    players.south,
    players.north,
    "You",
    "Partner"
  );

  const opponentEvents = getTeamScoringEvents(
    players.west,
    players.east,
    "West",
    "East"
  );

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
