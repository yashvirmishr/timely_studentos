# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Timely, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainer or open a private security advisory through GitHub:

1. Go to the [Security tab](https://github.com/yashvirmishr/timely_studentos/security) of the repository
2. Click **"Report a vulnerability"**
3. Fill in the advisory form with details

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Time

We aim to acknowledge reports within **72 hours** and provide a fix or mitigation plan within **7 days**.

## Scope

This applies to:

- The Timely web application (`src/`)
- The Tauri desktop wrapper (`src-tauri/`)
- The Gemini AI integration (`src/lib/local-ai.ts`)

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Security Best Practices

Timely stores all data locally in the browser (localStorage). API keys are stored in the browser's localStorage and are never sent to any server other than Google's Gemini API directly from the client. No data is transmitted to Timely servers — there are none.
