import { pipe } from "fp-ts/lib/pipeable"
import { chain, getOrElse } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import { defaultEnvironment } from "../Environment/domain"
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

const playerEventDispatcher = (_: PlayerId, event: PlayerEvent) => {
  switch (event.type) {
    case PlayerEventType.Play:
      return findBestMove(event.gameState, event.playerState)
  }

  return undefined
}

const environment: Environment = {
  ...defaultEnvironment,
  config: {
    ...defaultEnvironment.dealer,
    auto: false,
  },
  playerEventDispatcher,
}

const calcNodeValue = (state: GameModel.Game) => state.currentTrick.cards.length

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
): MoveModel.Move => {
  const players = R.range(0, 4).map(i =>
    i === gamePublicState.currentPlayerIndex
      ? Player.createFromPublicState(playerPublicState)
      : Player.create(`id${i}`, `Player ${i}`),
  )

  const game = getEitherRight(Game.createFromPublicState(gamePublicState, playerPublicState, players)(environment))

  const tree = MCTS.createTree(config)(game)
  const { node } = MCTS.findBestNode(tree, 1)

  console.log("bestmove", node.move)

  return node.move
}
