import { left, right } from "fp-ts/lib/Either"
import { ask as askReader } from "fp-ts/lib/Reader"
import { fromEither, ReaderEither, rightReader } from "fp-ts/lib/ReaderEither"
import { Environment } from "../Environment/model"
import { Game, GameError } from "../Game/model"

export type ActionResult<R = void> = ReaderEither<Environment, GameError, R>
export type Action<I = void, R = void> = (i: I) => ActionResult<R>
export type GameAction = Action<Game, Game>

export const ask = () => rightReader<Environment, GameError, Environment>(askReader<Environment>())

export const actionOf = <R>(v: R): ActionResult<R> => fromEither(right(v))
export function actionErrorOf<R>(error: GameError): ActionResult<R> {
  return fromEither(left<GameError, R>(error))
}
