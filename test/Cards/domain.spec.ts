import * as Card from "../../src/Cards/domain"
import * as CardModel from "../../src/Cards/model"

it("toSymbol", () => {
  expect(Card.toSymbol(Card.create(CardModel.Suit.Diamonds, 10))).toEqual("10D")
  expect(Card.toSymbol(Card.create(CardModel.Suit.Spades, 14))).toEqual("AS")
})

it("fromSymbol", () => {
  expect(Card.equals(Card.fromSymbol("QS"), Card.create(CardModel.Suit.Spades, 12))).toBeTruthy()
  expect(Card.equals(Card.fromSymbol("10C"), Card.create(CardModel.Suit.Clubs, 10))).toBeTruthy()
})

it("fromList", () => {
  expect(Card.fromList("2C AS 5H")).toEqual([
    Card.create(CardModel.Suit.Clubs, 2),
    Card.create(CardModel.Suit.Spades, 14),
    Card.create(CardModel.Suit.Hearts, 5),
  ])
})
