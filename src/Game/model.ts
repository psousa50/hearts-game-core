import { Deck } from "../Deck/model"
import { Move } from "../Moves/model"
import { Player, PlayerPublicState } from "../Players/model"
import { Trick } from "../Tricks/model"

export enum GameStage {
  Idle = "Idle",
  Playing = "Playing",
  Ended = "Ended",
}

export enum GameErrorType {
  InvalidPlayer = "InvalidPlayer",
  PlayerNotFound = "PlayerNotFound",
  InvalidMove = "InvalidMove",
}

export type GameError = {
  type: GameErrorType
}

export type GamePublicState = Readonly<{
  currentPlayerIndex: number
  currentTrick: Trick
  heartsBroken: boolean
  lastTrick: Trick
  playersCount: number,
  stage: GameStage
  trickCounter: number
  trickFirstPlayerIndex: number
  tricks: Trick[]
}>

export type Game = Readonly<GamePublicState & {
  deck: Deck
  players: readonly Player[]
}>

export type MoveValidator = (gameState: GamePublicState, playerState: PlayerPublicState) => (move: Move) => boolean
