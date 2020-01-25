import { Either, fold, getOrElse, isLeft } from "fp-ts/lib/Either"
import { identity } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as Card from "../../src/Cards/domain"
import * as CardModel from "../../src/Cards/model"
import { Suit } from "../../src/Cards/model"
import * as Dealer from "../../src/Dealer/domain"
import { Environment } from "../../src/Environment/model"
import { PlayerEvent, PlayerEventType } from "../../src/Events/model"
import * as Game from "../../src/Game/domain"
import * as GameModel from "../../src/Game/model"
import { GameStage } from "../../src/Game/model"
import * as Move from "../../src/Moves/domain"
import * as MoveModels from "../../src/Moves/model"
import * as Player from "../../src/Players/domain"
import * as PlayerModels from "../../src/Players/model"
import { PlayerId } from "../../src/Players/model"
import * as Trick from "../../src/Tricks/domain"
import { DeepPartial } from "../../src/utils/types"

type Event = {
  playerId: PlayerId
  event: PlayerEvent
}

const defaultEventFor = ({ hand, id, name, type }: PlayerModels.Player) => ({
  event: {
    gameState: {
      currentTrick: Trick.createTrick(),
      heartsBroken: false,
      lastTrick: Trick.createTrick(),
      trickCounter: 0,
      trickFirstPlayerIndex: 0,
    },
    playerState: {
      hand,
      id,
      name,
      type,
    },
  },
  playerId: id,
})

const getRight = <L, A>(fa: Either<L, A>) =>
  pipe(
    fa,
    getOrElse<L, A>(e => {
      throw new Error(`Should be Right => ${JSON.stringify(e)}`)
    }),
  )

const getLeft = <L, A>(fa: Either<L, A>) =>
  pipe(
    fa,
    fold(identity, r => {
      throw new Error(`Should be Left => ${JSON.stringify(r)}`)
    }),
  )

const createTrick = (cards: CardModel.Card[], firstPlayerIndex: number = 0) => ({
  cards,
  firstPlayerIndex,
})

