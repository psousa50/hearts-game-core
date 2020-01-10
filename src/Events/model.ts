import { Trick } from "../Cards/model"
import { Game } from "../Game/model"
import { Player } from "../Players/model"

export const enum PlayerEventType {
  GameStarted,
  Play,
  TrickFinished,
}

export interface PlayerEvent {
  type: PlayerEventType
}

export type PlayerEventGameStarted = PlayerEvent

export interface PlayerEventTrickFinished extends PlayerEvent {
  trick: Trick
}

export type PlayerEventPlay = PlayerEvent

export type PlayerEventDispatcher = (player: Player, event: PlayerEvent, game: Game) => void
