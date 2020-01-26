import * as CardModel from "./Cards/model"
import { create, distributeCards, shuffle } from "./Deck/domain"
import { Deck } from "./Deck/model"

export interface Dealer {
  createDeck: () => Deck
  shuffleDeck: (deck: Deck) => Deck
  distributeCards: (deck: Deck, count: number) => { deck: Deck; cards: CardModel.Card[] }
}

export const Dealer = {
  createDeck: create,
  distributeCards,
  shuffleDeck: shuffle,
}
