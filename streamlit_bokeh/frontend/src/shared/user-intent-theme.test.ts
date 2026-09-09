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

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { MessageChannel } from "node:worker_threads"

import { beforeAll, describe, expect, test } from "vitest"

import { streamlitTheme } from "../v2/streamlit-theme"
import { governingColorAttr, withUserIntent } from "./user-intent-theme"

// These tests run against the real Bokeh bundle we ship rather than a mock.
// `setupTests.js` stubs `window.Bokeh.Themes` with nulls and never defines
// `window.Bokeh.Models`, so a mocked theme cannot exercise the precedence
// chain this module depends on -- and an assertion like "use_theme was called
// with null" would pass whether or not the fix works. Loading the bundle costs
// well under a second and tests the mechanism that actually ships.
const BOKEH_DIR = resolve(__dirname, "../../public/bokeh")
const BOKEH_BUNDLES = ["bokeh-3.10.0.min.js", "bokeh-api-3.10.0.min.js"]

/** Model types the Streamlit theme and Bokeh's built-in themes both style. */
const THEMED_MODELS = [
  "LinearAxis",
  "Legend",
  "Grid",
  "Title",
  "ColorBar",
  "Plot",
]

const APP_THEME = {
  font: "Source Sans Pro",
  textColor: "#31333F",
  backgroundColor: "#FFFFFF",
  secondaryBackgroundColor: "#F0F2F6",
}

beforeAll(() => {
  // jsdom lacks a few globals BokehJS touches at import time.
  const withGlobals = window as unknown as Record<string, unknown>
  withGlobals.MessageChannel ??= MessageChannel
  withGlobals.requestIdleCallback ??= (cb: (deadline: unknown) => void) =>
    setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0)
  // Bokeh builds a canvas at import time to parse CSS colour names. It only
  // needs `fillStyle` to round-trip.
  ;(
    window.HTMLCanvasElement.prototype as unknown as Record<string, unknown>
  ).getContext = () => ({
    fillStyle: "#000000",
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 10 }),
    save() {},
    restore() {},
  })

  for (const bundle of BOKEH_BUNDLES) {
    window.eval(readFileSync(resolve(BOKEH_DIR, bundle), "utf8"))
  }
})

/**
 * Builds `type` under `theme` with `attrs` as its explicitly-set values, then
 * reads back the resolved properties in `keys`.
 *
 * Attributes passed here stand in for values that arrived in the figure's
 * JSON: both routes converge on `HasProps.initialize_props`, which is where
 * the theme is consulted and where `dirty` is set.
 */
