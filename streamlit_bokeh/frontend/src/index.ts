/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
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

import { Streamlit, RenderData, Theme } from "streamlit-component-lib"
import { streamlitTheme } from "./streamlit-theme"

declare global {
  interface Window {
    Bokeh: any
  }
}

interface Dimensions {
  width: number
  height: number
}

// The div with id "stBokehChart" will always exist because html file contains it
const chart = document.getElementById("stBokehChart") as HTMLDivElement

// These values come from Bokeh's default values
// See https://github.com/bokeh/bokeh/blob/3.6.2/bokehjs/src/lib/models/plots/plot.ts#L203
const DEFAULT_WIDTH = 400 // px
const DEFAULT_HEIGHT = 350 // px

/**
 * This function is a memoized function that returns the chart data
 * if the figure is the same as the last time it was called.
 */
export const getChartDataGenerator = () => {
  let savedFigure: string | null = null
  let savedChartData: object | null = null

  return (figure: string) => {
    if (figure !== savedFigure) {
      savedFigure = figure
      savedChartData = JSON.parse(figure)

      return { data: savedChartData, hasChanged: true }
    }

    return { data: savedChartData, hasChanged: false }
  }
}
const getChartData = getChartDataGenerator()

export const setChartThemeGenerator = () => {
  let currentTheme: string | null = null
  let appTheme: string | null = null

  return (newTheme: string, newAppTheme: Theme) => {
    let themeChanged = false
    const renderedAppTheme = JSON.stringify(newAppTheme)

    // The theme of the app changes if the theme provided by the component
    // has changed or, we are using the streamlit theme and the theme of the
    // app has changed (light mode to dark mode to custom theme)
    if (
      newTheme !== currentTheme ||
      (currentTheme === "streamlit" && appTheme !== renderedAppTheme)
    ) {
      currentTheme = newTheme
      appTheme = renderedAppTheme

      const { use_theme } = window.Bokeh.require("core/properties")

      if (
        currentTheme === "streamlit" ||
        !(currentTheme in window.Bokeh.Themes)
      ) {
        use_theme(streamlitTheme(newAppTheme))
        themeChanged = true
      } else {
        use_theme(window.Bokeh.Themes[currentTheme])
      }
    }

    return themeChanged
  }
}
const setChartTheme = setChartThemeGenerator()

export function getChartDimensions(
  plot: any,
  useContainerWidth: boolean
): Dimensions {
  const originalWidth: number = plot.attributes.width ?? DEFAULT_WIDTH
  const originalHeight: number = plot.attributes.height ?? DEFAULT_HEIGHT

  let width: number = originalWidth
  let height: number = originalHeight

  if (useContainerWidth) {
    // Use the width without a scrollbar to ensure the width always
    // looks good.
    width = document.documentElement.clientWidth
    height = (width / originalWidth) * originalHeight
  }

  return { width, height }
}

function removeAllChildNodes(element: Node): void {
  while (element.lastChild) {
    element.lastChild.remove()
  }
}

async function updateChart(data: any, useContainerWidth: boolean = false) {
  /**
   * When you create a bokeh chart in your python script, you can specify
   * the width: p = figure(title="simple line example", x_axis_label="x", y_axis_label="y", plot_width=200);
   * In that case, the json object will contains an attribute called
   * plot_width (or plot_heigth) inside the plot reference.
   * If that values are missing, we can set that values to make the chart responsive.
   *
   * Note that the figure is the first element in roots array.
   */
  const plot = data?.doc?.roots?.[0]

  if (plot) {
    const { width, height } = getChartDimensions(plot, useContainerWidth)

    if (width > 0) {
      plot.attributes.width = width
    }
    if (height > 0) {
      plot.attributes.height = height
    }
  }

  if (chart !== null) {
    removeAllChildNodes(chart)
    await window.Bokeh.embed.embed_item(data, "stBokehChart")
  }
}

interface ComponentData {
  figure: string
  use_container_width: boolean
  bokeh_theme: string
}

/**
 * The component's render function. This will be called immediately after
 * the component is initially loaded, and then again every time the
 * component gets new data from Python.
 */
async function onRender(event: Event): Promise<void> {
  const renderData: RenderData<ComponentData> = (
    event as CustomEvent<RenderData<ComponentData>>
  ).detail
  const {
    figure,
    bokeh_theme: bokehTheme,
    use_container_width: useContainerWidth,
  } = renderData.args

  const { data: chartData, hasChanged } = getChartData(figure)
  const themeChanged = setChartTheme(bokehTheme, renderData.theme as Theme)

  // NOTE: Each script run forces Bokeh to provide different ids for their
  // elements. For that reason, this will always update the chart.
  // The only exception would be if the same info is sent down from the frontend
  // only. It shouldn't happen, but it's a safeguard.
  if (hasChanged || themeChanged) {
    await updateChart(chartData, useContainerWidth)
  }

  // The UI may change dimensions so we should ensure the iframe is the proper height
  Streamlit.setFrameHeight()
}

// Attach our `onRender` handler to Streamlit's render event.
Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender)

// Tell Streamlit we're ready to start receiving data. We won't get our
// first RENDER_EVENT until we call this function.
Streamlit.setComponentReady()

// Finally, tell Streamlit to update our initial height. We omit the
// `height` parameter here to have it default to our scrollHeight.
Streamlit.setFrameHeight()
