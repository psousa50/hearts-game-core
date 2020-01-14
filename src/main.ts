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
import { CardMove } from "./Moves/model"
import * as Player from "./Players/domain"
import { PlayerId } from "./Players/model"
import { actionOf, GameAction } from "./utils/actions"

let gameEvent: GameEvent | null = null

export const playerEventDispatcher = (playerId: PlayerId, event: PlayerEvent) => {
  // console.log("Player ID => ", playerId, event.type)

  switch (event.type) {
    case PlayerEventType.TrickFinished:
      if (playerId === "id1") {
        console.log(event.type, event.gameState.currentTrick)
      }
      break
    case PlayerEventType.Play:
      const validCards = event.playerState.hand.filter(card =>
        Game.isValidMove(event.gameState, event.playerState, Move.createCardMove(card)),
      )
      if (validCards.length > 0) {
        const move = Move.createCardMove(validCards[0])
        gameEvent = Events.createGameEventPlayerPlayed(playerId, move)
      } else {
        console.log("NO VALID MOVE\n")
        console.log("P=====>\n", JSON.stringify(event.playerState, null, 2))
        console.log("=====>\n", JSON.stringify(event.gameState, null, 2))
        throw new Error("NO VALID MOVE")
      }
      break
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
    if (gameEvent) {
      switch (gameEvent.type) {
        case GameEventType.PlayerPlayed:
          console.log(`Player ${gameEvent.playerId} played ${JSON.stringify((gameEvent.move as CardMove).card, null, 2)}`)
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
