import { GameModel } from "./game"

type Move = {
  card: string
}

export type PlayerModel = {
  name: string
}

interface PlayerCalbacks {
  played: (player: PlayerModel, move: Move) => void
}

export interface Player {
  create: (name: string) => PlayerModel
  started: (player: PlayerModel, gameModel: GameModel) => void
}

export const Player: Player = {
  create: name => ({ name }),
  started: (_, __) => {
    //
   },
}
