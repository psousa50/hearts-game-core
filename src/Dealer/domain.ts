import * as R from "ramda"
import * as Card from "../Cards/domain"
import * as CardModel from "../Cards/model"
import { rnd } from "../utils/misc"
import { Deck } from "./model"

export interface Dealer {
  createDeck: () => Deck
  shuffleDeck: (deck: Deck) => Deck
  distributeCards: (deck: Deck, count: number) => { deck: Deck; cards: CardModel.Card[] }
}

export const createDeck = () =>
  R.flatten(
    CardModel.suits.map(suit =>
      R.range(CardModel.minFaceValue, CardModel.maxFaceValue + 1).map(fv => Card.create(suit, fv)),
    ),
  )

export const shuffleDeck = (deck: Deck, times: number = 100) =>
  R.range(1, times + 1).reduce((acc, _) => {
    const p = rnd(deck.length)
    return [...acc.slice(0, p), ...acc.slice(p + 1), acc[p]]
  }, deck)

export const distributeCards = (deck: Deck, count: number) => ({
    cards: sortCards(deck.slice(0, count)),
    deck: deck.slice(count),
  })

export const sortCards = (cards: CardModel.Card[]) =>
    R.sort(Card.order, cards)
