import { Card } from "../Cards/model"
import { CardMove, MoveType } from "./model"

export const createCardMove = (card: Card): CardMove => ({
  card,
  type: MoveType.Card as MoveType.Card,
})
