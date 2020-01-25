import { Hand } from "../Cards/model"
import { Trick } from "../Tricks/model"

export type PlayerId = string

export type PlayerPublicState = {
  id: PlayerId
  type: string,
  name: string
  hand: Hand
  tricks: Trick[]
}

export type Player = PlayerPublicState & {
}
