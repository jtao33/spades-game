"use client";

import { create } from "zustand";
import { Player, PlayerPosition, TeamScore } from "./game/types";
import { SCORING_CONSTANTS } from "./game/scoring";

export interface ScoringEvent {
  text: string;
  points: number;
}

export interface RoundHistory {
  roundNumber: number;
  playerTeamScore: TeamScore;
  opponentTeamScore: TeamScore;
  playerEvents: ScoringEvent[];
  opponentEvents: ScoringEvent[];
  playerDetails: string;
  opponentDetails: string;
}

interface ScoringHistoryState {
  rounds: RoundHistory[];
  addRound: (history: RoundHistory) => void;
  clearHistory: () => void;
}

export const useScoringHistoryStore = create<ScoringHistoryState>((set) => ({
  rounds: [],
  addRound: (history) => set((state) => ({
    rounds: [...state.rounds, history]
  })),
  clearHistory: () => set({ rounds: [] }),
}));

export function getTeamScoringEvents(
  player1: Player,
  player2: Player,
  player1Name: string,
  player2Name: string
): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  const { POINTS_PER_BID, NIL_BONUS, NIL_PENALTY, BLIND_NIL_BONUS, BLIND_NIL_PENALTY } = SCORING_CONSTANTS;

  // Check nil bids
  const checkNil = (player: Player, name: string) => {
    const isBlindNil = player.bid === -1;
    const isNil = player.bid === 0 || isBlindNil;

    if (isNil) {
      const madeNil = player.tricksWon === 0;
      if (madeNil) {
        const bonus = isBlindNil ? BLIND_NIL_BONUS : NIL_BONUS;
        events.push({
          text: `${name} made ${isBlindNil ? "Blind Nil" : "Nil"}`,
          points: bonus,
        });
      } else {
        const penalty = isBlindNil ? BLIND_NIL_PENALTY : NIL_PENALTY;
        events.push({
          text: `${name} ${isBlindNil ? "Blind Nil" : "Nil"} broken (${player.tricksWon} tricks)`,
          points: penalty,
        });
      }
    }
  };

  checkNil(player1, player1Name);
  checkNil(player2, player2Name);

  // Calculate team bid (excluding nil bidders)
  const p1Bid = (player1.bid === 0 || player1.bid === -1) ? 0 : (player1.bid ?? 0);
  const p2Bid = (player2.bid === 0 || player2.bid === -1) ? 0 : (player2.bid ?? 0);
  const teamBid = p1Bid + p2Bid;

  // Calculate non-nil tricks
  const p1Tricks = (player1.bid === 0 || player1.bid === -1) ? 0 : player1.tricksWon;
  const p2Tricks = (player2.bid === 0 || player2.bid === -1) ? 0 : player2.tricksWon;
  const teamTricks = p1Tricks + p2Tricks;

  if (teamBid > 0) {
    if (teamTricks >= teamBid) {
      events.push({
        text: `Made bid of ${teamBid}`,
        points: teamBid * POINTS_PER_BID,
      });

      const bags = teamTricks - teamBid;
      if (bags > 0) {
        events.push({
          text: `Took ${bags} bag${bags > 1 ? "s" : ""}`,
          points: bags,
        });
      }
    } else {
      events.push({
        text: `Set! Bid ${teamBid}, made ${teamTricks}`,
        points: -(teamBid * POINTS_PER_BID),
      });
    }
  }

  return events;
}

export function formatPlayerDetails(
  player1: Player,
  player2: Player,
  player1Name: string,
  player2Name: string
): string {
  const formatBid = (bid: number | null): string => {
    if (bid === null) return "-";
    if (bid === -1) return "BN";
    if (bid === 0) return "N";
    return String(bid);
  };

  return `${player1Name}: ${formatBid(player1.bid)} → ${player1.tricksWon} | ${player2Name}: ${formatBid(player2.bid)} → ${player2.tricksWon}`;
}
