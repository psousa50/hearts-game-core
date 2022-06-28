import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as Card from "../Cards/domain"
import * as CardModel from "../Cards/model"
import * as Events from "../Events/domain"
import { PlayerEvent } from "../Events/model"
import { Move, MoveType } from "../Moves/model"
import * as Player from "../Players/domain"
import * as PlayerModel from "../Players/model"
import * as Trick from "../Tricks/domain"
import { actionErrorOf, actionOf, ask, GameAction, GameResult } from "../utils/actions"
import { Game, GameErrorType, GamePublicState, GameStage } from "./model"

const nextPlayer = (game: Game) => (game.currentPlayerIndex + 1) % game.players.length
const isCurrentPlayer = (game: Game, playerId: PlayerModel.PlayerId) =>
  game.players[game.currentPlayerIndex].id === playerId

const gameError = (type: GameErrorType) => ({
  type,
})
const gameErrorOf = (type: GameErrorType) => actionErrorOf<Game>(gameError(type))

const twoOfClubs = Card.create(CardModel.Suit.Clubs, 2)

export const findWinningTrickPlayerIndex = (game: Game) => {
  const firstCard = Trick.firstCard(game.currentTrick)
  const sameSuit = game.currentTrick.cards.filter((c) => c.suit === firstCard.suit)
  const highestCard = R.reduce(
    R.max,
    0,
    sameSuit.map((c) => c.faceValue),
  )
  const i = game.currentTrick.cards.findIndex((c) => c.faceValue === highestCard && c.suit === firstCard.suit)
  return (i + game.currentPlayerIndex) % game.players.length
}

const sendEventToAllPlayers =
  (eventCreator: (player: PlayerModel.Player) => PlayerEvent): GameAction =>
  (game) =>
    pipe(
      ask(),
      chain(({ playerEventDispatcher }) => {
        game.players.forEach((player) => playerEventDispatcher(player.id, eventCreator(player)))
        return actionOf(game)
      }),
    )

const sendPlayToCurrentPlayerIfAuto: GameAction = (game) =>
  pipe(
    ask(),
    chain(({ config }) => (config.auto ? nextPlay(game) : actionOf(game))),
  )

export const create = (players: PlayerModel.Player[]): GameResult =>
  pipe(
    ask(),
    chain(({ dealer }) => {
      const deck = dealer.createDeck()
      const game = {
        currentPlayerIndex: 0,
        currentTrick: Trick.createTrick(),
        deck,
        deckInfo: deck,
        heartsBroken: false,
        lastTrick: Trick.createTrick(),
        players: [],
        playersCount: 0,
        stage: GameStage.Idle,
        trickCounter: 0,
        tricks: [],
      }
      return actionOf(setPlayers(game, players))
    }),
  )

export const createFromPublicState = (
  gamePublicState: GamePublicState,
  playerPublicState: PlayerModel.PlayerPublicState,
  players: PlayerModel.Player[],
) =>
  pipe(
    ask(),
    chain(({ dealer }) => {
      const deck = dealer.createDeck()
      return actionOf({
        ...gamePublicState,
        deck,
        players: replacePlayer(players, playerPublicState.id, (_) => Player.createFromPublicState(playerPublicState)),
      })
    }),
  )

export const getCurrentPlayer = (game: Game) => game.players[game.currentPlayerIndex]

export const getPlayerIndex = (game: Game, playerId: PlayerModel.PlayerId) =>
  game.players.findIndex((p) => p.id === playerId)

export const hasPlayed = (game: Game, playerIndex: number) =>
  (playerIndex - game.currentTrick.firstPlayerIndex + 4) % 4 < game.currentTrick.cards.length

