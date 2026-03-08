"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/svg";
import { Button, Modal } from "@/components/ui";
import { useGameStore } from "@/lib/store";
import { Difficulty } from "@/lib/game/types";
import { FONTS, COLORS } from "@/lib/styles";

const DIFFICULTY_OPTIONS: { name: string; description: string; difficulty: Difficulty; recommended?: boolean }[] = [
  { name: "Easy", description: "AI makes more mistakes, good for learning", difficulty: "easy" },
  { name: "Medium", description: "Balanced gameplay with strategic AI", difficulty: "medium", recommended: true },
  { name: "Hard", description: "Expert AI with card counting", difficulty: "hard" },
];

function DifficultyOption({
  name,
  description,
  difficulty,
  recommended = false,
  onClick,
}: {
  name: string;
  description: string;
  difficulty: Difficulty;
  recommended?: boolean;
  onClick: (d: Difficulty) => void;
}) {
  return (
    <motion.button
      className={`
        w-full p-4 rounded-xl text-left transition-all
        ${recommended
          ? "bg-indigo-dark/60 border-2 border-gold/50"
          : "bg-midnight/40 border border-white/20 hover:border-gold/30"
        }
      `}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(difficulty)}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-display" style={{ fontFamily: FONTS.display, color: COLORS.white }}>
          {name}
        </span>
        {recommended && (
          <span className="text-xs bg-gold/10 px-2 py-1 rounded-full" style={{ color: COLORS.gold }}>
            Recommended
          </span>
        )}
      </div>
      <p className="text-sm mt-1" style={{ color: COLORS.muted }}>{description}</p>
    </motion.button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const currentGame = useGameStore((s) => s.id);
  const phase = useGameStore((s) => s.phase);

  const handleSelectDifficulty = (difficulty: Difficulty) => {
    startNewGame(difficulty);
    setShowDifficultyModal(false);
    router.push("/game");
  };

  const canContinue = currentGame && phase !== "waiting" && phase !== "game_over";

  const menuItems = [
    { label: "New Game", onClick: () => setShowDifficultyModal(true), primary: true },
    ...(canContinue ? [{ label: "Continue Game", onClick: () => router.push("/game"), primary: false }] : []),
    { label: "Multiplayer", href: "/multiplayer", primary: false },
    { label: "Tutorial", href: "/tutorial", primary: false },
    { label: "Game History", href: "/history", primary: false },
    { label: "Settings", href: "/settings", primary: false },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Animated logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Logo size={140} animated />
      </motion.div>

      {/* Menu items */}
      <motion.div
        className="mt-12 flex flex-col gap-4 w-full max-w-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {menuItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            {item.href ? (
              <Link href={item.href} className="block">
                <Button variant={item.primary ? "primary" : "secondary"} size="lg" className="w-full">
                  {item.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={item.primary ? "primary" : "secondary"}
                size="lg"
                className="w-full"
                onClick={item.onClick}
              >
                {item.label}
              </Button>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="absolute bottom-4 text-center text-xs"
        style={{ color: COLORS.muted }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p>First to 500 wins | Nil (+50) | Blind Nil (+100) | 5 bags = -50</p>
      </motion.footer>

      {/* Difficulty selection modal */}
      <Modal isOpen={showDifficultyModal} onClose={() => setShowDifficultyModal(false)}>
        <h2
          className="text-2xl font-display text-center mb-6 tracking-wider"
          style={{ fontFamily: FONTS.display, color: COLORS.gold }}
        >
          SELECT DIFFICULTY
        </h2>

        <div className="space-y-4">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <DifficultyOption
              key={opt.difficulty}
              {...opt}
              onClick={handleSelectDifficulty}
            />
          ))}
        </div>

        <button
          className="mt-6 w-full text-center text-sm"
          style={{ color: COLORS.muted }}
          onClick={() => setShowDifficultyModal(false)}
        >
          Cancel
        </button>
      </Modal>
    </div>
  );
}
