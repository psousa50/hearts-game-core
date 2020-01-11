import { Hand } from "../Cards/model"
import { PlayerId } from "./model"

export const create = (id: PlayerId, name: string) => ({ id, name, hand: {} as Hand, tricks: [] as Hand[] })
