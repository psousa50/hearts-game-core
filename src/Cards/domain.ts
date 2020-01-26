import * as R from "ramda"
import { Card, FaceValue, faceValues, faceValueSymbols, Suit, suitOrder, suitSymbols } from "./model"

export const create = (suit: Suit, faceValue: FaceValue) => ({
  faceValue,
  suit,
})

export const isHearts = (card: Card) => card.suit === Suit.Hearts

export const equals = (card1: Card, card2: Card) => card1.suit === card2.suit && card1.faceValue === card2.faceValue

export const order = (card1: Card, card2: Card) =>
  card1.suit === card2.suit ? card1.faceValue - card2.faceValue : suitOrder[card1.suit] - suitOrder[card2.suit]

const queenOfSpades = create(Suit.Spades, faceValues.queen)

export const score = (card: Card) => (card.suit === Suit.Hearts ? 1 : equals(card, queenOfSpades) ? 13 : 0)

export const toSymbol = (card: Card) => `${faceValueSymbols[card.faceValue]}${suitSymbols[card.suit]}`

export const fromSymbol = (symbol: string) => {
  const l = symbol.length
  const suitSymbol = symbol.substr(l - 1, 1)
  const suit = R.keys(suitSymbols)[R.values(suitSymbols).findIndex(s => s === suitSymbol)]
  const faceValue = faceValueSymbols.findIndex(s => s === symbol.substring(0, l - 1))

  return create(suit, faceValue)
}

export const toList = (cards: Card[]) => cards.map(toSymbol).join(" ")

export const fromList = (list: string) => list.split(" ").map(fromSymbol)
