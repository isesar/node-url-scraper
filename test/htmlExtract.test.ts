import { describe, it, expect, afterEach } from 'vitest'
import { extract } from '../src/extract/htmlExtract'

describe('extract()', () => {
    const originalEnv = process.env.IM_SECRET

    afterEach(() => {
        process.env.IM_SECRET = originalEnv
    })

    it('extracts title from HTML', () => {
        const html =
            '<html><head><title>Test Page</title></head><body></body></html>'
        const result = extract(html)
        expect(result.title).toBe('Test Page')
        expect(result.emailHash).toBeUndefined()
    })

    it('returns undefined title when title tag is missing', () => {
        const html = '<html><head></head><body>No title here</body></html>'
        const result = extract(html)
        expect(result.title).toBeUndefined()
    })

    it('returns undefined title when title tag is empty', () => {
        const html = '<html><head><title></title></head><body></body></html>'
        const result = extract(html)
        expect(result.title).toBeUndefined()
    })

    it('trims whitespace from title', () => {
        const html =
            '<html><head><title>  Spaced Title  </title></head></body></html>'
        const result = extract(html)
        expect(result.title).toBe('Spaced Title')
    })

    it('extracts first email from HTML body', () => {
        process.env.IM_SECRET = 'test-secret'
        const html =
            '<html><body>Contact us at test@example.com or admin@example.com</body></html>'
        const result = extract(html)
        expect(result.emailHash).toBeDefined()
        expect(typeof result.emailHash).toBe('string')
        expect(result.emailHash?.length).toBe(64) // SHA-256 hex length
    })

    it('does not include emailHash when IM_SECRET is not set', () => {
        delete process.env.IM_SECRET
        const html = '<html><body>Contact: test@example.com</body></html>'
        const result = extract(html)
        expect(result.emailHash).toBeUndefined()
    })

    it('does not include emailHash when IM_SECRET is empty', () => {
        process.env.IM_SECRET = ''
        const html = '<html><body>Contact: test@example.com</body></html>'
        const result = extract(html)
        expect(result.emailHash).toBeUndefined()
    })

    it('hashes email correctly with secret', () => {
        process.env.IM_SECRET = 'my-secret'
        const html = '<html><body>Email: user@test.com</body></html>'
        const result = extract(html)

        // Manually compute expected hash: sha256('my-secret' + 'user@test.com')
        const crypto = require('node:crypto')
        const expected = crypto
            .createHash('sha256')
            .update('my-secretuser@test.com')
            .digest('hex')

        expect(result.emailHash).toBe(expected)
    })

    it('returns undefined emailHash when no email is present', () => {
        process.env.IM_SECRET = 'test-secret'
        const html = '<html><body>No email here</body></html>'
        const result = extract(html)
        expect(result.emailHash).toBeUndefined()
    })

    it('detects email in various formats', () => {
        process.env.IM_SECRET = 'secret'
        const testCases = [
            'user@example.com',
            'TEST@EXAMPLE.COM',
            'user.name+tag@example.co.uk',
            'user_name@example-domain.com',
        ]

        testCases.forEach((email) => {
            const html = `<html><body>${email}</body></html>`
            const result = extract(html)
            expect(result.emailHash).toBeDefined()
        })
    })

    it('extracts both title and email when both present', () => {
        process.env.IM_SECRET = 'secret'
        const html =
            '<html><head><title>Contact Us</title></head><body>Email: info@example.com</body></html>'
        const result = extract(html)
        expect(result.title).toBe('Contact Us')
        expect(result.emailHash).toBeDefined()
    })

    it('handles malformed HTML gracefully', () => {
        const html = '<html><title>Broken<body>test@example.com'
        const result = extract(html)
        // Should not throw, may or may not extract depending on parser tolerance
        expect(result).toBeDefined()
    })
})
