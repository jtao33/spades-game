"use client";

import { useState, useEffect } from "react";

export type ScreenSize = "xs" | "sm" | "md" | "lg";

interface ResponsiveConfig {
  screenSize: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  cardScale: number;
  trickScale: number;
}

const getScreenSize = (width: number): ScreenSize => {
  if (width < 480) return "xs";
  if (width < 768) return "sm";
  if (width < 1024) return "md";
  return "lg";
};

export function useResponsive(): ResponsiveConfig {
  const [config, setConfig] = useState<ResponsiveConfig>({
    screenSize: "lg",
    isMobile: false,
    isTablet: false,
    isLandscape: false,
    cardScale: 1,
    trickScale: 1,
  });

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const screenSize = getScreenSize(width);
      const isMobile = screenSize === "xs" || screenSize === "sm";
      const isTablet = screenSize === "md";
      const isLandscape = width > height;

      // Calculate scale based on dimensions and orientation
      const minDimension = Math.min(width, height);
      let cardScale = 1;
      let trickScale = 1;

      if (isMobile && isLandscape) {
        // Landscape mobile - use more of the available width
        if (height < 400) {
          cardScale = 0.55;
          trickScale = 0.5;
        } else if (height < 500) {
          cardScale = 0.65;
          trickScale = 0.6;
        } else {
          cardScale = 0.75;
          trickScale = 0.7;
        }
      } else {
        // Portrait or larger screens
        if (minDimension < 400) {
          cardScale = 0.4;
          trickScale = 0.45;
        } else if (minDimension < 500) {
          cardScale = 0.5;
          trickScale = 0.55;
        } else if (minDimension < 600) {
          cardScale = 0.6;
          trickScale = 0.6;
        } else if (minDimension < 800) {
          cardScale = 0.75;
          trickScale = 0.75;
        }
      }

      setConfig({
        screenSize,
        isMobile,
        isTablet,
        isLandscape,
        cardScale,
        trickScale,
      });
    };

    updateConfig();
    window.addEventListener("resize", updateConfig);
    window.addEventListener("orientationchange", updateConfig);
    return () => {
      window.removeEventListener("resize", updateConfig);
      window.removeEventListener("orientationchange", updateConfig);
    };
  }, []);

  return config;
}

// Card size calculations
export const getResponsiveCardSize = (
  baseSize: "sm" | "md" | "lg",
  scale: number
): { width: number; height: number } => {
  const baseSizes = {
    sm: { width: 50, height: 70 },
    md: { width: 70, height: 98 },
    lg: { width: 90, height: 126 },
  };

  const base = baseSizes[baseSize];
  return {
    width: Math.round(base.width * scale),
    height: Math.round(base.height * scale),
  };
};
