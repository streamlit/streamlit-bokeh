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

import { StreamlitTheme } from "@streamlit/component-v2-lib"
import { transparentize } from "color2k"

type BokehObjectType = string
type AttrName = string
type AttrValue = string | number

// Bokeh does not export their Theme Class, so we
// simulate close to the class provided by Bokeh
// The relevant class is located here:
// https://github.com/bokeh/bokeh/blob/3.7.3/bokehjs/src/lib/api/themes.ts#L17
class BokehTheme {
  readonly attrs: Record<BokehObjectType, Record<AttrName, AttrValue>>

  constructor(attrs: Record<BokehObjectType, Record<AttrName, AttrValue>>) {
    this.attrs = attrs
  }

  get(obj: any, attr: string): unknown | undefined {
    // Identify the type of the Bokeh object. It will be
    // an instance of a class that Bokeh provides through
    // their API, so we just iterate over all the classes
    // to identify the type of the object.
    let type = null
    Object.keys(this.attrs).forEach(key => {
      // Bokeh models are accessible through window.Bokeh.Models
      const BokehModel = window.Bokeh.Models?.[key]
      if (BokehModel && obj instanceof BokehModel) {
        type = key
      }
    })

    if (type === null) {
      return undefined
    }

    const attrsForType = this.attrs[type] ?? {}

    return attrsForType[attr] ?? undefined
  }
}

export function streamlitTheme(theme: StreamlitTheme): BokehTheme {
  const { backgroundColor, secondaryBackgroundColor, textColor } = theme
  const fadedText10 = transparentize(textColor, 0.8)

  return new BokehTheme({
    Plot: {
      background_fill_color: backgroundColor,
      border_fill_color: backgroundColor,
      outline_line_color: "transparent",
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
      // We hardcode the font because if the font ever changes,
      // We would need to include the relevant font files anyways
      major_label_text_font: '"Source Sans Pro", sans-serif',
      major_label_text_font_size: "1em",

      axis_label_standoff: 10,
      axis_label_text_color: textColor,
      // We hardcode the font because if the font ever changes,
      // We would need to include the relevant font files anyways
      axis_label_text_font: '"Source Sans Pro", sans-serif',
      axis_label_text_font_size: "1em",
      axis_label_text_font_style: "normal",
    },
    Legend: {
      spacing: 8,
      glyph_width: 15,

      label_standoff: 8,
      label_text_color: textColor,
      // We hardcode the font because if the font ever changes,
      // We would need to include the relevant font files anyways
      label_text_font: '"Source Sans Pro", sans-serif',
      label_text_font_size: "1.025em",

      border_line_alpha: 0,
      background_fill_alpha: 0.25,
      background_fill_color: fadedText10,
    },
    BaseColorBar: {
      title_text_color: textColor,
      // We hardcode the font because if the font ever changes,
      // We would need to include the relevant font files anyways
      title_text_font: '"Source Sans Pro", sans-serif',
      title_text_font_size: "1.025em",
      title_text_font_style: "normal",

      major_label_text_color: textColor,
      // We hardcode the font because if the font ever changes,
      // We would need to include the relevant font files anyways
      major_label_text_font: '"Source Sans Pro", sans-serif',
      major_label_text_font_size: "1.025em",

      background_fill_color: secondaryBackgroundColor,
      major_tick_line_alpha: 0,
      bar_line_alpha: 0,
    },
    Title: {
      text_color: textColor,
      // We hardcode the font because if the font ever changes,
      // We would need to include the relevant font files anyways
      text_font: '"Source Sans Pro", sans-serif',
      text_font_size: "1.15em",
    },
  })
}
