
import * as Deck from "../../src/Deck/domain"

it("Creates 52 card deck", () => {
  const deck = Deck.create(2, 14)

  expect(deck.cards.length).toEqual(52)
  expect(deck.minFaceValue).toEqual(2)
  expect(deck.maxFaceValue).toEqual(14)
})

it("Shuffles a deck", () => {
  const c1 = { some: "card1" } as any
  const c2 = { some: "card2" } as any
  const deck = Deck.shuffle({ cards: [c1, c2]} as any)

  expect((deck.cards[0] === c1 && deck.cards[1] === c2) || (deck.cards[0] === c2 && deck.cards[1] === c1)).toBeTruthy()
})

it("distribute cards", () => {
  const initialDeck = { cards: [1, 2, 3, 4, 5, 6] } as any

  const { cards, deck } = Deck.distributeCards(initialDeck, 2)

  expect(cards).toEqual([1, 2])
  expect(deck.cards).toEqual([3, 4, 5, 6])
})

// it("buildComplement", () => {
//   const cards = createFromList()
// })
