export enum Suit {
  Clubs = "Clubs",
  Diamonds = "Diamonds",
  Hearts = "Hearts",
  Spades = "Spades",
}

export const suits = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades]
export const minFaceValue = 2
export const maxFaceValue = 14

export type FaceValue = number

export type Card = {
  suit: Suit
  faceValue: FaceValue
}

export type Trick = Card[]

export type Hand = Card[]
