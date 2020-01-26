import { Dealer } from "../dealer"
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
