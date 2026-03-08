/**
 * @fileoverview Score calculation for Spades card game.
 * 
 * This module handles all scoring logic including:
 * - Standard bid scoring (10 points per trick)
 * - Nil and Blind Nil bonuses/penalties
 * - Bag accumulation and penalties
 * - Winner determination
 * 
 * @module lib/game/scoring
 * @see {@link ../doc/GAME_ENGINE.md} for detailed documentation
 */

import { TeamScore, Team } from "./types";

/**
 * Scoring constants used throughout the game.
 * These values follow official Spades tournament rules.
 * 
 * @constant
 * @exports
 */
export const SCORING_CONSTANTS = {
  /** Points earned per bid trick made */
  POINTS_PER_BID: 10,
  /** Bonus for successfully making a nil bid (JT's house rules: 50) */
  NIL_BONUS: 50,
  /** Penalty for failing a nil bid (JT's house rules: -50) */
  NIL_PENALTY: -50,
  /** Bonus for successfully making a blind nil bid (JT's house rules: 100) */
  BLIND_NIL_BONUS: 100,
  /** Penalty for failing a blind nil bid (JT's house rules: -100) */
  BLIND_NIL_PENALTY: -100,
  /** Number of bags that triggers a penalty (JT's house rules: 5) */
  BAG_PENALTY_THRESHOLD: 5,
  /** Points deducted when bag threshold is reached (JT's house rules: -50) */
  BAG_PENALTY: -50,
  /** Score required to win the game */
  WINNING_SCORE: 500,
} as const;

// Destructure for internal use
const {
  POINTS_PER_BID,
  NIL_BONUS,
  NIL_PENALTY,
  BLIND_NIL_BONUS,
  BLIND_NIL_PENALTY,
  BAG_PENALTY_THRESHOLD,
  BAG_PENALTY,
  WINNING_SCORE,
} = SCORING_CONSTANTS;

interface BidResult {
  bid: number;
  tricks: number;
  isNil: boolean;
  isBlindNil: boolean;
  madeNil: boolean;
  madeBid: boolean;
}

export interface RoundScoreResult {
  points: number;
  bags: number;
  bagPenalty: boolean;
  nilBonuses: number;
  nilPenalties: number;
  details: string[];
}

/**
 * Calculates the score for a single player's bid result.
 */
function calculatePlayerBidResult(bid: number, tricks: number): BidResult {
  const isBlindNil = bid === -1;
  const isNil = bid === 0 || isBlindNil;
  const madeNil = isNil && tricks === 0;
  const madeBid = !isNil && tricks >= bid;
  
  return {
    bid,
    tricks,
    isNil,
    isBlindNil,
    madeNil,
    madeBid,
  };
}

/**
 * Calculates the score for a team's round.
 * Handles nil bids, blind nil bids, regular bids, and bag penalties.
 */
