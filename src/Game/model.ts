import { Trick } from "../Cards/model"
import { Deck } from "../Dealer/model"
import { Move } from "../Moves/model"
import { Player, PlayerPublicState } from "../Players/model"

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

export type GamePublicState = Readonly<{
  currentTrick: Trick
  stage: GameStage
  trickCounter: number
  heartsHasBeenDrawn: boolean
}>

export type Game = Readonly<GamePublicState & {
  deck: Deck
  players: readonly Player[]
  currentPlayerIndex: number
  deckSize: number
}>

export type MoveValidator = (gameState: GamePublicState, playerState: PlayerPublicState, move: Move) => boolean
