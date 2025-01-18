# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import streamlit as st
from bokeh.plotting import figure
from chart_types import CHART_TYPES
import numpy as np
import pandas as pd
from streamlit_bokeh import streamlit_bokeh

np.random.seed(0)

chart = st.selectbox("Select a chart", CHART_TYPES)

p = None
if chart == "markers":
    from bokeh.core.enums import MarkerType

    p = figure(title="Bokeh Markers", toolbar_location=None)
    p.grid.grid_line_color = None
    p.background_fill_color = "#eeeeee"
    p.axis.visible = False
    p.y_range.flipped = True

    N = 10

    for i, marker in enumerate(MarkerType):
        x = i % 4
        y = (i // 4) * 4 + 1

        p.scatter(
            np.random.random(N) + 2 * x,
            np.random.random(N) + y,
            marker=marker,
            size=14,
            line_color="navy",
            fill_color="orange",
            alpha=0.5,
        )

        p.text(
            2 * x + 0.5,
            y + 2.5,
            text=[marker],
            text_color="firebrick",
            text_align="center",
            text_font_size="13px",
        )
elif chart == "color_scatter":
    N = 4000
    x = np.random.random(size=N) * 100
    y = np.random.random(size=N) * 100
    radii = np.random.random(size=N) * 1.5
    colors = np.array(
        [(r, g, 150) for r, g in zip(50 + 2 * x, 30 + 2 * y)], dtype="uint8"
    )

    TOOLS = "hover,crosshair,pan,wheel_zoom,zoom_in,zoom_out,box_zoom,undo,redo,reset,tap,save,box_select,poly_select,lasso_select,examine,help"

    p = figure(tools=TOOLS)

    p.circle(x, y, radius=radii, fill_color=colors, fill_alpha=0.6, line_color=None)
elif chart == "elements":
    from bokeh.models import ColumnDataSource, LabelSet
    from bokeh.sampledata.periodic_table import elements

    elements = elements.copy()
    elements = elements[elements["atomic number"] <= 82]
    elements = elements[~pd.isnull(elements["melting point"])]
    mass = [float(x.strip("[]")) for x in elements["atomic mass"]]
    elements["atomic mass"] = mass

    palette = [
        "#053061",
        "#2166ac",
        "#4393c3",
        "#92c5de",
        "#d1e5f0",
        "#f7f7f7",
        "#fddbc7",
        "#f4a582",
        "#d6604d",
        "#b2182b",
        "#67001f",
    ]

    melting_points = elements["melting point"]
    low = min(melting_points)
    high = max(melting_points)
    melting_point_inds = [
        int(10 * (x - low) / (high - low)) for x in melting_points
    ]  # gives items in colors a value from 0-10
    elements["melting_colors"] = [palette[i] for i in melting_point_inds]

    TITLE = "Density vs Atomic Weight of Elements (colored by melting point)"
    TOOLS = "hover,pan,wheel_zoom,box_zoom,reset,save"

    p = figure(tools=TOOLS, toolbar_location="above", width=1200, title=TITLE)
    p.toolbar.logo = "grey"
    p.background_fill_color = "#efefef"
    p.xaxis.axis_label = "atomic weight (amu)"
    p.yaxis.axis_label = "density (g/cm^3)"
    p.grid.grid_line_color = "white"
    p.hover.tooltips = [
        ("name", "@name"),
        ("symbol:", "@symbol"),
        ("density", "@density"),
        ("atomic weight", "@{atomic mass}"),
        ("melting point", "@{melting point}"),
    ]

    source = ColumnDataSource(elements)

    p.scatter(
        "atomic mass",
        "density",
        size=12,
        source=source,
        color="melting_colors",
        line_color="black",
        alpha=0.9,
    )

    labels = LabelSet(
        x="atomic mass",
        y="density",
        text="symbol",
        y_offset=8,
        text_font_size="11px",
        text_color="#555555",
        source=source,
        text_align="center",
    )
    p.add_layout(labels)
elif chart == "lorenz":
    from scipy.integrate import odeint

    sigma = 10
    rho = 28
    beta = 8.0 / 3
    theta = 3 * np.pi / 4

    def lorenz(xyz, t):
        x, y, z = xyz
        x_dot = sigma * (y - x)
        y_dot = x * rho - x * z - y
        z_dot = x * y - beta * z
        return [x_dot, y_dot, z_dot]

    initial = (-10, -7, 35)
    t = np.arange(0, 100, 0.006)

    solution = odeint(lorenz, initial, t)

    x = solution[:, 0]
    y = solution[:, 1]
    z = solution[:, 2]
    xprime = np.cos(theta) * x - np.sin(theta) * y

    colors = [
        "#C6DBEF",
        "#9ECAE1",
        "#6BAED6",
        "#4292C6",
        "#2171B5",
        "#08519C",
        "#08306B",
    ]

    p = figure(title="Lorenz attractor example", background_fill_color="#fafafa")

    p.multi_line(
        np.array_split(xprime, 7),
        np.array_split(z, 7),
        line_color=colors,
        line_alpha=0.8,
        line_width=1.5,
    )
elif chart == "linear_cmap":
    from numpy.random import standard_normal
    from bokeh.transform import linear_cmap
    from bokeh.util.hex import hexbin

    x = standard_normal(50000)
    y = standard_normal(50000)

    bins = hexbin(x, y, 0.1)

    p = figure(tools="", match_aspect=True, background_fill_color="#440154")
    p.grid.visible = False

    p.hex_tile(
        q="q",
        r="r",
        size=0.1,
        line_color=None,
        source=bins,
        fill_color=linear_cmap("counts", "Viridis256", 0, max(bins.counts)),
    )
elif chart == "basic_bar":
    fruits = ["Apples", "Pears", "Nectarines", "Plums", "Grapes", "Strawberries"]
    counts = [5, 3, 4, 2, 4, 6]

    p = figure(
        x_range=fruits,
        height=350,
        title="Fruit Counts",
        toolbar_location=None,
        tools="",
    )

    p.vbar(x=fruits, top=counts, width=0.9)

    p.xgrid.grid_line_color = None
    p.y_range.start = 0
elif chart == "vstack_line":
    from bokeh.palettes import tol

    N = 10
    df = pd.DataFrame(np.random.randint(10, 100, size=(15, N))).add_prefix("y")

    p = figure(x_range=(0, len(df) - 1), y_range=(0, 800))
    p.grid.minor_grid_line_color = "#eeeeee"

    names = [f"y{i}" for i in range(N)]
    p.varea_stack(
        stackers=names, x="index", color=tol["Sunset"][N], legend_label=names, source=df
    )

    p.legend.orientation = "horizontal"
    p.legend.background_fill_color = "#fafafa"
elif chart == "stack_bar":
    from bokeh.palettes import HighContrast3

    fruits = ["Apples", "Pears", "Nectarines", "Plums", "Grapes", "Strawberries"]
    years = ["2015", "2016", "2017"]

    data = {
        "fruits": fruits,
        "2015": [2, 1, 4, 3, 2, 4],
        "2016": [5, 3, 4, 2, 4, 6],
        "2017": [3, 2, 4, 4, 5, 3],
    }

    p = figure(
        x_range=fruits,
        height=250,
        title="Fruit Counts by Year",
        toolbar_location=None,
        tools="hover",
        tooltips="$name @fruits: @$name",
    )

    p.vbar_stack(
        years,
        x="fruits",
        width=0.9,
        color=HighContrast3,
        source=data,
        legend_label=years,
    )

    p.y_range.start = 0
    p.x_range.range_padding = 0.1
    p.xgrid.grid_line_color = None
    p.axis.minor_tick_line_color = None
    p.outline_line_color = None
    p.legend.location = "top_left"
    p.legend.orientation = "horizontal"

streamlit_bokeh(p, use_container_width=False)

streamlit_bokeh(p, use_container_width=True)