const resolveProps = (
  theme: unknown,
  type: string,
  attrs: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> => {
  const { use_theme } = window.Bokeh.require("core/properties")
  use_theme(theme)

  try {
    const model = new window.Bokeh.Models[type](attrs)
    return Object.fromEntries(keys.map(key => [key, model[key]]))
  } finally {
    use_theme(null)
  }
}

const TICK_PROPS = [
  "major_tick_line_color",
  "major_tick_line_alpha",
  "minor_tick_line_color",
  "minor_tick_line_alpha",
  "axis_line_color",
  "axis_line_alpha",
]

describe("governingColorAttr", () => {
  test.each([
    ["major_tick_line_alpha", "major_tick_line_color"],
    ["minor_tick_line_alpha", "minor_tick_line_color"],
    ["axis_line_alpha", "axis_line_color"],
    ["border_line_alpha", "border_line_color"],
    ["bar_line_alpha", "bar_line_color"],
    ["outline_line_alpha", "outline_line_color"],
    ["grid_line_alpha", "grid_line_color"],
    // Bare, unprefixed group member (glyph visuals).
    ["line_alpha", "line_color"],
  ])("maps %s to %s", (alphaAttr, colorAttr) => {
    expect(governingColorAttr(alphaAttr)).toBe(colorAttr)
  })

  test.each([
    "major_tick_line_color",
    "major_tick_line_width",
    "background_fill_color",
    "axis_label_standoff",
    "spacing",
    // Ends with "line_alpha" but not on a group boundary.
    "nonline_alpha",
    // Non-line groups are deliberately left to the theme: a theme's fill alpha
    // can be doing contrast work. See INTENT_GROUPS.
    "background_fill_alpha",
    "item_background_fill_alpha",
    "inactive_fill_alpha",
    "axis_label_text_alpha",
    "hatch_alpha",
    "fill_alpha",
    "text_alpha",
  ])("returns null for %s", attr => {
    expect(governingColorAttr(attr)).toBeNull()
  })
})

describe("withUserIntent", () => {
  test("passes null through so it composes with use_theme(null)", () => {
    expect(withUserIntent(null)).toBeNull()
    expect(withUserIntent(undefined)).toBeUndefined()
  })

  test("un-dims a tick whose colour the user set, under caliber", () => {
    const caliber = window.Bokeh.Themes.caliber
    const userAttrs = { major_tick_line_color: "yellow" }

    const before = resolveProps(caliber, "LinearAxis", userAttrs, TICK_PROPS)
    const after = resolveProps(
      withUserIntent(caliber),
      "LinearAxis",
      userAttrs,
      TICK_PROPS
    )

    // Today the theme's alpha wins and the tick is barely visible.
    expect(before.major_tick_line_alpha).toBe(0.25)

    expect(after.major_tick_line_alpha).toBe(1)
    expect(after.major_tick_line_color).toBe("yellow")
    // A group the user did not style keeps the theme's dimming.
    expect(after.minor_tick_line_alpha).toBe(0.25)
    expect(after.axis_line_alpha).toBe(before.axis_line_alpha)
  })

  test("reveals ticks the minimal themes hide outright", () => {
    // caliber dims to 0.25; these four hide with 0, so a user's tick colour is
    // invisible rather than faint.
    for (const name of [
      "dark_minimal",
      "light_minimal",
      "contrast",
      "night_sky",
    ]) {
      const theme = window.Bokeh.Themes[name]
      const userAttrs = { major_tick_line_color: "yellow" }

      expect(
        resolveProps(theme, "LinearAxis", userAttrs, TICK_PROPS)
          .major_tick_line_alpha
      ).toBe(0)
      expect(
        resolveProps(withUserIntent(theme), "LinearAxis", userAttrs, TICK_PROPS)
          .major_tick_line_alpha
      ).toBe(1)
    }
  })

  test("leaves an unstyled figure byte-identical under every built-in theme", () => {
    for (const name of Object.keys(window.Bokeh.Themes)) {
      const theme = window.Bokeh.Themes[name]

      for (const type of THEMED_MODELS) {
        const keys = Object.keys(
          new window.Bokeh.Models[type]({}).properties
        ).filter(key => governingColorAttr(key) !== null)

        expect(
          resolveProps(withUserIntent(theme), type, {}, keys),
          `${name} / ${type}`
        ).toEqual(resolveProps(theme, type, {}, keys))
      }
    }
  })

  test("never overrides an alpha the user set explicitly", () => {
    const caliber = withUserIntent(window.Bokeh.Themes.caliber)

    // Alpha alone: untouched, because there is no colour intent to honour.
    expect(
      resolveProps(
        caliber,
        "LinearAxis",
        { major_tick_line_alpha: 0.9 },
        TICK_PROPS
      ).major_tick_line_alpha
    ).toBe(0.9)

    // Both set: the user's alpha wins over the un-dim.
    expect(
      resolveProps(
        caliber,
        "LinearAxis",
        { major_tick_line_color: "yellow", major_tick_line_alpha: 0.1 },
        TICK_PROPS
      ).major_tick_line_alpha
    ).toBe(0.1)
  })

  test("falls back to Bokeh's own defaults, not to 1", () => {
    // Legend overrides its inherited border alpha to 0.5, so this pins that the
    // fallback is the class default rather than a hardcoded 1.
    const keys = ["border_line_alpha"]
    const userAttrs = { border_line_color: "navy" }

    expect(
      resolveProps(
        withUserIntent(window.Bokeh.Themes.caliber),
        "Legend",
        userAttrs,
        keys
      ).border_line_alpha
    ).toBe(resolveProps(null, "Legend", userAttrs, keys).border_line_alpha)

    expect(
      resolveProps(null, "Legend", userAttrs, keys).border_line_alpha
    ).toBe(0.5)
  })

  test("leaves a legend background alone even when its colour is set", () => {
    // The regression that scoped INTENT_GROUPS to lines: the Streamlit theme
    // dims legend backgrounds to 0.25 and draws labels in the app's text
    // colour, so opening this up made light-background legends unreadable in
    // dark mode.
    const userAttrs = { background_fill_color: "#fafafa" }
    const keys = ["background_fill_color", "background_fill_alpha"]

    for (const theme of [
      streamlitTheme(APP_THEME),
      window.Bokeh.Themes.dark_minimal,
    ]) {
      const resolved = resolveProps(
        withUserIntent(theme),
        "Legend",
        userAttrs,
        keys
      )
      expect(resolved.background_fill_color).toBe("#fafafa")
      expect(resolved.background_fill_alpha).toBe(0.25)
    }
  })

  test("composes with the Streamlit theme", () => {
    const theme = streamlitTheme(APP_THEME)
    const userAttrs = { major_tick_line_color: "crimson" }

    const unstyledBefore = resolveProps(theme, "LinearAxis", {}, TICK_PROPS)
    const unstyledAfter = resolveProps(
      withUserIntent(streamlitTheme(APP_THEME)),
      "LinearAxis",
      {},
      TICK_PROPS
    )
    // Streamlit's look is unchanged: ticks stay hidden when nothing is styled.
    expect(unstyledAfter).toEqual(unstyledBefore)
    expect(unstyledAfter.major_tick_line_alpha).toBe(0)

    expect(
      resolveProps(theme, "LinearAxis", userAttrs, TICK_PROPS)
        .major_tick_line_alpha
    ).toBe(0)

    const fixed = resolveProps(
      withUserIntent(streamlitTheme(APP_THEME)),
      "LinearAxis",
      userAttrs,
      TICK_PROPS
    )
    expect(fixed.major_tick_line_alpha).toBe(1)
    expect(fixed.major_tick_line_color).toBe("crimson")
    // Untouched groups stay hidden.
    expect(fixed.axis_line_alpha).toBe(0)
    expect(fixed.minor_tick_line_alpha).toBe(0)
  })

  test("keeps an element hidden when the user nulls its colour", () => {
    // Figures commonly hide an element with `grid_line_color = None` rather
    // than an alpha. That counts as explicit intent, so the wrapper withholds
    // the theme's alpha and it resolves to 1 -- but a null colour suppresses
    // drawing on its own, so the element stays hidden either way. The e2e
    // corpus relies on this: several of its figures null these exact colours.
    for (const [type, colorAttr, alphaAttr] of [
      ["Grid", "grid_line_color", "grid_line_alpha"],
      ["LinearAxis", "minor_tick_line_color", "minor_tick_line_alpha"],
      ["Plot", "outline_line_color", "outline_line_alpha"],
    ]) {
      const resolved = resolveProps(
        withUserIntent(streamlitTheme(APP_THEME)),
        type,
        { [colorAttr]: null },
        [colorAttr, alphaAttr]
      )

      expect(resolved[colorAttr], `${type}.${colorAttr}`).toBeNull()
      // Bokeh's `doit` is false whenever the colour is null, whatever the alpha.
      expect(resolved[alphaAttr], `${type}.${alphaAttr}`).toBe(1)
    }
  })

  test("restores the reporter's baseline in streamlit/streamlit#11346", () => {
    // Their figure styles three axes under `caliber` and compares against
    // st.bokeh_chart, which applied no theme at all. Verified against the full
    // figure via the real deserializer: of the 36 properties they set, the only
    // ones caliber altered were these two tick alphas, and the fix leaves zero
    // differences from the unthemed baseline.
    const reporterAttrs = {
      axis_line_color: "lightsteelblue",
      major_tick_line_color: "lightsteelblue",
      minor_tick_line_color: "lightsteelblue",
      major_label_text_color: "lightsteelblue",
      axis_label_text_color: "lightsteelblue",
    }
    const props = [
      ...Object.keys(reporterAttrs),
      "axis_line_alpha",
      "major_tick_line_alpha",
      "minor_tick_line_alpha",
      "major_label_text_alpha",
      "axis_label_text_alpha",
    ]

    const baseline = resolveProps(null, "LinearAxis", reporterAttrs, props)
    const broken = resolveProps(
      window.Bokeh.Themes.caliber,
      "LinearAxis",
      reporterAttrs,
      props
    )
    const fixed = resolveProps(
      withUserIntent(window.Bokeh.Themes.caliber),
      "LinearAxis",
      reporterAttrs,
      props
    )

    // The regression they reported...
    expect(broken.major_tick_line_alpha).toBe(0.25)
    expect(broken.minor_tick_line_alpha).toBe(0.25)
    // ...and nothing else about their styling was affected.
    expect(fixed).toEqual(baseline)
  })

  test("applies on the real deserializer path, not just direct construction", () => {
    // `embed_item` reaches models through the deserializer, which constructs
    // with `{id}` only -- skipping the constructor's `initialize_props` -- and
    // then calls `initialize_props(attributes)` itself. This asserts the fix
    // survives that route.
    const docJson = {
      version: "3.10.0",
      title: "user-intent",
      roots: [
        {
          type: "object",
          name: "Plot",
          id: "plot1",
          attributes: {
            below: [
              {
                type: "object",
                name: "LinearAxis",
                id: "axis1",
                attributes: { major_tick_line_color: "yellow" },
              },
            ],
          },
        },
      ],
    }

    const axisFrom = (theme: unknown): any => {
      const { use_theme } = window.Bokeh.require("core/properties")
      use_theme(theme)
      try {
        return window.Bokeh.Document.from_json(
          structuredClone(docJson)
        ).roots()[0].below[0]
      } finally {
        use_theme(null)
      }
    }

    const caliber = window.Bokeh.Themes.caliber

    const broken = axisFrom(caliber)
    expect(broken.properties.major_tick_line_color.dirty).toBe(true)
    expect(broken.properties.major_tick_line_alpha.dirty).toBe(false)
    expect(broken.major_tick_line_alpha).toBe(0.25)

    const fixed = axisFrom(withUserIntent(caliber))
    expect(fixed.major_tick_line_color).toBe("yellow")
    expect(fixed.major_tick_line_alpha).toBe(1)
  })
})

describe("Bokeh property ordering guard", () => {
  // `withUserIntent` reads `dirty` off a group's colour while resolving that
  // group's alpha, so the colour must initialize first. Every Bokeh visual
  // mixin declares colour before alpha and `initialize_props` iterates in
  // declaration order -- but that is Bokeh's internal detail, and
  // `update-bokeh.yml` upgrades Bokeh automatically. If an upgrade reorders
  // these, this fails instead of silently restoring the bug.
  test("every group's colour initializes before its alpha", () => {
    const violations: string[] = []
    let pairs = 0

    for (const type of THEMED_MODELS) {
      const order = Object.keys(new window.Bokeh.Models[type]({}).properties)

      order.forEach((attr, alphaIndex) => {
        const colorAttr = governingColorAttr(attr)
        if (colorAttr === null) {
          return
        }

        const colorIndex = order.indexOf(colorAttr)
        if (colorIndex === -1) {
          return
        }

        pairs += 1
        if (colorIndex > alphaIndex) {
          violations.push(`${type}: ${colorAttr} initializes after ${attr}`)
        }
      })
    }

    expect(violations).toEqual([])
    // Guards against the enumeration silently finding nothing.
    expect(pairs).toBeGreaterThanOrEqual(10)
  })
})
