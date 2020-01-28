import * as Card from "../../src/Cards/domain"
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
  const deck = Deck.shuffle({ cards: [c1, c2] } as any)

  expect((deck.cards[0] === c1 && deck.cards[1] === c2) || (deck.cards[0] === c2 && deck.cards[1] === c1)).toBeTruthy()
})

it("distribute cards", () => {
  const initialDeck = { cards: [1, 2, 3, 4, 5, 6] } as any

  const { cards, deck } = Deck.distributeCards(initialDeck, 2)

  expect(cards).toEqual([1, 2])
  expect(deck.cards).toEqual([3, 4, 5, 6])
})

describe("buildComplement", () => {
  it("on an 8 cards deck", () => {
    const cards = Card.fromList("2C 3H 2S")

    expect(Deck.buildComplement(cards, 2, 3)).toEqual(expect.arrayContaining(Card.fromList("3C 2H 3S 2D 3D")))
  })

  it("on an 12 cards deck", () => {
    const cards = Card.fromList("2C 3C 4C 2S 3S 4S 3H 3D")

    expect(Deck.buildComplement(cards, 2, 4)).toEqual(expect.arrayContaining(Card.fromList("2H 4H 2D 4D")))
  })

  it("for an empty list of cards", () => {
    expect(Deck.buildComplement([], 2, 3)).toEqual(expect.arrayContaining(Card.fromList("2C 3C 2H 3H 2S 3S 2D 3D")))
  })

  it("for a full deck", () => {
    const cards = Card.fromList("2C 3C 2H 3H 2S 3S 2D 3D")
    expect(Deck.buildComplement(cards, 2, 3)).toEqual([])
  })
})
