import { Hand, Trick } from "../Cards/model"

export type PlayerId = string

export type PlayerPublicState = {
  hand: Hand
}

export type Player = PlayerPublicState & {
  id: PlayerId
  name: string
  tricks: Trick[]
}
