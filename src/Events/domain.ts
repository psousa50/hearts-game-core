import { Hand, Trick } from "../Cards/model"
import { GameStage } from "../Game/model"
import { Move } from "../Moves/model"
import { PlayerId } from "../Players/model"
import { GameEvent, GameEventType, PlayerEvent, PlayerEventType } from "./model"

export const createPlayerEventGameStarted = (initialHand: Hand): PlayerEvent => ({
  initialHand,
  type: PlayerEventType.GameStarted,
})

export const createPlayerEventGameEnded = (): PlayerEvent => ({
  type: PlayerEventType.GameEnded,
})

export const createPlayerEventPlay = (
  hand: Hand,
  currentTrick: Trick,
  stage: GameStage,
  trickCounter: number,
): PlayerEvent => ({
  gamePublicState: {
    currentTrick,
    stage,
    trickCounter,
  },
  hand,
  type: PlayerEventType.Play,
})

export const createPlayerEventPlayerPlayed = (move: Move): PlayerEvent => ({
  move,
  type: PlayerEventType.PlayerPlayed,
})

export const createPlayerEventTrickFinished = (trick: Trick): PlayerEvent => ({
  trick,
  type: PlayerEventType.TrickFinished,
})

export const createGameEventPlayerPlayed = (playerId: PlayerId, move: Move): GameEvent => ({
  move,
  playerId,
  type: GameEventType.PlayerPlayed,
})
