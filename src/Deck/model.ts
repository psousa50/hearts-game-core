import { Card } from "../Cards/model"

export type DeckInfo = {
  size: number,
  minFaceValue: number,
  maxFaceValue: number
}

export type Deck = {
  cards: Card[],
} & DeckInfo
