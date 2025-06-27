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

// import { Theme } from "streamlit-component-lib"
import { BidiComponentState, StV2ComponentArgs } from "./ST_TEMP"
import { streamlitTheme } from "./streamlit-theme"

import bokehMin from "./assets/bokeh/bokeh-3.7.3.min.js?url"
import bokehWidgets from "./assets/bokeh/bokeh-widgets-3.7.3.min.js?url"
import bokehTables from "./assets/bokeh/bokeh-tables-3.7.3.min.js?url"
import bokehApi from "./assets/bokeh/bokeh-api-3.7.3.min.js?url"
import bokehGl from "./assets/bokeh/bokeh-gl-3.7.3.min.js?url"

import SourceSansProRegular from "./assets/fonts/SourceSansPro-Regular.woff2?url"
import SourceSansProSemiBold from "./assets/fonts/SourceSansPro-SemiBold.woff2?url"
import SourceSansProBold from "./assets/fonts/SourceSansPro-Bold.woff2?url"

import indexCss from "./assets/index.css?url"

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
// const chart = document.getElementById("stBokehChart") as HTMLDivElement

// These values come from Bokeh's default values
// See https://github.com/bokeh/bokeh/blob/3.6.2/bokehjs/src/lib/models/plots/plot.ts#L203
const DEFAULT_WIDTH = 400 // px
const DEFAULT_HEIGHT = 350 // px

/**
 * This function is a memoized function that returns the chart data
 * if the figure is the same as the last time it was called.
 */
export const getChartDataGenerator = () => {
  const savedFigure: Record<string, string | null> = {}
  const savedChartData: Record<string, object | null> = {}

  return (figure: string, key: string) => {
    if (figure !== savedFigure[key]) {
      savedFigure[key] = figure
      savedChartData[key] = JSON.parse(figure)

      return { data: savedChartData[key], hasChanged: true }
    }

    return { data: savedChartData[key], hasChanged: false }
  }
}
const getChartData = getChartDataGenerator()

export const setChartThemeGenerator = () => {
  let currentTheme: string | null = null
  let appTheme: string | null = null

  // TODO: FIXME:
  // @ts-expect-error TODO: Migrating to v2
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
  useContainerWidth: boolean,
  parentElement: HTMLElement
): Dimensions {
  const originalWidth: number = plot.attributes.width ?? DEFAULT_WIDTH
  const originalHeight: number = plot.attributes.height ?? DEFAULT_HEIGHT

  let width: number = originalWidth
  let height: number = originalHeight

  if (useContainerWidth) {
    // Use the width without a scrollbar to ensure the width always
    // looks good.
    width = parentElement.clientWidth
    height = (width / originalWidth) * originalHeight
  }

  return { width, height }
}

function removeAllChildNodes(element: Node): void {
  while (element.lastChild) {
    element.lastChild.remove()
  }
}

async function updateChart(
  data: any,
  useContainerWidth: boolean = false,
  chart: HTMLDivElement,
  parentElement: HTMLElement,
  key: string
) {
  /**
   * When you create a bokeh chart in your python script, you can specify
   * the width: p = figure(title="simple line example", x_axis_label="x", y_axis_label="y", plot_width=200);
   * In that case, the json object will contains an attribute called
   * plot_width (or plot_height) inside the plot reference.
   * If that values are missing, we can set that values to make the chart responsive.
   *
   * Note that the figure is the first element in roots array.
   */
  const plot = data?.doc?.roots?.[0]

  if (plot) {
    const { width, height } = getChartDimensions(
      plot,
      useContainerWidth,
      parentElement
    )

    if (width > 0) {
      plot.attributes.width = width
    }
    if (height > 0) {
      plot.attributes.height = height
    }
  }

  if (chart !== null) {
    removeAllChildNodes(chart)
    await window.Bokeh.embed.embed_item(data, `stBokehChart_${key}`)
  }
}

interface ComponentData {
  figure: string
  use_container_width: boolean
  bokeh_theme: string
  key: string
}

/**
 * The component's render function. This will be called immediately after
 * the component is initially loaded, and then again every time the
 * component gets new data from Python.
 */
