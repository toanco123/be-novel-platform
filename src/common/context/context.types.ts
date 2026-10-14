import type { Request } from 'express'

/** Request đã được requestIdMiddleware gắn id */
export type RequestWithId = Request & { id: string }
