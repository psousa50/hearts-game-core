import { map } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as Dealer from "./Dealer/domain"
import { Environment } from "./Environment/model"
import * as Events from "./Events/domain"
import { GameEvent, GameEventType, PlayerEvent, PlayerEventType } from "./Events/model"
import * as Game from "./Game/domain"
import { GameStage } from "./Game/model"
import * as Move from "./Moves/domain"
import * as Player from "./Players/domain"
import { PlayerId } from "./Players/model"
import { actionOf, GameAction } from "./utils/actions"

let gameEvent: GameEvent | null = null

export const playerEventDispatcher = (playerId: PlayerId, event: PlayerEvent) => {
  console.log("Player ID => ", playerId, event.type)

  switch (event.type) {
    case PlayerEventType.Play:
      // const card = event.hand.filter(c => Game.isValidMove(Game.isValidMove()))
      const move = Move.createCardMove(event.hand[0])
      console.log("Player ID=====>\n", playerId)
      console.log("Move=====>\n", move)
      gameEvent = Events.createGameEventPlayerPlayed(playerId, move)
  }
}

export const environment: Environment = {
  dealer: Dealer,
  playerEventDispatcher,
  validateMove: () => true,
}

const gameLoop: GameAction = game => {
  // console.log("GAME=====>\n", JSON.stringify(game, null, 2))
  if (game.stage === GameStage.Ended) {
    return actionOf(game)
  } else {
    console.log("EVENT=====>\n", gameEvent)
    if (gameEvent) {
      switch (gameEvent.type) {
        case GameEventType.PlayerPlayed:
          return pipe(actionOf(game), chain(Game.played(gameEvent.playerId, gameEvent.move)), chain(gameLoop))
      }
    }
    return actionOf(game)
  }
}

export const playGame = () => {
  const p1 = Player.create("id1", "p1")
  const p2 = Player.create("id2", "p2")
  const p3 = Player.create("id3", "p3")
  const p4 = Player.create("id4", "p4")
  const players = [p1, p2, p3, p4]

  const game = Game.create(players)

  return pipe(game, chain(Game.start), chain(gameLoop))(environment)
}

pipe(
  playGame(),
  map(g => {
    console.log("=====>\n", JSON.stringify(g, null, 2))
    return g
  }),
)
