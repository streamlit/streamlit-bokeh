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

"""Regression tests for Bokeh view teardown across reruns.

Asserts the leak rather than the symptom. `embed_item` returns a ViewManager the
component used to discard, so every rerun added a full view tree -- along with
the document listeners and ResizeObservers those views own -- and left hover
tooltips attached to document.body. Counting registered root views is
deterministic and needs no hover timing.

See streamlit/streamlit#15549.
"""

import pytest
from conftest import wait_for_app_run
from playwright.sync_api import Page, expect

_RERUNS = 4


def _root_view_count(page: Page) -> int:
    """Number of root views Bokeh currently has registered on the page."""
    return page.evaluate("() => window.Bokeh?.index?.roots?.length ?? -1")


def test_reruns_do_not_accumulate_views(app: Page, is_v2: bool) -> None:
    if not is_v2:
        # v1 renders each chart inside its own iframe with its own window.Bokeh,
        # so the top-level page has no Bokeh to inspect. The leak is also
        # confined to the iframe there, and dies with it.
        pytest.skip("v1 renders in an iframe; Bokeh is not on the top-level page")

    expect(app.locator("div.bk-Canvas")).to_be_visible()

    baseline = _root_view_count(app)
    assert baseline > 0, "expected Bokeh to have registered a root view"

    for _ in range(_RERUNS):
        app.get_by_test_id("stButton").locator("button").click()
        wait_for_app_run(app)
        expect(app.locator("div.bk-Canvas")).to_be_visible()

        # Grew by one tree per rerun before the fix, unbounded.
        assert _root_view_count(app) == baseline


def test_a_visible_tooltip_does_not_survive_a_rerun(app: Page, is_v2: bool) -> None:
    if not is_v2:
        pytest.skip("v1 renders in an iframe; tooltips cannot escape it")

    canvas = app.locator("div.bk-Canvas")
    expect(canvas).to_be_visible()

    # Hover a marker. The markers are large, so sweeping a few points across the
    # canvas is enough to land on one without resolving data coordinates.
    box = canvas.bounding_box()
    assert box is not None
    tooltip = app.locator("body > .bk-Tooltip")

    for fraction_x in (0.2, 0.35, 0.5, 0.65, 0.8):
        app.mouse.move(
            box["x"] + box["width"] * fraction_x,
            box["y"] + box["height"] * 0.5,
        )
        if tooltip.count() > 0:
            break

    if tooltip.count() == 0:
        pytest.skip("could not land the pointer on a marker to raise a tooltip")

    # Rerun by keyboard so the pointer never leaves the marker, which is the
    # reported situation: a tooltip up at the moment the chart is rebuilt.
    app.get_by_test_id("stButton").locator("button").focus()
    app.keyboard.press("Enter")
    wait_for_app_run(app)

    # Move away first, so a legitimately new tooltip for the new chart cannot be
    # mistaken for the stale one.
    app.mouse.move(box["x"] + box["width"] / 2, box["y"] - 60)

    expect(tooltip).to_have_count(0)
