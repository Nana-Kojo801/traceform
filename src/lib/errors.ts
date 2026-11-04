import { ConvexError } from 'convex/values'

/** Extract a user-facing message from a Convex or network error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) return typeof err.data === 'string' ? err.data : 'Request failed.'
  if (err instanceof Error) {
    const m = err.message.match(/Uncaught (?:ConvexError|Error): (.*?)(?:\n|$)/)
    return m ? m[1] : err.message
  }
  return 'Something went wrong.'
}
