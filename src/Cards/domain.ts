import { Card, FaceValue, faceValues, Suit, suitOrder } from "./model"

export const create = (suit: Suit, faceValue: FaceValue) => ({
  faceValue,
  suit,
})

export const isHearts = (card: Card) => card.suit === Suit.Hearts

export const equals = (card1: Card, card2: Card) => card1.suit === card2.suit && card1.faceValue === card2.faceValue

export const order = (card1: Card, card2: Card) =>
  card1.suit === card2.suit ? card1.faceValue - card2.faceValue : suitOrder[card1.suit] - suitOrder[card2.suit]

const queenOfSpades = create(Suit.Spades, faceValues.queen)

export const score = (card: Card) => card.suit === Suit.Hearts ? 1 : equals(card, queenOfSpades) ? 13 : 0
