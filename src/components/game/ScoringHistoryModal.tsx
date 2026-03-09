"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScoringHistoryStore } from "@/lib/scoringHistory";

interface ScoringHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScoringHistoryModal = memo(function ScoringHistoryModal({
  isOpen,
  onClose,
}: ScoringHistoryModalProps) {
  const rounds = useScoringHistoryStore((s) => s.rounds);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-gray-900 p-6 rounded-2xl border border-gray-700 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold" style={{ color: "#ffd700" }}>
                Scoring History
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4">
              {rounds.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No rounds completed yet.
                </p>
              ) : (
                rounds.map((round, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-white">
                        Round {round.roundNumber}
                      </h3>
                      <div className="flex gap-4 text-sm">
                        <span style={{ color: "#ffd700" }}>
                          You: {round.playerTeamScore.score}
                          <span className={`ml-1 ${round.playerTeamScore.roundScore >= 0 ? "text-green-400" : "text-red-400"}`}>
                            ({round.playerTeamScore.roundScore >= 0 ? "+" : ""}{round.playerTeamScore.roundScore})
                          </span>
                        </span>
                        <span className="text-white">
                          Opp: {round.opponentTeamScore.score}
                          <span className={`ml-1 ${round.opponentTeamScore.roundScore >= 0 ? "text-green-400" : "text-red-400"}`}>
                            ({round.opponentTeamScore.roundScore >= 0 ? "+" : ""}{round.opponentTeamScore.roundScore})
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Your Team */}
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Your Team</div>
                        <div className="space-y-1">
                          {round.playerEvents.map((event, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-gray-300">{event.text}</span>
                              <span className={event.points >= 0 ? "text-green-400" : "text-red-400"}>
                                {event.points >= 0 ? "+" : ""}{event.points}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {round.playerDetails}
                        </div>
                      </div>

                      {/* Opponents */}
                      <div className="border-l border-gray-700 pl-4">
                        <div className="text-gray-400 text-xs mb-1">Opponents</div>
                        <div className="space-y-1">
                          {round.opponentEvents.map((event, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-gray-300">{event.text}</span>
                              <span className={event.points >= 0 ? "text-green-400" : "text-red-400"}>
                                {event.points >= 0 ? "+" : ""}{event.points}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {round.opponentDetails}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default ScoringHistoryModal;
