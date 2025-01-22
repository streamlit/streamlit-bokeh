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

import pytest
from conftest import ImageCompareFunction, wait_for_app_run
from chart_types import CHART_TYPES
from playwright.sync_api import Page, expect


@pytest.mark.parametrize("chart", CHART_TYPES)
def test_bokeh_chart(themed_app: Page, assert_snapshot: ImageCompareFunction, chart: str):
    """Test that st.bokeh_chart renders correctly."""
    themed_app.get_by_test_id("stSelectbox").locator("input").click()

    # Take a snapshot of the selection dropdown:
    selection_dropdown = themed_app.locator('[data-baseweb="popover"]').first
    selection_dropdown.get_by_text(chart).click()

    wait_for_app_run(themed_app)
    iframes = themed_app.locator("iframe")
    IFRAME_COUNT = 2
    expect(iframes).to_have_count(IFRAME_COUNT)

    for idx in range(IFRAME_COUNT):
        label = "use-container-width" if idx == 1 else "standard-width"
        iframe = iframes.nth(idx)
        canvas = iframe.content_frame.locator("div.bk-Canvas")
        expect(canvas).to_be_visible()
        assert_snapshot(iframe, name=f"bokeh_chart-{chart}-{label}")
