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

import importlib.metadata
import json
from typing import TYPE_CHECKING

import bokeh
import streamlit as st
from bokeh.embed import json_item

if TYPE_CHECKING:
    from bokeh.plotting.figure import Figure


_component_func = st.components.v2.component("streamlit_bokeh.streamlit_bokeh")


__version__ = importlib.metadata.version("streamlit_bokeh")
REQUIRED_BOKEH_VERSION = "3.7.3"


def streamlit_bokeh(
    figure: "Figure",
    use_container_width: bool = True,
    theme: str = "streamlit",
    key: str | None = None,
) -> None:
    """Create a new instance of "streamlit_bokeh".

    Parameters
    ----------
    figure: bokeh.plotting.figure.Figure
        A Bokeh figure to plot.
    use_container_width : bool
        Whether to override the figure's native width with the width of
        the parent container. If ``use_container_width`` is ``False``,
        Streamlit sets the width of the chart to fit its contents
        according to the plotting library, up to the width of the parent
        container. If ``use_container_width`` is ``True`` (default), Streamlit
        sets the width of the figure to match the width of the parent container.
    key: str or None
        An optional key that uniquely identifies this component. If this is
        None, and the component's arguments are changed, the component will
        be re-mounted in the Streamlit frontend and lose its current state.

    Example
    -------
    >>> from streamlit_bokeh import streamlit_bokeh
    >>> from bokeh.plotting import figure
    >>>
    >>> x = [1, 2, 3, 4, 5]
    >>> y = [6, 7, 2, 4, 5]
    >>>
    >>> p = figure(title="simple line example", x_axis_label="x", y_axis_label="y")
    >>> p.line(x, y, legend_label="Trend", line_width=2)
    >>>
    >>> streamlit_bokeh(p, use_container_width=True)

    """

    if bokeh.__version__ != REQUIRED_BOKEH_VERSION:
        # TODO(ken): Update Error message
        raise Exception(
            f"Streamlit only supports Bokeh version {REQUIRED_BOKEH_VERSION}, "
            f"but you have version {bokeh.__version__} installed. Please "
            f"run `pip install --force-reinstall --no-deps bokeh=="
            f"{REQUIRED_BOKEH_VERSION}` to install the correct version."
        )

    # Call through to our private component function.
    out = _component_func(
        key=key,
        data={
            "figure": json.dumps(json_item(figure)),
            "bokeh_theme": theme,
            "use_container_width": use_container_width,
        },
        isolate_styles=False,
    )
    return out
