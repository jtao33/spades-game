"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card as CardType, RANK_VALUES } from "@/lib/game/types";
import { Card } from "./Card";
import { useSettingsStore } from "@/lib/settingsStore";

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

// Suit order for sorting
const SUIT_ORDER_LEFT: Record<string, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
const SUIT_ORDER_RIGHT: Record<string, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };

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

  // Vertical layout for east/west positions (AI opponents - simple stack)
  if (isVertical) {
    const cardOverlap = 20; // How much each card overlaps
    const totalHeight = Math.min(cards.length * cardOverlap + 60, 320);
    
    return (
      <div 
        className="relative"
        style={{ 
          width: 50,
          height: totalHeight
        }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={`${position}-${card.id}-${index}`}
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
            />
          </motion.div>
        ))}
      </div>
    );
  }

  // North player (partner) - horizontal face-down cards
  if (position === "north") {
    const cardOverlap = 25;
    const totalWidth = Math.min(cards.length * cardOverlap + 40, 400);
    
    return (
      <div 
        className="relative"
        style={{ 
          width: totalWidth,
          height: 70
        }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={`${position}-${card.id}-${index}`}
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
            />
          </motion.div>
        ))}
      </div>
    );
  }

  // South player (human) - large fanned cards
  const fanAngle = 4; // degrees between each card
  const displayCards = isHuman ? sortedCards : cards;
  const totalCards = displayCards.length;
  const cardWidth = size === "lg" ? 100 : size === "md" ? 80 : 60;
  const cardOverlap = size === "lg" ? 55 : size === "md" ? 45 : 35;
  
  return (
    <div 
      className="relative flex justify-center"
      style={{ 
        height: size === "lg" ? 180 : size === "md" ? 140 : 100,
        paddingTop: 20
      }}
    >
      <AnimatePresence mode="popLayout">
        {displayCards.map((card, index) => {
          const centerIndex = (totalCards - 1) / 2;
          const offset = index - centerIndex;
          const rotation = offset * fanAngle;
          const yOffset = Math.abs(offset) * 3; // Arc effect
          const isPlayable = isHuman && isCurrentPlayer && validCardIds.has(card.id);

          return (
            <motion.div
              key={`${position}-${card.id}-${index}`}
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
                y: -30, 
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
