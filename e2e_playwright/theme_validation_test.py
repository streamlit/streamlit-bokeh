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

"""Tests for `theme` validation.

These live here because `pytest e2e_playwright` is the only Python test run the
component has, and the playwright job installs the built package. They need no
browser.

Without them the `theme` parameter has no Python coverage at all: the e2e app
only ever passes valid names, so the rejection path never executes.
"""

from __future__ import annotations

from pathlib import Path

import bokeh
import pytest
import streamlit_bokeh
from streamlit.errors import StreamlitAPIException

_REPO_ROOT = Path(__file__).parent.parent


@pytest.mark.parametrize(
    "theme",
    [
        None,
        "streamlit",
        "caliber",
        "contrast",
        "dark_minimal",
        "light_minimal",
        "night_sky",
    ],
)
def test_accepts_supported_themes(theme: str | None) -> None:
    streamlit_bokeh._validate_theme(theme)


@pytest.mark.parametrize("theme", ["nope", "Caliber", "DARK_MINIMAL", ""])
def test_rejects_unknown_themes(theme: str) -> None:
    with pytest.raises(StreamlitAPIException, match="Invalid `theme` value"):
        streamlit_bokeh._validate_theme(theme)


def test_rejects_bokehs_misspelled_contrast_alias() -> None:
    # Bokeh ships "constrast" alongside "contrast". It renders today, so this is
    # a deliberate break rather than an oversight.
    with pytest.raises(StreamlitAPIException, match="Invalid `theme` value"):
        streamlit_bokeh._validate_theme("constrast")


def test_carbon_explains_why_it_cannot_be_applied() -> None:
    # "carbon" is a real Bokeh Python theme absent from BokehJS, so reporting it
    # as an unknown name would mislead.
    with pytest.raises(StreamlitAPIException, match="BokehJS"):
        streamlit_bokeh._validate_theme("carbon")


def test_error_lists_the_values_that_would_work() -> None:
    with pytest.raises(StreamlitAPIException) as excinfo:
        streamlit_bokeh._validate_theme("nope")

    message = str(excinfo.value)
    for name in ("streamlit", *streamlit_bokeh._SUPPORTED_BOKEH_THEMES):
        assert f"`{name}`" in message
    assert "`None`" in message


def test_readme_documents_every_supported_theme() -> None:
    # The README is where users look for accepted values; keep it in step with
    # what the code accepts.
    readme = (_REPO_ROOT / "README.md").read_text()
    for name in streamlit_bokeh._SUPPORTED_BOKEH_THEMES:
        assert f'`"{name}"`' in readme, f"{name} is accepted but undocumented"


@pytest.mark.skipif(
    bokeh.__version__ != streamlit_bokeh.REQUIRED_BOKEH_VERSION,
    reason="streamlit_bokeh raises on a Bokeh version mismatch before validating",
)
def test_validation_is_wired_into_the_public_function() -> None:
    # Guards the wiring, not just the helper: an unused validator would pass
    # every test above.
    from bokeh.plotting import figure

    plot = figure()
    plot.line([1, 2, 3], [4, 5, 6])

    with pytest.raises(StreamlitAPIException, match="Invalid `theme` value"):
        streamlit_bokeh.streamlit_bokeh(plot, theme="carbon")
