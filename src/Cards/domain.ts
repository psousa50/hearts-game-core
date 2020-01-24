import { Card, FaceValue, Suit, suitOrder, Trick } from "./model"

export const create = (suit: Suit, faceValue: FaceValue) => ({
  faceValue,
  suit,
})

export const equals = (card1: Card, card2: Card) => card1.suit === card2.suit && card1.faceValue === card2.faceValue

export const order = (card1: Card, card2: Card) =>
  card1.suit === card2.suit ? card1.faceValue - card2.faceValue : suitOrder[card1.suit] - suitOrder[card2.suit]

export const createTrick = (): Trick => ({
  cards: [],
  firstPlayerIndex: 0,
})

export const trickIsEmpty = (trick: Trick) => trick.cards.length === 0

export const trickFirstCard = (trick: Trick) => trick.cards[0]

export const trickSuit = (trick: Trick) => trick.cards[0].suit

export const trickCards = (trick: Trick) => trick.cards

export const addCardToTrick = (trick: Trick, card: Card, playerIndex: number) => ({
  cards: [...trick.cards, card],
  firstPlayerIndex: trickIsEmpty(trick) ? playerIndex : trick.firstPlayerIndex,
})
