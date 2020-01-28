import { score as cardScore } from "../Cards/domain"
import { Card } from "../Cards/model"
import { Trick } from "./model"

export const createTrick = (cards: Card[] = []): Trick => ({
  cards,
  firstPlayerIndex: 0,
})

export const isEmpty = (trick: Trick) => trick.cards.length === 0

export const firstCard = (trick: Trick) => trick.cards[0]

export const suit = (trick: Trick) => isEmpty(trick) ?  undefined : trick.cards[0].suit

export const addCard = (trick: Trick, card: Card, playerIndex: number) => ({
  cards: [...trick.cards, card],
  firstPlayerIndex: isEmpty(trick) ? playerIndex : trick.firstPlayerIndex,
})

export const score = (trick: Trick) => trick.cards.reduce((s, card) => s + cardScore(card), 0)
