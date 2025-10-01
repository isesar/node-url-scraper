import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { createPipeline } from './core/pipeline'

function printUsage() {
    const msg = `Usage:\n  url-scraper <path-to-text-file>\n  (no args): read from STDIN and start processing immediately\n\nInput format:\n  Wrap content in [ ... ] and include a URL. The last URL-like token\n  inside the bracket pair will be scraped.\n  Example: [hello https://example.com world]\n\nTips:\n  - When reading from STDIN, press Ctrl+D to finish input.`
    process.stderr.write(msg + '\n')
}

function main() {
    const args = process.argv.slice(2)
    const pipeline = createPipeline()

    if (args.includes('--help') || args.includes('-h')) {
        printUsage()
        return
    }

    if (args.length >= 1) {
        const rel = args[0] || ''
        if (!rel) {
            printUsage()
            process.exitCode = 1
            return
        }
        const filePath = path.resolve(__dirname, rel)
        const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
        stream.on('data', (chunk) => pipeline.handleRawChunk(chunk))
        stream.on('end', () => pipeline.end())
        stream.on('error', (err) => {
            process.stderr.write(
                `[ERROR] Failed to read file: ${filePath} - ${err instanceof Error ? err.message : String(err)}\n`,
            )
            pipeline.end()
            process.exitCode = 1
        })
        return
    }

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => pipeline.handleRawChunk(chunk))
    process.stdin.on('end', () => pipeline.end())
    process.stdin.on('error', (err) => {
        process.stderr.write(
            `[ERROR] stdin error: ${err instanceof Error ? err.message : String(err)}\n`,
        )
        pipeline.end()
        process.exitCode = 1
    })

    if (process.stdin.isTTY && process.stdout.isTTY) {
        const prompt = [
            'Interactive mode: type your text and press Ctrl+D when done.',
            'Wrap URLs inside [ ... ] to trigger scraping. The last URL-like token inside the brackets will be used.',
            'Example: [hello https://example.com world]',
            'Waiting for input...',
        ].join('\n')
        process.stderr.write(prompt + '\n')
    }
}

main()
