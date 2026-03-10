"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trick, PlayerPosition } from "@/lib/game/types";
import { Card } from "./Card";
import { useResponsive } from "@/lib/hooks/useResponsive";

interface TrickAreaProps {
  currentTrick: Trick | null;
}

const basePositionStyles: Record<
  PlayerPosition,
  { x: number; y: number; rotate: number }
> = {
  south: { x: 0, y: 45, rotate: 0 },
  west: { x: -55, y: 0, rotate: -12 },
  north: { x: 0, y: -45, rotate: 180 },
  east: { x: 55, y: 0, rotate: 12 },
};

export const TrickArea = memo(function TrickArea({
  currentTrick,
}: TrickAreaProps) {
  const { trickScale } = useResponsive();

  // Scale position offsets
  const positionStyles: Record<PlayerPosition, { x: number; y: number; rotate: number }> = {
    south: { x: 0, y: Math.round(basePositionStyles.south.y * trickScale), rotate: 0 },
    west: { x: Math.round(basePositionStyles.west.x * trickScale), y: 0, rotate: -12 },
    north: { x: 0, y: Math.round(basePositionStyles.north.y * trickScale), rotate: 180 },
    east: { x: Math.round(basePositionStyles.east.x * trickScale), y: 0, rotate: 12 },
  };

  const cardEntryVariants = {
    initial: (position: PlayerPosition) => ({
      opacity: 0,
      scale: 0.5,
      x: positionStyles[position].x * 3,
      y: positionStyles[position].y * 3,
      rotate: positionStyles[position].rotate + 180,
    }),
    animate: (position: PlayerPosition) => ({
      opacity: 1,
      scale: 1,
      x: positionStyles[position].x,
      y: positionStyles[position].y,
      rotate: positionStyles[position].rotate,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 25,
      },
    }),
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.3 },
    },
  };

  const containerSize = Math.round(200 * trickScale);
  const outerCircle = Math.round(100 * trickScale);
  const innerCircle = Math.round(60 * trickScale);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Center decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full border border-gold/20 flex items-center justify-center"
          style={{ width: outerCircle, height: outerCircle }}
        >
          <div
            className="rounded-full border border-gold/10"
            style={{ width: innerCircle, height: innerCircle }}
          />
        </div>
      </div>

      {/* Cards played in current trick */}
      <AnimatePresence mode="popLayout">
        {currentTrick?.cards.map(({ card, player }, index) => (
          <motion.div
            key={`${player}-${card.id}-${index}`}
            className="absolute"
            custom={player}
            variants={cardEntryVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              zIndex: index + 1,
            }}
          >
            <Card
              suit={card.suit}
              rank={card.rank}
              size="md"
              scale={trickScale}
              isPlayable={false}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Show winner indicator when trick is complete */}
      <AnimatePresence>
        {currentTrick?.cards.length === 4 && currentTrick.winner && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-gold/20 backdrop-blur-sm rounded-full px-3 py-1 border border-gold/50">
              <span
                className="font-display text-xs sm:text-sm uppercase tracking-wider"
                style={{ color: "#ffd700" }}
              >
                {currentTrick.winner === "south"
                  ? "You win!"
                  : `${currentTrick.winner} wins`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default TrickArea;

