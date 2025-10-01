import { describe, it, expect } from 'vitest'
import { enqueue } from '../src/net/rateLimiter'

describe('enqueue()', () => {
    it('executes a single job and resolves with its result', async () => {
        const job = () => Promise.resolve('result')
        const result = await enqueue(job)
        expect(result).toBe('result')
    })

    it('executes multiple jobs sequentially', async () => {
        const callOrder: number[] = []

        const job1 = () => {
            callOrder.push(1)
            return Promise.resolve('first')
        }
        const job2 = () => {
            callOrder.push(2)
            return Promise.resolve('second')
        }
        const job3 = () => {
            callOrder.push(3)
            return Promise.resolve('third')
        }

        const p1 = enqueue(job1)
        const p2 = enqueue(job2)
        const p3 = enqueue(job3)

        await Promise.all([p1, p2, p3])
        expect(callOrder).toEqual([1, 2, 3])
    })

    it('handles job rejection', async () => {
        const job = () => Promise.reject(new Error('Job failed'))
        await expect(enqueue(job)).rejects.toThrow('Job failed')
    })

    it('continues processing queue after a job fails', async () => {
        const callOrder: string[] = []

        const job1 = () => {
            callOrder.push('job1')
            return Promise.reject(new Error('Failed'))
        }
        const job2 = () => {
            callOrder.push('job2')
            return Promise.resolve('success')
        }

        const p1 = enqueue(job1).catch(() => 'caught')
        const p2 = enqueue(job2)

        const [r1, r2] = await Promise.all([p1, p2])

        expect(callOrder).toEqual(['job1', 'job2'])
        expect(r1).toBe('caught')
        expect(r2).toBe('success')
    })

    it('resolves each job with its correct value', async () => {
        const job1 = () => Promise.resolve(42)
        const job2 = () => Promise.resolve('text')
        const job3 = () => Promise.resolve(true)

        const [r1, r2, r3] = await Promise.all([
            enqueue(job1),
            enqueue(job2),
            enqueue(job3),
        ])

        expect(r1).toBe(42)
        expect(r2).toBe('text')
        expect(r3).toBe(true)
    })
})
