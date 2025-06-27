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


import streamlit as st
from bokeh.plotting import figure

from streamlit_bokeh import streamlit_bokeh

st.title("Streamlit Bokeh Example")


# Data
x = [1, 2, 3, 4, 5]
y = [6, 7, 2, 4, 5]


def make_bokeh_figure(title: str):
    # Create Bokeh figure
    bokeh_figure = figure(title=title, x_axis_label="x", y_axis_label="y")
    bokeh_figure.line(x, y, legend_label="Trend", line_width=2)

    return bokeh_figure


@st.cache_resource
def make_bokeh_figures():
    return [
        make_bokeh_figure("Simple Line Example"),
        make_bokeh_figure("Simple Line Example 2"),
        make_bokeh_figure("Simple Line Example 3"),
    ]


BOKEH_FIGURES = make_bokeh_figures()

# Render in Streamlit
streamlit_bokeh(
    BOKEH_FIGURES[0],
    theme="streamlit",
    key="my_unique_key",
    use_container_width=True,
)

st.write("Bokeh in columns ⬇️")

col1, col2 = st.columns(2)

with col1:
    streamlit_bokeh(
        BOKEH_FIGURES[1],
        theme="streamlit",
        key="my_unique_key_1",
        use_container_width=True,
    )

with col2:
    streamlit_bokeh(
        BOKEH_FIGURES[2],
        theme="streamlit",
        key="my_unique_key_2",
        use_container_width=True,
    )


if st.button("Update"):
    st.write("Clicked")
