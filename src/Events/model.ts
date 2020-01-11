import { Hand, Trick } from "../Cards/model"
import { Move } from "../Moves/model"
import { PlayerId } from "../Players/model"

export const enum PlayerEventType {
  GameStarted = "GameStarted",
  Play = "Play",
  TrickFinished = "TrickFinished",
  PlayerPlayed = "PlayerPlayed",
}

export interface PlayerEvent {
  type: PlayerEventType
}

export interface PlayerEventGameStarted extends PlayerEvent {
  initialHand: Hand
}

export interface PlayerEventPlayerPlayed extends PlayerEvent {
  move: Move
}

export interface PlayerEventTrickFinished extends PlayerEvent {
  trick: Trick
}

export type PlayerEventPlay = PlayerEvent

export type PlayerEventDispatcher = (playerId: PlayerId, event: PlayerEvent) => void
