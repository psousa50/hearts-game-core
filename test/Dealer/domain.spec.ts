import { distributeCards } from "../../src/Dealer/domain"

it("distribute cards", () => {
  const deck = [1, 2, 3, 4, 5, 6] as any

  expect(distributeCards(deck, 2)).toEqual({ cards: [1, 2], deck: [3, 4, 5, 6] })
})
