type Job = () => Promise<unknown>

const queue: Job[] = []
let running = false
let onIdleCallback: (() => void) | null = null

function runNext() {
    if (queue.length === 0) {
        running = false
        if (onIdleCallback) {
            onIdleCallback()
            onIdleCallback = null
        }
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

export function onIdle(callback: () => void): void {
    if (!running && queue.length === 0) {
        callback()
    } else {
        onIdleCallback = callback
    }
}
