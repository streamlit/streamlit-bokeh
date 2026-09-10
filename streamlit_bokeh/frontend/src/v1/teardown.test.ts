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

/**
 * Tests the v1 render path's view teardown.
 *
 * The e2e suite cannot cover this: v1 renders each chart inside its own iframe,
 * so the top-level page has no `window.Bokeh` to inspect. Without these tests
 * the v1 half of the fix has no coverage at all.
 *
 * v1 is a module, not a component function: it grabs `#stBokehChart` and
 * registers a render listener at import time. So the element has to exist
 * before the import, and the module has to be re-imported per test to reset its
 * module-scoped state.
 *
 * See streamlit/streamlit#15549.
 */

import { beforeEach, describe, expect, test, vi } from "vitest"

const FIGURE = JSON.stringify({
  doc: { roots: [{ attributes: {} }] },
  target_id: null,
})

const APP_THEME = {
  base: "light",
  primaryColor: "#ff4b4b",
  backgroundColor: "#ffffff",
  secondaryBackgroundColor: "#f0f2f6",
  textColor: "#31333f",
  font: "sans-serif",
}

/**
 * The component-lib instance from the same module graph as the freshly imported
 * component. `vi.resetModules()` gives the component its own copy, so a
 * statically imported `Streamlit` would expose a different event target and the
 * dispatch would never reach the listener.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- module namespace
let streamlit: any

const renderOnce = async (figure: string): Promise<void> => {
  streamlit.Streamlit.events.dispatchEvent(
    new CustomEvent(streamlit.Streamlit.RENDER_EVENT, {
      detail: {
        disabled: false,
        theme: APP_THEME,
        args: {
          figure,
          // A built-in theme: the Streamlit theme reads CSS custom properties
          // jsdom does not resolve, and theming is not what these tests cover.
          bokeh_theme: "caliber",
          use_container_width: false,
        },
      },
    })
  )
  // The listener is async and awaits embed_item; drain the microtask queue.
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe("v1 view teardown", () => {
  let managers: { clear: ReturnType<typeof vi.fn> }[]

  beforeEach(async () => {
    // Must exist before the import: the module captures it at load time.
    document.body.innerHTML = '<div id="stBokehChart"></div>'

    managers = []
    window.Bokeh.embed = {
      embed_item: vi.fn(async () => {
        const manager = { clear: vi.fn() }
        managers.push(manager)
        return manager
      }),
    }

    // Fresh module per test, so the module-scoped view reference resets.
    vi.resetModules()
    streamlit = await import("streamlit-component-lib")
    await import("./index")
  })

  test("does not tear anything down on a first render", async () => {
    await renderOnce(FIGURE)

    expect(managers).toHaveLength(1)
    expect(managers[0].clear).not.toHaveBeenCalled()
  })

  test("tears down the previous embed's views before re-embedding", async () => {
    await renderOnce(FIGURE)
    await renderOnce(JSON.stringify({ ...JSON.parse(FIGURE), rerun: 1 }))

    expect(managers).toHaveLength(2)
    expect(managers[0].clear).toHaveBeenCalledOnce()
    expect(managers[1].clear).not.toHaveBeenCalled()
  })

  test("keeps working when a teardown fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    try {
      await renderOnce(FIGURE)
      managers[0].clear.mockImplementation(() => {
        throw new Error("teardown failed")
      })

      await renderOnce(JSON.stringify({ ...JSON.parse(FIGURE), rerun: 1 }))
      await renderOnce(JSON.stringify({ ...JSON.parse(FIGURE), rerun: 2 }))

      expect(window.Bokeh.embed.embed_item).toHaveBeenCalledTimes(3)
      expect(managers[0].clear).toHaveBeenCalledOnce()
    } finally {
      consoleError.mockRestore()
    }
  })
})
