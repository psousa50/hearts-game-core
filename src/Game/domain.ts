import { Card } from "../Cards/model"
import { Player } from "../Players/model"
import { Game, GameState, Move, MoveType, PlayerDispatcher, PlayerEvent } from "./model"

const nextPlayer = (game: Game) => (game.currentPlayerIndex + 1) % game.players.length
const isCurrentPlayer = (game: Game, player: Player) => game.players[game.currentPlayerIndex] === player
const trickEnded = (game: Game) => game.currentTrick.length === game.players.length

export const currentPlayer = (game: Game) => game.players[game.currentPlayerIndex]

export const create = (players: Player[]) => ({
  currentPlayerIndex: 0,
  currentTrick: [],
  players,
  state: GameState.Idle,
})

export const start = (playerDispatcher: PlayerDispatcher = playerDispatcherImplementation) => (game: Game) => {
  game.players.forEach(p => playerDispatcher(p, PlayerEvent.GameStarted, game))
  playerDispatcher(currentPlayer(game), PlayerEvent.Play, game)
  return {
    ...game,
    state: GameState.Playing,
  }
}

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

export const played = (player: Player, move: Move) => (game: Game) =>
  isCurrentPlayer(game, player) ? doPlayerMove(player, move)(game) : game

const playerDispatcherImplementation: PlayerDispatcher = (_, __) => {
  //
}
