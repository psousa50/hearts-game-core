import { Hand, Trick } from "../Cards/model"

export type PlayerId = string

export type Player = {
  id: PlayerId
  hand: Hand
  name: string
  tricks: Trick[]
}
