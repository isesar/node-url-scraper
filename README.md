# URL Scraper

Node.js CLI tool for parsing and scraping URLs from bracketed text with rate limiting, retry logic, and HTML content extraction.

## Requirements

- Node.js >= 20.0.0 (uses global `fetch`)

## Installation

```bash
npm install
```

## Usage

### From a file

```bash
npm start -- path/to/file.txt
```

**Note**: The file path is resolved relative to the script location (`src/`), not the current working directory.

### From stdin (interactive)

```bash
npm start
```

Type or paste text, then press **Ctrl+D** to finish input.

### From stdin (piped)

```bash
echo "[ visit https://example.com now ]" | npm start
```

or

```bash
cat urls.txt | npm start
```

## Input Format

URLs must be wrapped in square brackets `[ ... ]`. Only the **last** URL-like token inside each bracket pair is scraped.

Examples:

```
[ check https://example.com here ]        → scrapes example.com
[ www.first.com and www.second.com ]     → scrapes www.second.com (last one)
[ nested [www.inner.com] www.outer.com ] → scrapes www.outer.com
\[www.escaped.com]                        → nothing (escaped brackets)
```

## Output

One JSON object per line (JSONL) written to stdout:

```json
{"url":"example.com","title":"Example Domain"}
{"url":"test.com","title":"Test Page","email":"a1b2c3..."}
```

- `url`: normalized URL (no scheme, lowercase host)
- `title`: HTML `<title>` tag content (if present)
- `email`: SHA-256 hash of first email found (if `IM_SECRET` is set)

Errors are written to stderr.

## Environment Variables

- `IM_SECRET`: Optional. When set, the first email found on each page is hashed as `sha256(IM_SECRET + email)` and included in output.

## Features

- **Rate limiting**: Maximum 1 HTTP request per second
- **Retry logic**: Failed requests are retried once after exactly 60 seconds
- **Deduplication**: Each URL is processed only once per run
- **Streaming**: Processes URLs as soon as they're detected (doesn't wait for EOF)

## Development

### Scripts

- `npm start` - Run the CLI
- `npm run dev` - Watch mode
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Generate coverage report
- `npm run lint` - Lint TypeScript files
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format all files with Prettier
- `npm run build` - Build TypeScript to CommonJS

### Testing

The project includes comprehensive unit tests using Vitest:

- Parser tests (`test/streamUrlParser.test.ts`)
- URL normalization tests (`test/urlNormalize.test.ts`)
- HTML extraction tests (`test/htmlExtract.test.ts`)
- HTTP client tests (`test/httpClient.test.ts`)
- Rate limiter tests (`test/rateLimiter.test.ts`)

Run tests with:

```bash
npm test
```

Generate coverage:

```bash
npm run test:cov
```
