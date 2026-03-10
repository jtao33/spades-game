"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { formatBid } from "@/lib/game/scoring";

interface PlayerLabelProps {
  name: string;
  bid: number | null;
  tricks: number;
  isCurrentPlayer: boolean;
  isHuman?: boolean;
  compact?: boolean;
}

/**
 * Displays a player's name with their current bid and tricks won.
 */
export const PlayerLabel = memo(function PlayerLabel({
  name,
  bid,
  tricks,
  isCurrentPlayer,
  isHuman = false,
  compact = false,
}: PlayerLabelProps) {
  const displayName = compact && !isHuman ? name.charAt(0) : name;

  return (
    <motion.div
      className="text-center"
      animate={isCurrentPlayer ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 1, repeat: isCurrentPlayer ? Infinity : 0 }}
    >
      <span
        className={`font-bold drop-shadow-lg ${compact ? "text-xs sm:text-sm" : "text-sm sm:text-lg"}`}
        style={{
          color: isHuman ? "#ff6b6b" : "#ffd700",
          textShadow: "1px 1px 2px rgba(0,0,0,0.8)"
        }}
      >
        {displayName}: {tricks}/{formatBid(bid, true)}
      </span>
    </motion.div>
  );
});

export default PlayerLabel;

