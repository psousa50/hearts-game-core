import * as R from "ramda"
import * as Card from "../Cards/domain"
import * as CardModel from "../Cards/model"
import { rnd } from "../utils/misc"
import { Deck } from "./model"

export const create = (
  minFaceValue: number = CardModel.minFaceValue,
  maxFaceValue: number = CardModel.maxFaceValue,
): Deck => {
  const cards = R.flatten(
    CardModel.suits.map(suit => R.range(minFaceValue, maxFaceValue + 1).map(fv => Card.create(suit, fv))),
  )
  return {
    cards,
    maxFaceValue,
    minFaceValue,
    size: cards.length,
  }
}

export const shuffle = (deck: Deck, times: number = 100) =>
  R.range(1, times + 1).reduce(({ cards }, _) => {
    const p = rnd(cards.length)
    return { ...deck, cards: [...cards.slice(0, p), ...cards.slice(p + 1), cards[p]] }
  }, deck)

export const distributeCards = (deck: Deck, count: number) => ({
  cards: sortCards(deck.cards.slice(0, count)),
  deck: {
    ...deck,
    cards: deck.cards.slice(count),
  },
})

export const sortCards = (cards: CardModel.Card[]) => R.sort(Card.order, cards)

// export const buildComplement = (
//   card: CardModel.Card[],
//   minFaceValue: number = CardModel.minFaceValue,
//   maxFaceValue: number = CardModel.maxFaceValue,
// ) => {}
