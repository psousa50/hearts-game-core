import { pipe } from "fp-ts/lib/pipeable"
import { chain, getOrElse } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as CardModel from "../Cards/model"
import * as Deck from "../Deck/domain"
import { buildEnvironment } from "../Environment/domain"
import { Environment } from "../Environment/model"
import { PlayerEvent, PlayerEventType } from "../Events/model"
import * as Game from "../Game/domain"
import * as GameModel from "../Game/model"
import * as MCTS from "../monte-carlo-tree-search/mcts"
import { getEitherRight } from "../monte-carlo-tree-search/utils/fpts"
import * as Move from "../Moves/domain"
import * as MoveModel from "../Moves/model"
import * as Player from "../Players/domain"
import { PlayerId, PlayerPublicState } from "../Players/model"
import { actionOf } from "../utils/actions"
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

const calcNodeValue = (game: GameModel.Game) => 26 - Game.calcPlayerScore(game, game.players[0].id)

const availableMoves = (game: GameModel.Game) => {
  const player = Game.getCurrentPlayer(game)
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

export const findBestMove = (
  gamePublicState: GameModel.GamePublicState,
  playerPublicState: PlayerPublicState,
  options: Options = defaultOptions,
): MoveModel.Move => {
  if (playerPublicState.hand.length === 1) {
    return Move.createCardMove(playerPublicState.hand[0])
  }

  const game = getEitherRight(Game.createFromPublicState(gamePublicState, playerPublicState, [])(environment))

  const cardsOut = [
    ...R.flatten(gamePublicState.tricks.map(t => t.cards)),
    ...gamePublicState.currentTrick.cards,
    ...playerPublicState.hand,
  ]

  const deckCards = Deck.buildComplement(cardsOut, 2, 14)
  const shuffledDeck = Deck.shuffle(Deck.fromCards(deckCards))

  const cardsCount = Math.floor(
    (shuffledDeck.size + gamePublicState.currentTrick.cards.length) / (gamePublicState.playersCount - 1),
  )
  const handsSlice = R.range(0, 4).reduce(
    (acc, playerIndex) => {
      if (playerIndex === gamePublicState.currentPlayerIndex) {
        return {
          ...acc,
          hands: [...acc.hands, []],
        }
      } else {
        const yetToPlay = Game.hasPlayed(game, playerIndex) ? -1 : 0
        const playerCardsCount = cardsCount + yetToPlay
        return {
          hands: [...acc.hands, shuffledDeck.cards.slice(acc.position, acc.position + playerCardsCount)],
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

  const gameWithPlayers = Game.setPlayers(game, players)

  const tree = MCTS.createTree(config)(gameWithPlayers)
  const { node } = MCTS.findBestNode(tree, options.maxIterations)

  return node.move
}
