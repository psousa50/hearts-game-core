import { Game } from "../Game/model"
import { Move } from "../Moves/model"
import { Player, PlayerId } from "../Players/model"
import { GameEvent, GameEventType, PlayerEvent, PlayerEventType } from "./model"

const createPlayerEventBase = (
  { hand, id, name, type }: Player,
  { currentTrick, heartsBroken, lastTrick, stage, trickCounter, trickFirstPlayerIndex }: Game,
) => ({
  gameState: {
    currentTrick,
    heartsBroken,
    lastTrick,
    stage,
    trickCounter,
    trickFirstPlayerIndex,
  },
  playerState: {
    hand,
    id,
    name,
    type,
  },
})

export const createPlayerEventGameStarted = (player: Player, game: Game): PlayerEvent => ({
  ...createPlayerEventBase(player, game),
  type: PlayerEventType.GameStarted,
})

export const createPlayerEventGameEnded = (player: Player, game: Game): PlayerEvent => ({
  ...createPlayerEventBase(player, game),
  type: PlayerEventType.GameEnded,
})

export const createPlayerEventPlay = (player: Player, game: Game): PlayerEvent => ({
  ...createPlayerEventBase(player, game),
  type: PlayerEventType.Play,
})

export const createPlayerEventPlayerPlayed = (
  player: Player,
  game: Game,
  { hand, id, name, type }: Player,
  move: Move,
): PlayerEvent => ({
  ...createPlayerEventBase(player, game),
  move,
  playing: { hand, id, name, type },
  type: PlayerEventType.PlayerPlayed,
})

export const createPlayerEventTrickFinished = (player: Player, game: Game): PlayerEvent => ({
  ...createPlayerEventBase(player, game),
  type: PlayerEventType.TrickFinished,
})

export const createGameEventPlayerPlayed = (playerId: PlayerId, move: Move): GameEvent => ({
  move,
  playerId,
  type: GameEventType.PlayerPlayed,
})
