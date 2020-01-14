import { Hand, Trick } from "../Cards/model"

export type PlayerId = string

export type PlayerPublicState = {
  id: PlayerId
  name: string
  hand: Hand
}

export type Player = PlayerPublicState & {
  tricks: Trick[]
}