export const start: GameAction = (game) =>
  pipe(
    ask(),
    chain(({ dealer }) => {
      const shuffledDeck = dealer.shuffleDeck(game.deck)
      const distributedCards = R.range(1, game.players.length + 1).reduce(
        (hands) => {
          const distributed = dealer.distributeCards(hands.deck, game.deck.size / game.players.length)
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

      const currentPlayerIndex = Math.max(
        players.findIndex((p) => p.hand.some((c) => Card.equals(c, twoOfClubs))),
        0,
      )

      const nextGame = {
        ...game,
        currentPlayerIndex,
        deck: distributedCards.deck,
        players,
        stage: GameStage.Playing,
      }

      return pipe(
        actionOf(nextGame),
        chain(sendEventToAllPlayers((player) => Events.createPlayerEventGameStarted(player, nextGame))),
        chain(sendPlayToCurrentPlayerIfAuto),
      )
    }),
  )

export const setPlayers = (game: Game, players: PlayerModel.Player[]) => ({
  ...game,
  players,
  playersCount: players.length,
})

export const nextPlay: GameAction = (game) =>
  game.stage === GameStage.Playing
    ? pipe(
        ask(),
        chain(({ playerEventDispatcher }) => {
          const currentPlayer = getCurrentPlayer(game)
          const move = playerEventDispatcher(currentPlayer.id, Events.createPlayerEventPlay(currentPlayer, game))
          return move ? doPlayerMove(currentPlayer, move)(game) : actionOf(game)
        }),
      )
    : actionOf(game)

const removeCardFromHand = (card: CardModel.Card) => (player: PlayerModel.Player) => ({
  ...player,
  hand: player.hand.filter((c) => !Card.equals(c, card)),
})

const replacePlayer = (
  players: readonly PlayerModel.Player[],
  playerId: PlayerModel.PlayerId,
  replaceFn: (player: PlayerModel.Player) => PlayerModel.Player,
) => players.map((p) => (p.id === playerId ? replaceFn(p) : p))

const doPlayerCardMove =
  (playerId: PlayerModel.PlayerId, card: CardModel.Card): GameAction =>
  (game) =>
    actionOf({
      ...game,
      currentPlayerIndex: nextPlayer(game),
      currentTrick: Trick.addCard(game.currentTrick, card, getPlayerIndex(game, playerId)),
      heartsBroken: game.heartsBroken || card.suit === CardModel.Suit.Hearts,
      players: replacePlayer(game.players, playerId, removeCardFromHand(card)),
    })

const doTrickFinished: GameAction = (game) => {
  const winningTrickPlayedIndex = findWinningTrickPlayerIndex(game)
  const winningPlayer = game.players[winningTrickPlayedIndex]
  return pipe(
    actionOf({
      ...game,
      currentPlayerIndex: winningTrickPlayedIndex,
      currentTrick: Trick.createTrick(),
      lastTrick: game.currentTrick,
      players: replacePlayer(game.players, winningPlayer.id, (p) => ({
        ...p,
        tricks: [...p.tricks, game.currentTrick],
      })),
      trickCounter: game.trickCounter + 1,
      tricks: [...game.tricks, game.currentTrick],
    }),
    chain(sendEventToAllPlayers((player) => Events.createPlayerEventTrickFinished(player, game))),
  )
}

const checkTrickFinished: GameAction = (game) =>
  game.currentTrick.cards.length === game.players.length ? doTrickFinished(game) : actionOf(game)

const doEndOfGame: GameAction = (game) =>
  pipe(
    actionOf({
      ...game,
      stage: GameStage.Ended,
    }),
    chain((newGame) => sendEventToAllPlayers((player) => Events.createPlayerEventGameEnded(player, newGame))(newGame)),
  )

const checkEndOfGame: GameAction = (game) =>
  game.trickCounter === game.deck.size / game.players.length ? doEndOfGame(game) : actionOf(game)

const dispatchPlayerMove =
  (playerId: PlayerModel.PlayerId, move: Move): GameAction =>
  (game) =>
    move.type === MoveType.Card ? doPlayerCardMove(playerId, move.card)(game) : actionOf(game)

const doPlayerMove =
  (player: PlayerModel.Player, move: Move): GameAction =>
  (game) =>
    pipe(
      ask(),
      chain(({ validateMove }) =>
        validateMove(game, player)(move)
          ? pipe(
              actionOf(game),
              chain(sendEventToAllPlayers((p) => Events.createPlayerEventPlayerPlayed(p, game, player, move))),
              chain(dispatchPlayerMove(player.id, move)),
            )
          : gameErrorOf(GameErrorType.InvalidMove),
      ),
      chain(checkTrickFinished),
      chain(checkEndOfGame),
      chain(sendPlayToCurrentPlayerIfAuto),
    )

const getPlayer = (game: Game, playerId: PlayerModel.PlayerId) => game.players.find((p) => p.id === playerId)

export const played =
  (playerId: PlayerModel.PlayerId, move: Move): GameAction =>
  (game) =>
    isCurrentPlayer(game, playerId)
      ? doPlayerMove(getPlayer(game, playerId)!, move)(game)
      : gameErrorOf(GameErrorType.InvalidPlayer)

const isValidCardMove = (
  gameState: GamePublicState,
  playerState: PlayerModel.PlayerPublicState,
  card: CardModel.Card,
) => {
  const { currentTrick: trick } = gameState
  const isFirstCard = gameState.trickCounter === 0 && Trick.isEmpty(trick)
  const trickSuit = Trick.suit(trick)

  const firstCardMustBe2OfClubs = () => !isFirstCard || Card.equals(card, twoOfClubs)
  const suitMustBeSameAsFirstCard = () =>
    !trickSuit || card.suit === trickSuit || playerState.hand.every((c) => c.suit !== trickSuit)
  const canPlayHeartsOnlyIfBroken = () =>
    !Card.isHearts(card) || gameState.heartsBroken || playerState.hand.every((c) => c.suit === CardModel.Suit.Hearts)

  return firstCardMustBe2OfClubs() && suitMustBeSameAsFirstCard() && canPlayHeartsOnlyIfBroken()
}

export const isValidMove = (gameState: GamePublicState, playerState: PlayerModel.PlayerPublicState) => (move: Move) =>
  move.type === MoveType.Card ? isValidCardMove(gameState, playerState, move.card) : false

export const calcPlayerScore = (game: Game, playerId: PlayerModel.PlayerId) =>
  getPlayer(game, playerId)!.tricks.reduce((score, trick) => score + Trick.score(trick), 0)