describe("game", () => {
  const getEnvironment = (overrides: DeepPartial<Environment> = {}): Environment => {
    const defaultEnvironment = {
      config: {
        auto: true,
      },
      dealer: {
        createDeck: jest.fn(() => []),
        distributeCards: jest.fn(() => ({ deck: [], cards: [] })),
        shuffleDeck: jest.fn(),
      },
      playerEventDispatcher: jest.fn(),
      validateMove: () => true,
    }

    return R.mergeDeepRight(defaultEnvironment, overrides)
  }

  const firstPlayer = Player.create("id1", "Player 1")
  const secondPlayer = Player.create("id2", "Player 2")
  const twoPlayers = [firstPlayer, secondPlayer]

  describe("On Creation", () => {
    it("creates a new game with a new Deck, on 'Idle' status", () => {
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
      let events: Event[] = []
      const shuffledDeck = { some: "Deck" } as any
      const player1Cards = [{ player1: "cards" }] as any
      const player2Cards = [{ player2: "cards" }] as any
      const environment = getEnvironment({
        dealer: {
          distributeCards: jest
            .fn()
            .mockImplementationOnce(() => ({ deck: [], cards: player1Cards }))
            .mockImplementationOnce(() => ({ deck: [], cards: player2Cards })),
          shuffleDeck: jest.fn(() => shuffledDeck),
        },
        playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
          events = [...events, { playerId, event }]
        },
      })

      pipe(Game.create(twoPlayers), chain(Game.start))(environment)

      const expectedEvents = twoPlayers.map(player =>
        R.mergeDeepRight(defaultEventFor(player), {
          event: {
            gameState: {
              stage: GameStage.Playing,
            },
            playerState: {
              hand: player.id === firstPlayer.id ? player1Cards : player2Cards,
            },
            type: PlayerEventType.GameStarted,
          },
        }),
      )

      expect(events).toEqual(expect.arrayContaining(expectedEvents.map(expect.objectContaining)))
    })

    it("calls 'Play' on player that has the 2 of Clubs", () => {
      let events: Event[] = []
      const twoOfClubs = Card.create(Suit.Clubs, 2)
      const otherCard = Card.create(Suit.Hearts, 7)
      const player1Cards = [otherCard, otherCard]
      const player2Cards = [otherCard, twoOfClubs]
      const environment = getEnvironment({
        dealer: {
          createDeck: () => [otherCard, otherCard, otherCard, otherCard],
          distributeCards: jest
            .fn()
            .mockImplementationOnce(() => ({ deck: [], cards: player1Cards }))
            .mockImplementationOnce(() => ({ deck: [], cards: player2Cards })),
        },
        playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
          events = [...events, { playerId, event }]
        },
      })
      pipe(Game.create(twoPlayers), chain(Game.start))(environment)

      const expectedEvents = [
        R.mergeDeepRight(defaultEventFor(firstPlayer), {
          event: {
            gameState: {
              stage: GameStage.Playing,
              trickFirstPlayerIndex: 1,
            },
            playerState: {
              hand: player1Cards,
            },
            type: PlayerEventType.GameStarted,
          },
          playerId: firstPlayer.id,
        }),
      ]

      expect(events).toEqual(expect.arrayContaining(expectedEvents.map(expect.objectContaining)))
    })
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

        expect(game.currentTrick).toEqual(createTrick([move.card]))
      })

      it("should call 'PlayerPlayed' on every player", () => {
        let events: Event[] = []
        const environment = getEnvironment({
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
          },
        })
        const move = Move.createCardMove(Card.create(Suit.Clubs, 2))
        gameAfterFirstMove(environment, move)

        const expectedEvents = twoPlayers.map(player =>
          R.mergeDeepRight(defaultEventFor(player), {
            event: {
              gameState: {
                stage: GameStage.Playing,
              },
              move,
              playing: {
                hand: firstPlayer.hand,
                id: firstPlayer.id,
                name: firstPlayer.name,
                type: "",
              },
              type: PlayerEventType.PlayerPlayed,
            },
          }),
        )

        expect(events).toEqual(expect.arrayContaining(expectedEvents.map(expect.objectContaining)))
      })

      it("should move to next player", () => {
        const environment = getEnvironment()
        const move = Move.createCardMove(Card.create(Suit.Clubs, 5))
        const game = getRight(gameAfterFirstMove(environment, move))

        expect(Game.getCurrentPlayer(game).id).toBe(secondPlayer.id)
      })

      it("should call 'Play' on next player", () => {
        let events: Event[] = []
        const moveCard = Card.create(Suit.Clubs, 5)
        const card1 = Card.create(Suit.Diamonds, 9)
        const card2 = Card.create(Suit.Hearts, 7)
        const player2Cards = [card1, card2]
        const environment = getEnvironment({
          dealer: {
            createDeck: Dealer.createDeck,
            distributeCards: jest
              .fn()
              .mockImplementationOnce(() => ({ deck: [], cards: [] }))
              .mockImplementationOnce(() => ({ deck: [], cards: player2Cards })),
          },
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
          },
        })
        gameAfterFirstMove(environment, Move.createCardMove(moveCard))

        const expectedEvents = [
          R.mergeDeepRight(defaultEventFor(secondPlayer), {
            event: {
              gameState: {
                currentTrick: createTrick([moveCard]),
                stage: GameStage.Playing,
              },
              playerState: {
                hand: player2Cards,
              },
              type: PlayerEventType.Play,
            },
            playerId: secondPlayer.id,
          }),
        ]

        expect(events).toEqual(expect.arrayContaining(expectedEvents.map(expect.objectContaining)))
      })
    })

    describe("When trick finishes", () => {
      const moves = [
        Move.createCardMove(Card.create(Suit.Clubs, 3)),
        Move.createCardMove(Card.create(Suit.Clubs, 2)),
        Move.createCardMove(Card.create(Suit.Clubs, 8)),
        Move.createCardMove(Card.create(Suit.Diamonds, 10)),
      ]
      const trickFirstPlayer = 1
      const lastTrick = createTrick([moves[1].card, moves[2].card, moves[3].card, moves[0].card], trickFirstPlayer)

      const getTrickFinishedGame = (environment: Environment) => {
        const game = Game.create(fourPlayers)

        const env = R.mergeDeepRight(environment, {
          dealer: {
            distributeCards: jest
              .fn()
              .mockImplementationOnce(() => ({ deck: [], cards: [moves[0].card] }))
              .mockImplementationOnce(() => ({ deck: [], cards: [moves[1].card] }))
              .mockImplementationOnce(() => ({ deck: [], cards: [moves[2].card] }))
              .mockImplementationOnce(() => ({ deck: [], cards: [moves[3].card] })),
          },
        })

        return getRight(
          pipe(
            game,
            chain(Game.start),
            chain(Game.played(fourPlayers[1].id, moves[trickFirstPlayer])),
            chain(Game.played(fourPlayers[2].id, moves[2])),
            chain(Game.played(fourPlayers[3].id, moves[3])),
            chain(Game.played(fourPlayers[0].id, moves[0])),
          )(env),
        )
      }

      it("calls 'TrickFinished' on every player", () => {
        let events: Event[] = []
        const environment = getEnvironment({
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
          },
        })
        getTrickFinishedGame(environment)

        const expectedEvents = fourPlayers.map(player =>
          R.mergeDeepRight(defaultEventFor(player), {
            event: {
              gameState: {
                currentTrick: lastTrick,
                stage: GameStage.Ended,
                trickFirstPlayerIndex: 1,
              },
              type: PlayerEventType.TrickFinished,
            },
          }),
        )

        expect(events).toEqual(expect.arrayContaining(expectedEvents.map(expect.objectContaining)))
      })

      it("adds current trick to winning player", () => {
        const environment = getEnvironment()
        const trickFinishedGame = getTrickFinishedGame(environment)

        expect(trickFinishedGame.players[2].tricks).toEqual([lastTrick])
      })

      it("clears current trick and saves it in lastTrick", () => {
        const environment = getEnvironment()
        const trickFinishedGame = getTrickFinishedGame(environment)

        const emptyTrick = Trick.createTrick()
        expect(trickFinishedGame.currentTrick).toEqual(emptyTrick)
        expect(trickFinishedGame.lastTrick).toEqual(lastTrick)
      })

      it("set's the current player to the winning player", () => {
        const environment = getEnvironment()
        const trickFinishedGame = getTrickFinishedGame(environment)

        expect(trickFinishedGame.currentPlayerIndex).toEqual(2)
      })

      describe("calls 'Play' on the winning player", () => {
        const setupTrickFinishedGame = (auto: boolean) => {
          let events: Event[] = []
          const someCard = Card.create(Suit.Clubs, 5)
          const playerCards = [someCard, someCard]
          const environment = getEnvironment({
            config: {
              auto,
            },
            dealer: {
              createDeck: () => [someCard, someCard, someCard, someCard, someCard, someCard, someCard, someCard],
              distributeCards: jest
                .fn()
                .mockImplementationOnce(() => ({ deck: [], cards: playerCards }))
                .mockImplementationOnce(() => ({ deck: [], cards: playerCards }))
                .mockImplementationOnce(() => ({ deck: [], cards: playerCards }))
                .mockImplementationOnce(() => ({ deck: [], cards: playerCards })),
            },
            playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
              events = [...events, { playerId, event }]
            },
          })
          const trickFinishedGame = getTrickFinishedGame(environment)

          return { events, trickFinishedGame, winningPlayer: trickFinishedGame.players[2] }
        }

        it("if auto is true", () => {
          const { events, winningPlayer } = setupTrickFinishedGame(true)

          const expectedEvents = [
            R.mergeDeepRight(defaultEventFor(winningPlayer), {
              event: {
                gameState: {
                  lastTrick,
                  stage: GameStage.Playing,
                  trickCounter: 1,
                  trickFirstPlayerIndex: 2,
                },
                type: PlayerEventType.Play,
              },
            }),
          ]

          expect(events).toEqual(expect.arrayContaining(expectedEvents.map(expect.objectContaining)))
        })

        it("unless auto is false", () => {
          const { events, winningPlayer } = setupTrickFinishedGame(false)

          expect(
            events.find(
              e =>
                e.event.type === PlayerEventType.Play &&
                e.playerId === winningPlayer.id &&
                e.event.gameState.trickCounter === 1,
            ),
          ).toBeUndefined()
        })

        it("when 'next' is called, if auto is false", () => {
          let events: Event[] = []
          const { trickFinishedGame, winningPlayer } = setupTrickFinishedGame(false)

          const environment = getEnvironment({
            config: {
              auto: false,
            },
            playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
              events = [...events, { playerId, event }]
            },
          })
          pipe(trickFinishedGame, Game.nextPlay)(environment)

          const expectedEvents = [
            R.mergeDeepRight(defaultEventFor(winningPlayer), {
              event: {
                gameState: {
                  lastTrick,
                  stage: GameStage.Playing,
                  trickCounter: 1,
                  trickFirstPlayerIndex: 2,
                },
                type: PlayerEventType.Play,
              },
            }),
          ]

          expect(events).toEqual(expect.arrayContaining(expectedEvents.map(expect.objectContaining)))
        })
      })
    })

    describe("When game ends", () => {
      const getFinishedGame = (players: PlayerModels.Player[], environment: Environment, move: MoveModels.Move) => {
        return getRight(
          pipe(
            Game.create(players),
            chain(Game.start),
            chain(Game.played(firstPlayer.id, move)),
            chain(Game.played(secondPlayer.id, move)),
            chain(Game.played(firstPlayer.id, move)),
            chain(Game.played(secondPlayer.id, move)),
          )(environment),
        )
      }

      it("should set stage to 'GameEnded", () => {
        const someCard = Card.create(Suit.Clubs, 5)
        const move = Move.createCardMove(someCard)
        const environment = getEnvironment({
          dealer: {
            createDeck: () => [someCard, someCard, someCard, someCard],
          },
        })
        const finishedGame = getFinishedGame(twoPlayers, environment, move)

        expect(finishedGame.stage).toEqual(GameStage.Ended)
      })

      it("should call 'GameEnded' on every player", () => {
        let events: Event[] = []
        const someCard = Card.create(Suit.Clubs, 5)
        const move = Move.createCardMove(someCard)
        const playerCards = [someCard, someCard]
        const environment = getEnvironment({
          dealer: {
            createDeck: () => [someCard, someCard, someCard, someCard],
            distributeCards: jest
              .fn()
              .mockImplementationOnce(() => ({ deck: [], cards: playerCards }))
              .mockImplementationOnce(() => ({ deck: [], cards: playerCards })),
          },
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
          },
        })
        getFinishedGame(twoPlayers, environment, move)

        const expectedEvents = twoPlayers.map(player =>
          R.mergeDeepRight(defaultEventFor(player), {
            event: {
              gameState: {
                lastTrick: createTrick([someCard, someCard]),
                stage: GameStage.Ended,
                trickCounter: 2,
              },
              type: PlayerEventType.GameEnded,
            },
          }),
        )

        expect(events).toEqual(expect.arrayContaining(expectedEvents.map(expect.objectContaining)))
      })

      it("should not call 'Play' on any player", () => {
        let events: Event[] = []
        const someCard = Card.create(Suit.Clubs, 5)
        const move = Move.createCardMove(someCard)
        const playerCards = [someCard, someCard]
        const environment = getEnvironment({
          dealer: {
            createDeck: () => [someCard, someCard, someCard, someCard],
            distributeCards: jest
              .fn()
              .mockImplementationOnce(() => ({ deck: [], cards: playerCards }))
              .mockImplementationOnce(() => ({ deck: [], cards: playerCards })),
          },
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
          },
        })
        getFinishedGame(twoPlayers, environment, move)

        expect(events.filter(e => e.event.type === PlayerEventType.Play).length).toBeLessThan(5)
      })
    })

    it("rejects invalid moves", () => {
      const environment = getEnvironment({
        validateMove: () => false,
      })
      const invalidMove = { some: "invalid-move" } as any
      const game = pipe(
        Game.create(twoPlayers),
        chain(Game.start),
        chain(Game.played(firstPlayer.id, invalidMove)),
      )(environment)

      expect(getLeft(game).type).toEqual(GameModel.GameErrorType.InvalidMove)
    })
  })

  describe("Winning Trick", () => {
    it("is the highest card of the same suit as the first", () => {
      const c0 = Card.create(Suit.Spades, 3)
      const c1 = Card.create(Suit.Diamonds, 5)
      const c2 = Card.create(Suit.Spades, 5)
      const c3 = Card.create(Suit.Spades, 9)
      const currentTrick = createTrick([c0, c1, c2, c3])
      const game = {
        currentPlayerIndex: 0,
        currentTrick,
        players: [1, 2, 3, 4],
      } as any

      expect(Game.findWinningTrickPlayerIndex(game)).toEqual(3)
    })

    it("is the first if no other has the same suit", () => {
      const c0 = Card.create(Suit.Spades, 3)
      const c1 = Card.create(Suit.Diamonds, 5)
      const c2 = Card.create(Suit.Diamonds, 5)
      const c3 = Card.create(Suit.Clubs, 9)
      const currentTrick = createTrick([c0, c1, c2, c3])
      const game = {
        currentPlayerIndex: 0,
        currentTrick,
        players: [1, 2, 3, 4],
      } as any

      expect(Game.findWinningTrickPlayerIndex(game)).toEqual(0)
    })
  })

  describe("Moves are", () => {
    const twoOfClubsMove = Move.createCardMove(Card.create(CardModel.Suit.Clubs, 2))

    describe("valid if", () => {
      it("suit is the same as the first card", () => {
        const game = getRight(
          pipe(
            Game.create(twoPlayers),
            chain(Game.start),
            chain(Game.played(firstPlayer.id, Move.createCardMove(Card.create(Suit.Clubs, 2)))),
          )(getEnvironment()),
        )
        const validMove = Move.createCardMove(Card.create(Suit.Clubs, 3))

        expect(Game.isValidMove(game, secondPlayer, validMove)).toBeTruthy()
      })

      it("suit is different but player has no card of the same suit", () => {
        const game = getRight(
          pipe(
            Game.create(twoPlayers),
            chain(Game.start),
            chain(Game.played(firstPlayer.id, twoOfClubsMove)),
          )(getEnvironment()),
        )
        const validMove = Move.createCardMove(Card.create(Suit.Clubs, 3))
        const player = { hand: [Card.create(Suit.Hearts, 5)] } as any

        expect(Game.isValidMove(game, player, validMove)).toBeTruthy()
      })

      it("first card is Hearts but hearts as already been drawn", () => {
        const game = getRight(
          pipe(
            Game.create(twoPlayers),
            chain(Game.played(firstPlayer.id, twoOfClubsMove)),
            chain(Game.played(secondPlayer.id, Move.createCardMove(Card.create(Suit.Hearts, 5)))),
          )(getEnvironment()),
        )

        const heartsCard = Card.create(Suit.Hearts, 3)
        const validMove = Move.createCardMove(heartsCard)

        expect(Game.isValidMove(game, firstPlayer, validMove)).toBeTruthy()
      })

      it("card is Hearts and hearts has not been drawn yet but player only have hearts", () => {
        const game = getRight(
          pipe(Game.create(twoPlayers), chain(Game.played(firstPlayer.id, twoOfClubsMove)))(getEnvironment()),
        )
        const player = { hand: [Card.create(Suit.Hearts, 5)] } as any
        const heartsCard = Card.create(Suit.Hearts, 3)
        const validMove = Move.createCardMove(heartsCard)

        expect(Game.isValidMove(game, player, validMove)).toBeTruthy()
      })
    })

    describe("invalid if", () => {
      it("first trick card is not the 2 of clubs", () => {
        const not2OfClubs = Card.create(Suit.Clubs, 3)
        const invalidMove = Move.createCardMove(not2OfClubs)

        const game = getRight(Game.create(twoPlayers)(getEnvironment()))

        expect(Game.isValidMove(game, firstPlayer, invalidMove)).toBeFalsy()
      })

      it("first card is Hearts but hearts has not been drawn yet", () => {
        const game = getRight(Game.create(twoPlayers)(getEnvironment()))

        const heartsCard = Card.create(Suit.Hearts, 3)
        const invalidMove = Move.createCardMove(heartsCard)

        expect(Game.isValidMove(game, firstPlayer, invalidMove)).toBeFalsy()
      })
    })
  })
})
