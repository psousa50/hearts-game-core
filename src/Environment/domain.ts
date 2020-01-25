import * as Dealer from "../Dealer/domain"
import * as Game from "../Game/domain"
import { Environment } from "./model"

export const defaultEnvironment: Environment = {
  config: {
    auto: true,
  },
  dealer: Dealer,
  playerEventDispatcher: () => undefined,
  validateMove: Game.isValidMove,
}
