/**
 * Copyright (c) Snowflake Inc. (2025)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Bokeh assets path:
// - In dev: served from Vite's public dir at "/bokeh/"
// - In prod builds: shared once at "../bokeh/" (sibling of v1/ and v2/)
const BOKEH_PUBLIC =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV
    ? "/bokeh/"
    : "../bokeh/"

/**
 * Resolves an asset reference (relative path or absolute URL) to an absolute
 * URL string.
 *
 * Why:
 * - When bundling with Vite and using `?url&no-inline`, imports produce URLs
 *   that are relative to this module. `new URL(rel, import.meta.url).href`
 *   turns these into absolute URLs that work reliably in Shadow DOM, iframes,
 *   and different base paths.
 * - If callers provide an already absolute URL (e.g., CDN override), we keep it
 *   as-is.
 *
 * @param relativeOrUrl - A relative asset path emitted by the bundler or an
 * absolute URL.
 * @returns Absolute URL string to the asset that can be used in DOM elements.
 */
function resolveAssetUrl(relativeOrUrl: string): string {
  try {
    return new URL(relativeOrUrl, import.meta.url).href
  } catch (e) {
    return relativeOrUrl
  }
}

// Global, module-scoped caches to ensure scripts are only appended once
const scriptLoadPromises = new Map<string, Promise<void>>()
let bokehLoadPromise: Promise<void> | null = null

/**
 * Finds an existing <script> element by exact `src` in the document.
 *
 * Searches both <head> and <body> to be resilient to external injections.
 *
 * @param src - Absolute URL string to match against the `src` attribute.
 * @returns The matching HTMLScriptElement or null if not found.
 */
function findScriptBySrc(src: string): HTMLScriptElement | null {
  return (document.head.querySelector(`script[src="${src}"]`) ||
    document.body.querySelector(
      `script[src="${src}"]`
    )) as HTMLScriptElement | null
}

/**
 * Loads a script exactly once (idempotent) and resolves when it finishes.
 *
 * Behavior:
 * - If a matching script is already present and marked as loaded, resolves immediately.
 * - If present but not marked loaded, attaches load/error listeners and waits.
 * - If not present, appends a new async script to <head> and waits.
 * - Caches the in-flight Promise by `src` to coalesce concurrent calls.
 *
 * @param src - Absolute URL to the script.
 * @param timeoutMs - Max time to wait before rejecting (default: 10s).
 * @returns Promise that resolves when the script loads, rejects on failure/timeout.
 */
function loadScriptOnce(src: string, timeoutMs = 10000): Promise<void> {
  const cached = scriptLoadPromises.get(src)
  if (cached) return cached

  const existing = findScriptBySrc(src)
  if (existing && (existing as any).dataset?.loaded === "true") {
    const resolved = Promise.resolve()
    scriptLoadPromises.set(src, resolved)
    return resolved
  }

  const promise = new Promise<void>((resolve, reject) => {
    const el = existing ?? document.createElement("script")
    if (!existing) {
      el.src = src
      el.async = true
      el.crossOrigin = "anonymous"
      document.head.appendChild(el)
    }

    let done = false
    const onLoad = () => {
      if (done) return
      done = true
      el.setAttribute("data-loaded", "true")
      cleanup()
      resolve()
    }
    const onError = () => {
      if (done) return
      done = true
      cleanup()
      reject(new Error(`Failed to load script ${src}`))
    }
    const cleanup = () => {
      el.removeEventListener("load", onLoad)
      el.removeEventListener("error", onError)
      clearTimeout(timeout)
    }

    el.addEventListener("load", onLoad)
    el.addEventListener("error", onError)
    const timeout = setTimeout(() => onError(), timeoutMs)

    // If we didn't create it and it's already loaded, resolve on next tick
    if (existing && (existing as any).readyState === "complete") {
      setTimeout(onLoad, 0)
    }
  })

  scriptLoadPromises.set(src, promise)
  return promise
}

async function ensureBokehCoreLoaded(coreUrl: string, timeoutMs = 10000) {
  if (window.Bokeh) return
  if (bokehLoadPromise) return bokehLoadPromise

  bokehLoadPromise = (async () => {
    await loadScriptOnce(coreUrl, timeoutMs)
    // Double-check Bokeh global; if not present, poll briefly
    if (!window.Bokeh) {
      await new Promise<void>((resolve, reject) => {
        const started = Date.now()
        const tick = () => {
          if (window.Bokeh) return resolve()
          if (Date.now() - started > timeoutMs)
            return reject(
              new Error("Bokeh global not available after core load")
            )
          setTimeout(tick, 50)
        }
        tick()
      })
    }
  })()

  return bokehLoadPromise
}

const BOKEH_URLS = {
  core: resolveAssetUrl(`${BOKEH_PUBLIC}bokeh-3.8.0.min.js`),
  widgets: resolveAssetUrl(`${BOKEH_PUBLIC}bokeh-widgets-3.8.0.min.js`),
  tables: resolveAssetUrl(`${BOKEH_PUBLIC}bokeh-tables-3.8.0.min.js`),
  api: resolveAssetUrl(`${BOKEH_PUBLIC}bokeh-api-3.8.0.min.js`),
  gl: resolveAssetUrl(`${BOKEH_PUBLIC}bokeh-gl-3.8.0.min.js`),
  mathjax: resolveAssetUrl(`${BOKEH_PUBLIC}bokeh-mathjax-3.8.0.min.js`),
}

const PLUGIN_URLS = [
  BOKEH_URLS.widgets,
  BOKEH_URLS.tables,
  BOKEH_URLS.api,
  BOKEH_URLS.gl,
  BOKEH_URLS.mathjax,
]

/**
 * Loads the Bokeh core runtime and plugins into the global document once.
 *
 * What it does:
 * - Resolves asset URLs emitted by the bundler for core and plugins.
 * - Ensures the core script is present and that `window.Bokeh` is available.
 * - Loads plugins (Widgets, Tables, API, GL, MathJax) concurrently.
 *
 * Guarantees:
 * - Idempotent across the entire page: repeated calls share a singleton promise
 *   and no duplicate <script> tags are appended.
 * - Safe for concurrent calls from multiple component instances.
 *
 * @returns Promise that resolves when core and all plugins are ready.
 * @throws If the core or any plugin fails to load within the timeout.
 */
export const loadBokehGlobally = async () => {
  // Load Bokeh core first (global, idempotent)
  await ensureBokehCoreLoaded(BOKEH_URLS.core, 10000)

  // Load plugins concurrently (global, idempotent)
  await Promise.all(PLUGIN_URLS.map(url => loadScriptOnce(url, 10000)))
}
