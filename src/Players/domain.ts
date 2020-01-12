import { PlayerId } from "./model"

export const create = (id: PlayerId, name: string) => ({ id, name, hand: [], tricks: [] })
