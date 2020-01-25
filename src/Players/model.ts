import { Hand } from "../Cards/model"
import { Trick } from "../Tricks/model"

export type PlayerId = string

export type PlayerPublicState = {
  id: PlayerId
  type: string,
  name: string
  hand: Hand
}

export type Player = PlayerPublicState & {
  tricks: Trick[]
}
