import { Either, getOrElse, left, right } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import { ask as askReader } from "fp-ts/lib/Reader"
import { fromEither, ReaderEither, rightReader } from "fp-ts/lib/ReaderEither"
import { Environment } from "../Environment/model"
import { Game, GameError } from "../Game/model"

type ActionResult<R = void> = ReaderEither<Environment, GameError, R>
type Action<I = void, R = void> = (i: I) => ActionResult<R>

export type GameResult = ActionResult<Game>
export type GameAction = Action<Game, Game>

export const ask = () => rightReader<Environment, GameError, Environment>(askReader<Environment>())

export const actionOf = <R>(v: R): ActionResult<R> => fromEither(right(v))
export function actionErrorOf<R>(error: GameError): ActionResult<R> {
  return fromEither(left<GameError, R>(error))
}

export const getEitherRight = <L, A>(fa: Either<L, A>) =>
  pipe(
    fa,
    getOrElse<L, A>(e => {
      throw new Error(`Should be Right => ${JSON.stringify(e)}`)
    }),
  )
