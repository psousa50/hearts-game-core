import { Hand, Trick } from "../Cards/model"
import { PlayerId } from "../Players/model"

export const enum PlayerEventType {
  GameStarted,
  Play,
  TrickFinished,
}

export interface PlayerEvent {
  type: PlayerEventType
}

export interface PlayerEventGameStarted extends PlayerEvent {
  initialHand: Hand
}

export interface PlayerEventTrickFinished extends PlayerEvent {
  trick: Trick
}

export type PlayerEventPlay = PlayerEvent

export type PlayerEventDispatcher = (playerId: PlayerId, event: PlayerEvent) => void
