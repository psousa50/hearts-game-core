import { pipe } from "fp-ts/lib/pipeable"
import { chain, getOrElse } from "fp-ts/lib/ReaderEither"
import { defaultEnvironment } from "../Environment/domain"
import { Environment } from "../Environment/model"
import { PlayerEvent, PlayerEventType } from "../Events/model"
import * as Game from "../Game/domain"
import * as GameModel from "../Game/model"
import * as MCTS from "../monte-carlo-tree-search/mcts"
import * as Move from "../Moves/domain"
import * as MoveModel from "../Moves/model"
import { PlayerId } from "../Players/model"
import { actionOf } from "../utils/actions"
import { randomElement } from "../utils/misc"

const playerEventDispatcher = (_: PlayerId, event: PlayerEvent) => {
  switch (event.type) {
    case PlayerEventType.Play:
      return findBestMove(event.gameState)
  }

  return undefined
}

const environment: Environment = {
  ...defaultEnvironment,
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

const findBestMove = (game: GameModel.GamePublicState): MoveModel.Move => {

  const tree = MCTS.createTree(config)(game)

  const { node : { move } } = MCTS.findBestNode(tree, 20)

  return move
}
