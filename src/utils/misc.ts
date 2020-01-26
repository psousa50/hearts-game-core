
export const rnd = (exclusiveMaxValue: number) => Math.floor(Math.random() * exclusiveMaxValue)

export const randomElement = <T>(coll: ReadonlyArray<T>) => coll.length > 0 ?  coll[ rnd(coll.length)] : undefined

export const lj = (m: string, data: any) => console.log(m, "=>", JSON.stringify(data, null, 2))
