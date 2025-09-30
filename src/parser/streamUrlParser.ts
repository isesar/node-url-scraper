export type UrlHandler = (rawToken: string) => void

// Simple URL-like token regex: optional scheme, domain.tld, optional path/query/hash
const URL_REGEX = /\b((https?:\/\/)?[\w.-]+\.[a-z]{2,}(?:\/\S*)?)\b/i

export class StreamUrlParser {
    private handler: UrlHandler | null = null
    private depth = 0 // counts only non-escaped brackets
    private inOuter = false // true when depth === 1
    private prevBackslash = false // true iff previous character was '\\'
    private currentToken = ''
    private lastUrlToken: string | null = null

    onUrl(fn: UrlHandler): void {
        this.handler = fn
    }

    write(chunk: string | Buffer): void {
        const s = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
        for (let i = 0; i < s.length; i++) {
            const ch = s[i]!

            if (ch === '[') {
                if (this.prevBackslash) {
                    // literal '['
                    // do not include '[' in token; treat as delimiter
                    if (this.inOuter) this.finishToken()
                    this.prevBackslash = false
                    continue
                }
                this.depth++
                if (this.depth === 1) {
                    this.inOuter = true
                    this.currentToken = ''
                    this.lastUrlToken = null
                } else if (this.inOuter) {
                    // nested '[' acts as delimiter in outer text
                    this.finishToken()
                }
                this.prevBackslash = false
                continue
            }

            if (ch === ']') {
                if (this.prevBackslash) {
                    // literal ']'
                    // do not include ']' in token; treat as delimiter
                    if (this.inOuter) this.finishToken()
                    this.prevBackslash = false
                    continue
                }
                if (this.inOuter) {
                    // finalize current token before closing the outer pair
                    this.finishToken()
                }
                if (this.depth > 0) this.depth--
                if (this.depth === 0 && this.inOuter) {
                    // close of outermost
                    if (this.lastUrlToken && this.handler) {
                        this.handler(this.lastUrlToken)
                    }
                    this.inOuter = false
                    this.currentToken = ''
                    this.lastUrlToken = null
                } else if (this.inOuter) {
                    // nested ']' acts as delimiter
                    this.finishToken()
                }
                this.prevBackslash = false
                continue
            }

            if (ch === '\\') {
                // mark that the previous character is a backslash
                // do not add to token (not part of URL tokens)
                this.prevBackslash = true
                continue
            }

            // Any other character
            if (this.inOuter) {
                if (this.isWhitespace(ch)) {
                    this.finishToken()
                } else {
                    this.currentToken += ch
                }
            }

            // any non-backslash character clears the prevBackslash flag
            this.prevBackslash = false
        }
    }

    end(): void {
        // Do not emit on EOF unless a valid outer pair was closed
        // Flush any pending token if needed is not required because emit only occurs on closing ']'.
    }

    private isWhitespace(ch: string): boolean {
        return (
            ch === ' ' ||
            ch === '\n' ||
            ch === '\r' ||
            ch === '\t' ||
            ch === '\f' ||
            ch === '\v'
        )
    }

    private finishToken(): void {
        if (this.currentToken.length > 0) {
            const token = this.currentToken
            if (URL_REGEX.test(token)) {
                this.lastUrlToken = token
            }
            this.currentToken = ''
        }
    }
}
