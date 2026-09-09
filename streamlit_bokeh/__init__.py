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

from __future__ import annotations

import importlib.metadata
import json
import os
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

import bokeh
import streamlit as st
from bokeh.embed import json_item
from packaging.version import Version
from streamlit.errors import StreamlitAPIException

if TYPE_CHECKING:
    from bokeh.model import Model


# Create a _RELEASE constant. We'll set this to False while we're developing
# the component, and True when we're ready to package and distribute it.
# (This is, of course, optional - there are innumerable ways to manage your
# release process.)
_DEV = os.environ.get("DEV", False)
_RELEASE = not _DEV


_STREAMLIT_VERSION = importlib.metadata.version("streamlit")

# If streamlit version is >= 1.51.0 use Custom Component v2 API, otherwise use
# Custom Component v1 API
_IS_USING_CCV2 = Version(_STREAMLIT_VERSION) >= Version("1.51.0")

_ISOLATE_STYLES = False

_IS_USING_UPDATED_ISOLATE_STYLES_PARAM = Version(_STREAMLIT_VERSION) >= Version(
    "1.53.0"
)

# Version-gated component registration
_component_func: Callable[..., Any]

if _IS_USING_CCV2:
    # Streamlit 1.53+ accepts isolate_styles in the `component(...)` call.
    if _IS_USING_UPDATED_ISOLATE_STYLES_PARAM:
        _component_func = st.components.v2.component(
            name="streamlit-bokeh.streamlit_bokeh",
            js="v2/index-*.mjs",
            html="<div class='stBokehContainer'></div>",
            isolate_styles=_ISOLATE_STYLES,
        )
    else:
        _component_func = st.components.v2.component(
            name="streamlit-bokeh.streamlit_bokeh",
            js="v2/index-*.mjs",
            html="<div class='stBokehContainer'></div>",
        )
else:
    if not _RELEASE:
        _component_func = st.components.v1.declare_component(
            "streamlit_bokeh",
            url="http://localhost:3001",
        )
    else:
        parent_dir = os.path.dirname(os.path.abspath(__file__))
        build_dir = os.path.join(parent_dir, "frontend/build")
        _component_func = st.components.v1.declare_component(
            "streamlit_bokeh", path=build_dir
        )


__version__ = importlib.metadata.version("streamlit_bokeh")
REQUIRED_BOKEH_VERSION = "3.10.0"

# Bokeh's built-in themes that ship in the BokehJS bundles this component
# loads. Deliberately not bokeh.themes.built_in_themes: "carbon" is in Bokeh's
# Python package but absent from BokehJS, so it can never be applied here.
_SUPPORTED_BOKEH_THEMES = (
    "caliber",
    "contrast",
    "dark_minimal",
    "light_minimal",
    "night_sky",
)

# Themes bokeh.themes offers that BokehJS does not, tracked so the error can
# explain the difference instead of reporting them as unknown names.
_PYTHON_ONLY_BOKEH_THEMES = ("carbon",)


def _validate_theme(theme: str | None) -> None:
    """Reject theme names the frontend cannot apply.

    Without this, an unsupported name silently falls back to the Streamlit
    theme in the frontend, so the chart renders with a theme the caller never
    asked for and nothing reports it.
    """
    if theme is None or theme == "streamlit" or theme in _SUPPORTED_BOKEH_THEMES:
        return

    supported = ", ".join(
        f"`{name}`" for name in ("streamlit", *_SUPPORTED_BOKEH_THEMES)
    )
    detail = ""
    if theme in _PYTHON_ONLY_BOKEH_THEMES:
        detail = (
            f" `{theme}` is one of Bokeh's Python themes, but it isn't included in "
            "BokehJS, so it can't be applied in the browser."
        )

    raise StreamlitAPIException(
        f"Invalid `theme` value: `{theme}`. Supported values: {supported}, or "
        f"`None` to disable theming.{detail}"
    )


def streamlit_bokeh(
    figure: "Model",
    use_container_width: bool = True,
    theme: str | None = "streamlit",
    key: str | None = None,
) -> None:
    """Create a new instance of "streamlit_bokeh".

    Parameters
    ----------
    figure: bokeh.model.Model
        A Bokeh model, typically a figure, to plot.
    use_container_width : bool
        Whether to override the figure's native width with the width of
        the parent container. If ``use_container_width`` is ``False``,
        Streamlit sets the width of the chart to fit its contents
        according to the plotting library, up to the width of the parent
        container. If ``use_container_width`` is ``True`` (default), Streamlit
        sets the width of the figure to match the width of the parent container.
    theme : str or None
        The theme to draw the figure with. This can be:

        - ``"streamlit"`` (default): match Streamlit's current theme, including
          light and dark mode.
        - The name of a Bokeh theme: ``"caliber"``, ``"contrast"``,
          ``"dark_minimal"``, ``"light_minimal"``, or ``"night_sky"``.
        - ``None``: apply no theme, so the figure renders exactly as Bokeh
          would draw it on its own.

        Styling you set on the figure always takes precedence over the theme.
        A theme only fills in what you left unspecified, so setting a colour
        makes that element render at Bokeh's default opacity rather than the
        theme's. Set the matching ``*_alpha`` property to control opacity
        yourself.
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
        raise StreamlitAPIException(
            f"`streamlit-bokeh` only supports Bokeh version "
            f"{REQUIRED_BOKEH_VERSION}, but you have version "
            f"{bokeh.__version__} installed. Please run `pip install "
            f"--force-reinstall --no-deps bokeh=={REQUIRED_BOKEH_VERSION}` to "
            f"install the correct version."
        )

    _validate_theme(theme)

    if _IS_USING_CCV2:
        # Call through to our private component function.
        data = {
            "figure": json.dumps(json_item(figure)),
            "bokeh_theme": theme,
            "use_container_width": use_container_width,
        }
        # Streamlit 1.51-1.52 accepts isolate_styles on the returned component
        # function (it moved to `component(...)` in 1.53).
        if not _IS_USING_UPDATED_ISOLATE_STYLES_PARAM:
            _component_func(key=key, data=data, isolate_styles=_ISOLATE_STYLES)
        else:
            _component_func(key=key, data=data)

        return None
    else:
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
