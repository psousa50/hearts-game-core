import * as Game from "../../src/Game/domain"
import { GameState, PlayerEvent } from "../../src/Game/model"
import * as Player from "../../src/Players/domain"

describe("game", () => {
  describe("On Start", () => {
    it("calls 'Started' on every player", () => {
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = Game.create([p1, p2])

      const dispatcher = jest.fn()
      Game.start(dispatcher)(game)

      expect(dispatcher).toHaveBeenCalledTimes(2)
      expect(dispatcher).toHaveBeenCalledWith(p1, PlayerEvent.GameStarted)
      expect(dispatcher).toHaveBeenCalledWith(p2, PlayerEvent.GameStarted)
    })

    it("should have status 'Playing", () => {
      const p1 = Player.create("Player 1")
      const p2 = Player.create("Player 2")

      const game = Game.create([p1, p2])

      const dispatcher = jest.fn()
      const gameStarted = Game.start(dispatcher)(game)

      expect(gameStarted.state).toBe(GameState.Playing)

    })
  })
})
