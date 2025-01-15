from conftest import ImageCompareFunction
from playwright.sync_api import Page, expect


def test_bokeh_chart(themed_app: Page, assert_snapshot: ImageCompareFunction):
    """Test that st.bokeh_chart renders correctly."""
    iframes = themed_app.locator("iframe")
    IFRAME_COUNT = 2
    expect(iframes).to_have_count(IFRAME_COUNT)

    for idx in range(IFRAME_COUNT):
        iframe = iframes.nth(idx)
        canvas = iframe.content_frame.locator("div.bk-Canvas")
        expect(canvas).to_be_visible()
        assert_snapshot(iframe, name=f"bokeh_chart-{idx + 1}")
