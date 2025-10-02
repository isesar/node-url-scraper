export type UrlHandler = (rawToken: string) => void

// Simple URL-like token regex: optional scheme, domain.tld, optional path/query/hash
const URL_REGEX = /\b((https?:\/\/)?[\w.-]+\.[a-z]{2,}(?:\/\S*)?)\b/i

interface BracketContext {
    currentToken: string
    lastUrlToken: string | null
}

export class StreamUrlParser {
    private handler: UrlHandler | null = null
    private stack: BracketContext[] = []
    private prevBackslash = false

    onUrl(fn: UrlHandler): void {
        this.handler = fn
    }

    write(chunk: string | Buffer): void {
        if (chunk == null) return

        const s = this.normalizeInput(chunk)

        for (let i = 0; i < s.length; i++) {
            const ch = s[i]!

            if (ch === '[') {
                if (this.prevBackslash) {
                    if (this.stack.length > 0) this.finishToken()
                    this.prevBackslash = false
                    continue
                }
                if (this.stack.length > 0) {
                    this.finishToken()
                }
                this.stack.push({ currentToken: '', lastUrlToken: null })
                this.prevBackslash = false
                continue
            }

            if (ch === ']') {
                if (this.prevBackslash) {
                    if (this.stack.length > 0) this.finishToken()
                    this.prevBackslash = false
                    continue
                }
                if (this.stack.length > 0) {
                    this.finishToken()
                    const context = this.stack.pop()!

                    if (
                        this.stack.length === 0 &&
                        context.lastUrlToken &&
                        this.handler
                    ) {
                        this.handler(context.lastUrlToken)
                    }
                }
                this.prevBackslash = false
                continue
            }

            if (ch === '\\') {
                this.prevBackslash = true
                continue
            }

            if (this.stack.length > 0) {
                const context = this.stack[this.stack.length - 1]!
                if (this.isWhitespace(ch)) {
                    this.finishToken()
                } else {
                    context.currentToken += ch
                }
            }

            this.prevBackslash = false
        }
    }

    end(): void {}

    private normalizeInput(chunk: string | Buffer): string {
        if (typeof chunk === 'string') return chunk
        if (Buffer.isBuffer(chunk)) return chunk.toString('utf8')
        return String(chunk)
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
        if (this.stack.length === 0) return

        const context = this.stack[this.stack.length - 1]!
        if (context.currentToken.length > 0) {
            const token = context.currentToken
            if (URL_REGEX.test(token)) {
                context.lastUrlToken = token
            }
            context.currentToken = ''
        }
    }
}
