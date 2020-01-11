import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import { Card, Hand, Trick } from "../Cards/model"
import * as Events from "../Events/domain"
import { Move, MoveType } from "../Moves/model"
import { Player, PlayerId } from "../Players/model"
import { actionErrorOf, actionOf, ask, GameAction } from "../utils/actions"
import { Game, GameErrorType, GameStage } from "./model"

const nextPlayer = (game: Game) => (game.currentPlayerIndex + 1) % game.players.length
const isCurrentPlayer = (game: Game, playerId: PlayerId) => game.players[game.currentPlayerIndex].id === playerId
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
        stage: GameStage.Idle,
      }),
    ),
  )

export const start: GameAction = game =>
  pipe(
    ask(),
    chain(({ playerEventDispatcher, dealer }) => {
      const shuffledDeck = dealer.shuffleDeck(game.deck)
      const distributedCards = R.range(1, game.players.length + 1).reduce(
        (hands, _) => {
          const distributed = dealer.distributeCards(hands.deck, 13)
          return {
            deck: distributed.deck,
            hands: [...hands.hands, distributed.cards],
          }
        },
        {
          deck: shuffledDeck,
          hands: [] as Hand[],
        },
      )
      const players = game.players.map((player, i) => ({
        ...player,
        hand: distributedCards.hands[i],
      }))
      players.forEach(player => playerEventDispatcher(player.id, Events.createPlayerEventGameStarted(player.hand)))
      playerEventDispatcher(currentPlayer(game).id, Events.createPlayerEventPlay())
      return actionOf({
        ...game,
        deck: distributedCards.deck,
        players,
        stage: GameStage.Playing,
      })
    }),
  )

export const doPlayerCardMove = (card: Card): GameAction => game => {
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
        newGame.players.forEach(player =>
          playerEventDispatcher(player.id, Events.createPlayerEventTrickFinished(newGame.currentTrick)),
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

export const doPlayerMove = (move: Move): GameAction => game =>
  move.type === MoveType.Card ? doPlayerCardMove(move.card)(game) : actionOf(game)

export const played = (playerId: PlayerId, move: Move): GameAction => game =>
  isCurrentPlayer(game, playerId) ? doPlayerMove(move)(game) : gameErrorOf(GameErrorType.InvalidPlayer)
