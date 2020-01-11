import { Either, getOrElse } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as Card from "../../src/Cards/domain"
import { Suit } from "../../src/Cards/model"
import { Environment } from "../../src/Environment/model"
import * as Events from "../../src/Events/domain"
import * as Game from "../../src/Game/domain"
import { GameStage } from "../../src/Game/model"
import * as Move from "../../src/Moves/domain"
import * as MoveModels from "../../src/Moves/model"
import * as Player from "../../src/Players/domain"
import { DeepPartial } from "../../src/utils/types"

const getRight = <L, A>(fa: Either<L, A>) =>
  pipe(
    fa,
    getOrElse<L, A>(e => {
      throw new Error(`Should be Right${JSON.stringify(e)}`)
    }),
  )

describe("game", () => {
  const getEnvironment = (overrides: DeepPartial<Environment> = {}) => {
    const defaultEnvironment = {
      dealer: {
        createDeck: jest.fn(),
        distributeCards: jest.fn(() => ({ deck: [], cards: [] })),
        shuffleDeck: jest.fn(),
      },
      playerEventDispatcher: jest.fn(),
    }

    return R.mergeDeepRight(defaultEnvironment, overrides)
  }

  const firstPlayer = Player.create("id1", "Player 1")
  const secondPlayer = Player.create("id2", "Player 2")
  const twoPlayers = [firstPlayer, secondPlayer]

  describe("On Creation", () => {
    it("creates a new game with a new Deck, on Idle status", () => {
      const newDeck = { some: "Deck" } as any
      const environment = getEnvironment({
        dealer: { createDeck: jest.fn(() => newDeck) },
      })
      const game = getRight(Game.create([])(environment))

      expect(game.stage).toEqual(GameStage.Idle)
      expect(game.deck).toBe(newDeck)
    })
  })

  describe("On Start", () => {
    it("shuffles the deck", () => {
      const shuffledDeck = { some: "Deck" } as any
      const environment = getEnvironment({
        dealer: { shuffleDeck: jest.fn(() => shuffledDeck) },
      })
      const newGame = getRight(Game.create(twoPlayers)(environment))
      const startedGame = getRight(Game.start(newGame)(environment))

      expect(environment.dealer.shuffleDeck).toHaveBeenCalledWith(newGame.deck)
    })

    it("starts 'Playing'", () => {
      const startedGame = getRight(pipe(Game.create(twoPlayers), chain(Game.start))(getEnvironment()))

      expect(startedGame.stage).toEqual(GameStage.Playing)
    })

    it("calls 'Started' on every player", () => {
      const shuffledDeck = { some: "Deck" } as any
      const player1Cards = { player1: "cards" } as any
      const player2Cards = { player2: "cards" } as any
      const environment = getEnvironment({
        dealer: {
          distributeCards: jest
            .fn()
            .mockImplementationOnce(() => ({ deck: [], cards: player1Cards }))
            .mockImplementationOnce(() => ({ deck: [], cards: player2Cards })),
          shuffleDeck: jest.fn(() => shuffledDeck),
        },
      })

      pipe(Game.create(twoPlayers), chain(Game.start))(environment)

      const dispatcher = environment.playerEventDispatcher
      expect(dispatcher).toHaveBeenCalledWith(firstPlayer.id, Events.createPlayerEventGameStarted(player1Cards))
      expect(dispatcher).toHaveBeenCalledWith(secondPlayer.id, Events.createPlayerEventGameStarted(player2Cards))
    })

    it("calls 'Play' on first player", () => {
      const environment = getEnvironment()
      pipe(Game.create(twoPlayers), chain(Game.start))(environment)

      expect(environment.playerEventDispatcher).toHaveBeenCalledWith(firstPlayer.id, Events.createPlayerEventPlay())
    })

    describe("While playing", () => {
      describe("After first move", () => {
        const gameAfterFirstMove = (move: MoveModels.Move) => {
          const environment = getEnvironment()
          const game = Game.create(twoPlayers)

          return pipe(game, chain(Game.start), chain(Game.played(firstPlayer.id, move)))(environment)
        }

        it("should add player card move to current trick", () => {
          const move = Move.createCardMove(Card.create(Suit.Clubs, 2))
          const game = getRight(gameAfterFirstMove(move))
          expect(game.currentTrick).toEqual([move.card])
        })

        it("should move to next player", () => {
          const move = { some: "move" } as any
          const game = getRight(gameAfterFirstMove(move))
          expect(Game.currentPlayer(game).id).toBe(firstPlayer.id)
        })
      })

      describe("When trick finishes", () => {
        const fourPlayers = [
          Player.create("id1", "Player 1"),
          Player.create("id2", "Player 2"),
          Player.create("id3", "Player 3"),
          Player.create("id4", "Player 4"),
        ]

        const moves = [
          Move.createCardMove(Card.create(Suit.Clubs, 5)),
          Move.createCardMove(Card.create(Suit.Clubs, 3)),
          Move.createCardMove(Card.create(Suit.Clubs, 8)),
          Move.createCardMove(Card.create(Suit.Hearts, 10)),
        ]

        const getTrickFinishedGame = (environment: Environment) => {
          const game = Game.create(fourPlayers)

          return getRight(
            pipe(
              game,
              chain(Game.start),
              chain(Game.played(fourPlayers[0].id, moves[0])),
              chain(Game.played(fourPlayers[1].id, moves[1])),
              chain(Game.played(fourPlayers[2].id, moves[2])),
              chain(Game.played(fourPlayers[3].id, moves[3])),
            )(environment),
          )
        }

        it("calls 'TrickFinished' on every player", () => {
          const environment = getEnvironment()
          const dispatcher = environment.playerEventDispatcher
          getTrickFinishedGame(environment)

          const trick = moves.map(m => m.card)
          const event = Events.createPlayerEventTrickFinished(trick)
          expect(dispatcher).toHaveBeenCalledWith(fourPlayers[0].id, event)
          expect(dispatcher).toHaveBeenCalledWith(fourPlayers[1].id, event)
          expect(dispatcher).toHaveBeenCalledWith(fourPlayers[2].id, event)
          expect(dispatcher).toHaveBeenCalledWith(fourPlayers[3].id, event)
        })

        it("clears current trick", () => {
          const environment = getEnvironment()
          const trickFinishedGame = getTrickFinishedGame(environment)

          expect(trickFinishedGame.currentTrick).toEqual([])
        })

        it("set's the current player to the winning player", () => {
          const environment = getEnvironment()
          const trickFinishedGame = getTrickFinishedGame(environment)

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
})
