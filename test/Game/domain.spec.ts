import { Either, getOrElse } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as Card from "../../src/Cards/domain"
import { Suit } from "../../src/Cards/model"
import { Environment } from "../../src/Environment/model"
import * as Events from "../../src/Events/domain"
import * as Game from "../../src/Game/domain"
import { GameState } from "../../src/Game/model"
import * as Move from "../../src/Moves/domain"
import * as Player from "../../src/Players/domain"
import { DeepPartial } from "../../src/utils/types"

const getRight = <L, A>(fa: Either<L, A>) =>
  pipe(
    fa,
    getOrElse<L, A>(() => {
      throw new Error("get called on Left")
    }),
  )

describe("game", () => {
  const getEnvironment = (overrides: DeepPartial<Environment> = {}) => {
    const dispatcher = jest.fn()
    const dealer = {
      createDeck: jest.fn(),
      distributeCards: jest.fn(),
      shuffleDeck: jest.fn(),
    }
    const defaultEnvironment = {
      dealer,
      playerEventDispatcher: dispatcher,
    }

    return { dealer, dispatcher, environment: R.mergeDeepRight(defaultEnvironment, overrides) }
  }

  describe("On Creation", () => {
    it("creates a new game with a new Deck", () => {
      const newDeck = { some: "Deck" } as any
      const { environment } = getEnvironment({
        dealer: { createDeck: jest.fn(() => newDeck) },
      })
      const game = getRight(Game.create([])(environment))

      expect(game.state).toBe(GameState.Idle)
      expect(game.deck).toBe(newDeck)
    })
  })

  describe("On Start", () => {
    const twoPlayers = [Player.create("Player 1"), Player.create("Player 2")]

    it("shuffles the deck", () => {
      const shuffledDeck = { some: "Deck" } as any
      const { environment } = getEnvironment({
        dealer: { shuffleDeck: jest.fn(() => shuffledDeck) },
      })
      const game = getRight(pipe(Game.create(twoPlayers), chain(Game.start))(environment))

      expect(game.state).toBe(GameState.Playing)
      expect(game.deck).toBe(shuffledDeck)
    })

    it("calls 'Started' on every player", () => {
      const shuffledDeck = { some: "Deck" } as any
      const player1Cards = { player1: "cards" } as any
      const player2Cards = { player2: "cards" } as any
      const { environment, dispatcher } = getEnvironment({
        dealer: {
          distributeCards: jest
            .fn()
            .mockImplementation(() => player1Cards)
            .mockImplementation(() => player2Cards),
          shuffleDeck: jest.fn(() => shuffledDeck),
        },
      })
      const game = getRight(Game.create(twoPlayers)(environment))

      Game.start(game)(environment)

      expect(dispatcher).toHaveBeenCalledWith(twoPlayers[0], Events.createPlayerEventGameStarted(), expect.anything())
      expect(dispatcher).toHaveBeenCalledWith(twoPlayers[1], Events.createPlayerEventGameStarted(), expect.anything())
    })

    it("calls 'Play' on first player", () => {
      const { environment, dispatcher } = getEnvironment()

      const game = getRight(Game.create(twoPlayers)(environment))
      expect(game.state).toBe(GameState.Idle)

      Game.start(game)(environment)

      expect(dispatcher).toHaveBeenCalledWith(twoPlayers[0], Events.createPlayerEventPlay(), expect.anything())
    })

    it("should have status 'Playing'", () => {
      const { environment } = getEnvironment()

      const game = getRight(Game.create(twoPlayers)(environment))

      const gameStarted = getRight(Game.start(game)(environment))

      expect(gameStarted.state).toBe(GameState.Playing)
    })
  })

  describe("While playing", () => {
    const twoPlayers = [Player.create("Player 1"), Player.create("Player 2")]

    describe("After first move", () => {
      const move = Move.createCardMove(Card.create(Suit.Clubs, 12))

      const gameAfterFirstMove = () => {
        const { environment } = getEnvironment()
        const game = Game.create(twoPlayers)

        return pipe(game, chain(Game.start), chain(Game.played(twoPlayers[0], move)))(environment)
      }

      it("should add player card move to current trick", () => {
        const game = getRight(gameAfterFirstMove())
        expect(game.currentTrick).toEqual([move.card])
      })

      it("should move to next player", () => {
        const game = getRight(gameAfterFirstMove())
        expect(Game.currentPlayer(game)).toEqual(twoPlayers[1])
      })
    })

    describe("When trick finishes", () => {
      const fourPlayers = [
        Player.create("Player 1"),
        Player.create("Player 2"),
        Player.create("Player 3"),
        Player.create("Player 4"),
      ]

      const moves = [
        Move.createCardMove(Card.create(Suit.Clubs, 5)),
        Move.createCardMove(Card.create(Suit.Clubs, 3)),
        Move.createCardMove(Card.create(Suit.Clubs, 8)),
        Move.createCardMove(Card.create(Suit.Hearts, 10)),
      ]

      const getTrickFinishedGame = () => {
        const { environment, dispatcher } = getEnvironment()
        const game = Game.create(fourPlayers)

        return {
          dispatcher,
          trickFinishedGame: getRight(
            pipe(
              game,
              chain(Game.start),
              chain(Game.played(fourPlayers[0], moves[0])),
              chain(Game.played(fourPlayers[1], moves[1])),
              chain(Game.played(fourPlayers[2], moves[2])),
              chain(Game.played(fourPlayers[3], moves[3])),
            )(environment),
          ),
        }
      }

      it("calls 'TrickFinished' on every player", () => {
        const { trickFinishedGame, dispatcher } = getTrickFinishedGame()

        const trick = moves.map(m => m.card)
        const event = Events.createPlayerEventTrickFinished(trick)
        expect(dispatcher).toHaveBeenCalledWith(fourPlayers[0], event, expect.anything())
        expect(dispatcher).toHaveBeenCalledWith(fourPlayers[1], event, expect.anything())
        expect(dispatcher).toHaveBeenCalledWith(fourPlayers[2], event, expect.anything())
        expect(dispatcher).toHaveBeenCalledWith(fourPlayers[3], event, expect.anything())
      })

      it("clears current trick", () => {
        const { trickFinishedGame } = getTrickFinishedGame()

        expect(trickFinishedGame.currentTrick).toEqual([])
      })

      it("set's the current player to the winning trick", () => {
        const { trickFinishedGame } = getTrickFinishedGame()

        expect(trickFinishedGame.currentPlayerIndex).toEqual(2)
      })
    })
  })

  describe("Winning Trick", () => {
    it("is the highest card of the same suit as the first", () => {
      const c0 = Card.create(Suit.Spades, 3)
      const c1 = Card.create(Suit.Diamonds, 5)
      const c2 = Card.create(Suit.Spades, 5)
      const c3 = Card.create(Suit.Spades, 9)
      const trick = [c0, c1, c2, c3]

      expect(Game.findWinningTrickPlayerIndex(trick)).toEqual(3)
    })

    it("is the first if no other has the same suit", () => {
      const c0 = Card.create(Suit.Spades, 3)
      const c1 = Card.create(Suit.Diamonds, 5)
      const c2 = Card.create(Suit.Diamonds, 5)
      const c3 = Card.create(Suit.Clubs, 9)
      const trick = [c0, c1, c2, c3]

      expect(Game.findWinningTrickPlayerIndex(trick)).toEqual(0)
    })
  })
})
