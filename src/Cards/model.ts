export enum Suit {
  Clubs = "Clubs",
  Diamonds = "Diamonds",
  Hearts = "Hearts",
  Spades = "Spades",
}

export const suits = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades]
export const maxFaceValue = 13

export type FaceValue = number

export type Card = {
  suit: Suit
  faceValue: FaceValue
}

export type Trick = Card[]

export type Hand = Card[]
