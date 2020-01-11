import { Trick } from "../Cards/model"
import { Deck } from "../Dealer/model"
import { Move } from "../Moves/model"
import { Player, PlayerId } from "../Players/model"

export const enum GameStage {
  Idle = "Idle",
  Playing = "Playing",
  Ended = "Ended",
}

export const enum GameErrorType {
  InvalidPlayer = "InvalidPlayer",
  PlayerNotFound = "PlayerNotFound",
  InvalidMove = "InvalidMove",
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

export type MoveValidator = (game: Game, playedId: PlayerId, move: Move) => boolean
