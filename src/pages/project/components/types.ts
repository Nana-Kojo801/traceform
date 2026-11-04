import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'

export type Workspace = FunctionReturnType<typeof api.runs.workspace>
export type ProjectDoc = NonNullable<FunctionReturnType<typeof api.projects.get>>
export type DocumentRow = FunctionReturnType<typeof api.documents.list>[number]
export type SchemaRow = FunctionReturnType<typeof api.forms.get>
export type FieldResultRow = Workspace['results'][number]

/** Which citation is focused in the source viewer. */
export interface ActiveEvidence {
  fieldId: string
  index: number
  /** bumps on every click so the highlight animation replays */
  nonce: number
}
