import { Card } from "../Cards/model"

export type Deck = {
  cards: Card[],
  size: number,
  minFaceValue: number,
  maxFaceValue: number
}
