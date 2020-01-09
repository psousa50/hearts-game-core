import { FaceValue, Suit } from "./model"

export const create = (suit: Suit, faceValue: FaceValue) => ({
  faceValue,
  suit,
})
