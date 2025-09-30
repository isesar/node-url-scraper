export type UrlHandler = (rawToken: string) => void

// Simple URL-like token regex: optional scheme, domain.tld, optional path/query/hash
const URL_REGEX = /\b((https?:\/\/)?[\w.-]+\.[a-z]{2,}(?:\/\S*)?)\b/i

export class StreamUrlParser {
    private handler: UrlHandler | null = null
    private depth = 0
    private inOuter = false
    private prevBackslash = false
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
                    this.finishToken()
                }
                this.prevBackslash = false
                continue
            }

            if (ch === ']') {
                if (this.prevBackslash) {
                    if (this.inOuter) this.finishToken()
                    this.prevBackslash = false
                    continue
                }
                if (this.inOuter) {
                    this.finishToken()
                }
                if (this.depth > 0) this.depth--
                if (this.depth === 0 && this.inOuter) {
                    if (this.lastUrlToken && this.handler) {
                        this.handler(this.lastUrlToken)
                    }
                    this.inOuter = false
                    this.currentToken = ''
                    this.lastUrlToken = null
                } else if (this.inOuter) {
                    this.finishToken()
                }
                this.prevBackslash = false
                continue
            }

            if (ch === '\\') {
                this.prevBackslash = true
                continue
            }

            if (this.inOuter) {
                if (this.isWhitespace(ch)) {
                    this.finishToken()
                } else {
                    this.currentToken += ch
                }
            }

            this.prevBackslash = false
        }
    }

    end(): void {}

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
