import * as R from "ramda"
import { createGameForSimulation } from "../../src/AI/mcts"
import * as mcts from "../../src/AI/mcts"
import * as Card from "../../src/Cards/domain"
import * as CardModel from "../../src/Cards/model"
import { maxFaceValue } from "../../src/Cards/model"
import * as Deck from "../../src/Deck/domain"
import { GamePublicState, GameStage } from "../../src/Game/model"
import { MoveType } from "../../src/Moves/model"
import * as Player from "../../src/Players/domain"
import * as Trick from "../../src/Tricks/domain"
import * as TrickModel from "../../src/Tricks/model"

// const sortList = (cardList: string) => Card.toList(R.sort(Card.order, Card.fromList(cardList)))

describe("createGameForSimulation", () => {
  it("create a game with random hands for the other players", () => {
    const tricksCards = Card.fromList(
      "2C 3C 4C 5C 6C 7C 8C 9C 10C JC QC KC AC 2D 3D 4D 5D 6D 7D 8D 9D 10D JD QD KD AD 2H 3H 4H 5H 6H 7H 8H 9H 10H JH",
    )
    const tricks = [
      { cards: tricksCards.slice(0, 4) },
      { cards: tricksCards.slice(4, 8) },
      { cards: tricksCards.slice(8, 12) },
      { cards: tricksCards.slice(12, 16) },
      { cards: tricksCards.slice(16, 20) },
      { cards: tricksCards.slice(20, 24) },
      { cards: tricksCards.slice(24, 28) },
      { cards: tricksCards.slice(28, 32) },
      { cards: tricksCards.slice(32, 36) },
    ]

    const gamePublicState = {
      currentPlayerIndex: 0,
      currentTrick: {
        cards: Card.fromList("3S 4S"),
        firstPlayerIndex: 2,
      },
      deckInfo: {
        maxFaceValue: 14,
        minFaceValue: 2,
        size: 52,
      },
      playersCount: 4,
      trickCounter: 9,
      tricks,
    } as any
    const playerPublicState = {
      hand: Card.fromList("QH KH AH 2S"),
    } as any

    const game = createGameForSimulation(R.identity)(gamePublicState, playerPublicState)

    expect(Card.toList(R.sort(Card.order, game.players[0].hand))).toEqual("QH KH AH 2S")
    expect(Card.toList(R.sort(Card.order, game.players[1].hand))).toEqual("5S 6S 7S 8S")
    expect(Card.toList(R.sort(Card.order, game.players[2].hand))).toEqual("9S 10S JS")
    expect(Card.toList(R.sort(Card.order, game.players[3].hand))).toEqual("QS KS AS")
  })

  it("create a game with random hands for the other players", () => {
    const tricksCards = Card.fromList("2C KC 5C 8C JD 10D 6D QD 9D 7D 2D QC")
    const tricks = [
      { cards: tricksCards.slice(0, 4) },
      { cards: tricksCards.slice(4, 8) },
      { cards: tricksCards.slice(8, 12) },
    ]

    const gamePublicState = {
      currentPlayerIndex: 3,
      currentTrick: {
        cards: Card.fromList(""),
        firstPlayerIndex: 0,
      },
      deckInfo: {
        maxFaceValue: 14,
        minFaceValue: 2,
        size: 52,
      },
      playersCount: 4,
      trickCounter: 3,
      tricks,
    } as any
    const playerPublicState = {
      hand: Card.fromList("2H 3H 7H KH 10C AC AD 3S 6S JS"),
    } as any

    const game = createGameForSimulation(R.identity)(gamePublicState, playerPublicState)

    expect(Card.toList(R.sort(Card.order, game.players[0].hand))).toEqual("4H 5H 6H 8H 9H 10H JH QH AH 3C")
    expect(Card.toList(R.sort(Card.order, game.players[1].hand))).toEqual("4C 6C 7C 9C JC 3D 4D 5D 8D KD")
    expect(Card.toList(R.sort(Card.order, game.players[2].hand))).toEqual("2S 4S 5S 7S 8S 9S 10S QS KS AS")
    expect(Card.toList(R.sort(Card.order, game.players[3].hand))).toEqual("2H 3H 7H KH 10C AC AD 3S 6S JS")
  })
})

describe("findBestMove", () => {
  const p0 = Player.create("p0", "Player 0")
  const p1 = Player.create("p1", "Player 1")
  const p2 = Player.create("p2", "Player 2")
  const p3 = Player.create("p3", "Player 3")
  const players = [p0, p1, p2, p3]

  const buildGame = (currentTrick: TrickModel.Trick, playerHand: CardModel.Hand) => {
    const gamePublicState = {
      currentPlayerIndex: 1,
      currentTrick,
      deckInfo: {
        maxFaceValue: 14,
        minFaceValue: 2,
        size: 52,
      },
      heartsBroken: false,
      lastTrick: Trick.createTrick(),
      players,
      playersCount: 4,
      stage: GameStage.Playing,
      trickCounter: 0,
      tricks: [],
    }

    const playerPublicState = {
      ...p1,
      hand: playerHand,
      tricks: [],
      type: "",
    }

    return {gamePublicState, playerPublicState}
  }

  it("get rid of QS if possible", () => {
    const currentTrick = Trick.createTrick(Card.fromList("2C"))
    const playerHand = Card.fromList("3D 4D 5D 6D 7D 8D 2S 3S 4S 5S QS KS AS")

    const {gamePublicState, playerPublicState} = buildGame(currentTrick, playerHand)

    const bestMove = mcts.findBestMove(gamePublicState, playerPublicState, { maxIterations: 500 })
    const bestCard = (bestMove as any).card

    expect(Card.toSymbol(bestCard)).toEqual("QS")
  })
})
