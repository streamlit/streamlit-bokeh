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

  test("does not swallow an error raised by clear", () => {
    // A failing teardown should surface rather than leave the caller believing
    // the previous views are gone.
    const boom = new Error("teardown failed")

    expect(() =>
      destroyViews({
        clear: () => {
          throw boom
        },
      })
    ).toThrow(boom)
  })
})
