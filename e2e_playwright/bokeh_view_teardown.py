# Copyright (c) Snowflake Inc. (2025)
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

"""App for the view-teardown regression test.

A chart plus a widget that reruns the script without changing the figure, which
is the shape that leaked views before: each rerun gives Bokeh fresh element ids,
so the component re-embeds every time. A HoverTool is included because its
tooltip is the visible symptom -- it attaches to document.body and is left
behind when views are not torn down.

See streamlit/streamlit#15549.
"""

import streamlit as st
from bokeh.models import HoverTool
from bokeh.plotting import figure

from streamlit_bokeh import streamlit_bokeh

# Reruns the script; the figure is rebuilt unchanged.
st.button("Rerun")

# One large marker at the exact centre of fixed ranges, with the axes hidden so
# the plot frame fills the canvas. A test can then hover the centre of the canvas
# and be certain of hitting it -- no sweeping for a marker, and no way for the
# test to quietly pass because it never found one.
plot = figure(
    title="View teardown",
    width=400,
    height=300,
    x_range=(0, 10),
    y_range=(0, 10),
    toolbar_location=None,
    tools=[HoverTool(tooltips=[("x", "@x"), ("y", "@y")])],
)
plot.axis.visible = False
plot.grid.visible = False
plot.scatter([5], [5], size=80, fill_color="orange", line_color="navy")

streamlit_bokeh(plot, use_container_width=False, key="teardown_chart")
