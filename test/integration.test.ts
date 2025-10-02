import { describe, it, expect, vi, afterEach } from 'vitest'
import { createPipeline } from '../src/core/pipeline'

// Helper to capture stdout/stderr
function captureOutput() {
    const stdout: string[] = []
    const stderr: string[] = []

    const originalStdoutWrite = process.stdout.write.bind(process.stdout)
    const originalStderrWrite = process.stderr.write.bind(process.stderr)

    process.stdout.write = ((chunk: any) => {
        stdout.push(chunk.toString())
        return true
    }) as any

    process.stderr.write = ((chunk: any) => {
        stderr.push(chunk.toString())
        return true
    }) as any

    const restore = () => {
        process.stdout.write = originalStdoutWrite
        process.stderr.write = originalStderrWrite
    }

    return { stdout, stderr, restore }
}

// Helper to wait for async operations
async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('Integration Tests', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
        globalThis.fetch = originalFetch
        vi.restoreAllMocks()
    })

    it('processes bracketed URL and outputs JSON with title', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () =>
                '<html><head><title>Test Page</title></head><body></body></html>',
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk('[ check https://example.com here ]')
        pipeline.end()

        await wait(1500)
        capture.restore()

        const output = capture.stdout.join('')
        const lines = output.trim().split('\n').filter(Boolean)
        expect(lines.length).toBe(1)

        const json = JSON.parse(lines[0]!)
        expect(json).toEqual({
            url: 'example.com',
            title: 'Test Page',
        })
    })

    it('extracts email hash when IM_SECRET is set', async () => {
        const originalSecret = process.env.IM_SECRET
        process.env.IM_SECRET = 'test-secret'

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () =>
                '<html><head><title>Contact</title></head><body>Email: test@example.com</body></html>',
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk('[ check https://example.com ]')
        pipeline.end()

        await wait(1500)
        capture.restore()
        process.env.IM_SECRET = originalSecret

        const output = capture.stdout.join('')
        const json = JSON.parse(output.trim())

        expect(json.url).toBe('example.com')
        expect(json.title).toBe('Contact')
        expect(json.email).toBeDefined()
        expect(typeof json.email).toBe('string')
        expect(json.email.length).toBe(64)
    })

    it('emits last URL from each bracket pair', async () => {
        globalThis.fetch = vi.fn().mockImplementation((url) => {
            const urlStr = url.toString()
            if (urlStr.includes('second.com')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () =>
                        '<html><head><title>Second</title></head></html>',
                })
            }
            if (urlStr.includes('fourth.com')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: async () =>
                        '<html><head><title>Fourth</title></head></html>',
                })
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                text: async () => '<html></html>',
            })
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk(
            '[ first.com second.com ] middle [ third.com fourth.com ]',
        )
        pipeline.end()

        await wait(1500)
        capture.restore()

        const output = capture.stdout.join('')
        const lines = output.trim().split('\n').filter(Boolean)
        expect(lines.length).toBe(2)

        const json1 = JSON.parse(lines[0]!)
        const json2 = JSON.parse(lines[1]!)

        expect(json1.url).toBe('second.com')
        expect(json2.url).toBe('fourth.com')
    })

    it('deduplicates URLs', async () => {
        let callCount = 0
        globalThis.fetch = vi.fn().mockImplementation(() => {
            callCount++
            return Promise.resolve({
                ok: true,
                status: 200,
                text: async () =>
                    '<html><head><title>Same</title></head></html>',
            })
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk(
            '[ https://example.com ] text [ https://example.com ]',
        )
        pipeline.end()

        await wait(1500)
        capture.restore()

        const output = capture.stdout.join('')
        const lines = output.trim().split('\n').filter(Boolean)
        expect(lines.length).toBe(1)
        expect(callCount).toBe(1)
    })

    it('handles nested brackets correctly', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '<html><head><title>Outer</title></head></html>',
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk(
            '[ inner [https://inner.com] https://outer.com ]',
        )
        pipeline.end()

        await wait(1500)
        capture.restore()

        const output = capture.stdout.join('')
        const json = JSON.parse(output.trim())
        expect(json.url).toBe('outer.com')
    })

    it('handles escaped brackets', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '<html><head><title>Test</title></head></html>',
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk(
            '\\[ not-detected.com ] [ https://detected.com ]',
        )
        pipeline.end()

        await wait(1500)
        capture.restore()

        const output = capture.stdout.join('')
        const lines = output.trim().split('\n').filter(Boolean)
        expect(lines.length).toBe(1)

        const json = JSON.parse(lines[0]!)
        expect(json.url).toBe('detected.com')
    })

    it('outputs only URL when title and email are missing', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '<html><body>No title, no email</body></html>',
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk('[ https://minimal.com ]')
        pipeline.end()

        await wait(1500)
        capture.restore()

        const output = capture.stdout.join('')
        const json = JSON.parse(output.trim())

        expect(json).toEqual({ url: 'minimal.com' })
        expect(json.title).toBeUndefined()
        expect(json.email).toBeUndefined()
    })

    it('logs error to stderr when request fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => 'Not Found',
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk('[ https://notfound.com ]')
        pipeline.end()

        await wait(62000)

        capture.restore()

        const errors = capture.stderr.join('')
        expect(errors).toContain('notfound.com')
        expect(errors).toContain('ERROR')
    }, 65000)

    it('enforces rate limiting (1 request per second)', async () => {
        const timestamps: number[] = []
        globalThis.fetch = vi.fn().mockImplementation(() => {
            timestamps.push(Date.now())
            return Promise.resolve({
                ok: true,
                status: 200,
                text: async () => '<html></html>',
            })
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk(
            '[ https://first.com ] [ https://second.com ] [ https://third.com ]',
        )
        pipeline.end()

        await wait(3500)

        capture.restore()

        expect(timestamps.length).toBe(3)
        expect(timestamps[1]! - timestamps[0]!).toBeGreaterThanOrEqual(1000)
        expect(timestamps[2]! - timestamps[1]!).toBeGreaterThanOrEqual(1000)
    }, 5000)

    it('handles streaming input across multiple chunks', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () =>
                '<html><head><title>Streamed</title></head></html>',
        })

        const capture = captureOutput()
        const pipeline = createPipeline()

        pipeline.handleRawChunk('[ check https://exa')
        pipeline.handleRawChunk('mple.com now ]')
        pipeline.end()

        await wait(1500)
        capture.restore()

        const output = capture.stdout.join('')
        const json = JSON.parse(output.trim())
        expect(json.url).toBe('example.com')
        expect(json.title).toBe('Streamed')
    })
})
