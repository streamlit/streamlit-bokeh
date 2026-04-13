# Copyright (c) Snowflake Inc. (2025)
#
# Licensed under the Apache License, Version 2.0

import importlib.metadata
import json
import os
from typing import TYPE_CHECKING

import bokeh
import streamlit as st
from bokeh.embed import json_item
from packaging.version import Version

if TYPE_CHECKING:
    from bokeh.plotting.figure import Figure


_DEV = os.environ.get("DEV", False)
_RELEASE = not _DEV

_STREAMLIT_VERSION = importlib.metadata.version("streamlit")

_IS_USING_CCV2 = Version(_STREAMLIT_VERSION) >= Version("1.51.0")

_ISOLATE_STYLES = False

_IS_USING_UPDATED_ISOLATE_STYLES_PARAM = Version(_STREAMLIT_VERSION) >= Version(
    "1.53.0"
)

# Component registration
if _IS_USING_CCV2:
    _component_kwargs: dict[str, object] = {
        "name": "streamlit-bokeh.streamlit_bokeh",
        "js": "v2/index-*.mjs",
        "html": "<div class='stBokehContainer'></div>",
    }

    if _IS_USING_UPDATED_ISOLATE_STYLES_PARAM:
        _component_kwargs["isolate_styles"] = _ISOLATE_STYLES

    _component_func = st.components.v2.component(**_component_kwargs)

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
REQUIRED_BOKEH_VERSION = "3.9.0"


def streamlit_bokeh(
    figure: "Figure",
    use_container_width: bool = True,
    theme: str = "streamlit",
    key: str | None = None,
) -> None:
    """Render a Bokeh chart in Streamlit."""

    if bokeh.__version__ != REQUIRED_BOKEH_VERSION:
        raise Exception(
            f"Streamlit only supports Bokeh version {REQUIRED_BOKEH_VERSION}, "
            f"but you have version {bokeh.__version__} installed. Please "
            f"run `pip install --force-reinstall --no-deps bokeh=="
            f"{REQUIRED_BOKEH_VERSION}`"
        )

    if _IS_USING_CCV2:
        _call_kwargs: dict[str, object] = {
            "key": key,
            "data": {
                "figure": json.dumps(json_item(figure)),

                # 🔥 FINAL FIX: Disable frontend theme override
                "bokeh_theme": None,

                "use_container_width": use_container_width,
            },
        }

        if not _IS_USING_UPDATED_ISOLATE_STYLES_PARAM:
            _call_kwargs["isolate_styles"] = _ISOLATE_STYLES

        _component_func(**_call_kwargs)
        return None

    else:
        _component_func(
            figure=json.dumps(json_item(figure)),
            use_container_width=use_container_width,

            # 🔥 FINAL FIX HERE ALSO
            bokeh_theme=None,

            key=key,
        )
        return None