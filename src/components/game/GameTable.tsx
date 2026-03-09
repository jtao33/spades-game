"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useGameStore } from "@/lib/store";
import { Card as CardType, PlayerPosition } from "@/lib/game/types";
import { getValidPlays } from "@/lib/game/rules";
import { getHintCard } from "@/lib/game/ai";
import { ANIMATION_DELAYS, PLAYER_POSITIONS } from "@/lib/game/constants";
import { Hand } from "./Hand";
import { TrickArea } from "./TrickArea";
import { BidSelector } from "./BidSelector";
import { GameOverModal } from "./GameOverModal";
import { ScoreDisplay } from "./ScoreDisplay";
import { RoundEndModal } from "./RoundEndModal";
import { PlayerLabel } from "./PlayerLabel";
import { TopBar } from "./TopBar";
import {
  HintDisplay,
  WaitingForBidOverlay,
  AIThinkingOverlay,
} from "./GameStatusOverlay";

/**
 * Component to render a player's hand area.
 */
const PlayerArea = memo(function PlayerArea({ position }: { position: PlayerPosition }) {
  const player = useGameStore((s) => s.players[position]);
  const currentPlayer = useGameStore((s) => s.round.currentPlayer);
  const phase = useGameStore((s) => s.phase);
  const currentTrick = useGameStore((s) => s.round.currentTrick);
  const spadesBroken = useGameStore((s) => s.round.spadesBroken);
  const playCard = useGameStore((s) => s.playCard);

  const validPlays = useMemo(() => {
    const isLeading = !currentTrick || currentTrick.cards.length === 0;
    return getValidPlays(player.hand, currentTrick, spadesBroken, isLeading);
  }, [player.hand, currentTrick, spadesBroken]);

  const handlePlayCard = useCallback(
    (card: CardType) => {
      if (phase !== "playing" || currentPlayer !== position) return;
      playCard(position, card);
    },
    [phase, currentPlayer, position, playCard]
  );

  const isCurrentPlayerTurn = currentPlayer === position && phase === "playing";
  const showCards = player.isHuman;

  return (
    <Hand
      cards={player.hand}
      validPlays={isCurrentPlayerTurn ? validPlays : []}
      isCurrentPlayer={isCurrentPlayerTurn}
      isHuman={player.isHuman}
      position={position}
      onPlayCard={handlePlayCard}
      showCards={showCards}
      size={position === PLAYER_POSITIONS.SOUTH ? "lg" : "sm"}
    />
  );
});

/**
 * Main game table component that orchestrates the entire game UI.
 */
export const GameTable = memo(function GameTable() {
  const phase = useGameStore((s) => s.phase);
  const round = useGameStore((s) => s.round);
  const players = useGameStore((s) => s.players);
  const playerTeamScore = useGameStore((s) => s.playerTeamScore);
  const opponentTeamScore = useGameStore((s) => s.opponentTeamScore);
  const winner = useGameStore((s) => s.winner);
  const difficulty = useGameStore((s) => s.difficulty);
  const placeBid = useGameStore((s) => s.placeBid);
  const startNewGame = useGameStore((s) => s.startNewGame);

  const [hintCard, setHintCard] = useState<CardType | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handlePlayerBid = useCallback(
    (bid: number) => {
      placeBid(PLAYER_POSITIONS.SOUTH, bid);
    },
    [placeBid]
  );

  const handlePlayAgain = useCallback(() => {
    startNewGame(difficulty);
  }, [startNewGame, difficulty]);

  const handleGetHint = useCallback(() => {
    if (phase !== "playing" || round.currentPlayer !== PLAYER_POSITIONS.SOUTH) return;
    
    const player = players.south;
    const isLeading = !round.currentTrick || round.currentTrick.cards.length === 0;
    const validPlays = getValidPlays(player.hand, round.currentTrick, round.spadesBroken, isLeading);
    
    const hint = getHintCard(
      player.hand,
      validPlays,
      round.currentTrick,
      round.spadesBroken,
      player.bid || 0,
      player.tricksWon
    );
    
    setHintCard(hint);
    setShowHint(true);
    
    setTimeout(() => {
      setShowHint(false);
      setHintCard(null);
    }, ANIMATION_DELAYS.HINT_DISPLAY_DELAY);
  }, [phase, round, players]);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #1a5f4a 0%, #0d4a3a 50%, #0a3d2f 100%)"
      }}
    >
      {/* Top bar with navigation and score */}
      <TopBar onHint={handleGetHint}>
        <ScoreDisplay
          playerTeamScore={playerTeamScore}
          opponentTeamScore={opponentTeamScore}
          roundNumber={round.roundNumber}
        />
      </TopBar>

      {/* Partner (North) */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <PlayerArea position={PLAYER_POSITIONS.NORTH} />
        <PlayerLabel
          name={players.north.name}
          bid={players.north.bid}
          tricks={players.north.tricksWon}
          isCurrentPlayer={round.currentPlayer === PLAYER_POSITIONS.NORTH && phase === "playing"}
        />
      </div>

      {/* West Opponent */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
        <PlayerLabel
          name={players.west.name}
          bid={players.west.bid}
          tricks={players.west.tricksWon}
          isCurrentPlayer={round.currentPlayer === PLAYER_POSITIONS.WEST && phase === "playing"}
        />
        <PlayerArea position={PLAYER_POSITIONS.WEST} />
      </div>

      {/* East Opponent */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
        <PlayerLabel
          name={players.east.name}
          bid={players.east.bid}
          tricks={players.east.tricksWon}
          isCurrentPlayer={round.currentPlayer === PLAYER_POSITIONS.EAST && phase === "playing"}
        />
        <PlayerArea position={PLAYER_POSITIONS.EAST} />
      </div>

      {/* Center trick area */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <TrickArea currentTrick={round.currentTrick} />
      </div>

      {/* Player (South) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <PlayerLabel
          name="You"
          bid={players.south.bid}
          tricks={players.south.tricksWon}
          isCurrentPlayer={round.currentPlayer === PLAYER_POSITIONS.SOUTH && phase === "playing"}
          isHuman
        />
        <PlayerArea position={PLAYER_POSITIONS.SOUTH} />
      </div>

      {/* Hint display */}
      <HintDisplay showHint={showHint} hintCard={hintCard} />

      {/* Bidding UI - positioned above cards, not blocking them */}
      {phase === "bidding" && round.currentPlayer === PLAYER_POSITIONS.SOUTH && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
          <BidSelector
            onBid={handlePlayerBid}
            partnerBid={players.north.bid}
            playerHand={players.south.hand}
          />
        </div>
      )}

      {/* Waiting for AI to bid */}
      {phase === "bidding" && round.currentPlayer !== PLAYER_POSITIONS.SOUTH && (
        <WaitingForBidOverlay
          currentPlayer={round.currentPlayer}
          players={players}
        />
      )}

      {/* AI thinking indicator */}
      {phase === "playing" && round.currentPlayer !== PLAYER_POSITIONS.SOUTH && (
        <AIThinkingOverlay
          currentPlayer={round.currentPlayer}
          players={players}
        />
      )}

      {/* Round end summary */}
      {phase === "round_end" && !winner && (
        <RoundEndModal
          roundNumber={round.roundNumber}
          playerTeamScore={playerTeamScore}
          opponentTeamScore={opponentTeamScore}
        />
      )}

      {/* Game over modal */}
      <GameOverModal
        isOpen={phase === "game_over"}
        winner={winner}
        playerScore={playerTeamScore}
        opponentScore={opponentTeamScore}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  );
});

export default GameTable;
