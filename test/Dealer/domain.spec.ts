import * as Dealer from "../../src/Dealer/domain"
import { Deck } from "../../src/Dealer/model"

const checkDeck = (deck: Deck) => {
  return deck.length === 52
}

it("Creates 52 card deck", () => {
  const deck = Dealer.createDeck()

  expect(checkDeck(deck)).toBeTruthy()
})

it("Shuffles a deck", () => {
  const c1 = { some: "card1" } as any
  const c2 = { some: "card2" } as any
  const deck = Dealer.shuffleDeck([c1, c2])

  expect((deck[0] === c1 && deck[1] === c2) || (deck[0] === c2 && deck[1] === c1)).toBeTruthy()
})

it("distribute cards", () => {
  const deck = [1, 2, 3, 4, 5, 6] as any

  expect(Dealer.distributeCards(deck, 2)).toEqual({ cards: [1, 2], deck: [3, 4, 5, 6] })
})
