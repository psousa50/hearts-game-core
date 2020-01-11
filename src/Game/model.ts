import { Trick } from "../Cards/model"
import { Deck } from "../Dealer/model"
import { Player } from "../Players/model"

export const enum GameStage {
  Idle = "Idle",
  Playing = "Playing",
  Ended = "Ended",
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
  stage: GameStage
  deckSize: number
  trickCounter: number
}>
