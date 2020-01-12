import * as R from "ramda"
import * as Card from "../Cards/domain"
import * as CardModel from "../Cards/model"
import { Deck } from "./model"

export interface Dealer {
  createDeck: () => Deck
  shuffleDeck: (deck: Deck) => Deck
  distributeCards: (deck: Deck, count: number) => { deck: Deck; cards: CardModel.Card[] }
}

export const createDeck = () =>
  R.flatten(CardModel.suits.map(suit => R.range(1, CardModel.maxFaceValue + 1).map(fv => Card.create(suit, fv))))

export const shuffleDeck = (deck: Deck) =>
  R.range(1, 100).reduce((acc, _) => {
    const p = Math.floor(Math.random() * 52)
    return [...acc.slice(0, p), ...acc.slice(p + 1), deck[p]]
  }, deck)

export const distributeCards = (deck: Deck, count: number) => ({
  cards: deck.slice(0, count),
  deck: deck.slice(count),
})
