import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchOnce } from '../src/net/httpClient'

describe('fetchOnce()', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
        globalThis.fetch = originalFetch
        vi.restoreAllMocks()
    })

    it('returns ok:true with body when fetch succeeds', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            text: vi.fn().mockResolvedValue('<html>Success</html>'),
        }
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

        const result = await fetchOnce('https://example.com')

        expect(result.ok).toBe(true)
        expect(result.status).toBe(200)
        expect(result.body).toBe('<html>Success</html>')
        expect(result.error).toBeUndefined()
    })

    it('returns ok:false with status when response is not ok', async () => {
        const mockResponse = {
            ok: false,
            status: 404,
            text: vi.fn().mockResolvedValue('Not Found'),
        }
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

        const result = await fetchOnce('https://example.com/missing')

        expect(result.ok).toBe(false)
        expect(result.status).toBe(404)
        expect(result.body).toBe('Not Found')
    })

    it('returns ok:false with error message when fetch throws', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

        const result = await fetchOnce('https://example.com')

        expect(result.ok).toBe(false)
        expect(result.error).toBe('Network error')
        expect(result.status).toBeUndefined()
    })

    it('handles non-Error thrown objects', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue('String error')

        const result = await fetchOnce('https://example.com')

        expect(result.ok).toBe(false)
        expect(result.error).toBe('String error')
    })

    it('returns empty body when text() fails', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            text: vi.fn().mockRejectedValue(new Error('Text parse error')),
        }
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

        const result = await fetchOnce('https://example.com')

        expect(result.ok).toBe(true)
        expect(result.status).toBe(200)
        expect(result.body).toBe('')
    })

    it('follows redirects by default', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            text: vi.fn().mockResolvedValue('Redirected content'),
        }
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

        await fetchOnce('https://example.com/redirect')

        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://example.com/redirect',
            { redirect: 'follow' },
        )
    })

    it('handles 5xx server errors', async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            text: vi.fn().mockResolvedValue('Internal Server Error'),
        }
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

        const result = await fetchOnce('https://example.com')

        expect(result.ok).toBe(false)
        expect(result.status).toBe(500)
    })
})
