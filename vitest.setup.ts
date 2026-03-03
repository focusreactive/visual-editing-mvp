// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Auto-cleanup @testing-library/react after each test
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
