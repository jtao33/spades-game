"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card as CardType, RANK_VALUES } from "@/lib/game/types";
import { Card } from "./Card";
import { useSettingsStore } from "@/lib/settingsStore";
import { useResponsive } from "@/lib/hooks/useResponsive";

interface HandProps {
  cards: CardType[];
  validPlays?: CardType[];
  isCurrentPlayer?: boolean;
  isHuman?: boolean;
  position: "south" | "west" | "north" | "east";
  onPlayCard?: (card: CardType) => void;
  showCards?: boolean;
  size?: "sm" | "md" | "lg";
}

// Suit order for sorting (alternating colors)
const SUIT_ORDER_LEFT: Record<string, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
const SUIT_ORDER_RIGHT: Record<string, number> = { diamonds: 0, clubs: 1, hearts: 2, spades: 3 };

export const Hand = memo(function Hand({
  cards,
  validPlays = [],
  isCurrentPlayer = false,
  isHuman = false,
  position,
  onPlayCard,
  showCards = true,
  size = "md",
}: HandProps) {
  const cardSortOrder = useSettingsStore((s) => s.cardSortOrder);
  const spadesPosition = useSettingsStore((s) => s.spadesPosition);
  const { cardScale, isMobile } = useResponsive();

  const isVertical = position === "west" || position === "east";
  const validCardIds = new Set(validPlays.map((c) => c.id));

  // Sort cards for human player
  const sortedCards = useMemo(() => {
    if (!isHuman) return cards;

    const suitOrder = spadesPosition === "left" ? SUIT_ORDER_LEFT : SUIT_ORDER_RIGHT;

    return [...cards].sort((a, b) => {
      // First sort by suit
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;

      // Then sort by rank
      const rankDiff = RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
      return cardSortOrder === "ascending" ? rankDiff : -rankDiff;
    });
  }, [cards, isHuman, cardSortOrder, spadesPosition]);

  // On mobile, don't render opponent/partner cards - just show count
  if (isMobile && !isHuman) {
    return (
      <div className="flex items-center justify-center">
        <span className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">
          {cards.length} cards
        </span>
      </div>
    );
  }

  // Vertical layout for east/west positions (AI opponents - simple stack)
  if (isVertical) {
    const cardOverlap = Math.round(15 * cardScale);
    const cardWidth = Math.round(50 * cardScale);
    const totalHeight = Math.min(cards.length * cardOverlap + Math.round(60 * cardScale), Math.round(280 * cardScale));

    return (
      <div
        className="relative"
        style={{
          width: cardWidth,
          height: totalHeight
        }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            className="absolute"
            style={{
              top: index * cardOverlap,
              left: 0,
              zIndex: index,
            }}
            initial={{ opacity: 0, x: position === "west" ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card
              suit={card.suit}
              rank={card.rank}
              faceDown={true}
              isPlayable={false}
              size="sm"
              scale={cardScale}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  // North player (partner) - horizontal face-down cards
  if (position === "north") {
    const cardOverlap = Math.round(20 * cardScale);
    const cardHeight = Math.round(70 * cardScale);
    const totalWidth = Math.min(cards.length * cardOverlap + Math.round(40 * cardScale), Math.round(350 * cardScale));

    return (
      <div
        className="relative"
        style={{
          width: totalWidth,
          height: cardHeight
        }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            className="absolute"
            style={{
              left: index * cardOverlap,
              top: 0,
              zIndex: index,
            }}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card
              suit={card.suit}
              rank={card.rank}
              faceDown={true}
              isPlayable={false}
              size="sm"
              scale={cardScale}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  // South player (human) - large fanned cards
  const fanAngle = isMobile ? 2 : 4; // Less angle on mobile
  const displayCards = isHuman ? sortedCards : cards;
  const totalCards = displayCards.length;

  // Scale card dimensions and overlap based on screen size
  const baseCardWidth = size === "lg" ? 90 : size === "md" ? 70 : 50;
  const baseCardOverlap = size === "lg" ? 45 : size === "md" ? 35 : 25;
  const cardWidth = Math.round(baseCardWidth * cardScale);
  const cardOverlap = Math.round(baseCardOverlap * cardScale);
  const containerHeight = Math.round((size === "lg" ? 160 : size === "md" ? 120 : 90) * cardScale);
  const hoverLift = Math.round(25 * cardScale);

  return (
    <div
      className="relative flex justify-center"
      style={{
        height: containerHeight,
        paddingTop: Math.round(15 * cardScale)
      }}
    >
      <AnimatePresence mode="popLayout">
        {displayCards.map((card, index) => {
          const centerIndex = (totalCards - 1) / 2;
          const offset = index - centerIndex;
          const rotation = offset * fanAngle;
          const yOffset = Math.abs(offset) * Math.round(2 * cardScale);
          const isPlayable = isHuman && isCurrentPlayer && validCardIds.has(card.id);

          return (
            <motion.div
              key={card.id}
              className="absolute"
              style={{
                left: `calc(50% + ${offset * cardOverlap}px - ${cardWidth / 2}px)`,
                bottom: yOffset,
                zIndex: index,
                transformOrigin: "bottom center",
              }}
              initial={{ opacity: 0, y: 100, rotate: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: rotation,
              }}
              exit={{ opacity: 0, y: 100 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                delay: index * 0.03
              }}
              whileHover={isPlayable ? {
                y: -hoverLift,
                zIndex: 100,
                scale: 1.1,
                transition: { duration: 0.15 }
              } : undefined}
              onClick={() => isPlayable && onPlayCard?.(card)}
            >
              <Card
                suit={card.suit}
                rank={card.rank}
                faceDown={!showCards}
                isPlayable={isPlayable}
                size={size}
                scale={cardScale}
                className={isPlayable ? "cursor-pointer" : ""}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

export default Hand;
