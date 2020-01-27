import { Game } from "../Game/model"
import { Move } from "../Moves/model"
import { Player, PlayerId } from "../Players/model"
import { GameEvent, GameEventType, PlayerEvent, PlayerEventType } from "./model"

const createPlayerEventBase = (
  { hand, id, name, tricks, type }: Player,
  {
    currentPlayerIndex,
    currentTrick,
    heartsBroken,
    lastTrick,
    playersCount,
    stage,
    trickCounter,
    tricks: gameTricks,
  }: Game,
) => ({
  gameState: {
    currentPlayerIndex,
    currentTrick,
    heartsBroken,
    lastTrick,
    playersCount,
    stage,
    trickCounter,
    tricks: gameTricks,
  },
  playerState: {
    hand,
    id,
    name,
    tricks,
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
  playing: Player,
  move: Move,
): PlayerEvent => ({
  ...createPlayerEventBase(player, game),
  move,
  playing,
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
