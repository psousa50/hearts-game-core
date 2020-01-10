import { Trick } from "../Cards/model"
import { Player } from "../Players/model"

export const enum PlayerEvent {
  GameStarted,
  Play,
  TrickFinished,
}

export const enum GameState {
  Idle,
  Playing,
}

export const enum GameErrorType {
  InvalidPlayer,
  InvalidMove,
}

export type GameError = {
  type: GameErrorType
}

export type PlayerEventDispatcher = (player: Player, event: PlayerEvent, eventData: {}, game: Game) => void

export type Game = Readonly<{
  players: readonly Player[]
  currentPlayerIndex: number
  currentTrick: Trick
  state: GameState
}>
