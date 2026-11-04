# Meta Model API: what was confirmed

Checked against the official docs at https://dev.meta.ai/docs on 2026-11-04, then confirmed with live calls from this project. No key values appear in this file.

## Confirmed from the docs

| Item | Confirmed value | Source page |
|---|---|---|
| Base URL | `https://api.meta.ai/v1` | Responses API, Structured output |
| Protocol used | `POST /v1/responses` (Responses API). `/v1/chat/completions` also exists. | `/docs/protocols/responses` |
| Auth | `Authorization: Bearer <MODEL_API_KEY>` | Responses API examples |
| Model | `muse-spark-1.3` (Standard mode) | `/docs/models`, `/docs/pricing-rate-limits` |
| Contributor mode | `muse-spark-1.3-contributor` trades your prompts and outputs for discounted pricing: Meta may use them to train future models. **Standard mode content is not used for training.** TraceForm uses the standard model. | `/docs/pricing-rate-limits#contributor-mode` |
| Structured output (Responses) | `text.format = { type: "json_schema", name, schema, strict }`. Decoding is constrained to the schema. `response_format` is the Chat Completions equivalent and does **not** configure the Responses API. | `/docs/structured-output` |
| Strict subset | With `strict: true`: root must be an object, every object sets `additionalProperties: false`, `required` lists every key, no `oneOf`/`allOf`. Recursive schemas are rejected. | `/docs/structured-output` |
| Reasoning control | Responses API: `reasoning: { effort }` with `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. `none` returns HTTP 400 for Muse Spark. Reasoning tokens count as output tokens. | `/docs/reasoning` |
| Instructions | Top-level `instructions` is developer-level and takes priority over `input`. | `/docs/protocols/responses` |
| Storage | `store` defaults to `true`; TraceForm sends `store: false`. | `/docs/protocols/responses` |
| Rate limits (muse-spark-1.3) | 3,000 RPM, 4,000,000 TPM, per team | `/docs/pricing-rate-limits` |
| Pricing (muse-spark-1.3, standard) | $1.25 / 1M input tokens, $4.25 / 1M output tokens, $0.15 / 1M cached input | `/docs/pricing-rate-limits` |

## Request TraceForm sends

`shared/model-provider.ts` is the only place the API is called.

```json
POST https://api.meta.ai/v1/responses
Authorization: Bearer <MODEL_API_KEY>
Content-Type: application/json

{
  "model": "muse-spark-1.3",
  "instructions": "<extraction rules, see shared/prompt.ts>",
  "input": "<fields + delimited source documents>",
  "store": false,
  "reasoning": { "effort": "medium" },
  "text": {
    "format": {
      "type": "json_schema",
      "name": "traceform_extraction",
      "strict": true,
      "schema": { "...": "see shared/model-output.ts (modelOutputJsonSchema)" }
    }
  }
}
```

## Response shape (observed live)

Smoke test on 2026-11-04 (HTTP 200, about 3 s, `reasoning.effort: "low"`). Trimmed:

```json
{
  "id": "resp_…",
  "object": "response",
  "status": "completed",
  "model": "muse-spark-1.3",
  "output": [
    { "type": "reasoning", "id": "rs_…", "encrypted_content": "…", "summary": [], "status": "completed" },
    {
      "type": "message",
      "role": "assistant",
      "status": "completed",
      "content": [{ "type": "output_text", "text": "{\"city\":\"Menlo Park\"}", "annotations": [], "logprobs": [] }]
    }
  ],
  "usage": {
    "input_tokens": 73,
    "output_tokens": 276,
    "output_tokens_details": { "reasoning_tokens": 260 },
    "total_tokens": 349
  }
}
```

TraceForm reads the JSON text by concatenating `output[type=message].content[type=output_text].text`. It still validates that text with Zod (`shared/model-output.ts`) and retries malformed output at most twice, so it does not rely on schema-constrained decoding alone.

## Connectivity check

`GET /v1/models` lists models without using tokens. The "Test connection" button in the UI calls it through the `extraction.testConnection` Convex action.

## Environment variables (Convex only, never in the client)

| Name | Default | Purpose |
|---|---|---|
| `MODEL_API_KEY` | none (required for live runs) | Meta Model API key |
| `META_MODEL` | `muse-spark-1.3` | Model ID |
| `META_API_BASE` | `https://api.meta.ai/v1` | API base URL |
| `META_REASONING_EFFORT` | `medium` | `reasoning.effort` |
| `DAILY_RUN_CAP` | `60` | Global cap on live extraction runs per UTC day |

## Features not used

- Image input (Muse Spark vision) and Muse Voice Transcribe. Both are on the stretch list; neither was built.
- `previous_response_id` and encrypted reasoning replay. Each TraceForm call is a single independent turn.
