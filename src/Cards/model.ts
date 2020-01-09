export enum Suit {
  Clubs,
  Diamonds,
  Hearts,
  Spades,
}

export type FaceValue = number

export type Card = {
  suit: Suit
  faceValue: FaceValue
}
