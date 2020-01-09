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

export const create = (players: PlayerModel[]) => ({ players, state: GameState.Idle })

export const start = (playerDispatcher: PlayerDispatcher = playerDispatcherImplementation) =>
 (gameModel: GameModel) => {
  gameModel.players.forEach(p => playerDispatcher(p, PlayerEvent.GameStarted))
  return {
    ...gameModel,
    state: GameState.Playing,
  }
}

const playerDispatcherImplementation: PlayerDispatcher = (_, __) => {
  //
}
