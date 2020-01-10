import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import { Card, Trick } from "../Cards/model"
import * as Events from "../Events/domain"
import { Move, MoveType } from "../Moves/model"
import { Player } from "../Players/model"
import { actionErrorOf, actionOf, ask, GameAction } from "../utils/actions"
import { Game, GameErrorType, GameState } from "./model"

const nextPlayer = (game: Game) => (game.currentPlayerIndex + 1) % game.players.length
const isCurrentPlayer = (game: Game, player: Player) => game.players[game.currentPlayerIndex] === player
const trickEnded = (game: Game) => game.currentTrick.length === game.players.length

export const gameError = (type: GameErrorType) => ({
  type,
})
export const gameErrorOf = (type: GameErrorType) => actionErrorOf<Game>(gameError(type))

export const currentPlayer = (game: Game) => game.players[game.currentPlayerIndex]

export const findWinningTrickPlayerIndex = (trick: Trick) => {
  const firstCard = trick[0]
  const sameSuit = trick.filter(c => c.suit === firstCard.suit)
  const highestCard = R.reduce(
    R.max,
    0,
    sameSuit.map(c => c.faceValue),
  )
  return trick.findIndex(c => c.faceValue === highestCard && c.suit === firstCard.suit)
}

export const create = (players: Player[]) =>
  pipe(
    ask(),
    chain(({ dealer }) =>
      actionOf({
        currentPlayerIndex: 0,
        currentTrick: [],
        deck: dealer.createDeck(),
        players,
        state: GameState.Idle,
      }),
    ),
  )

export const start: GameAction = game =>
  pipe(
    ask(),
    chain(({ playerEventDispatcher, dealer }) => {
      game.players.forEach(p => playerEventDispatcher(p, Events.createPlayerEventGameStarted(), game))
      playerEventDispatcher(currentPlayer(game), Events.createPlayerEventPlay(), game)
      return actionOf({
        ...game,
        deck: dealer.shuffleDeck(game.deck),
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
    const winningTrickPlayedIndex = findWinningTrickPlayerIndex(newGame.currentTrick)
    return pipe(
      ask(),
      chain(({ playerEventDispatcher }) => {
        newGame.players.forEach(p =>
          playerEventDispatcher(p, Events.createPlayerEventTrickFinished(newGame.currentTrick), newGame),
        )
        return actionOf({
          ...newGame,
          currentPlayerIndex: winningTrickPlayedIndex,
          currentTrick: [],
        })
      }),
    )
  }

  return actionOf(newGame)
}

export const doPlayerMove = (player: Player, move: Move): GameAction => game =>
  move.type === MoveType.Card ? doPlayerCardMove(player, move.card)(game) : actionOf(game)

export const played = (player: Player, move: Move): GameAction => game =>
  isCurrentPlayer(game, player) ? doPlayerMove(player, move)(game) : gameErrorOf(GameErrorType.InvalidPlayer)
