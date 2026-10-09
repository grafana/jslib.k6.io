import { check } from 'k6'
import { browser, browserAI, createLLMClient } from '../lib/k6-browser-ai/0.1.0/index.js'

export function BrowserAIExports() {
  check(null, {
    'browser is exported': () => browser !== undefined,
    'browserAI is exported': () => browserAI !== undefined,
    'createLLMClient is a function': () => typeof createLLMClient === 'function',
  })
}
