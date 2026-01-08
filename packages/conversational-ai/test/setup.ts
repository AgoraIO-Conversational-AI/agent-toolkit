/**
 * Global test setup for client-sdk tests
 */

// Mock environment if needed
globalThis.console = {
  ...console,
  // Suppress console.log in tests unless VERBOSE=true
  log: process.env.VERBOSE ? console.log : () => {},
}
