import { Either, getOrElse } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as Card from "../../src/Cards/domain"
import { Suit } from "../../src/Cards/model"
import * as Game from "../../src/Game/domain"
import { GameState, PlayerEvent } from "../../src/Game/model"
import * as Move from "../../src/Moves/domain"
import * as Player from "../../src/Players/domain"

const getRight = <L, A>(fa: Either<L, A>) =>
  pipe(
    fa,
    getOrElse<L, A>(() => {
      throw new Error("get called on Left")
    }),
  )

describe("game", () => {
  const getEnvironment = () => {
    const dispatcher = jest.fn()
    return {
      dispatcher,
      environment: { playerEventDispatcher: dispatcher },
    }
  }

  describe("On Start", () => {
    it("calls 'Started' on every player", () => {
      const { environment, dispatcher } = getEnvironment()
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = getRight(Game.create([p1, p2])(environment))

      expect(game.state).toBe(GameState.Idle)

      Game.start(game)(environment)

      expect(dispatcher).toHaveBeenCalledWith(p1, PlayerEvent.GameStarted, {}, expect.anything())
      expect(dispatcher).toHaveBeenCalledWith(p2, PlayerEvent.GameStarted, {}, expect.anything())
    })

    it("calls 'Play' on first player", () => {
      const { environment, dispatcher } = getEnvironment()
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = getRight(Game.create([p1, p2])(environment))
      expect(game.state).toBe(GameState.Idle)

      Game.start(game)(environment)

      expect(dispatcher).toHaveBeenCalledWith(p1, PlayerEvent.Play, {}, expect.anything())
    })

    it("should have status 'Playing", () => {
      const { environment } = getEnvironment()
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

    describe("After first move", () => {
      const move = Move.createCardMove(Card.create(Suit.Clubs, 12))

      const gameAfterFirstMove = () => {
        const { environment } = getEnvironment()
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

    it.only("should finish the trick after all players played", () => {
      const { environment, dispatcher } = getEnvironment()
      const game = Game.create([p1, p2])

      const move1 = Move.createCardMove(Card.create(Suit.Clubs, 12))
      const move2 = Move.createCardMove(Card.create(Suit.Spades, 3))
      const trickFinishedGame = pipe(
        game,
        chain(Game.start),
        chain(Game.played(p1, move1)),
        chain(Game.played(p2, move2)),
      )(environment)

      const trick = [move1.card, move2.card]
      expect(dispatcher).toHaveBeenCalledWith(p1, PlayerEvent.TrickFinished, trick, expect.anything())
      expect(dispatcher).toHaveBeenCalledWith(p2, PlayerEvent.TrickFinished, trick, expect.anything())
    })
  })
})
