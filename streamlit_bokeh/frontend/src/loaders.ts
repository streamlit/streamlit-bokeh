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

import SourceSansProBold from "./assets/fonts/SourceSansPro-Bold.woff2?url&no-inline"
import SourceSansProRegular from "./assets/fonts/SourceSansPro-Regular.woff2?url&no-inline"
import SourceSansProSemiBold from "./assets/fonts/SourceSansPro-SemiBold.woff2?url&no-inline"

import indexCss from "./assets/index.css?url&no-inline"

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
 * Loads and registers the Source Sans Pro font variants via the FontFace API.
 *
 * What:
 * - Constructs `FontFace` objects for the Regular (400), SemiBold (600), and
 *   Bold (700) weights and adds them to `document.fonts` once loaded.
 *
 * Why:
 * - Ensures consistent typography for Bokeh-rendered visuals without relying on
 *   a global stylesheet, which may not penetrate Shadow DOM boundaries.
 * - Avoids layout shift/FOIT by explicitly preloading and registering the fonts
 *   before use.
 *
 * @returns A promise that resolves when all fonts are loaded and registered.
 */
export const loadFonts = async () => {
  const fontSources = [
    { url: SourceSansProRegular, weight: "400" },
    { url: SourceSansProSemiBold, weight: "600" },
    { url: SourceSansProBold, weight: "700" },
  ]

  await Promise.all(
    fontSources.map(async ({ url, weight }) => {
      const face = new FontFace(
        "Source Sans Pro",
        `url(${url}) format('woff2')`,
        { weight }
      )
      const loaded = await face.load()
      document.fonts.add(loaded)
    })
  )
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

/**
 * Injects the component stylesheet into the provided container via a `<link>`
 * tag.
 *
 * What:
 * - Resolves the emitted CSS asset URL and appends a `rel="stylesheet"` link
 *   element to the given parent.
 *
 * Why:
 * - Using a `<link>` keeps CSS cacheable by the browser and avoids inlining
 *   large styles into JavaScript bundles.
 * - Passing an explicit `parentElement` supports usage inside Shadow DOM so
 *   styles are applied where the component actually renders.
 *
 * @param options.parentElement - The container (HTMLElement or ShadowRoot)
 * where the link is appended.
 * @returns A promise that resolves once the link is appended.
 */
export const loadCss = async ({
  parentElement,
}: {
  parentElement: HTMLElement | ShadowRoot
}) => {
  const href = resolveAssetUrl(indexCss)
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = href
  parentElement.appendChild(link)
}
