import { Card } from "../Cards/model"

export const create = (name: string) => ({ name, tricks: [] as Card[][] })

export const started = () => {
  //
}
