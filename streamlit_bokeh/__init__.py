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

import json
import os
from typing import TYPE_CHECKING
import streamlit.components.v1 as components
import importlib.metadata
import bokeh
from bokeh.embed import json_item

# Create a _RELEASE constant. We'll set this to False while we're developing
# the component, and True when we're ready to package and distribute it.
# (This is, of course, optional - there are innumerable ways to manage your
# release process.)
_DEV = os.environ.get("DEV", False)
_RELEASE = not _DEV

# Declare a Streamlit component. `declare_component` returns a function
# that is used to create instances of the component. We're naming this
# function "_component_func", with an underscore prefix, because we don't want
# to expose it directly to users. Instead, we will create a custom wrapper
# function, below, that will serve as our component's public API.

# It's worth noting that this call to `declare_component` is the
# *only thing* you need to do to create the binding between Streamlit and
# your component frontend. Everything else we do in this file is simply a
# best practice.

if not _RELEASE:
    _component_func = components.declare_component(
        # We give the component a simple, descriptive name ("streamlit_bokeh"
        # does not fit this bill, so please choose something better for your
        # own component :)
        "streamlit_bokeh",
        # Pass `url` here to tell Streamlit that the component will be served
        # by the local dev server that you run via `npm run start`.
        # (This is useful while your component is in development.)
        url="http://localhost:3001",
    )
else:
    # When we're distributing a production version of the component, we'll
    # replace the `url` param with `path`, and point it to the component's
    # build directory:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("streamlit_bokeh", path=build_dir)

if TYPE_CHECKING:
    from bokeh.plotting.figure import Figure

__version__ = importlib.metadata.version("streamlit_bokeh")
REQUIRED_BOKEH_VERSION = "3.6.3"


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

    # Call through to our private component function. Arguments we pass here
    # will be sent to the frontend, where they'll be available in an "args"
    # dictionary.
    _component_func(
        figure=json.dumps(json_item(figure)),
        use_container_width=use_container_width,
        bokeh_theme=theme,
        key=key,
    )

    return None
