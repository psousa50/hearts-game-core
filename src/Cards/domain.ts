import { Card, FaceValue, Suit } from "./model"

export const create = (suit: Suit, faceValue: FaceValue) => ({
  faceValue,
  suit,
})

export const equals = (card1: Card, card2: Card) => card1.suit === card2.suit && card1.faceValue === card2.faceValue
