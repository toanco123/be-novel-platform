import type { QUEUES } from './queue.constants'

/** Tên một hàng đợi trong QUEUES */
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]
