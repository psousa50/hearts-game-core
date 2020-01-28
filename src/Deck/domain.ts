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

export const fromCards = (
  cards: CardModel.Card[],
  minFaceValue: number = CardModel.minFaceValue,
  maxFaceValue: number = CardModel.maxFaceValue,
): Deck => ({
    cards,
    maxFaceValue,
    minFaceValue,
    size: cards.length,
  })

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

const powersOfTwo = R.range(0, 14).map(i => Math.pow(2, i))

export const buildComplement = (
  cards: CardModel.Card[],
  minFaceValue: number = CardModel.maxFaceValue,
  maxFaceValue: number = CardModel.maxFaceValue,
) => {
  const initialMasks = {
    [CardModel.Suit.Hearts]: 0,
    [CardModel.Suit.Clubs]: 0,
    [CardModel.Suit.Diamonds]: 0,
    [CardModel.Suit.Spades]: 0,
  }

  const suitMasks = cards.reduce(
    (acc, card) => ({
      ...acc,
      [card.suit]: acc[card.suit] + powersOfTwo[card.faceValue - minFaceValue],
    }),
    initialMasks,
  )

  const revertedSuitMasks = R.keys(suitMasks).reduce(
    (acc, k) => ({
      ...acc,
      [k]: powersOfTwo[maxFaceValue - minFaceValue + 1] - 1 - suitMasks[k],
    }),
    initialMasks,
  )

  // tslint:disable: no-bitwise
  const complement =  R.flatten(
    R.keys(revertedSuitMasks).map(suit => {
      const mask = revertedSuitMasks[suit]
      const values = R.range(minFaceValue, maxFaceValue + 1)
        .map(faceValue => ((powersOfTwo[faceValue - minFaceValue] & mask) === 0 ? undefined : faceValue))
        .filter(R.identity)
      return values.map(v => Card.create(suit, v!))
    }),
  )

  return complement
}
