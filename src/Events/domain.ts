import { Trick } from "../Cards/model"
import { PlayerEventType } from "./model"

export const createPlayerEventGameStarted = () => ({
  type: PlayerEventType.GameStarted,
})

export const createPlayerEventPlay = () => ({
  type: PlayerEventType.Play,
})
export const createPlayerEventTrickFinished = (trick: Trick) => ({
  trick,
  type: PlayerEventType.TrickFinished,
})
