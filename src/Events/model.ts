import { Hand, Trick } from "../Cards/model"
import { GamePublicState } from "../Game/model"
import { Move } from "../Moves/model"
import { PlayerId } from "../Players/model"

export enum PlayerEventType {
  GameStarted = "GameStarted",
  GameEnded = "GameEnded",
  Play = "Play",
  TrickFinished = "TrickFinished",
  PlayerPlayed = "PlayerPlayed",
}

export interface PlayerEventBase {
  type: PlayerEventType
}

export interface PlayerEventGameStarted extends PlayerEventBase {
  type: PlayerEventType.GameStarted
  initialHand: Hand
}

export interface PlayerEventGameEnded extends PlayerEventBase {
  type: PlayerEventType.GameEnded
}

export interface PlayerEventPlayerPlayed extends PlayerEventBase {
  type: PlayerEventType.PlayerPlayed
  move: Move
}

export interface PlayerEventTrickFinished extends PlayerEventBase {
  type: PlayerEventType.TrickFinished
  trick: Trick
}

export interface PlayerEventPlay extends PlayerEventBase {
  type: PlayerEventType.Play
  hand: Hand
  gamePublicState: GamePublicState
}

export type PlayerEvent =
  | PlayerEventGameStarted
  | PlayerEventGameEnded
  | PlayerEventPlayerPlayed
  | PlayerEventTrickFinished
  | PlayerEventPlay

export type PlayerEventDispatcher = (playerId: PlayerId, event: PlayerEvent) => void

export enum GameEventType {
  PlayerPlayed = "PlayerPlayed",
}

export interface GameEventBase {
  playerId: PlayerId
  type: GameEventType
}

export interface GameEventPlayerPlayed extends GameEventBase {
  move: Move
}

export type GameEvent = GameEventPlayerPlayed

export type GameEventDispatcher = (event: GameEvent) => void
