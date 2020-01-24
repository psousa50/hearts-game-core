import { PlayerId } from "./model"

export const create = (id: PlayerId, name: string, type = "") => ({ id, name, type, hand: [], tricks: [] })
