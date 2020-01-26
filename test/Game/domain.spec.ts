import { Either, fold, getOrElse } from "fp-ts/lib/Either"
import { identity } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import * as R from "ramda"
import * as Card from "../../src/Cards/domain"
import * as CardModel from "../../src/Cards/model"
import { Suit } from "../../src/Cards/model"
import { Dealer } from "../../src/dealer"
import * as Deck from "../../src/Deck/domain"
import * as DeckModel from "../../src/Deck/model"
import { defaultEnvironment } from "../../src/Environment/domain"
import { Config, Environment } from "../../src/Environment/model"
import { GameEventType, PlayerEvent, PlayerEventType } from "../../src/Events/model"
import * as Game from "../../src/Game/domain"
import * as GameModel from "../../src/Game/model"
import { GameStage } from "../../src/Game/model"
import * as Move from "../../src/Moves/domain"
import * as MoveModels from "../../src/Moves/model"
import * as Player from "../../src/Players/domain"
import * as PlayerModels from "../../src/Players/model"
import { PlayerId } from "../../src/Players/model"
import * as Trick from "../../src/Tricks/domain"
import { actionOf } from "../../src/utils/actions"
import { DeepPartial } from "../../src/utils/types"

type Event = {
  playerId: PlayerId
  event: PlayerEvent
}

const twoOfClubs = Card.create(Suit.Clubs, 2)

const defaultEventFor = ({ hand, id, name, tricks, type }: PlayerModels.Player) => ({
  event: {
    gameState: {
      currentPlayerIndex: 0,
      currentTrick: Trick.createTrick(),
      heartsBroken: false,
      lastTrick: Trick.createTrick(),
      trickCounter: 0,
      trickFirstPlayerIndex: 0,
      tricks: [],
    },
    playerState: {
      hand,
      id,
      name,
      tricks,
      type,
    },
  },
  playerId: id,
})

const createDeck = (cards: any) =>
  ({
    cards,
    size: cards.length,
  } as DeckModel.Deck)

const createDeckWith = (numberOfCards: number) => Deck.create(0, numberOfCards / 4 - 1)

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

const playFirstPlayerCard = (_: PlayerId, event: PlayerEvent) => {
  switch (event.type) {
    case PlayerEventType.Play:
      return Move.createCardMove(event.playerState.hand[0])
  }
  return undefined
}

