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

import { Theme } from "streamlit-component-lib"
import { describe, test, expect, beforeEach } from "vitest"

import {
  getChartDataGenerator,
  setChartThemeGenerator,
  getChartDimensions,
} from "./index"

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
  let setChartTheme: (newTheme: string, newAppTheme: Theme) => boolean

  beforeEach(() => {
    setChartTheme = setChartThemeGenerator()
  })

  test("should apply the theme when theme changes", () => {
    const newTheme = "dark"
    const newAppTheme = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
    } as Theme
    const result = setChartTheme(newTheme, newAppTheme)
    const { use_theme: useTheme } =
      global.window.Bokeh.require("core/properties")

    expect(result).toBe(true)
    expect(useTheme).toHaveBeenCalled()
  })

  test("should not reapply the theme if it's the same", () => {
    const newTheme = "dark"
    const newAppTheme = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
    } as Theme
    setChartTheme(newTheme, newAppTheme)
    const result = setChartTheme(newTheme, newAppTheme)

    expect(result).toBe(false)
  })

  test("should apply Streamlit theme when appropriate", () => {
    const newTheme = "streamlit"
    const newAppTheme = {
      textColor: "white",
      backgroundColor: "black",
      secondaryBackgroundColor: "gray",
    } as Theme
    const result = setChartTheme(newTheme, newAppTheme)

    expect(result).toBe(true)
  })
})

describe("getChartDimensions", () => {
  test("should return default dimensions when no width/height attributes are provided", () => {
    const plot = { attributes: {} }
    const result = getChartDimensions(plot, false)
    expect(result).toEqual({ width: 400, height: 350 })
  })

  test("should return provided dimensions when width/height attributes are set", () => {
    const plot = { attributes: { width: 800, height: 400 } }
    const result = getChartDimensions(plot, false)
    expect(result).toEqual({ width: 800, height: 400 })
  })

  test("should calculate new dimensions based on container width", () => {
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      writable: true,
      value: 1200, // Set the desired value
    })

    const plot = { attributes: { width: 800, height: 400 } }
    const result = getChartDimensions(plot, true)
    expect(result.width).toBe(1200)
    expect(result.height).toBeCloseTo(600)
  })
})
