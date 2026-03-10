"use client";

import { memo, useState } from "react";
import { motion, Variants } from "framer-motion";
import { Suit, Rank } from "@/components/svg";
import { CardFace } from "./CardFace";

interface CardProps {
  suit: Suit;
  rank: Rank;
  faceDown?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  scale?: number;
  animationDelay?: number;
  className?: string;
}

const sizeMap = {
  sm: { width: 50, height: 70 },
  md: { width: 70, height: 98 },
  lg: { width: 90, height: 126 },
};

const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 50,
    rotateY: 180,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    y: 0,
    rotateY: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.2 },
  },
  hover: {
    y: -20,
    rotateX: 5,
    scale: 1.08,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 15,
    },
  },
  tap: {
    scale: 0.95,
  },
  disabled: {
    opacity: 0.5,
    filter: "grayscale(50%)",
  },
};

export const Card = memo(function Card({
  suit,
  rank,
  faceDown = false,
  isPlayable = true,
  isSelected = false,
  onClick,
  size = "md",
  scale = 1,
  animationDelay = 0,
  className = "",
}: CardProps) {
  const baseDimensions = sizeMap[size];
  const dimensions = {
    width: Math.round(baseDimensions.width * scale),
    height: Math.round(baseDimensions.height * scale),
  };
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`
        relative select-none
        ${isPlayable ? "cursor-pointer" : "cursor-not-allowed"}
        ${className}
      `}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={isPlayable ? "hover" : undefined}
      whileTap={isPlayable ? "tap" : undefined}
      onClick={isPlayable ? onClick : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        filter: isPlayable ? "none" : "brightness(0.85)",
        perspective: "600px",
        transformStyle: "preserve-3d",
      }}
      transition={{
        delay: animationDelay,
      }}
    >
      {/* Multi-layer shadow for 3D depth effect */}
      <div 
        className="absolute rounded-lg pointer-events-none"
        style={{
          top: 2,
          left: 1,
          right: -1,
          bottom: -2,
          background: "rgba(0,0,0,0.15)",
          filter: "blur(2px)",
          zIndex: 0,
          transform: "translateZ(-2px)",
        }}
      />
      <div 
        className="absolute rounded-lg pointer-events-none"
        style={{
          top: 4,
          left: 2,
          right: -2,
          bottom: -4,
          background: "rgba(0,0,0,0.25)",
          filter: "blur(4px)",
          zIndex: 0,
          transform: "translateZ(-4px)",
        }}
      />
      <div 
        className="absolute rounded-lg pointer-events-none"
        style={{
          top: 6,
          left: 3,
          right: -3,
          bottom: -6,
          background: "rgba(0,0,0,0.2)",
          filter: "blur(6px)",
          zIndex: 0,
          transform: "translateZ(-6px)",
        }}
      />
      
      {/* Selection glow */}
      {isSelected && (
        <motion.div
          className="absolute inset-[-4px] rounded-xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.5) 0%, transparent 70%)",
            zIndex: 1,
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        />
      )}
      
      {/* Card container with 3D transform */}
      <motion.div 
        className="relative z-10 rounded-lg overflow-hidden"
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
        animate={{
          rotateX: isHovered && isPlayable ? 3 : 0,
          translateZ: isHovered && isPlayable ? 5 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
      >
        {/* Specular highlight */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-20"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.3) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.05) 100%)",
          }}
          animate={{
            opacity: isHovered ? 0.8 : 0.5,
          }}
        />
        
        {/* The SVG card from the library */}
        <CardFace
          suit={suit}
          rank={rank}
          faceDown={faceDown}
          className="card-face-wrapper"
        />
      </motion.div>
      
      {/* Playable indicator glow */}
      {isPlayable && isHovered && (
        <motion.div
          className="absolute inset-[-2px] rounded-xl pointer-events-none"
          style={{
            boxShadow: "0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1)",
            zIndex: 0,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
});

export default Card;
