import * as R from "ramda"
import { Dealer } from "../dealer"
import * as Game from "../Game/domain"
import { DeepPartial } from "../utils/types"
import { Environment } from "./model"

const defaultEnvironment: Environment = {
  config: {
    auto: true,
  },
  dealer: Dealer,
  playerEventDispatcher: () => undefined,
  validateMove: Game.isValidMove,
}

export const buildEnvironment = (overrides: DeepPartial<Environment> = {}): Environment => {
  return R.mergeDeepRight(defaultEnvironment, overrides)
}
