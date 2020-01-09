import { pipe } from "ramda"
import * as Card from "../../src/Cards/domain"
import { Suit } from "../../src/Cards/model"
import * as Game from "../../src/Game/domain"
import { GameState, Move, MoveType, PlayerEvent } from "../../src/Game/model"
import * as Player from "../../src/Players/domain"

describe("game", () => {
  describe("On Start", () => {
    it("calls 'Started' on every player", () => {
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = Game.create([p1, p2])
      expect(game.state).toBe(GameState.Idle)

      const dispatcher = jest.fn()
      Game.start(dispatcher)(game)

      expect(dispatcher).toHaveBeenCalledWith(p1, PlayerEvent.GameStarted, expect.anything())
      expect(dispatcher).toHaveBeenCalledWith(p2, PlayerEvent.GameStarted, expect.anything())
    })

    it("calls 'Play' on first player", () => {
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = Game.create([p1, p2])
      expect(game.state).toBe(GameState.Idle)

      const dispatcher = jest.fn()
      Game.start(dispatcher)(game)

      expect(dispatcher).toHaveBeenCalledWith(p1, PlayerEvent.Play, expect.anything())
    })

    it("should have status 'Playing", () => {
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = Game.create([p1, p2])

      const dispatcher = jest.fn()
      const gameStarted = Game.start(dispatcher)(game)

      expect(gameStarted.state).toBe(GameState.Playing)
    })
  })

  describe("While playing", () => {
    const p1 = Player.create("Player 1")
    const p2 = Player.create("Player 2")

    const move: Move = {
      card: Card.create(Suit.Clubs, 12),
      type: MoveType.Card,
    }

    describe("After first move", () => {
      const gameAfterFirstMove = () => {
        const game = Game.create([p1, p2])

        return Game.played(p1, move)(Game.start()(game))
      }

      it("should add player card move to current trick", () => {
        expect(gameAfterFirstMove().currentTrick).toEqual([move.card])
      })

      it("should move to next player", () => {
        expect(Game.currentPlayer(gameAfterFirstMove())).toEqual(p2)
      })
    })

    // it("should finish the trick after all players played", () => {
    //   const dispatcher = jest.fn()
    //   const startGame = pipe(Game.start(dispatcher), Game.played(p1, move), Game.played(p2, move))
    //   const game = Game.create([p1, p2])
    //   const trickFinishedGame = startGame(game)

    //   expect(dispatcher).toHaveBeenCalledWith(p1, PlayerEvent.TrickFinished, expect.anything())
    // })
  })
})
