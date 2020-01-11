import { Hand, Trick } from "../Cards/model"
import { Move } from "../Moves/model"
import { PlayerEventType } from "./model"

export const createPlayerEventGameStarted = (initialHand: Hand) => ({
  initialHand,
  type: PlayerEventType.GameStarted,
})

export const createPlayerEventPlay = () => ({
  type: PlayerEventType.Play,
})

export const createPlayerEventPlayerPlayed = (move: Move) => ({
  move,
  type: PlayerEventType.PlayerPlayed,
})

export const createPlayerEventTrickFinished = (trick: Trick) => ({
  trick,
  type: PlayerEventType.TrickFinished,
})
