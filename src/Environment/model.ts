import { Dealer } from "../dealer"
import { PlayerEventDispatcher } from "../Events/model"
import { MoveValidator } from "../Game/model"

export interface Config {
  auto: boolean
}

export type Environment = {
  config: Config
  playerEventDispatcher: PlayerEventDispatcher
  validateMove: MoveValidator
  dealer: Dealer
}
