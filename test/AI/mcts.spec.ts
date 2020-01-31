import * as R from "ramda"
import { createGameForSimulation } from "../../src/AI/mcts"
import * as mcts from "../../src/AI/mcts"
import * as Card from "../../src/Cards/domain"
import * as CardModel from "../../src/Cards/model"
import { Dealer } from "../../src/dealer"
import { GameStage } from "../../src/Game/model"
import * as Player from "../../src/Players/domain"
import * as Trick from "../../src/Tricks/domain"
import * as TrickModel from "../../src/Tricks/model"
import { lj } from "../../src/utils/misc"

const allCards = Card.toList(Dealer.createDeck().cards)

const removeCards = (cards: CardModel.Card[], toRemove: CardModel.Card[]) =>
  cards.filter(c1 => toRemove.every(c2 => !Card.equals(c1, c2)))

const buildTricks = (cards: CardModel.Card[], count: number) =>
  R.range(0, Math.floor(cards.length / count)).reduce(
    (acc, chunk) => [...acc, Trick.createTrick(cards.slice(chunk * count, (chunk + 1) * count))],
    [] as TrickModel.Trick[],
  )

const p0 = Player.create("p0", "Player 0")
const p1 = Player.create("p1", "Player 1")
const p2 = Player.create("p2", "Player 2")
const p3 = Player.create("p3", "Player 3")
const players = [p0, p1, p2, p3]

const buildGameState = (
  currentTrick: TrickModel.Trick,
  playerHand: CardModel.Hand,
  currentPlayerIndex: number,
  tricks: TrickModel.Trick[] = [],
) => {
  const gamePublicState = {
    currentPlayerIndex,
    currentTrick,
    deckInfo: {
      maxFaceValue: 14,
      minFaceValue: 2,
      size: 52,
    },
    heartsBroken: true,
    lastTrick: Trick.createTrick(),
    players,
    playersCount: 4,
    stage: GameStage.Playing,
    trickCounter: tricks.length,
    tricks,
  }

  const playerPublicState = {
    ...p1,
    hand: playerHand,
    tricks: [],
    type: "",
  }

  return { gamePublicState, playerPublicState }
}

describe("createGameForSimulation", () => {
  it("create a game with random hands for the other players", () => {
    const currentTrick = Trick.createTrick(Card.fromList("3S 4S"), 2)
    const playerHand = Card.fromList("QH KH AH 2S")
    const tricksCards = Card.fromList(
      "2C 3C 4C 5C 6C 7C 8C 9C 10C JC QC KC AC 2D 3D 4D 5D 6D 7D 8D 9D 10D JD QD KD AD 2H 3H 4H 5H 6H 7H 8H 9H 10H JH",
    )
    const tricks = buildTricks(tricksCards, 4)

    const { gamePublicState, playerPublicState } = buildGameState(currentTrick, playerHand, 0, tricks)

    const game = createGameForSimulation(R.identity)(gamePublicState, playerPublicState)

    expect(Card.toList(R.sort(Card.order, game.players[0].hand))).toEqual("QH KH AH 2S")
    expect(Card.toList(R.sort(Card.order, game.players[1].hand))).toEqual("5S 6S 7S 8S")
    expect(Card.toList(R.sort(Card.order, game.players[2].hand))).toEqual("9S 10S JS")
    expect(Card.toList(R.sort(Card.order, game.players[3].hand))).toEqual("QS KS AS")
  })

  it("create a game with random hands for the other players", () => {
    const currentTrick = Trick.createTrick(Card.fromList(""))
    const playerHand = Card.fromList("2H 3H 7H KH 10C AC AD 3S 6S JS")
    const tricksCards = Card.fromList("2C KC 5C 8C JD 10D 6D QD 9D 7D 2D QC")
    const tricks = buildTricks(tricksCards, 4)

    const { gamePublicState, playerPublicState } = buildGameState(currentTrick, playerHand, 3, tricks)

    const game = createGameForSimulation(R.identity)(gamePublicState, playerPublicState)

    expect(Card.toList(R.sort(Card.order, game.players[0].hand))).toEqual("4H 5H 6H 8H 9H 10H JH QH AH 3C")
    expect(Card.toList(R.sort(Card.order, game.players[1].hand))).toEqual("4C 6C 7C 9C JC 3D 4D 5D 8D KD")
    expect(Card.toList(R.sort(Card.order, game.players[2].hand))).toEqual("2S 4S 5S 7S 8S 9S 10S QS KS AS")
    expect(Card.toList(R.sort(Card.order, game.players[3].hand))).toEqual("2H 3H 7H KH 10C AC AD 3S 6S JS")
  })
})

describe("findBestMove", () => {
  it("get rid of QS if possible", () => {
    const currentTrick = Trick.createTrick(Card.fromList("2C"))
    const playerHand = Card.fromList("3D 4D 5D 6D 7D 8D 2S 3S 4S 5S QS KS AS")

    const { gamePublicState, playerPublicState } = buildGameState(currentTrick, playerHand, 1)

    const bestMove = mcts.findBestMove(gamePublicState, playerPublicState, { maxIterations: 500 })
    const bestCard = (bestMove as any).card

    expect(Card.toSymbol(bestCard)).toEqual("QS")
  })

  it("take some points to prevent higher losses", () => {
    const currentTrick = Trick.createTrick(Card.fromList("2S 3S 6H"), 1)
    const playerHand = Card.fromList("2H AH")
    const tricks = buildTricks(
      removeCards(Dealer.createDeck().cards, [...currentTrick.cards, ...playerHand, ...Card.fromList("3H 4H 5H")]),
      4,
    )

    const { gamePublicState, playerPublicState } = buildGameState(currentTrick, playerHand, 0, tricks)

    const bestMove = mcts.findBestMove(gamePublicState, playerPublicState, { maxIterations: 2 })
    const bestCard = (bestMove as any).card

    expect(Card.toSymbol(bestCard)).toBe("AH")
  })
})
