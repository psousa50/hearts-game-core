import { Card, FaceValue, Suit, suitOrder } from "./model"

export const create = (suit: Suit, faceValue: FaceValue) => ({
  faceValue,
  suit,
})

export const equals = (card1: Card, card2: Card) => card1.suit === card2.suit && card1.faceValue === card2.faceValue

export const order = (card1: Card, card2: Card) =>
  card1.suit === card2.suit ? card1.faceValue - card2.faceValue : suitOrder[card1.suit] - suitOrder[card2.suit]