async function onRender(event: Event): Promise<void> {
  // @ts-expect-error TODO: Migrating to v2
  const renderData: RenderData<ComponentData> =
    // @ts-expect-error TODO: Migrating to v2
    (event as CustomEvent<RenderData<ComponentData>>).detail
  const {
    figure,
    bokeh_theme: bokehTheme,
    use_container_width: useContainerWidth,
    key,
  } = renderData.args

  const { data: chartData, hasChanged } = getChartData(figure, key)
  // @ts-expect-error TODO: Migrating to v2
  const themeChanged = setChartTheme(bokehTheme, renderData.theme as Theme)

  // NOTE: Each script run forces Bokeh to provide different ids for their
  // elements. For that reason, this will always update the chart.
  // The only exception would be if the same info is sent down from the frontend
  // only. It shouldn't happen, but it's a safeguard.
  if (hasChanged || themeChanged) {
    // await updateChart(chartData, useContainerWidth)
  }

  // The UI may change dimensions so we should ensure the iframe is the proper height
  // Streamlit.setFrameHeight()
}

const loadFonts = async ({
  parentElement,
}: {
  parentElement: HTMLElement | ShadowRoot
}) => {
  const fonts = [SourceSansProRegular, SourceSansProSemiBold, SourceSansProBold]
  for (const font of fonts) {
    const fontElement = document.createElement("link")
    // fontElement.rel = "preload"
    fontElement.href = font
    parentElement.appendChild(fontElement)
  }
}

const loadBokeh = async ({
  parentElement,
}: {
  parentElement: HTMLElement | ShadowRoot
}) => {
  // Load bokeh first and wait for it to exist before loading the rest of the scripts
  // This is to avoid race conditions since plugins require window.Bokeh to be defined
  // before they can be loaded.
  const bokehScript = document.createElement("script")
  bokehScript.src = bokehMin
  parentElement.appendChild(bokehScript)

  // Wait for window.Bokeh to be defined
  await new Promise(resolve => {
    // If it is not loaded in 5 seconds, throw an error
    const timeout = setTimeout(() => {
      throw new Error("Bokeh not loaded")
    }, 5000)

    const interval = setInterval(() => {
      if (window.Bokeh) {
        clearInterval(interval)
        clearTimeout(timeout)
        resolve(undefined)
      }
    }, 100)
  })

  const bokehScripts = [bokehWidgets, bokehTables, bokehApi, bokehGl]

  for (const script of bokehScripts) {
    const scriptElement = document.createElement("script")
    scriptElement.src = script
    parentElement.appendChild(scriptElement)
  }
}

const loadCss = async ({
  parentElement,
}: {
  parentElement: HTMLElement | ShadowRoot
}) => {
  const cssElement = document.createElement("link")
  cssElement.rel = "stylesheet"
  cssElement.href = indexCss
  parentElement.appendChild(cssElement)
}

/**
 * Module-scoped state to avoid loading the Bokeh scripts multiple times per
 * component.
 */
const hasInitialized: Record<string, boolean> = {}

export default async function (
  component: StV2ComponentArgs<{}, ComponentData>
) {
  console.debug("Streamlit Bokeh component rendered by Streamlit", component, {
    hasInitialized,
  })
  const { parentElement } = component
  const {
    figure,
    bokeh_theme: bokehTheme,
    use_container_width: useContainerWidth,
    key,
  } = component.data

  if (!hasInitialized[key]) {
    hasInitialized[key] = true
    await Promise.all([
      loadBokeh({ parentElement }),
      loadFonts({ parentElement }),
      loadCss({ parentElement }),
    ])
  }

  const container =
    parentElement.querySelector<HTMLDivElement>(".stBokehContainer")
  const chart = parentElement.querySelector<HTMLDivElement>(
    `#stBokehChart_${key}`
  )

  if (!chart || !container) {
    throw new Error("Chart not found")
  }

  const { data: chartData, hasChanged } = getChartData(figure, key)
  // TODO: Support theming.
  const themeChanged = false
  // const themeChanged = setChartTheme(bokehTheme, renderData.theme as Theme)

  // NOTE: Each script run forces Bokeh to provide different ids for their
  // elements. For that reason, this will always update the chart.
  // The only exception would be if the same info is sent down from the frontend
  // only. It shouldn't happen, but it's a safeguard.
  if (hasChanged || themeChanged) {
    await updateChart(chartData, useContainerWidth, chart, container, key)
  }

  return () => {}
}
