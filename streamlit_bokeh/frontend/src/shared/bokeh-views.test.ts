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

import { describe, expect, test, vi } from "vitest"

import { destroyViews } from "./bokeh-views"

describe("destroyViews", () => {
  test("clears a view manager", () => {
    const clear = vi.fn()

    destroyViews({ clear })

    expect(clear).toHaveBeenCalledOnce()
  })

  test.each([
    ["null", null],
    ["undefined", undefined],
    // What `embed_item` would return if a future Bokeh stopped handing back a
    // manager. Losing teardown is a slow leak; throwing would break the chart.
    ["an object without clear", { roots: [] }],
    ["a non-callable clear", { clear: "not a function" }],
    ["a string", "views"],
  ])("is a no-op for %s", (_label, value) => {
    expect(() => destroyViews(value)).not.toThrow()
  })

  test("reports a failure inside clear without rethrowing", () => {
    // Propagating would be worse than leaking: the caller only replaces its
    // stored manager from the `embed_item` that follows, so a throw here leaves
    // the old reference in place and every later render retries teardown on the
    // same broken manager -- breaking the chart for the rest of the session
    // rather than for one render.
    const boom = new Error("teardown failed")
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    try {
      expect(() =>
        destroyViews({
          clear: () => {
            throw boom
          },
        })
      ).not.toThrow()
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("failed to tear down"),
        boom
      )
    } finally {
      consoleError.mockRestore()
    }
  })
})
