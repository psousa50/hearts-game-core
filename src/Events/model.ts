import { GamePublicState } from "../Game/model"
import { Move } from "../Moves/model"
import { PlayerId, PlayerPublicState } from "../Players/model"

export enum PlayerEventType {
  GameStarted = "GameStarted",
  GameEnded = "GameEnded",
  Play = "Play",
  TrickFinished = "TrickFinished",
  PlayerPlayed = "PlayerPlayed",
}

export interface PlayerEventBase {
  type: PlayerEventType
  playerState: PlayerPublicState
  gameState: GamePublicState
}

export interface PlayerEventGameStarted extends PlayerEventBase {
  type: PlayerEventType.GameStarted
}

export interface PlayerEventGameEnded extends PlayerEventBase {
  type: PlayerEventType.GameEnded
}

export interface PlayerEventPlayerPlayed extends PlayerEventBase {
  type: PlayerEventType.PlayerPlayed
  playing: PlayerPublicState
  move: Move
}

export interface PlayerEventTrickFinished extends PlayerEventBase {
  type: PlayerEventType.TrickFinished
}

export interface PlayerEventPlay extends PlayerEventBase {
  type: PlayerEventType.Play
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
  type: GameEventType.PlayerPlayed
  move: Move
}

export type GameEvent = GameEventPlayerPlayed

export type GameEventDispatcher = (event: GameEvent) => void
