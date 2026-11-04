/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as demo from "../demo.js";
import type * as documents from "../documents.js";
import type * as extraction from "../extraction.js";
import type * as forms from "../forms.js";
import type * as helpers from "../helpers.js";
import type * as projects from "../projects.js";
import type * as review from "../review.js";
import type * as runs from "../runs.js";
import type * as transcribe from "../transcribe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  demo: typeof demo;
  documents: typeof documents;
  extraction: typeof extraction;
  forms: typeof forms;
  helpers: typeof helpers;
  projects: typeof projects;
  review: typeof review;
  runs: typeof runs;
  transcribe: typeof transcribe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
