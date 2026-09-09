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

import { beforeEach, describe, expect, test } from "vitest"

import {
  getChartDataGenerator,
  getChartDimensions,
  setChartThemeGenerator,
} from "./index"
import { MinimalStreamlitTheme } from "./streamlit-theme"

describe("getChartDataGenerator", () => {
  let getChartData: (figure: string) => {
    data: object | null
    hasChanged: boolean
  }

  beforeEach(() => {
    getChartData = getChartDataGenerator()
  })

  test("should return parsed data and hasChanged true on first call", () => {
    const figure = JSON.stringify({ key: "value" })
    const result = getChartData(figure)

    expect(result).toEqual({ data: { key: "value" }, hasChanged: true })
  })

  test("should return hasChanged false for the same figure", () => {
    const figure = JSON.stringify({ key: "value" })
    getChartData(figure)
    const result = getChartData(figure)

    expect(result).toEqual({ data: { key: "value" }, hasChanged: false })
  })

  test("should return hasChanged true for a different figure", () => {
    getChartData(JSON.stringify({ key: "value" }))
    const newFigure = JSON.stringify({ key: "newValue" })
    const result = getChartData(newFigure)

    expect(result).toEqual({ data: { key: "newValue" }, hasChanged: true })
  })
})

// Unit tests for setChartThemeGenerator
describe("setChartThemeGenerator", () => {
  let setChartTheme: (
    newTheme: string | null,
    newAppTheme: MinimalStreamlitTheme
  ) => { themeChanged: boolean; theme: unknown }

  beforeEach(() => {
    setChartTheme = setChartThemeGenerator()
  })

  test("should apply the theme when theme changes", () => {
    const newTheme = "dark"
    const newAppTheme: MinimalStreamlitTheme = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
      font: "Source Pro",
    }
    const { themeChanged, theme } = setChartTheme(newTheme, newAppTheme)

    expect(themeChanged).toBe(true)
    expect(theme).not.toBeNull()
  })

  test("reports no change when the theme and app theme are unchanged", () => {
    const newTheme = "dark"
    const newAppTheme: MinimalStreamlitTheme = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
      font: "Source Pro",
    }
    setChartTheme(newTheme, newAppTheme)
    const { themeChanged } = setChartTheme(newTheme, newAppTheme)

    expect(themeChanged).toBe(false)
  })

  test("should apply Streamlit theme when appropriate", () => {
    const newTheme = "streamlit"
    const newAppTheme: MinimalStreamlitTheme = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
      font: "Source Pro",
    }
    const { themeChanged } = setChartTheme(newTheme, newAppTheme)

    expect(themeChanged).toBe(true)
  })

  test("should install no theme at all when the theme is null", () => {
    const newAppTheme: MinimalStreamlitTheme = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
      font: "Source Pro",
    }
    const { themeChanged, theme } = setChartTheme(null, newAppTheme)

    expect(themeChanged).toBe(true)
    expect(theme).toBeNull()
  })

  test("resolves a theme without touching Bokeh's page-global theme slot", () => {
    // Resolution must be side-effect free. Bokeh keeps the active theme in one
    // page-global slot, so writing it on a render that is not about to embed can
    // replace the theme a sibling chart's in-flight embed is waiting to read.
    // index.ts installs the returned theme immediately before `embed_item`.
    const base = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
      font: "Source Pro",
    }
    const { use_theme: useTheme } =
      global.window.Bokeh.require("core/properties")
    useTheme.mockClear()

    setChartTheme("streamlit", base)

    expect(useTheme).not.toHaveBeenCalled()
  })

  test("keeps returning its own theme when nothing changed", () => {
    // A rerun re-embeds regardless, because each script run gives Bokeh fresh
    // element ids, so an unchanged render still has to hand back the theme it
    // wants installed -- otherwise it embeds under whatever a sibling chart with
    // a different theme left in the global slot.
    const base = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
      font: "Source Pro",
    }
    const setTheme = setChartThemeGenerator()

    const first = setTheme("streamlit", base)
    const second = setTheme("streamlit", base)

    expect(first.themeChanged).toBe(true)
    expect(second.themeChanged).toBe(false)
    // Unchanged, but still a real theme rather than null.
    expect(second.theme).not.toBeNull()
  })

  test("keeps following the app theme when the requested name is unavailable", () => {
    // A name BokehJS doesn't have falls back to the Streamlit theme -- reachable
    // if bokeh-api-*.min.js fails to load. Caching the requested name instead of
    // the one in effect would stop later light/dark switches re-applying it.
    const base = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
      font: "Source Pro",
    }
    const setTheme = setChartThemeGenerator()

    expect(setTheme("nonexistent_theme", base).themeChanged).toBe(true)
    expect(
      setTheme("nonexistent_theme", { ...base, backgroundColor: "white" })
        .themeChanged
    ).toBe(true)
  })

  test("should keep the opt-out when switching from a real theme to null", () => {
    const newAppTheme: MinimalStreamlitTheme = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
      font: "Source Pro",
    }
    setChartTheme("caliber", newAppTheme)

    // This previously resolved to the *Streamlit* theme: `null in Bokeh.Themes`
    // coerces to the string "null", which is not a key, so the lookup missed and
    // fell through to the Streamlit branch.
    const { themeChanged, theme } = setChartTheme(null, newAppTheme)

    expect(themeChanged).toBe(true)
    expect(theme).toBeNull()
  })
})

describe("getChartDimensions", () => {
  test("should return default dimensions when no width/height attributes are provided", () => {
    const plot = { attributes: {} }
    const result = getChartDimensions(plot, false, document.documentElement)
    expect(result).toEqual({ width: 400, height: 350 })
  })

  test("should return provided dimensions when width/height attributes are set", () => {
    const plot = { attributes: { width: 800, height: 400 } }
    const result = getChartDimensions(plot, false, document.documentElement)
    expect(result).toEqual({ width: 800, height: 400 })
  })

  test("should calculate new dimensions based on container width", () => {
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      writable: true,
      value: 1200, // Set the desired value
    })

    const plot = { attributes: { width: 800, height: 400 } }
    const result = getChartDimensions(plot, true, document.documentElement)
    expect(result.width).toBe(1200)
    expect(result.height).toBeCloseTo(600)
  })
})
