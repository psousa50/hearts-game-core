import { Dealer } from "../Dealer/domain"
import { PlayerEventDispatcher } from "../Events/model"

export type Environment = {
  playerEventDispatcher: PlayerEventDispatcher
  dealer: Dealer
}
