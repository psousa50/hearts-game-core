import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import { Card } from "../Cards/model"
import { Player } from "../Players/model"
import { Action, actionErrorOf, actionOf, ActionResult, ask, GameAction } from "../utils/actions"
import { Game, GameErrorType, GameState, Move, MoveType, PlayerEvent, PlayerEventDispatcher } from "./model"

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
      game.players.forEach(p => playerEventDispatcher(p, PlayerEvent.GameStarted, game))
      playerEventDispatcher(currentPlayer(game), PlayerEvent.Play, game)
      return actionOf({
        ...game,
        state: GameState.Playing,
      })
    }),
  )

export const doPlayerCardMove = (_: Player, card: Card) => (game: Game) => {
  const newGame = {
    ...game,
    currentPlayerIndex: nextPlayer(game),
    currentTrick: [...game.currentTrick, card],
  }

  // if (trickEnded(newGame)) {
  //   const winningTrickPlayedIndex = findWinningTrickPlayedIndex(newGame)

  return newGame
}

export const doPlayerMove = (player: Player, move: Move) => (game: Game) =>
  move.type === MoveType.Card ? doPlayerCardMove(player, move.card)(game) : game

export const played = (player: Player, move: Move): GameAction => game =>
  isCurrentPlayer(game, player) ? actionOf(doPlayerMove(player, move)(game)) : gameErrorOf(GameErrorType.InvalidPlayer)

const playerDispatcherImplementation: PlayerEventDispatcher = (_, __) => {
  //
}
