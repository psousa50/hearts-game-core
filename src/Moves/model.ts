import { Card } from "../Cards/model"

export const enum MoveType {
  Card = "Card",
  Swap = "Swap",
}

export type CardMove = {
  type: MoveType.Card
  card: Card
}

export type SwapMove = {
  type: MoveType.Swap
  cards: Card[]
}

export type Move = CardMove | SwapMove
