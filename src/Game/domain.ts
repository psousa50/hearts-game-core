import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as Card from "../Cards/domain"
import * as CardModel from "../Cards/model"
import * as Events from "../Events/domain"
import { Move, MoveType } from "../Moves/model"
import { Player, PlayerId } from "../Players/model"
import { actionErrorOf, actionOf, ask, GameAction } from "../utils/actions"
import { Game, GameErrorType, GameStage } from "./model"

const nextPlayer = (game: Game) => (game.currentPlayerIndex + 1) % game.players.length
const isCurrentPlayer = (game: Game, playerId: PlayerId) => game.players[game.currentPlayerIndex].id === playerId

const gameError = (type: GameErrorType) => ({
  type,
})
const gameErrorOf = (type: GameErrorType) => actionErrorOf<Game>(gameError(type))

export const findWinningTrickPlayerIndex = (trick: CardModel.Trick) => {
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
    chain(({ dealer }) => {
      const deck = dealer.createDeck()
      return actionOf({
        currentPlayerIndex: 0,
        currentTrick: [],
        deck,
        deckSize: deck.length,
        players,
        stage: GameStage.Idle,
        trickCounter: 0,
      })
    }),
  )

export const currentPlayer = (game: Game) => game.players[game.currentPlayerIndex]

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
          hands: [] as CardModel.Hand[],
        },
      )
      const players = game.players.map((player, i) => ({
        ...player,
        hand: distributedCards.hands[i],
      }))
      const nextGame = {
        ...game,
        deck: distributedCards.deck,
        players,
        stage: GameStage.Playing,
      }
      players.forEach(player => playerEventDispatcher(player.id, Events.createPlayerEventGameStarted(player.hand)))
      playerEventDispatcher(
        currentPlayer(nextGame).id,
        Events.createPlayerEventPlay(
          currentPlayer(nextGame).hand,
          nextGame.currentTrick,
          nextGame.stage,
          nextGame.trickCounter,
        ),
      )
      return actionOf(nextGame)
    }),
  )

const removeCardFromHand = (card: CardModel.Card) => (player: Player) => ({
  ...player,
  hand: player.hand.filter(c => c.faceValue !== card.faceValue || c.suit !== card.suit),
})

const replacePlayer = (players: readonly Player[], playerId: PlayerId, replaceFn: (player: Player) => Player) =>
  players.map(p => (p.id === playerId ? replaceFn(p) : p))

const doPlayerCardMove = (playerId: PlayerId, card: CardModel.Card): GameAction => game =>
  actionOf({
    ...game,
    currentPlayerIndex: nextPlayer(game),
    currentTrick: [...game.currentTrick, card],
    players: replacePlayer(game.players, playerId, removeCardFromHand(card)),
  })

const doTrickFinished: GameAction = game => {
  const winningTrickPlayedIndex = findWinningTrickPlayerIndex(game.currentTrick)
  return pipe(
    ask(),
    chain(({ playerEventDispatcher }) => {
      game.players.forEach(player =>
        playerEventDispatcher(player.id, Events.createPlayerEventTrickFinished(game.currentTrick)),
      )
      return actionOf({
        ...game,
        currentPlayerIndex: winningTrickPlayedIndex,
        currentTrick: [],
        trickCounter: game.trickCounter + 1,
      })
    }),
  )
}

const checkTrickFinished: GameAction = game =>
  game.currentTrick.length === game.players.length ? doTrickFinished(game) : actionOf(game)

const doEndOfGame: GameAction = game =>
  actionOf({
    ...game,
    stage: GameStage.Ended,
  })

const checkEndOfGame: GameAction = game =>
  game.trickCounter === game.deckSize / game.players.length ? doEndOfGame(game) : actionOf(game)

const doPlayerMove = (playerId: PlayerId, move: Move): GameAction => game =>
  pipe(
    ask(),
    chain(({ playerEventDispatcher, validateMove }) => {
      if (validateMove(game, playerId, move)) {
        game.players.forEach(player => playerEventDispatcher(player.id, Events.createPlayerEventPlayerPlayed(move)))
        return move.type === MoveType.Card ? doPlayerCardMove(playerId, move.card)(game) : actionOf(game)
      } else {
        return gameErrorOf(GameErrorType.InvalidMove)
      }
    }),
    chain(checkTrickFinished),
    chain(checkEndOfGame),
  )

export const played = (playerId: PlayerId, move: Move): GameAction => game =>
  isCurrentPlayer(game, playerId) ? doPlayerMove(playerId, move)(game) : gameErrorOf(GameErrorType.InvalidPlayer)

const getPlayer = (game: Game, playerId: PlayerId) => game.players.find(p => p.id === playerId)

const twoOfClubs = Card.create(CardModel.Suit.Clubs, 2)

const isValidCardMove = (game: Game, playerId: PlayerId, card: CardModel.Card) => {
  const player = getPlayer(game, playerId)
  return player
    ? (game.trickCounter !== 0 || game.currentTrick.length > 0 || Card.equals(card, twoOfClubs)) &&
        (game.currentTrick.length === 0 ||
          game.currentTrick[0].suit === card.suit ||
          player.hand.every(c => c.suit !== game.currentTrick[0].suit))
    : false
}

export const isValidMove = (game: Game, playerId: PlayerId, move: Move) =>
  move.type === MoveType.Card ? isValidCardMove(game, playerId, move.card) : false
