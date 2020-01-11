import { Dealer } from "../Dealer/domain"
import { PlayerEventDispatcher } from "../Events/model"
import { MoveValidator } from "../Game/model"

export type Environment = {
  playerEventDispatcher: PlayerEventDispatcher
  validateMove: MoveValidator
  dealer: Dealer
}
