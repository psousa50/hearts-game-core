export enum Suit {
  Clubs = "Clubs",
  Diamonds = "Diamonds",
  Hearts = "Hearts",
  Spades = "Spades",
}

export const suitOrder = {
  [Suit.Hearts]: 0,
  [Suit.Clubs]: 1,
  [Suit.Diamonds]: 2,
  [Suit.Spades]: 3,
}

export const faceValues = {
  ace: 14,
  jack: 11,
  king: 13,
  queen: 12,
}

export const suits = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades]
export const minFaceValue = 2
export const maxFaceValue = 14

export type FaceValue = number

export type Card = {
  suit: Suit
  faceValue: FaceValue
}

export type Hand = Card[]
