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

import bokehMin from "./assets/bokeh/bokeh-3.8.0.min.js?url&no-inline"
import bokehApi from "./assets/bokeh/bokeh-api-3.8.0.min.js?url&no-inline"
import bokehGl from "./assets/bokeh/bokeh-gl-3.8.0.min.js?url&no-inline"
import bokehMathjax from "./assets/bokeh/bokeh-mathjax-3.8.0.min.js?url&no-inline"
import bokehTables from "./assets/bokeh/bokeh-tables-3.8.0.min.js?url&no-inline"
import bokehWidgets from "./assets/bokeh/bokeh-widgets-3.8.0.min.js?url&no-inline"

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

/**
 * Programmatically loads the Bokeh runtime and its optional plugins into a
 * container.
 *
 * What:
 * - Resolves URLs for Bokeh core and plugins via the bundler.
 * - Injects a deferred `<script>` for the core library and waits for it to load
 *   with a fail-fast timeout.
 * - After the core exposes `window.Bokeh`, concurrently loads plugin scripts
 *   (widgets, tables, API, GL, MathJax).
 *
 * Why:
 * - Loading core first guarantees the global `window.Bokeh` exists before
 *   plugins run, which mirrors how Bokeh expects to be initialized.
 * - Parallel plugin loading reduces total startup time once core is available.
 *
 * @param options.parentElement - The container (HTMLElement or ShadowRoot)
 * where scripts are appended.
 * @returns A promise that resolves when all scripts have loaded successfully.
 * @throws If the core script fails to load or `window.Bokeh` is not available
 * in time.
 */
export const loadBokeh = async ({
  parentElement,
}: {
  parentElement: HTMLElement | ShadowRoot
}) => {
  const urls = {
    core: resolveAssetUrl(bokehMin),
    widgets: resolveAssetUrl(bokehWidgets),
    tables: resolveAssetUrl(bokehTables),
    api: resolveAssetUrl(bokehApi),
    gl: resolveAssetUrl(bokehGl),
    mathjax: resolveAssetUrl(bokehMathjax),
  }

  // Load Bokeh core first
  const bokehScript = document.createElement("script")
  bokehScript.defer = true
  bokehScript.crossOrigin = "anonymous"
  bokehScript.src = urls.core
  bokehScript.addEventListener("error", ev => {
    // eslint-disable-next-line no-console
    console.error(
      "[streamlit-bokeh] Failed to load Bokeh core script",
      urls.core,
      ev
    )
  })
  parentElement.appendChild(bokehScript)

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Bokeh not loaded")),
      5000
    )
    bokehScript.addEventListener("load", () => {
      clearTimeout(timeout)
      resolve()
    })
    bokehScript.addEventListener("error", () => {
      clearTimeout(timeout)
      reject(new Error("Failed to load Bokeh core script"))
    })
  })

  // Ensure window.Bokeh is available before loading plugins
  if (!window.Bokeh) {
    throw new Error("Bokeh global not available after core load")
  }

  const pluginUrls = [
    urls.widgets,
    urls.tables,
    urls.api,
    urls.gl,
    urls.mathjax,
  ]
  await Promise.all(
    pluginUrls.map(
      url =>
        new Promise<void>((resolve, reject) => {
          const s = document.createElement("script")
          s.defer = true
          s.crossOrigin = "anonymous"
          s.src = url
          s.addEventListener("load", () => resolve())
          s.addEventListener("error", () =>
            reject(new Error(`Failed to load script ${url}`))
          )
          parentElement.appendChild(s)
        })
    )
  )
}
