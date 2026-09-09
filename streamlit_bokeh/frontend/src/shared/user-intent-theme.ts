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
 * Stops a Bokeh theme from overriding styling the user asked for.
 *
 * Bokeh resolves every property independently, in this order:
 *
 *     explicit value in the figure's JSON -> _default_override() -> theme -> Bokeh default
 *
 * Explicit values already beat the theme, so a user who sets a colour keeps it.
 * The problem is *partial* specification. Bokeh composes one visual decision
 * out of sibling properties -- a line is drawn only when
 * `!(line_color == null || line_alpha == 0 || line_width == 0)` -- so a theme
 * that supplies `major_tick_line_alpha: 0` suppresses a tick whose
 * `major_tick_line_color` the user set explicitly. Their colour is respected
 * and the tick still doesn't render.
 *
 * Every built-in Bokeh theme does this: `caliber` dims axis ticks to 0.25, and
 * `dark_minimal`, `light_minimal`, `contrast` and `night_sky` hide ticks and
 * axis lines outright with 0.
 *
 * So: when the user has explicitly styled a group's colour, withhold the
 * theme's opinion about that group's alpha and let Bokeh's own default apply.
 * That lands on exactly what an unthemed figure renders, which is the
 * behaviour the removed `st.bokeh_chart` had by applying no theme at all. It
 * also matches how Streamlit themes its other charts -- `ArrowVegaLiteChart`
 * merges the user's config over the Streamlit theme, to "fill in theme
 * defaults where the user didn't specify config options".
 *
 * Two properties of the mechanism this relies on:
 *
 *  1. `dirty` is set only for values that came from the figure's JSON, never
 *     for values a theme supplied -- so it is a true record of user intent.
 *  2. A group's colour property initializes before its alpha property, because
 *     every Bokeh visual mixin declares colour first and that order survives
 *     into `HasProps.initialize_props`. `user-intent-theme.test.ts` guards this
 *     against Bokeh upgrades; `update-bokeh.yml` bumps Bokeh automatically, so
 *     a reordering must fail loudly rather than silently restore the bug.
 */

/**
 * Bokeh's visual property groups. Each is a colour plus an alpha (plus other
 * members we don't care about), mixed into models under a prefix -- hence
 * `major_tick_line_color`, `axis_label_text_color`, `background_fill_color`.
 */
const INTENT_GROUPS = ["line", "fill", "text", "hatch"] as const

/** The minimum of Bokeh's Theme surface that BokehJS actually consumes. */
export interface BokehThemeLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Bokeh models are untyped here, as elsewhere in this codebase.
  get(obj: any, attr: string): unknown
}

/**
 * The colour property that governs whether `attr`'s group renders at all, or
 * null when `attr` is not a group alpha.
 *
 * Handles both prefixed and bare forms: `major_tick_line_alpha` ->
 * `major_tick_line_color`, and `line_alpha` -> `line_color`.
 */
export function governingColorAttr(attr: string): string | null {
  for (const group of INTENT_GROUPS) {
    const alphaSuffix = `${group}_alpha`

    if (!attr.endsWith(alphaSuffix)) {
      continue
    }

    // Require a group boundary so `nonline_alpha` isn't read as the `line`
    // group with prefix `non`.
    const prefix = attr.slice(0, -alphaSuffix.length)
    if (prefix === "" || prefix.endsWith("_")) {
      return `${prefix}${group}_color`
    }
  }

  return null
}

/**
 * Wraps a Bokeh theme so it stops supplying a group's alpha once the user has
 * explicitly set that group's colour.
 *
 * `null` passes through unchanged, so this composes with `use_theme(null)`.
 * The result only needs a `get` method: BokehJS stores the installed theme in
 * a module-level variable and reads it in exactly one place, as
 * `theme.get(obj, attr)` -- there is no `instanceof Theme` check and nothing
 * reads any other member.
 */
export function withUserIntent<T extends BokehThemeLike | null | undefined>(
  theme: T
): T | BokehThemeLike {
  if (theme == null) {
    return theme
  }

  return {
    get(obj: any, attr: string): unknown {
      const colorAttr = governingColorAttr(attr)

      if (colorAttr !== null && obj?.properties?.[colorAttr]?.dirty === true) {
        // `undefined` is how a Bokeh theme says "no opinion"; the property
        // then falls through to Bokeh's own default.
        return undefined
      }

      return theme.get(obj, attr)
    },
  }
}
