import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as mcts from "./AI/mcts"
import { defaultEnvironment } from "./Environment/domain"
import { Environment } from "./Environment/model"
import { PlayerEvent, PlayerEventType } from "./Events/model"
import * as Game from "./Game/domain"
import { GameStage } from "./Game/model"
import { getEitherRight } from "./monte-carlo-tree-search/utils/fpts"
import * as Move from "./Moves/domain"
import * as MoveModels from "./Moves/model"
import * as Player from "./Players/domain"
import * as PlayerModel from "./Players/model"
import { actionOf, GameAction } from "./utils/actions"

enum PlayerType {
  Random = "Random",
  MCTS = "MCTS",
}

const randomMove = (event: PlayerEvent) => {
  const validCards = event.playerState.hand.filter(card =>
    Game.isValidMove(event.gameState, event.playerState)(Move.createCardMove(card)),
  )

  return validCards.length > 0
    ? Move.createCardMove(validCards[Math.floor(Math.random() * validCards.length)])
    : undefined
}

const mctsMove = (event: PlayerEvent) => mcts.findBestMove(event.gameState, event.playerState)

type PlayFunction = (event: PlayerEvent) => MoveModels.Move | undefined
type PlayFunctions = {
  [k: string]: PlayFunction
}

const play: PlayFunctions = {
  [PlayerType.Random]: randomMove,
  [PlayerType.MCTS]: mctsMove,
}

const p1 = Player.create("p1", "Player 1", PlayerType.MCTS)
const p2 = Player.create("p2", "Player 2", PlayerType.Random)
const p3 = Player.create("p3", "Player 3", PlayerType.Random)
const p4 = Player.create("p4", "Player 4", PlayerType.Random)
const players = [p1, p2, p3, p4]

const playerEventDispatcher = (_: PlayerModel.PlayerId, event: PlayerEvent) => {
  switch (event.type) {
    case PlayerEventType.Play:
      return play[event.playerState.type](event)
      break
  }
  return undefined
}

const environment: Environment = {
  ...defaultEnvironment,
  playerEventDispatcher,
}

const gameLoop: GameAction = game =>
  game.trickCounter < 1 || game.stage === GameStage.Ended
    ? actionOf(game)
    : pipe(actionOf(game), chain(Game.nextPlay), chain(gameLoop))

const simulate = () => {
  const game = getEitherRight(pipe(Game.create(players), chain(Game.start), chain(gameLoop))(environment))

  // lj("T", game)

  const scores = game.players.map(p => Game.calcPlayerScore(game, p.id))

  console.log("SCORES=====>\n", scores)
}

simulate()
