"use client";

import { memo, useState } from "react";
import { TeamScore } from "@/lib/game/types";
import { ScoringHistoryModal } from "./ScoringHistoryModal";

interface ScoreDisplayProps {
  playerTeamScore: TeamScore;
  opponentTeamScore: TeamScore;
  roundNumber: number;
}

/**
 * Displays the current game scores in the top bar.
 */
export const ScoreDisplay = memo(function ScoreDisplay({
  playerTeamScore,
  opponentTeamScore,
  roundNumber,
}: ScoreDisplayProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <div
        className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-center"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="flex gap-2 sm:gap-4 items-center">
          <div>
            <div className="text-[10px] sm:text-xs text-gray-400">US</div>
            <div className="text-base sm:text-xl font-bold" style={{ color: "#ffd700" }}>
              {playerTeamScore.score}
            </div>
          </div>
          <div className="text-gray-500 text-sm">|</div>
          <div>
            <div className="text-[10px] sm:text-xs text-gray-400">THEM</div>
            <div className="text-base sm:text-xl font-bold text-white">
              {opponentTeamScore.score}
            </div>
          </div>
          <div className="text-gray-500 text-sm hidden sm:block">|</div>
          <div className="text-xs sm:text-sm text-gray-400 hidden sm:block">R{roundNumber}</div>
          <div className="text-gray-500 text-sm hidden sm:block">|</div>
          <button
            onClick={() => setShowHistory(true)}
            className="text-[10px] sm:text-xs text-gray-400 hover:text-amber-400 transition-colors px-1 sm:px-2 py-1 rounded hover:bg-white/10 hidden sm:block"
            title="View scoring history"
          >
            History
          </button>
        </div>
      </div>

      <ScoringHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
});

export default ScoreDisplay;

