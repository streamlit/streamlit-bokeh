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

import { Theme } from "streamlit-component-lib"

class BokehTheme {
  readonly attrs: Record<string, Record<string, string | number>>

  constructor(attrs: Record<string, Record<string, string | number>>) {
    this.attrs = attrs
  }

  get(obj: any, attr: string): unknown | undefined {
    let type = null
    Object.keys(this.attrs).forEach((key) => {
      if (obj instanceof window.Bokeh[key]) {
        type = key
      }
    })

    if (type === null) {
      return undefined
    }

    try {
      return this.attrs[type][attr]
    } catch {
      // Must not be set
      return undefined
    }
  }
}

export function streamlitTheme(theme: Theme): BokehTheme {
  // @ts-expect-error fadedText10 is not defined in the Theme type
  const { backgroundColor, fadedText10, secondaryBackgroundColor, textColor } =
    theme

  return new BokehTheme({
    Plot: {
      background_fill_color: backgroundColor,
      border_fill_color: backgroundColor,
      outline_line_color: textColor,
      outline_line_alpha: 0.25,
    },
    Grid: {
      grid_line_color: fadedText10,
      grid_line_alpha: 0.5,
    },
    Axis: {
      major_tick_line_alpha: 0,
      major_tick_line_color: textColor,

      minor_tick_line_alpha: 0,
      minor_tick_line_color: textColor,

      axis_line_alpha: 0,
      axis_line_color: textColor,

      major_label_text_color: textColor,
      major_label_text_font: '"Source Sans Pro", sans-serif',
      major_label_text_font_size: "1em",

      axis_label_standoff: 10,
      axis_label_text_color: textColor,
      axis_label_text_font: '"Source Sans Pro", sans-serif',
      axis_label_text_font_size: "1em",
      axis_label_text_font_style: "normal",
    },
    Legend: {
      spacing: 8,
      glyph_width: 15,

      label_standoff: 8,
      label_text_color: textColor,
      label_text_font: '"Source Sans Pro", sans-serif',
      label_text_font_size: "1.025em",

      border_line_alpha: 0,
      background_fill_alpha: 0.25,
      background_fill_color: fadedText10,
    },
    BaseColorBar: {
      title_text_color: textColor,
      title_text_font: '"Source Sans Pro", sans-serif',
      title_text_font_size: "1.025em",
      title_text_font_style: "normal",

      major_label_text_color: textColor,
      major_label_text_font: '"Source Sans Pro", sans-serif',
      major_label_text_font_size: "1.025em",

      background_fill_color: secondaryBackgroundColor,
      major_tick_line_alpha: 0,
      bar_line_alpha: 0,
    },
    Title: {
      text_color: textColor,
      text_font: '"Source Sans Pro", sans-serif',
      text_font_size: "1.15em",
    },
  })
}
