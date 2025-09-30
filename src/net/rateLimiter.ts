type Job = () => Promise<unknown>

const queue: Job[] = []
let running = false

function runNext() {
    if (queue.length === 0) {
        running = false
        return
    }
    running = true
    const job = queue.shift()
    if (job) {
        void job()
            .catch(() => {})
            .finally(() => {
                setTimeout(runNext, 1000)
            })
    }
}

export function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        queue.push(async () => {
            try {
                const result = await fn()
                resolve(result)
            } catch (err) {
                reject(err)
            }
        })
        if (!running) runNext()
    })
}
