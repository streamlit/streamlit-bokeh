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
 * Tests the v2 render path's view teardown, which the e2e suite covers only
 * end-to-end. Mocking `./loaders` is what makes the component reachable from a
 * unit test at all -- otherwise importing it tries to append real <script> tags
 * for the Bokeh bundles.
 *
 * See streamlit/streamlit#15549.
 */

import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("./loaders", () => ({
  loadBokehGlobally: vi.fn(async () => undefined),
}))

// eslint-disable-next-line import/first -- must follow the mock above.
import bokehComponent from "./index"

const FIGURE = JSON.stringify({
  doc: { roots: [{ attributes: {} }] },
  target_id: null,
})

/** A fresh host element, since instance state is keyed on it by WeakMap. */
const makeHost = (): HTMLElement => {
  const host = document.createElement("div")
  const container = document.createElement("div")
  container.className = "stBokehContainer"
  host.appendChild(container)
  document.body.appendChild(host)
  return host
}

const render = (host: HTMLElement, figure: string) =>
  bokehComponent({
    parentElement: host,
    key: "chart",
    data: {
      figure,
      // A built-in theme rather than "streamlit": the Streamlit theme reads CSS
      // custom properties that jsdom does not resolve, and theming is not what
      // these tests are about.
      bokeh_theme: "caliber",
      use_container_width: false,
      key: "chart",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the host's
    // full ComponentArgs surface is irrelevant here.
  } as any)

describe("v2 view teardown", () => {
  let managers: { clear: ReturnType<typeof vi.fn> }[]

  beforeEach(() => {
    document.body.innerHTML = ""
    managers = []
    window.Bokeh.embed = {
      embed_item: vi.fn(async () => {
        const manager = { clear: vi.fn() }
        managers.push(manager)
        return manager
      }),
    }
  })

  test("does not tear anything down on a first render", async () => {
    await render(makeHost(), FIGURE)

    expect(window.Bokeh.embed.embed_item).toHaveBeenCalledOnce()
    expect(managers).toHaveLength(1)
    expect(managers[0].clear).not.toHaveBeenCalled()
  })

  test("tears down the previous embed's views before re-embedding", async () => {
    const host = makeHost()

    await render(host, FIGURE)
    // A rerun sends a different figure, because each script run gives Bokeh
    // fresh element ids.
    await render(host, JSON.stringify({ ...JSON.parse(FIGURE), rerun: 1 }))

    expect(managers).toHaveLength(2)
    expect(managers[0].clear).toHaveBeenCalledOnce()
    expect(managers[1].clear).not.toHaveBeenCalled()
  })

  test("keeps working when a teardown fails, instead of wedging the chart", async () => {
    const host = makeHost()
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    try {
      await render(host, FIGURE)
      managers[0].clear.mockImplementation(() => {
        throw new Error("teardown failed")
      })

      await render(host, JSON.stringify({ ...JSON.parse(FIGURE), rerun: 1 }))
      await render(host, JSON.stringify({ ...JSON.parse(FIGURE), rerun: 2 }))

      // Re-embedded both times rather than retrying the broken manager forever.
      expect(window.Bokeh.embed.embed_item).toHaveBeenCalledTimes(3)
      expect(managers[0].clear).toHaveBeenCalledOnce()
    } finally {
      consoleError.mockRestore()
    }
  })

  test("tears down on unmount, so nothing outlives the component", async () => {
    const host = makeHost()

    const cleanup = await render(host, FIGURE)
    expect(managers[0].clear).not.toHaveBeenCalled()

    cleanup?.()

    expect(managers[0].clear).toHaveBeenCalledOnce()
  })

  test("keeps two instances independent", async () => {
    const first = makeHost()
    const second = makeHost()

    await render(first, FIGURE)
    await render(second, FIGURE)
    // Rerun only the first instance.
    await render(first, JSON.stringify({ ...JSON.parse(FIGURE), rerun: 1 }))

    expect(managers).toHaveLength(3)
    // The first instance's original views went; the second's are untouched.
    expect(managers[0].clear).toHaveBeenCalledOnce()
    expect(managers[1].clear).not.toHaveBeenCalled()
  })
})
