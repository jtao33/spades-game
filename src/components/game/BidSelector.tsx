"use client";

import { memo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/lib/game/types";
import { BID_CONSTANTS } from "@/lib/game/constants";
import { useResponsive } from "@/lib/hooks/useResponsive";

interface BidSelectorProps {
  onBid: (bid: number) => void;
  partnerBid: number | null;
  disabled?: boolean;
  playerHand?: Card[];
}

export const BidSelector = memo(function BidSelector({
  onBid,
  partnerBid,
  disabled = false,
}: BidSelectorProps) {
  const { isMobile } = useResponsive();
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleBidClick = (bid: number) => {
    setSelectedBid(bid);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (selectedBid !== null) {
      onBid(selectedBid);
      setShowConfirm(false);
      setSelectedBid(null);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setSelectedBid(null);
  };

  const getBidLabel = (bid: number): string => {
    if (bid === BID_CONSTANTS.BLIND_NIL_BID) return "Blind Nil";
    if (bid === BID_CONSTANTS.NIL_BID) return "Nil";
    return String(bid);
  };

  const getBidDescription = (bid: number): string => {
    if (bid === BID_CONSTANTS.BLIND_NIL_BID) return "Bid 0 tricks without seeing cards (+100/-100)";
    if (bid === BID_CONSTANTS.NIL_BID) return "Bid 0 tricks (+50/-50)";
    return `Bid to win ${bid} trick${bid === 1 ? "" : "s"}`;
  };

  const getTeamTotal = (bid: number): number => {
    if (partnerBid === null || partnerBid < 0) return bid;
    return partnerBid + Math.max(0, bid);
  };

  // All bid options: Blind Nil, Nil, 1-13
  const allBids = [BID_CONSTANTS.BLIND_NIL_BID, BID_CONSTANTS.NIL_BID, ...Array.from({ length: 13 }, (_, i) => i + 1)];

  return (
    <motion.div
      className="glass-panel p-3 rounded-xl max-w-xs sm:max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3
        className="text-center font-display text-sm sm:text-lg mb-2 sm:mb-4 tracking-wider"
        style={{ fontFamily: "var(--font-cinzel)", color: "#ffd700" }}
      >
        PLACE YOUR BID
      </h3>

      {/* Partner's bid info */}
      {partnerBid !== null && (
        <div className="text-center text-xs sm:text-sm mb-2 sm:mb-4" style={{ color: "#ffffff" }}>
          Partner bid:{" "}
          <span className="font-mono" style={{ fontFamily: "var(--font-fira-code)", color: "#ffd700" }}>
            {getBidLabel(partnerBid)}
          </span>
        </div>
      )}

      {/* Confirmation dialog */}
      <AnimatePresence>
        {showConfirm && selectedBid !== null && (
          <motion.div
            className="mb-3 p-3 bg-indigo-dark/60 rounded-lg border border-gold/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <p className="text-center text-sm mb-2" style={{ color: "#ffffff" }}>
              {getBidDescription(selectedBid)}
            </p>
            {partnerBid !== null && partnerBid >= 0 && selectedBid > 0 && (
              <p className="text-center text-xs mb-2" style={{ color: "#cccccc" }}>
                Team total:{" "}
                <span
                  className="font-mono"
                  style={{
                    fontFamily: "var(--font-fira-code)",
                    color: getTeamTotal(selectedBid) > BID_CONSTANTS.MAX_BID ? "#ef4444" : "#ffd700"
                  }}
                >
                  {getTeamTotal(selectedBid)}
                </span>
                {getTeamTotal(selectedBid) > BID_CONSTANTS.MAX_BID && (
                  <span style={{ color: "#ef4444" }} className="ml-1">(risky!)</span>
                )}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <button
                className="btn-secondary text-xs px-3 py-1.5"
                onClick={handleCancel}
                style={{ color: "#ffffff" }}
              >
                Cancel
              </button>
              <button
                className="btn-primary text-xs px-4 py-1.5"
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bid options */}
      {!showConfirm && (
        <>
          {isMobile ? (
            /* Mobile: Horizontal scroll selector */
            <div className="relative">
              <div
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {allBids.map((bid) => (
                  <motion.button
                    key={bid}
                    className={`
                      flex-shrink-0 snap-center px-3 py-2 rounded-lg border text-xs font-medium min-w-[60px]
                      ${
                        selectedBid === bid
                          ? "bg-gold text-midnight border-gold"
                          : "border-gold/50 text-gold hover:bg-gold/10"
                      }
                    `}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBidClick(bid)}
                    disabled={disabled}
                  >
                    {getBidLabel(bid)}
                  </motion.button>
                ))}
              </div>
              <p className="text-center text-[10px] mt-1 text-gray-400">
                Swipe to select bid
              </p>
            </div>
          ) : (
            /* Desktop: Grid layout */
            <>
              {/* Special bids */}
              <div className="flex justify-center gap-2 mb-4">
                <motion.button
                  className={`
                    px-4 py-2 rounded-lg border text-sm font-medium
                    ${
                      selectedBid === BID_CONSTANTS.BLIND_NIL_BID
                        ? "bg-gold text-midnight border-gold"
                        : "border-gold/50 text-gold hover:bg-gold/10"
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleBidClick(BID_CONSTANTS.BLIND_NIL_BID)}
                  disabled={disabled}
                >
                  Blind Nil
                </motion.button>
                <motion.button
                  className={`
                    px-4 py-2 rounded-lg border text-sm font-medium
                    ${
                      selectedBid === BID_CONSTANTS.NIL_BID
                        ? "bg-gold text-midnight border-gold"
                        : "border-gold/50 text-gold hover:bg-gold/10"
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleBidClick(BID_CONSTANTS.NIL_BID)}
                  disabled={disabled}
                >
                  Nil
                </motion.button>
              </div>

              {/* Number bids */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 13 }, (_, i) => i + 1).map((bid) => (
                  <motion.button
                    key={bid}
                    className={`
                      w-10 h-10 rounded-lg border text-sm font-mono font-medium
                      ${
                        selectedBid === bid
                          ? "bg-gold border-gold"
                          : "border-gold/40 hover:border-gold/70 hover:bg-gold/10"
                      }
                    `}
                    style={{
                      fontFamily: "var(--font-fira-code)",
                      color: selectedBid === bid ? "#000000" : "#ffffff"
                    }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBidClick(bid)}
                    disabled={disabled}
                  >
                    {bid}
                  </motion.button>
                ))}
              </div>

              <p className="text-center text-xs mt-3" style={{ color: "#cccccc" }}>
                Click a number to bid how many tricks you think you&apos;ll win
              </p>
            </>
          )}
        </>
      )}
    </motion.div>
  );
});

export default BidSelector;
