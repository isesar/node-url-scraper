import { describe, it, expect } from 'vitest'
import { normalize } from '../src/parser/urlNormalize'

describe('normalize()', () => {
    it('adds https scheme when missing', () => {
        const n = normalize('Example.COM')
        expect(n.requestUrl).toBe('https://example.com/')
        expect(n.displayUrl).toBe('example.com')
        expect(n.key).toBe('example.com')
    })

    it('preserves scheme when present and lowercases host', () => {
        const n = normalize('HTTP://EXAMPLE.com/path?q=1')
        expect(n.requestUrl).toBe('http://example.com/path?q=1')
        expect(n.displayUrl).toBe('example.com/path?q=1')
        expect(n.key).toBe('example.com/path?q=1')
    })

    it('strips trailing punctuation from token before parsing', () => {
        const n = normalize('example.com)')
        expect(n.requestUrl).toBe('https://example.com/')
        expect(n.displayUrl).toBe('example.com')
    })

    it('falls back gracefully on invalid URL tokens', () => {
        const n = normalize('foo_bar_invalid_token')
        expect(n.requestUrl).toBe('https://foo_bar_invalid_token/')
        expect(n.displayUrl).toBe('foo_bar_invalid_token')
        expect(n.key).toBe('foo_bar_invalid_token')
    })

    it('preserves path/search/hash and lowercases only host', () => {
        const n = normalize('HTTPS://ExAmple.COM/Path/To?q=Q#Hash')
        expect(n.requestUrl).toBe('https://example.com/Path/To?q=Q#Hash')
        expect(n.displayUrl).toBe('example.com/Path/To?q=Q#Hash')
    })

    it('handles subdomains and mixed-case TLD', () => {
        const n = normalize('Sub.EXAMPLE.Co.UK/foo')
        expect(n.requestUrl).toBe('https://sub.example.co.uk/foo')
        expect(n.displayUrl).toBe('sub.example.co.uk/foo')
    })

    it('strips multiple trailing punctuation characters', () => {
        const n = normalize('example.com)!?')
        expect(n.requestUrl).toBe('https://example.com/')
        expect(n.displayUrl).toBe('example.com')
    })

    it('ignores surrounding whitespace', () => {
        const n = normalize('  \texample.com\n  ')
        expect(n.requestUrl).toBe('https://example.com/')
        expect(n.displayUrl).toBe('example.com')
    })

    it('does not change case of path segment', () => {
        const n = normalize('HTTPS://EXAMPLE.com/MiXeD')
        expect(n.displayUrl).toBe('example.com/MiXeD')
    })
})
