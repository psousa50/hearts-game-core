import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as mcts from "./AI/mcts"
import { buildEnvironment } from "./Environment/domain"
import { Environment } from "./Environment/model"
import { PlayerEvent, PlayerEventType } from "./Events/model"
import * as Game from "./Game/domain"
import { GameStage } from "./Game/model"
import * as Move from "./Moves/domain"
import * as MoveModels from "./Moves/model"
import * as Player from "./Players/domain"
import * as PlayerModel from "./Players/model"
import { actionOf, GameAction, getEitherRight } from "./utils/actions"

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

const mctsMove = (event: PlayerEvent) => mcts.findBestMove(event.gameState, event.playerState, { timeLimitMs: 500 })

type PlayFunction = (event: PlayerEvent) => MoveModels.Move | undefined
type PlayFunctions = {
  [k: string]: PlayFunction
}

const play: PlayFunctions = {
  [PlayerType.Random]: randomMove,
  [PlayerType.MCTS]: mctsMove,
}

const p0 = Player.create("p0", "Player 0", PlayerType.Random)
const p1 = Player.create("p1", "Player 1", PlayerType.Random)
const p2 = Player.create("p2", "Player 2", PlayerType.Random)
const p3 = Player.create("p3", "Player 3", PlayerType.MCTS)
const players = [p0, p1, p2, p3]

const playerEventDispatcher = (_: PlayerModel.PlayerId, event: PlayerEvent) => {
  switch (event.type) {
    case PlayerEventType.Play:
      return play[event.playerState.type](event)
      break
  }
  return undefined
}

const environment: Environment = buildEnvironment({
  config: {
    auto: false,
  },
  playerEventDispatcher,
})

const gameLoop: GameAction = game =>
  game.stage === GameStage.Ended
    ? actionOf(game)
    : pipe(actionOf(game), chain(Game.nextPlay), chain(gameLoop))

const simulate = () => {
  const game = getEitherRight(pipe(Game.create(players), chain(Game.start), chain(gameLoop))(environment))

  const scores = game.players.map(p => Game.calcPlayerScore(game, p.id))

  return scores
}

const many = () => {
  const iterations = 10
  const totalScores = [0, 0, 0, 0]

  for (let index = 0; index < iterations; index++) {
    const scores = simulate()
    totalScores[0] += scores[0]
    totalScores[1] += scores[1]
    totalScores[2] += scores[2]
    totalScores[3] += scores[3]
  }

  totalScores.map((score, i) => console.log(i, score, score / iterations))
}

many()
