import { Hand, Trick } from "../Cards/model"
import { GameStage } from "../Game/model"
import { Move } from "../Moves/model"
import { Player } from "../Players/model"
import { PlayerEventType } from "./model"

export const createPlayerEventGameStarted = (initialHand: Hand) => ({
  initialHand,
  type: PlayerEventType.GameStarted,
})

export const createPlayerEventPlay = (hand: Hand, currentTrick: Trick, stage: GameStage, trickCounter: number) => ({
  currentTrick,
  hand,
  stage,
  trickCounter,
  type: PlayerEventType.Play,
})

export const createPlayerEventPlayerPlayed = (move: Move) => ({
  move,
  type: PlayerEventType.PlayerPlayed,
})

export const createPlayerEventTrickFinished = (trick: Trick) => ({
  trick,
  type: PlayerEventType.TrickFinished,
})
