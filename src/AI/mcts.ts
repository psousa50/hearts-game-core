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
import { PlayerId, PlayerPublicState } from "../Players/model"
import { actionOf, getEitherRight } from "../utils/actions"
import { randomElement } from "../utils/misc"

interface Options {
  maxIterations: number
}

const defaultOptions = {
  maxIterations: 500,
}

const randomMove = (event: PlayerEvent) => {
  const validCards = event.playerState.hand.filter(card =>
    Game.isValidMove(event.gameState, event.playerState)(Move.createCardMove(card)),
  )

  return validCards.length > 0
    ? Move.createCardMove(validCards[Math.floor(Math.random() * validCards.length)])
    : undefined
}

const playerEventDispatcher = (_: PlayerId, event: PlayerEvent) => {
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

interface GameInfo {
  playerIndex: number
}
const calcNodeValue = (game: GameModel.Game, { playerIndex }: GameInfo) =>
  26 - Game.calcPlayerScore(game, game.players[playerIndex].id)

const availableMoves = (game: GameModel.Game) => {
  const player = Game.getCurrentPlayer(game)
  const moves = player.hand.map(Move.createCardMove)
  return moves.filter(Game.isValidMove(game, player))
}

const availableMovesForPlayer = (game: GameModel.GamePublicState, player: PlayerPublicState) => {
  const moves = player.hand.map(Move.createCardMove)
  return moves.filter(Game.isValidMove(game, player))
}

const isFinal = (game: GameModel.Game) =>
  game.players.reduce((totalCards, player) => totalCards + player.hand.length, 0) === 0

const nextMove = (game: GameModel.Game) => randomElement(availableMoves(game))

const nextState = (game: GameModel.Game, move: MoveModel.Move) =>
  pipe(
    actionOf(game),
    chain(Game.played(Game.getCurrentPlayer(game).id, move)),
    getOrElse(() => () => game),
  )(environment)

const strategy: MCTS.Strategy<GameModel.Game, MoveModel.Move> = {
  availableMoves,
  calcValue: calcNodeValue,
  isFinal,
  nextMove,
  nextState,
}

const config: MCTS.Config<GameModel.Game, MoveModel.Move> = {
  calcUcb: MCTS.defaultUcbFormula(),
  strategy,
}

export const createGameForSimulation = (shuffle: (deck: DeckModel.Deck) => DeckModel.Deck) => (
  gamePublicState: GameModel.GamePublicState,
  playerPublicState: PlayerPublicState,
) => {
  const game = getEitherRight(Game.createFromPublicState(gamePublicState, playerPublicState, [])(environment))
  const { deckInfo, playersCount, trickCounter } = gamePublicState

  const playedCards = [...R.flatten(gamePublicState.tricks.map(t => t.cards)), ...gamePublicState.currentTrick.cards]

  const cardsOut = [...playedCards, ...playerPublicState.hand]

  const deck = Deck.buildComplement(cardsOut, deckInfo.minFaceValue, deckInfo.maxFaceValue)
  const cardsToDistribute = shuffle(Deck.fromCards(deck))

  // console.log(
  //   "CO =====>\n",
  //   "TRICKS", Card.toList(R.flatten(gamePublicState.tricks.map(t => t.cards))),
  //   R.flatten(gamePublicState.tricks.map(t => t.cards)).length,
  //   "\n",
  //   "TRICK", Card.toList(gamePublicState.currentTrick.cards),
  //   "\n",
  //   "HAND", Card.toList(playerPublicState.hand),
  //   "\n",
  //   "CO", Card.toList(cardsOut),
  //   cardsOut.length, "\n",
  //   "DIST", Card.toList(cardsToDistribute.cards),
  //   cardsToDistribute.cards.length,
  // )

  // console.log(
  //   "FIND=====>\n",
  //   Card.toList(gamePublicState.currentTrick.cards),
  //   gamePublicState.currentTrick.firstPlayerIndex,
  //   gamePublicState.currentPlayerIndex,
  //   gamePublicState.trickCounter,
  //   R.flatten(gamePublicState.tricks.map(t => t.cards)).length,
  // )

  const cardsCountPerPlayer = (deckInfo.size - trickCounter * playersCount) / playersCount

  const handsSlice = R.range(0, 4).reduce(
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

  // console.log("0 =====>\n", Card.toList(players[0].hand), players[0].hand.length)
  // console.log("1 =====>\n", Card.toList(players[1].hand), players[1].hand.length)
  // console.log("2 =====>\n", Card.toList(players[2].hand), players[2].hand.length)
  // console.log("3 =====>\n", Card.toList(players[3].hand), players[3].hand.length)

  // console.log("currentTrick=====>\n", game.currentTrick)
  // console.log("currentPlayerIndex=====>\n", game.currentPlayerIndex)

  return { ...Game.setPlayers(game, players), deck: cardsToDistribute }
}

const simulateGame = (
  gamePublicState: GameModel.GamePublicState,
  playerPublicState: PlayerPublicState,
  options: Options,
) => {
  const game = createGameForSimulation(Deck.shuffle)(gamePublicState, playerPublicState)

  const tree = MCTS.createTree(config)(game, { playerIndex: gamePublicState.currentPlayerIndex })
  const { node } = MCTS.findBestNode(tree, options.maxIterations)

  return node.move as MoveModel.Move
}

export const findBestMove = (
  gamePublicState: GameModel.GamePublicState,
  playerPublicState: PlayerPublicState,
  options: Options = defaultOptions,
): MoveModel.Move => {
  const moves = availableMovesForPlayer(gamePublicState, playerPublicState)

  const bm = moves.length === 1 ? moves[0] : simulateGame(gamePublicState, playerPublicState, options)

  // console.log("BEST MOVE=====>\n", Card.toSymbol((bm as any).card))

  return bm
}
