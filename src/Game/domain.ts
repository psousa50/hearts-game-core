import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import { Card } from "../Cards/model"
import { Move, MoveType } from "../Moves/model"
import { Player } from "../Players/model"
import { actionErrorOf, actionOf, ask, GameAction } from "../utils/actions"
import { Game, GameErrorType, GameState, PlayerEvent, PlayerEventDispatcher } from "./model"

const nextPlayer = (game: Game) => (game.currentPlayerIndex + 1) % game.players.length
const isCurrentPlayer = (game: Game, player: Player) => game.players[game.currentPlayerIndex] === player
const trickEnded = (game: Game) => game.currentTrick.length === game.players.length

export const gameError = (type: GameErrorType) => ({
  type,
})
export const gameErrorOf = (type: GameErrorType) => actionErrorOf<Game>(gameError(type))

export const currentPlayer = (game: Game) => game.players[game.currentPlayerIndex]

export const create = (players: Player[]) =>
  actionOf({
    currentPlayerIndex: 0,
    currentTrick: [],
    players,
    state: GameState.Idle,
  })

export const start: GameAction = game =>
  pipe(
    ask(),
    chain(({ playerEventDispatcher }) => {
      game.players.forEach(p => playerEventDispatcher(p, PlayerEvent.GameStarted, {}, game))
      playerEventDispatcher(currentPlayer(game), PlayerEvent.Play, {}, game)
      return actionOf({
        ...game,
        state: GameState.Playing,
      })
    }),
  )

export const doPlayerCardMove = (_: Player, card: Card): GameAction => game => {
  const newGame = {
    ...game,
    currentPlayerIndex: nextPlayer(game),
    currentTrick: [...game.currentTrick, card],
  }

  if (trickEnded(newGame)) {
    // const winningTrickPlayedIndex = findWinningTrickPlayerIndex(newGame)
    return pipe(
      ask(),
      chain(({ playerEventDispatcher }) => {
        newGame.players.forEach(p => playerEventDispatcher(p, PlayerEvent.TrickFinished, newGame.currentTrick, newGame))
        return actionOf({ ...newGame, currentTrick: [] })
      }),
    )
  }

  return actionOf(newGame)
}

export const doPlayerMove = (player: Player, move: Move): GameAction => game =>
  move.type === MoveType.Card ? doPlayerCardMove(player, move.card)(game) : actionOf(game)

export const played = (player: Player, move: Move): GameAction => game =>
  isCurrentPlayer(game, player) ? doPlayerMove(player, move)(game) : gameErrorOf(GameErrorType.InvalidPlayer)

const playerDispatcherImplementation: PlayerEventDispatcher = (_, __) => {
  //
}
