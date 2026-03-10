"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Team, TeamScore } from "@/lib/game/types";
import { SuitIcon } from "@/components/svg";
import Link from "next/link";

interface GameOverModalProps {
  isOpen: boolean;
  winner: Team | null;
  playerScore: TeamScore;
  opponentScore: TeamScore;
  onPlayAgain: () => void;
}

export const GameOverModal = memo(function GameOverModal({
  isOpen,
  winner,
  playerScore,
  opponentScore,
  onPlayAgain,
}: GameOverModalProps) {
  const isWinner = winner === "player";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-midnight-deep/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative glass-panel p-4 sm:p-8 rounded-2xl max-w-md w-full text-center mx-2"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Decorative stars for winner */}
            {isWinner && (
              <>
                <motion.div
                  className="absolute -top-4 left-1/2 -translate-x-1/2"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <SuitIcon suit="spades" size={40} className="text-gold fill-gold" />
                </motion.div>
                {/* Confetti-like decorations */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-gold rounded-full"
                    style={{
                      top: "10%",
                      left: `${20 + i * 10}%`,
                    }}
                    initial={{ opacity: 0, y: -20, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: [0, 100],
                      scale: [0, 1, 0.5],
                    }}
                    transition={{
                      delay: 0.5 + i * 0.1,
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  />
                ))}
              </>
            )}

            {/* Result heading */}
            <motion.h2
              className={`text-3xl font-display mb-2 tracking-wider ${
                isWinner ? "text-gold" : "text-text-secondary"
              }`}
              style={{ fontFamily: "var(--font-cinzel)" }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {isWinner ? "VICTORY!" : "DEFEAT"}
            </motion.h2>

            <motion.p
              className="text-text-secondary mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {isWinner
                ? "Congratulations! You've reached 500 points!"
                : "The opponents reached 500 points first."}
            </motion.p>

            {/* Final scores */}
            <motion.div
              className="bg-midnight/50 rounded-xl p-4 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h3
                className="text-sm text-text-muted uppercase tracking-wider mb-3"
                style={{ fontFamily: "var(--font-cinzel)" }}
              >
                Final Score
              </h3>
              <div className="flex justify-around">
                <div>
                  <div
                    className={`text-3xl font-mono font-bold ${
                      isWinner ? "text-gold" : "text-text-primary"
                    }`}
                    style={{ fontFamily: "var(--font-fira-code)" }}
                  >
                    {playerScore.score}
                  </div>
                  <div className="text-xs text-text-muted">Your Team</div>
                </div>
                <div className="w-px bg-text-muted/30" />
                <div>
                  <div
                    className={`text-3xl font-mono font-bold ${
                      !isWinner ? "text-gold" : "text-text-primary"
                    }`}
                    style={{ fontFamily: "var(--font-fira-code)" }}
                  >
                    {opponentScore.score}
                  </div>
                  <div className="text-xs text-text-muted">Opponents</div>
                </div>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button className="btn-primary w-full" onClick={onPlayAgain}>
                Play Again
              </button>
              <Link href="/" className="btn-secondary w-full text-center">
                Return Home
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default GameOverModal;


