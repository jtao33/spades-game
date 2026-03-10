"use client";

import { memo, ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface IconButtonProps {
  onClick?: () => void;
  children: ReactNode;
  title: string;
}

/**
 * A styled icon button for the top bar.
 */
export const IconButton = memo(function IconButton({
  onClick,
  children,
  title,
}: IconButtonProps) {
  return (
    <motion.button
      className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-gray-800/80 border border-gray-600 flex items-center justify-center hover:bg-gray-700/80"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={title}
    >
      {children}
    </motion.button>
  );
});

interface TopBarProps {
  children: ReactNode;
  onHint?: () => void;
}

/**
 * The top navigation bar containing icons and score display.
 */
export const TopBar = memo(function TopBar({
  children,
  onHint,
}: TopBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-start p-2 sm:p-4">
      {/* Left icons */}
      <div className="flex gap-1 sm:gap-2">
        <Link href="/">
          <IconButton title="Home">
            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </IconButton>
        </Link>
        <Link href="/settings" className="hidden sm:block">
          <IconButton title="Settings">
            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </IconButton>
        </Link>
      </div>

      {/* Score display slot */}
      {children}

      {/* Right icons */}
      <div className="flex gap-1 sm:gap-2">
        <IconButton onClick={onHint} title="Get Hint">
          <span className="text-base sm:text-xl">💡</span>
        </IconButton>
        <Link href="/tutorial" className="hidden sm:block">
          <IconButton title="Help">
            <span className="text-white text-base sm:text-xl font-bold">?</span>
          </IconButton>
        </Link>
      </div>
    </div>
  );
});

export default TopBar;