export function calculateRoundScore(
  player1Bid: number,
  player1Tricks: number,
  player2Bid: number,
  player2Tricks: number,
  currentBags: number
): RoundScoreResult {
  const details: string[] = [];
  let points = 0;
  let newBags = currentBags;
  let bagPenalty = false;
  let nilBonuses = 0;
  let nilPenalties = 0;
  
  const result1 = calculatePlayerBidResult(player1Bid, player1Tricks);
  const result2 = calculatePlayerBidResult(player2Bid, player2Tricks);
  
  // Handle nil bids for player 1
  if (result1.isNil) {
    if (result1.madeNil) {
      const bonus = result1.isBlindNil ? BLIND_NIL_BONUS : NIL_BONUS;
      points += bonus;
      nilBonuses += bonus;
      details.push(
        result1.isBlindNil
          ? `Blind Nil made: +${BLIND_NIL_BONUS}`
          : `Nil made: +${NIL_BONUS}`
      );
    } else {
      const penalty = result1.isBlindNil ? BLIND_NIL_PENALTY : NIL_PENALTY;
      points += penalty;
      nilPenalties += Math.abs(penalty);
      details.push(
        result1.isBlindNil
          ? `Blind Nil failed (${result1.tricks} tricks): ${BLIND_NIL_PENALTY}`
          : `Nil failed (${result1.tricks} tricks): ${NIL_PENALTY}`
      );
    }
  }
  
  // Handle nil bids for player 2
  if (result2.isNil) {
    if (result2.madeNil) {
      const bonus = result2.isBlindNil ? BLIND_NIL_BONUS : NIL_BONUS;
      points += bonus;
      nilBonuses += bonus;
      details.push(
        result2.isBlindNil
          ? `Partner Blind Nil made: +${BLIND_NIL_BONUS}`
          : `Partner Nil made: +${NIL_BONUS}`
      );
    } else {
      const penalty = result2.isBlindNil ? BLIND_NIL_PENALTY : NIL_PENALTY;
      points += penalty;
      nilPenalties += Math.abs(penalty);
      details.push(
        result2.isBlindNil
          ? `Partner Blind Nil failed (${result2.tricks} tricks): ${BLIND_NIL_PENALTY}`
          : `Partner Nil failed (${result2.tricks} tricks): ${NIL_PENALTY}`
      );
    }
  }
  
  // Calculate combined team bid (excluding nil bidders)
  const teamBid =
    (result1.isNil ? 0 : result1.bid) + (result2.isNil ? 0 : result2.bid);
  
  // Calculate non-nil player tricks (for bags calculation)
  const nonNilTricks =
    (result1.isNil ? 0 : result1.tricks) + (result2.isNil ? 0 : result2.tricks);
  
  if (teamBid > 0) {
    if (nonNilTricks >= teamBid) {
      // Made the bid
      points += teamBid * POINTS_PER_BID;
      details.push(`Bid ${teamBid}, made ${nonNilTricks}: +${teamBid * POINTS_PER_BID}`);
      
      // Calculate bags (overtricks)
      const bags = nonNilTricks - teamBid;
      if (bags > 0) {
        points += bags; // 1 point per bag
        newBags += bags;
        details.push(`Overtricks (bags): +${bags}`);
      }
    } else {
      // Set (failed to make bid)
      points -= teamBid * POINTS_PER_BID;
      details.push(
        `Bid ${teamBid}, only made ${nonNilTricks}: -${teamBid * POINTS_PER_BID}`
      );
    }
  }
  
  // Check for bag penalty
  if (newBags >= BAG_PENALTY_THRESHOLD) {
    points += BAG_PENALTY;
    newBags -= BAG_PENALTY_THRESHOLD;
    bagPenalty = true;
    details.push(`10 bags penalty: ${BAG_PENALTY}`);
  }
  
  return {
    points,
    bags: newBags,
    bagPenalty,
    nilBonuses,
    nilPenalties,
    details,
  };
}

/**
 * Updates team score after a round.
 */
export function updateTeamScore(
  currentScore: TeamScore,
  roundResult: RoundScoreResult
): TeamScore {
  return {
    score: currentScore.score + roundResult.points,
    bags: roundResult.bags,
    roundScore: roundResult.points,
    roundBags: roundResult.bags - currentScore.bags,
  };
}

/**
 * Checks if a team has won (reached winning score).
 * If both teams pass the winning score, highest score wins.
 */
export function checkWinner(
  playerTeamScore: number,
  opponentTeamScore: number
): Team | null {
  const playerWon = playerTeamScore >= WINNING_SCORE;
  const opponentWon = opponentTeamScore >= WINNING_SCORE;
  
  if (playerWon && opponentWon) {
    // Both passed winning score - highest wins
    if (playerTeamScore > opponentTeamScore) return "player";
    if (opponentTeamScore > playerTeamScore) return "opponent";
    // Tie at winning score+ - continue playing (rare edge case)
    return null;
  }
  
  if (playerWon) return "player";
  if (opponentWon) return "opponent";
  
  return null;
}

/**
 * Formats a bid for display.
 * @param bid - The bid value (null, -1 for blind nil, 0 for nil, or 1-13)
 * @param short - If true, uses abbreviated forms (BN, N) instead of full names
 */
export function formatBid(bid: number | null, short: boolean = false): string {
  if (bid === null) return "-";
  if (bid === -1) return short ? "BN" : "Blind Nil";
  if (bid === 0) return short ? "N" : "Nil";
  return String(bid);
}
