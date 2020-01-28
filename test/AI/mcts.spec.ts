import * as R from "ramda"
import { createGameForSimulation } from "../../src/AI/mcts"
import * as Card from "../../src/Cards/domain"
import * as Deck from "../../src/Deck/domain"
import * as Trick from "../../src/Tricks/domain"

// 2C 2S 2D 2H
// 3C 3S 3D 3H
// 4C 4S 4D 4H

const sortList = (cardList: string) => Card.toList(R.sort(Card.order, Card.fromList(cardList)))

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

  it.only("create a game with random hands for the other players", () => {
    const tricksCards = Card.fromList(
      "2C KC 5C 8C JD 10D 6D QD 9D 7D 2D QC",
    )
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
