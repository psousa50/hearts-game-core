import { Trick } from "../Cards/model"
import { Deck } from "../Dealer/model"
import { Player } from "../Players/model"

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

export type Game = Readonly<{
  deck: Deck
  players: readonly Player[]
  currentPlayerIndex: number
  currentTrick: Trick
  state: GameState
}>
