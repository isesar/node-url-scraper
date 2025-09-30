import { StreamUrlParser } from '../parser/streamUrlParser'
import { normalize } from '../parser/urlNormalize'
import { fetchOnce } from '../net/httpClient'
import { enqueue } from '../net/rateLimiter'
import { extract } from '../extract/htmlExtract'

export interface Pipeline {
    handleRawChunk: (chunk: string | Buffer) => void
    end: () => void
}

const DELAY = 60000

export function createPipeline(): Pipeline {
    const parser = new StreamUrlParser()
    const seen = new Set<string>()

    parser.onUrl((raw) => {
        const norm = normalize(raw)
        if (seen.has(norm.key)) return
        seen.add(norm.key)

        const runJob = (retried: boolean) => async () => {
            const res = await fetchOnce(norm.requestUrl)
            if (res.ok && typeof res.body === 'string') {
                const { title, emailHash } = extract(res.body)
                const out: Record<string, string> = { url: norm.displayUrl }
                if (title) out.title = title
                if (emailHash) out.email = emailHash
                process.stdout.write(`${JSON.stringify(out)}\n`)
                return
            }

            if (!retried) {
                setTimeout(() => {
                    void enqueue(runJob(true))
                }, DELAY)
            } else {
                const msg = res.status
                    ? String(res.status)
                    : res.error || 'request failed'
                process.stderr.write(`[ERROR] ${norm.displayUrl} - ${msg}\n`)
            }
        }

        void enqueue(runJob(false))
    })

    return {
        handleRawChunk: (chunk) => parser.write(chunk),
        end: () => parser.end(),
    }
}
