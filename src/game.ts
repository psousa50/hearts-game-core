import { PlayerModel } from "./players"

export const enum PlayerEvent {
  GameStarted,
}

export const enum GameState {
  Idle,
  Playing,
}

export type PlayerDispatcher = (player: PlayerModel, event: PlayerEvent) => void

export type GameModel = Readonly<{
  players: readonly PlayerModel[]
  state: GameState

}>

export interface Game {
  create: (players: PlayerModel[]) => GameModel
  start: (playerDispatcher?: PlayerDispatcher) => (gameModel: GameModel) => GameModel
}

const start: typeof Game.start = (playerDispatcher = playerDispatcherImplementation) => gameModel => {
  gameModel.players.forEach(p => playerDispatcher(p, PlayerEvent.GameStarted))
  return {
    ...gameModel,
    state: GameState.Playing,
  }
}

export const Game: Game = {
  create: players => ({ players, state: GameState.Idle }),
  start,
}

const playerDispatcherImplementation: PlayerDispatcher = (_, __) => {
  //
}
