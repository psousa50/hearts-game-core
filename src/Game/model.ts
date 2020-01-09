import { Card } from "../Cards/model"
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

export const enum MoveType {
  Card,
  Swap,
}

export const enum GameErrorType {
  InvalidPlayer,
  InvalidMove,
}

export type GameError = {
  type: GameErrorType
}

export type CardMove = {
  type: MoveType.Card
  card: Card
}

export type SwapMove = {
  type: MoveType.Swap
  cards: Card[]
}

export type Move = CardMove | SwapMove

export type PlayerEventDispatcher = (player: Player, event: PlayerEvent, game: Game) => void

export type Game = Readonly<{
  players: readonly Player[]
  currentPlayerIndex: number
  currentTrick: Card[]
  state: GameState
}>
