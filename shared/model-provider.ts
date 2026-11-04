// The single place TraceForm calls Meta's Model API (Responses protocol).
// Confirmed request/response shapes are documented in docs/meta-model-api.md.

import { modelOutputJsonSchema } from './model-output'

export interface ModelConfig {
  apiKey: string
  model: string
  baseUrl: string
  reasoningEffort: string
}

export interface ModelCallResult {
  text: string
  responseId: string | null
  inputTokens: number
  outputTokens: number
}

/** A user message with text and image blocks (Responses API input array). */
export interface ResponsesInputItem {
  role: 'user'
  content: ({ type: 'input_text'; text: string } | { type: 'input_image'; image_url: string })[]
}

export class ModelApiError extends Error {
  status: number | null
  retryable: boolean
  constructor(message: string, status: number | null, retryable: boolean) {
    super(message)
    this.status = status
    this.retryable = retryable
  }
}

interface ResponsesOutputItem {
  type: string
  content?: { type: string; text?: string }[]
}

interface ResponsesBody {
  id?: string
  status?: string
  output?: ResponsesOutputItem[]
  error?: { message?: string } | null
  usage?: { input_tokens?: number; output_tokens?: number }
}

export async function callStructured(
  config: ModelConfig,
  instructions: string,
  input: string | ResponsesInputItem[],
  schema: { name: string; schema: unknown } = { name: 'traceform_extraction', schema: modelOutputJsonSchema },
): Promise<ModelCallResult> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      instructions,
      input,
      store: false,
      reasoning: { effort: config.reasoningEffort },
      text: {
        format: {
          type: 'json_schema',
          name: schema.name,
          strict: true,
          schema: schema.schema,
        },
      },
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      detail = body.error?.message ?? ''
    } catch {
      /* ignore */
    }
    const retryable = res.status === 429 || res.status >= 500
    const hint =
      res.status === 401 || res.status === 403
        ? 'The Meta API key was rejected.'
        : res.status === 429
          ? 'Meta API rate limit or credit limit reached.'
          : `Meta API returned HTTP ${res.status}.`
    throw new ModelApiError(`${hint}${detail ? ` ${detail.slice(0, 200)}` : ''}`, res.status, retryable)
  }

  const body = (await res.json()) as ResponsesBody
  if (body.status && body.status !== 'completed') {
    throw new ModelApiError(
      `Meta API response status was "${body.status}"${body.error?.message ? `: ${body.error.message}` : ''}.`,
      null,
      true,
    )
  }
  const text = (body.output ?? [])
    .filter((o) => o.type === 'message')
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === 'output_text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('')
  return {
    text,
    responseId: body.id ?? null,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  }
}

/** Free connectivity check: lists models (no tokens consumed). */
export async function listModels(config: Pick<ModelConfig, 'apiKey' | 'baseUrl'>): Promise<string[]> {
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  })
  if (!res.ok) throw new ModelApiError(`Meta API returned HTTP ${res.status}.`, res.status, false)
  const body = (await res.json()) as { data?: { id: string }[] }
  return (body.data ?? []).map((m) => m.id)
}
