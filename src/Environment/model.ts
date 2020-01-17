import { Dealer } from "../Dealer/domain"
import { PlayerEventDispatcher } from "../Events/model"
import { MoveValidator } from "../Game/model"

interface Config {
  auto: boolean
}

export type Environment = {
  config: Config
  playerEventDispatcher: PlayerEventDispatcher
  validateMove: MoveValidator
  dealer: Dealer
}
