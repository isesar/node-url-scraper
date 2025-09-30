import { load } from 'cheerio'
import crypto from 'node:crypto'

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

export interface ExtractResult {
    title?: string
    emailHash?: string
}

export function extract(html: string): ExtractResult {
    let title: string | undefined
    try {
        const $ = load(html)
        const t = $('title').first().text().trim()
        if (t) title = t
    } catch (err) {
        console.error(err)
    }

    let emailHash: string | undefined
    const match = html.match(EMAIL_REGEX)
    if (match && match[0]) {
        const email = match[0]
        const secret = process.env.IM_SECRET || ''
        if (secret) {
            emailHash = crypto
                .createHash('sha256')
                .update(secret + email)
                .digest('hex')
        }
    }

    const out: ExtractResult = {}
    if (title) out.title = title
    if (emailHash) out.emailHash = emailHash
    return out
}
