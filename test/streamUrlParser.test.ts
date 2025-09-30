import { describe, it, expect } from 'vitest'
import { StreamUrlParser } from '../src/parser/streamUrlParser'

function capture(parser: StreamUrlParser) {
  const emitted: string[] = []
  parser.onUrl((t) => emitted.push(t))
  return emitted
}

describe('StreamUrlParser', () => {
  it('emits the last URL-like token inside the outer [ ... ]', () => {
    const p = new StreamUrlParser()
    const out = capture(p)

    p.write('prefix [ hello https://example.com and http://foo.bar/baz ] suffix')

    expect(out).toEqual(['http://foo.bar/baz'])
  })

  it('does not emit if the closing bracket is missing', () => {
    const p = new StreamUrlParser()
    const out = capture(p)

    p.write('[ visit example.com now')
    p.end()

    expect(out).toEqual([])
  })

  it('handles chunked input across writes', () => {
    const p = new StreamUrlParser()
    const out = capture(p)

    p.write('pre [ a https://exa')
    p.write('mple.com b ] post')

    expect(out).toEqual(['https://example.com'])
  })

  // Edge cases merged from separate edge test
  it('treats escaped closing bracket \\] as literal and does not close the outer block', () => {
    const p = new StreamUrlParser()
    const out = capture(p)
    p.write('[ before https://a.example x \\] y https://b.example ]')
    expect(out).toEqual(['https://b.example'])
  })

  it('treats escaped opening bracket \\[ as delimiter but not as nested depth', () => {
    const p = new StreamUrlParser()
    const out = capture(p)
    p.write('[ a https://one.example x \\[ y z https://two.example ]')
    expect(out).toEqual(['https://two.example'])
  })

  it('nested brackets inside the outer act as delimiters but do not emit until the outer closes', () => {
    const p = new StreamUrlParser()
    const out = capture(p)
    p.write('[ a https://one.example [ mid ] tail https://two.example ]')
    expect(out).toEqual(['https://two.example'])
  })

  it('splits tokens on whitespace including newlines and tabs', () => {
    const p = new StreamUrlParser()
    const out = capture(p)
    p.write('[ a\n\t b https://one.example\n\t c ]')
    expect(out).toEqual(['https://one.example'])
  })

  it('does not emit when no URL-like token is present inside the outer brackets', () => {
    const p = new StreamUrlParser()
    const out = capture(p)
    p.write('[ just words without a link ]')
    expect(out).toEqual([])
  })

  it('emits for multiple independent outer blocks in order', () => {
    const p = new StreamUrlParser()
    const out = capture(p)
    p.write('[ one https://a.example ] middle [ two https://b.example ] end')
    expect(out).toEqual(['https://a.example', 'https://b.example'])
  })

  it('handles streams across multiple writes with brackets split', () => {
    const p = new StreamUrlParser()
    const out = capture(p)
    p.write('prefix [ a https://exa')
    p.write('mple.com b ] suffix [ c http://foo.')
    p.write('bar/baz d ] tail')
    expect(out).toEqual(['https://example.com', 'http://foo.bar/baz'])
  })
})
