import { Either, getOrElse } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as Card from "../../src/Cards/domain"
import * as CardModel from "../../src/Cards/model"
import { Suit } from "../../src/Cards/model"
import { Environment } from "../../src/Environment/model"
import * as Events from "../../src/Events/domain"
import * as Game from "../../src/Game/domain"
import * as GameModel from "../../src/Game/model"
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
        createDeck: jest.fn(() => []),
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
      getRight(Game.start(newGame)(environment))

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
      const fourPlayers = [
        Player.create("id1", "Player 1"),
        Player.create("id2", "Player 2"),
        Player.create("id3", "Player 3"),
        Player.create("id4", "Player 4"),
      ]

      describe("After a move", () => {
        const gameAfterFirstMove = (environment: Environment, move: MoveModels.Move) => {
          const game = Game.create(twoPlayers)

          return pipe(game, chain(Game.start), chain(Game.played(firstPlayer.id, move)))(environment)
        }

        it("should remove card from players hand", () => {
          const card1 = Card.create(Suit.Clubs, 5)
          const card2 = Card.create(Suit.Hearts, 7)
          const move = Move.createCardMove(card2)
          const player1Cards = [card1, card2]
          const environment = getEnvironment({
            dealer: {
              distributeCards: jest
                .fn()
                .mockImplementationOnce(() => ({ deck: [], cards: player1Cards }))
                .mockImplementationOnce(() => ({ deck: [], cards: [] })),
            },
          })
          const game = getRight(gameAfterFirstMove(environment, move))

          expect(game.players[0].hand).toEqual([card1])
        })

        it("should add player card move to current trick", () => {
          const environment = getEnvironment()
          const move = Move.createCardMove(Card.create(Suit.Clubs, 2))
          const game = getRight(gameAfterFirstMove(environment, move))

          expect(game.currentTrick).toEqual([move.card])
        })

        it("should call 'PlayerPlayed' on every player", () => {
          const environment = getEnvironment()
          const move = Move.createCardMove(Card.create(Suit.Clubs, 2))
          gameAfterFirstMove(environment, move)

          const dispatcher = environment.playerEventDispatcher
          const event = Events.createPlayerEventPlayerPlayed(move)
          expect(dispatcher).toHaveBeenCalledWith(firstPlayer.id, event)
          expect(dispatcher).toHaveBeenCalledWith(secondPlayer.id, event)
        })

        it("should move to next player", () => {
          const environment = getEnvironment()
          const move = { some: "move" } as any
          const game = getRight(gameAfterFirstMove(environment, move))

          expect(Game.currentPlayer(game).id).toBe(firstPlayer.id)
        })
      })

      describe("When trick finishes", () => {
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
          getTrickFinishedGame(environment)

          const trick = moves.map(m => m.card)
          const event = Events.createPlayerEventTrickFinished(trick)
          const dispatcher = environment.playerEventDispatcher
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

      describe("When game ends", () => {
        it("should call 'GameEnded on every player", () => {
          const someCard = Card.create(Suit.Clubs, 5)
          const move = Move.createCardMove(someCard)
          const playerCards = [someCard, someCard, someCard]
          const environment = getEnvironment({
            dealer: {
              createDeck: () => [someCard, someCard, someCard, someCard],
              distributeCards: jest
                .fn()
                .mockImplementationOnce(() => ({ deck: [], cards: playerCards }))
                .mockImplementationOnce(() => ({ deck: [], cards: playerCards })),
            },
          })
          const finishedGame = getRight(
            pipe(
              Game.create(twoPlayers),
              chain(Game.start),
              chain(Game.played(firstPlayer.id, move)),
              chain(Game.played(secondPlayer.id, move)),
              chain(Game.played(firstPlayer.id, move)),
              chain(Game.played(secondPlayer.id, move)),
            )(environment),
          )

          expect(finishedGame.stage).toEqual(GameStage.Ended)
        })
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

  describe("Moves are", () => {
    const startGame = ({ player2Hand: player2Hand }: { player2Hand: CardModel.Card[] } = { player2Hand: [] }) => {
      const game = getRight(pipe(Game.create(twoPlayers), chain(Game.start))(getEnvironment()))
      const player2 = game.players[1]
      return {
        ...game,
        players: [game.players[0], { ...player2, hand: player2Hand }],
      }
    }

    const playCard = (game: GameModel.Game, card: CardModel.Card) => {
      const move = Move.createCardMove(card)
      return getRight(Game.played(firstPlayer.id, move)(game)(getEnvironment()))
    }

    describe("valid if", () => {
      it("suit is the same as the first card", () => {
        const game = playCard(startGame(), Card.create(Suit.Clubs, 2))
        const validMove = Move.createCardMove(Card.create(Suit.Clubs, 3))

        expect(Game.isValidMove(game, secondPlayer.id, validMove)).toBeTruthy()
      })

      it("suit is different but player has no card of the same suit", () => {
        const firstCard = Card.create(Suit.Hearts, 3)
        const moveCard = Card.create(Suit.Clubs, 3)
        const validMove = Move.createCardMove(moveCard)
        const otherCard = Card.create(Suit.Spades, 3)
        const player2Cards = [moveCard, otherCard]
        const game = playCard(startGame({ player2Hand: player2Cards }), firstCard)

        expect(Game.isValidMove(game, secondPlayer.id, validMove)).toBeTruthy()
      })
    })

    describe("invalid if", () => {
      it("first trick card is not the 2 of clubs", () => {
        const game = startGame()
        const not2OfClubs = Card.create(Suit.Clubs, 3)
        const invalidMove = Move.createCardMove(not2OfClubs)
        expect(Game.isValidMove(game, firstPlayer.id, invalidMove)).toBeFalsy()
      })
    })
  })
})
