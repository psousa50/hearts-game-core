import { Either, getOrElse } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as Card from "../../src/Cards/domain"
import { Suit } from "../../src/Cards/model"
import * as Game from "../../src/Game/domain"
import { GameState, Move, MoveType, PlayerEvent } from "../../src/Game/model"
import * as Player from "../../src/Players/domain"

const getRight = <L, A>(fa: Either<L, A>) =>
  pipe(
    fa,
    getOrElse<L, A>(() => {
      throw new Error("get called on Left")
    }),
  )

describe("game", () => {
  const playerEventDispatcher = jest.fn()
  const environment = {
    playerEventDispatcher,
  }

  describe("On Start", () => {
    it("calls 'Started' on every player", () => {
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = getRight(Game.create([p1, p2])(environment))

      expect(game.state).toBe(GameState.Idle)

      Game.start(game)(environment)

      expect(playerEventDispatcher).toHaveBeenCalledWith(p1, PlayerEvent.GameStarted, expect.anything())
      expect(playerEventDispatcher).toHaveBeenCalledWith(p2, PlayerEvent.GameStarted, expect.anything())
    })

    it("calls 'Play' on first player", () => {
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = getRight(Game.create([p1, p2])(environment))
      expect(game.state).toBe(GameState.Idle)

      Game.start(game)(environment)

      expect(playerEventDispatcher).toHaveBeenCalledWith(p1, PlayerEvent.Play, expect.anything())
    })

    it("should have status 'Playing", () => {
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = getRight(Game.create([p1, p2])(environment))

      const gameStarted = getRight(Game.start(game)(environment))

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

        return pipe(game, chain(Game.start), chain(Game.played(p1, move)))(environment)
      }

      it("should add player card move to current trick", () => {
        const game = getRight(gameAfterFirstMove())
        expect(game.currentTrick).toEqual([move.card])
      })

      it("should move to next player", () => {
        const game = getRight(gameAfterFirstMove())
        expect(Game.currentPlayer(game)).toEqual(p2)
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
