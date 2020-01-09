import { Player } from "../Players/model"

export const enum PlayerEvent {
  GameStarted,
}

export const enum GameState {
  Idle,
  Playing,
}

export type PlayerDispatcher = (player: Player, event: PlayerEvent) => void

export type Game = Readonly<{
  players: readonly Player[];
  state: GameState;
}>
