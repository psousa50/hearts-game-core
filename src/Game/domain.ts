import { Player } from "../Players/model"
import { Game, GameState, PlayerDispatcher, PlayerEvent } from "./model"

export const create = (players: Player[]) => ({ players, state: GameState.Idle })

export const start = (playerDispatcher: PlayerDispatcher = playerDispatcherImplementation) =>
 (gameModel: Game) => {
  gameModel.players.forEach(p => playerDispatcher(p, PlayerEvent.GameStarted))
  return {
    ...gameModel,
    state: GameState.Playing,
  }
}

const playerDispatcherImplementation: PlayerDispatcher = (_, __) => {
  //
}
