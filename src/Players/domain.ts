import { Player, PlayerId, PlayerPublicState } from "./model"

export const create = (id: PlayerId, name: string, type = ""): Player => ({ id, name, type, hand: [], tricks: [] })

export const createFromPublicState = (playerPublicState: PlayerPublicState): Player => ({
  ...playerPublicState,
})
