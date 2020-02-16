import { pipe } from "fp-ts/lib/pipeable"
import { chain, getOrElse } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as CardModel from "../Cards/model"
import * as Deck from "../Deck/domain"
import * as DeckModel from "../Deck/model"
import { buildEnvironment } from "../Environment/domain"
import { Environment } from "../Environment/model"
import { PlayerEvent, PlayerEventType } from "../Events/model"
import * as Game from "../Game/domain"
import * as GameModel from "../Game/model"
import * as MCTS from "../monte-carlo-tree-search/mcts"
import * as Move from "../Moves/domain"
import * as MoveModel from "../Moves/model"
import * as Player from "../Players/domain"
import * as PlayerModel from "../Players/model"
import { actionOf, getEitherRight } from "../utils/actions"
import { randomElement } from "../utils/misc"

const defaultOptions = {
  timeLimitMs: 500,
}

const randomMove = (event: PlayerEvent) => {
  const validCards = event.playerState.hand.filter(card =>
    Game.isValidMove(event.gameState, event.playerState)(Move.createCardMove(card)),
  )

  return validCards.length > 0
    ? Move.createCardMove(validCards[Math.floor(Math.random() * validCards.length)])
    : undefined
}

const playerEventDispatcher = (_: PlayerModel.PlayerId, event: PlayerEvent) => {
  switch (event.type) {
    case PlayerEventType.Play:
      return randomMove(event)
  }

  return undefined
}

const environment: Environment = buildEnvironment({
  config: {
    auto: false,
  },
  playerEventDispatcher,
})

const calcScore = (game: GameModel.Game) => (player: PlayerModel.Player) => {
  const score = Game.calcPlayerScore(game, player.id)
  return (26 - score) / 26
}

const calcScores = (game: GameModel.Game) =>
  game.players.map(calcScore(game))

const availableMoves = (game: GameModel.Game) => {
  const player = Game.getCurrentPlayer(game)
  const moves = player.hand.map(Move.createCardMove)
  const valid = moves.filter(Game.isValidMove(game, player))

  return valid
}

const availableMovesForPlayer = (game: GameModel.GamePublicState, player: PlayerModel.PlayerPublicState) => {
  const moves = player.hand.map(Move.createCardMove)
  return moves.filter(Game.isValidMove(game, player))
}

const isFinal = (game: GameModel.Game) =>
  game.players.reduce((totalCardsInHands, player) => totalCardsInHands + player.hand.length, 0) === 0

const nextMove = (game: GameModel.Game) => randomElement(availableMoves(game))

const nextState = (game: GameModel.Game, move: MoveModel.Move) => {
  return pipe(
    actionOf(game),
    chain(Game.played(Game.getCurrentPlayer(game).id, move)),
    getOrElse(e => {
      throw e
    }),
  )(environment)
}

const gameRules: MCTS.GameRules<GameModel.Game, MoveModel.Move> = {
  availableMoves,
  currentPlayerIndex: state => state.currentPlayerIndex,
  isFinal,
  nextMove,
  nextState,
  playersCount: state => state.playersCount,
}

const config: MCTS.Config<GameModel.Game, MoveModel.Move> = {
  calcScores,
  calcUct: MCTS.defaultUctFormula(),
  gameRules,
}

export const createGameForSimulation = (shuffle: (deck: DeckModel.Deck) => DeckModel.Deck) => (
  gamePublicState: GameModel.GamePublicState,
  playerPublicState: PlayerModel.PlayerPublicState,
) => {
  const game = getEitherRight(Game.createFromPublicState(gamePublicState, playerPublicState, [])(environment))
  const { deckInfo, playersCount, trickCounter } = gamePublicState

  const playedCards = [...R.flatten(gamePublicState.tricks.map(t => t.cards)), ...gamePublicState.currentTrick.cards]

  const cardsOut = [...playedCards, ...playerPublicState.hand]

  const deck = Deck.buildComplement(cardsOut, deckInfo.minFaceValue, deckInfo.maxFaceValue)
  const cardsToDistribute = shuffle(Deck.fromCards(deck))

  const cardsCountPerPlayer = (deckInfo.size - trickCounter * playersCount) / playersCount

  const handsSlice = R.range(0, game.playersCount).reduce(
    (acc, playerIndex) => {
      if (playerIndex === gamePublicState.currentPlayerIndex) {
        return {
          ...acc,
          hands: [...acc.hands, []],
        }
      } else {
        const alreadyPlayedAdjustment = Game.hasPlayed(game, playerIndex) ? -1 : 0
        const playerCardsCount = cardsCountPerPlayer + alreadyPlayedAdjustment
        return {
          hands: [...acc.hands, cardsToDistribute.cards.slice(acc.position, acc.position + playerCardsCount)],
          position: acc.position + playerCardsCount,
        }
      }
    },
    { position: 0, hands: [] as CardModel.Card[][] },
  )

  const players = R.range(0, 4).map(i =>
    i === gamePublicState.currentPlayerIndex
      ? Player.createFromPublicState(playerPublicState)
      : Player.create(`id${i}`, `PlayerX ${i}`, "", handsSlice.hands[i]),
  )

  return { ...Game.setPlayers(game, players), deck: cardsToDistribute }
}

const simulateGame = (
  gamePublicState: GameModel.GamePublicState,
  playerPublicState: PlayerModel.PlayerPublicState,
  options: MCTS.Options,
) => {
  const game = createGameForSimulation(Deck.shuffle)(gamePublicState, playerPublicState)

  const tree = MCTS.createTree(config)(game, gamePublicState.currentPlayerIndex)

  const { bestNode } = MCTS.findBestNode(tree, options)

  return bestNode.move as MoveModel.Move
}

export const findBestMove = (
  gamePublicState: GameModel.GamePublicState,
  playerPublicState: PlayerModel.PlayerPublicState,
  options: MCTS.Options = defaultOptions,
): MoveModel.Move => {

  const moves = availableMovesForPlayer(gamePublicState, playerPublicState)

  const bm = moves.length === 1 ? moves[0] : simulateGame(gamePublicState, playerPublicState, options)

  // console.log("BEST MOVE=====>\n", Card.toSymbol((bm as any).card))

  return bm
}