describe("game", () => {
  const getEnvironment = (overrides: DeepPartial<Environment> = {}): Environment => {
    const defEnv: DeepPartial<Environment> = {
      config: {
        auto: false,
      },
      dealer: {
        shuffleDeck: (deck: DeckModel.Deck) => deck,
      },
      playerEventDispatcher: playFirstPlayerCard,
      validateMove: () => () => true,
    }

    return R.mergeDeepRight(R.mergeDeepRight(defaultEnvironment, defEnv), overrides)
  }

  const firstPlayer = Player.create("id1", "Player 1")
  const secondPlayer = Player.create("id2", "Player 2")
  const twoPlayers = [firstPlayer, secondPlayer]

  describe("On Creation", () => {
    it("creates a new game with a new Deck, on 'Idle' status", () => {
      const newDeck = Deck.create()
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
      const shuffledDeck = Deck.create()
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
          return undefined
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
      const environment = getEnvironment({
        playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
          events = [...events, { playerId, event }]
          return undefined
        },
      })

      const game = getRight(pipe(Game.create(twoPlayers), chain(Game.start))(environment))
      const playerWith2OfClubs = game.players.find(p => p.hand.some(c => Card.equals(c, twoOfClubs)))!
      pipe(actionOf(game), chain(Game.nextPlay))(environment)

      const playEvents = events.filter(
        e => e.event.type === PlayerEventType.Play && e.playerId === playerWith2OfClubs.id,
      )

      expect(playEvents.length).toEqual(1)
    })

    it("'Plays' the move returnd by playerEventDispatcher", () => {
      const environment = getEnvironment({
        playerEventDispatcher: (_: PlayerId, event: PlayerEvent) => {
          switch (event.type) {
            case PlayerEventType.Play:
              return Move.createCardMove(twoOfClubs)
          }
          return undefined
        },
      })

      const game = getRight(pipe(Game.create(twoPlayers), chain(Game.start), chain(Game.nextPlay))(environment))

      expect(game.currentTrick.cards).toEqual([twoOfClubs])
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
      it("should remove card from players hand", () => {
        const game = getRight(pipe(Game.create(twoPlayers), chain(Game.start), chain(Game.nextPlay))(getEnvironment()))

        const playedCard = game.currentTrick.cards[0]
        expect(game.players[0].hand.find(c => Card.equals(c, playedCard))).toBeUndefined()
      })

      it("should add player card move to current trick", () => {
        const firstCard = Card.create(Suit.Clubs, 2)
        const environment = getEnvironment({
          dealer: {
            createDeck: () => createDeck([firstCard]),
          },
        })
        const game = getRight(pipe(Game.create(twoPlayers), chain(Game.start), chain(Game.nextPlay))(getEnvironment()))

        expect(game.currentTrick).toEqual(createTrick([firstCard]))
      })

      it("should call 'PlayerPlayed' on every player", () => {
        let events: Event[] = []
        const environment = getEnvironment({
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
            return playFirstPlayerCard(playerId, event)
          },
        })
        const game = getRight(pipe(Game.create(twoPlayers), chain(Game.start), chain(Game.nextPlay))(environment))

        const playerPlayedEvents = events.filter(e => e.event.type === PlayerEventType.PlayerPlayed)
        expect(playerPlayedEvents[0].playerId).toBe(firstPlayer.id)
        expect(playerPlayedEvents[1].playerId).toBe(secondPlayer.id)
      })

      it("should move to next player", () => {
        const environment = getEnvironment()
        const move = Move.createCardMove(Card.create(Suit.Clubs, 5))
        const game = getRight(pipe(Game.create(twoPlayers), chain(Game.start), chain(Game.nextPlay))(getEnvironment()))

        expect(Game.getCurrentPlayer(game).id).toBe(secondPlayer.id)
      })

      it("should call 'Play' on next player", () => {
        let events: Event[] = []
        const environment = getEnvironment({
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
            return playFirstPlayerCard(playerId, event)
          },
        })
        getRight(pipe(Game.create(twoPlayers), chain(Game.start), chain(Game.nextPlay))(environment))

        const playEvents = events.filter(e => e.event.type === PlayerEventType.Play && e.playerId === firstPlayer.id)
        expect(playEvents.length).toEqual(1)
      })
    })

    describe("When trick finishes", () => {
      const cards = [
        Card.create(Suit.Clubs, 3),
        Card.create(Suit.Clubs, 2),
        Card.create(Suit.Clubs, 8),
        Card.create(Suit.Diamonds, 10),
      ]
      const firstPlayerIndex = 1
      const winningPlayerId = fourPlayers[2].id

      const lastTrick = {
        cards: [cards[1], cards[2], cards[3], cards[0]],
        firstPlayerIndex,
      }

      const getTrickFinishedGame = (config: Config) => {
        let events: Event[] = []
        const environment = getEnvironment({
          config,
          dealer: {
            createDeck: () => createDeck(cards),
          },
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
            return playFirstPlayerCard(playerId, event)
          },
        })

        const startedGame: GameModel.Game = {
          ...getRight(Game.create(fourPlayers)(environment)),
          currentPlayerIndex: firstPlayerIndex,
        }

        const game = getRight(
          pipe(
            actionOf(startedGame),
            chain(Game.start),
            chain(Game.nextPlay),
            chain(Game.nextPlay),
            chain(Game.nextPlay),
          )(environment),
        )

        return { game, events }
      }

      it("calls 'TrickFinished' on every player", () => {
        const { events } = getTrickFinishedGame({ auto: true })

        const trickFinishedEvents = events.filter(e => e.event.type === PlayerEventType.TrickFinished)
        expect(trickFinishedEvents[0].playerId).toBe(firstPlayer.id)
        expect(trickFinishedEvents[1].playerId).toBe(secondPlayer.id)
      })

      it("adds current trick to winning player", () => {
        const { game } = getTrickFinishedGame({ auto: true })

        expect(game.players[2].tricks).toEqual([game.lastTrick])
      })

      it("clears current trick, saves it in lastTrick and add it to tricks", () => {
        const { game } = getTrickFinishedGame({ auto: true })

        const emptyTrick = Trick.createTrick()
        expect(game.currentTrick).toEqual(emptyTrick)
        expect(game.lastTrick).toEqual(lastTrick)
        expect(game.tricks).toEqual([lastTrick])
      })

      it("set's the current player to the winning player", () => {
        const { game } = getTrickFinishedGame({ auto: true })

        expect(game.currentPlayerIndex).toEqual(2)
      })

      describe("calls 'Play' on the winning player", () => {
        it("if auto is true", () => {
          const { events } = getTrickFinishedGame({ auto: true })
          const playEvents = events.filter(e => e.event.type === PlayerEventType.Play && e.playerId === winningPlayerId)

          expect(playEvents.length).toEqual(1)
        })

        it("unless auto is false", () => {
          const { events } = getTrickFinishedGame({ auto: false })

          expect(
            events.find(
              e =>
                e.event.type === PlayerEventType.Play &&
                e.playerId === winningPlayerId &&
                e.event.gameState.trickCounter === 1,
            ),
          ).toBeUndefined()
        })

        it("when 'next' is called, if auto is false", () => {
          const { events } = getTrickFinishedGame({ auto: false })

          const playEvents = events.filter(e => e.event.type === PlayerEventType.Play && e.playerId === winningPlayerId)

          expect(playEvents.length).toEqual(1)
        })
      })
    })

    describe("When game ends", () => {
      const getFinishedGame = () => {
        let events: Event[] = []
        const environment = getEnvironment({
          dealer: {
            createDeck: () => createDeckWith(4),
          },
          playerEventDispatcher: (playerId: PlayerId, event: PlayerEvent) => {
            events = [...events, { playerId, event }]
            return playFirstPlayerCard(playerId, event)
          },
        })

        const game = getRight(
          pipe(
            Game.create(twoPlayers),
            chain(Game.start),
            chain(Game.nextPlay),
            chain(Game.nextPlay),
            chain(Game.nextPlay),
            chain(Game.nextPlay),
          )(environment),
        )

        return { game, events }
      }

      it("should set stage to 'GameEnded", () => {
        const { game } = getFinishedGame()

        expect(game.stage).toEqual(GameStage.Ended)
      })

      it("should call 'GameEnded' on every player", () => {
        const { events } = getFinishedGame()

        const gameEndedEvents = events.filter(e => e.event.type === PlayerEventType.GameEnded)
        expect(gameEndedEvents[0].playerId).toBe(firstPlayer.id)
        expect(gameEndedEvents[1].playerId).toBe(secondPlayer.id)
      })

      it("should not call 'Play' on any player", () => {
        const { events } = getFinishedGame()

        expect(events.filter(e => e.event.type === PlayerEventType.Play).length).toBeLessThan(5)
      })
    })

    it("rejects invalid moves", () => {
      const environment = getEnvironment({
        validateMove: () => () => false,
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
        const game = {
          currentTrick: { cards: [Card.create(Suit.Diamonds, 5)], firstPlayerIndex: 0 },
          players: [{}, { hand: [Card.create(Suit.Diamonds, 3)] }],
          trickCounter: 0,
        } as any

        const validMove = Move.createCardMove(game.players[1].hand[0])

        expect(Game.isValidMove(game, game.players[1])(validMove)).toBeTruthy()
      })

      it("suit is different but player has no card of the same suit", () => {
        const game = {
          currentTrick: { cards: [Card.create(Suit.Diamonds, 5)], firstPlayerIndex: 0 },
          players: [{}, { hand: [Card.create(Suit.Hearts, 3)] }],
          trickCounter: 0,
        } as any

        const validMove = Move.createCardMove(game.players[1].hand[0])

        expect(Game.isValidMove(game, game.players[1])(validMove)).toBeTruthy()
      })

      it("first card is Hearts but hearts as already been drawn", () => {
        const game = {
          currentTrick: { cards: [], firstPlayerIndex: 0 },
          heartsBroken: true,
          players: [{ hand: [Card.create(Suit.Hearts, 3), Card.create(Suit.Clubs, 10)] }, {}],
          trickCounter: 1,
        } as any

        const validMove = Move.createCardMove(game.players[0].hand[0])

        expect(Game.isValidMove(game, game.players[0])(validMove)).toBeTruthy()
      })

      it("card is Hearts and hearts has not been drawn yet but player only have hearts", () => {
        const game = {
          currentTrick: { cards: [], firstPlayerIndex: 0 },
          heartsBroken: false,
          players: [{ hand: [Card.create(Suit.Hearts, 3), Card.create(Suit.Hearts, 10)] }, {}],
          trickCounter: 1,
        } as any

        const validMove = Move.createCardMove(game.players[0].hand[0])

        expect(Game.isValidMove(game, game.players[0])(validMove)).toBeTruthy()
      })
    })

    describe("invalid if", () => {
      it("first trick card is not the 2 of clubs", () => {
        const game = {
          currentTrick: { cards: [], firstPlayerIndex: 0 },
          players: [{ hand: [Card.create(Suit.Hearts, 2)] }, {}],
          trickCounter: 0,
        } as any

        const validMove = Move.createCardMove(game.players[0].hand[0])

        expect(Game.isValidMove(game, game.players[0])(validMove)).toBeFalsy()
      })

      it("first card is Hearts but hearts has not been drawn yet", () => {
        const game = {
          currentTrick: { cards: [], firstPlayerIndex: 0 },
          players: [{ hand: [Card.create(Suit.Hearts, 2), Card.create(Suit.Spades, 2)] }, {}],
          trickCounter: 1,
        } as any

        const validMove = Move.createCardMove(game.players[0].hand[0])

        expect(Game.isValidMove(game, game.players[0])(validMove)).toBeFalsy()
      })
    })
  })
})
