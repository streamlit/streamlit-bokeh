# streamlit-bokeh

> [!WARNING]
> **`streamlit-bokeh` is deprecated, and this repository is archived.** It won't receive any further updates: no bug fixes, no security fixes, and no support for new Bokeh or Streamlit versions. Please migrate to Streamlit's native chart commands. See [Migrating to native charts](#-migrating-to-native-charts).

A lightweight Python package that embeds **Bokeh** plots in **Streamlit** apps.

## 📢 Deprecation notice

Streamlit's native chart commands now cover what `streamlit-bokeh` was built for, and they're maintained as part of Streamlit itself. So we've stopped developing this component.

What this means for you:

- **No new releases.** We won't publish bug fixes, security fixes, or compatibility updates for new Bokeh or Streamlit versions.
- **Existing releases stay on PyPI.** Apps that use `streamlit-bokeh` keep working as long as their environment stays compatible. Each release is built for a specific Bokeh version (see [Versioning](#-versioning)), so if you keep using it, pin `streamlit-bokeh` and `bokeh` together.
- **We no longer accept issues or pull requests.** Please don't file `streamlit-bokeh` issues in the Streamlit repository. If the native chart commands are missing something you need, file a [feature request](https://github.com/streamlit/streamlit/issues/new?template=feature_request.yml).
- **The code stays available.** This repository remains readable under the Apache 2.0 license, so you can fork it if you need to maintain it yourself.

---

## 🔀 Migrating to native charts

Pick the native command that fits your chart:

| If you need…                                                                                     | Use                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A quick line, area, bar, or scatter chart from a dataframe                                       | [`st.line_chart`](https://docs.streamlit.io/develop/api-reference/charts/st.line_chart), [`st.area_chart`](https://docs.streamlit.io/develop/api-reference/charts/st.area_chart), [`st.bar_chart`](https://docs.streamlit.io/develop/api-reference/charts/st.bar_chart), [`st.scatter_chart`](https://docs.streamlit.io/develop/api-reference/charts/st.scatter_chart) |
| A fully customized chart built with a declarative grammar                                         | [`st.altair_chart`](https://docs.streamlit.io/develop/api-reference/charts/st.altair_chart) or [`st.vega_lite_chart`](https://docs.streamlit.io/develop/api-reference/charts/st.vega_lite_chart)                                                                                                                                             |
| A wide range of chart types, such as gauges, sankey, sunburst, network graphs, candlestick, or radar | [`st.echarts_chart`](https://docs.streamlit.io/develop/api-reference/charts/st.echarts_chart) (Streamlit 1.64+)                                                                                                                                                                                                                              |
| An existing Plotly figure or 3D charts                                                           | [`st.plotly_chart`](https://docs.streamlit.io/develop/api-reference/charts/st.plotly_chart)                                                                                                                                                                                                                                                  |

We recommend the Vega-based commands (`st.line_chart`, `st.altair_chart`, and so on) or `st.echarts_chart`. Like `streamlit-bokeh`, they follow Streamlit's light and dark theme, and most stretch to the container width by default. `st.altair_chart`, `st.vega_lite_chart`, `st.echarts_chart`, and `st.plotly_chart` can also return the user's selections to your app through `on_select`.

### Parameter mapping

| `streamlit_bokeh`                                                           | Native chart commands                                                                                                                                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use_container_width=True`                                                  | `width="stretch"` (the default)                                                                                                                                             |
| `use_container_width=False`                                                 | `width="content"`, or an integer width in pixels                                                                                                                            |
| `theme="streamlit"`                                                         | `theme="streamlit"` (the default)                                                                                                                                           |
| `theme=None`                                                                | `theme=None`                                                                                                                                                                |
| A Bokeh theme (`"caliber"`, `"dark_minimal"`, …)                            | No direct equivalent. Style the chart itself, or adjust the Streamlit theme's chart colors with the `theme.chartCategoricalColors` and `theme.chartSequentialColors` config options. |
| `key`                                                                       | `key` (on `st.altair_chart`, `st.vega_lite_chart`, `st.echarts_chart`, and `st.plotly_chart`)                                                                               |

### Example

Here's the Bokeh line chart from the [Usage](#-usage) section, followed by its native replacements.

**Before (`streamlit-bokeh`):**

```python
from bokeh.plotting import figure
from streamlit_bokeh import streamlit_bokeh

x = [1, 2, 3, 4, 5]
y = [6, 7, 2, 4, 5]

p = figure(title="Simple Line Example", x_axis_label="x", y_axis_label="y")
p.line(x, y, legend_label="Trend", line_width=2)

streamlit_bokeh(p, use_container_width=True, theme="streamlit", key="trend")
```

**After, with `st.line_chart` (simplest):**

```python
import pandas as pd
import streamlit as st

df = pd.DataFrame({"x": [1, 2, 3, 4, 5], "y": [6, 7, 2, 4, 5]})

st.subheader("Simple Line Example")
st.line_chart(df, x="x", y="y", x_label="x", y_label="y")
```

**After, with `st.altair_chart` (fully customizable):**

```python
import altair as alt
import pandas as pd
import streamlit as st

df = pd.DataFrame({"x": [1, 2, 3, 4, 5], "y": [6, 7, 2, 4, 5]})

chart = (
    alt.Chart(df, title="Simple Line Example")
    .mark_line(strokeWidth=2)
    .encode(x="x", y="y")
)
st.altair_chart(chart, key="trend")
```

**After, with `st.echarts_chart`:**

```python
import streamlit as st

x = [1, 2, 3, 4, 5]
y = [6, 7, 2, 4, 5]

st.echarts_chart(
    {
        "title": {"text": "Simple Line Example"},
        "legend": {},
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "name": "x", "data": x},
        "yAxis": {"type": "value", "name": "y"},
        "series": [{"type": "line", "name": "Trend", "data": y, "lineStyle": {"width": 2}}],
    },
    key="trend",
)
```

**After, with `st.plotly_chart`:**

```python
import pandas as pd
import plotly.express as px
import streamlit as st

df = pd.DataFrame({"x": [1, 2, 3, 4, 5], "y": [6, 7, 2, 4, 5]})

fig = px.line(df, x="x", y="y", title="Simple Line Example")
st.plotly_chart(fig, key="trend")
```

---

## 📖 Legacy documentation

The documentation below describes the last release of `streamlit-bokeh`. It's kept for apps that still depend on it.

### 📦 Installation

```bash
uv pip install streamlit-bokeh
```

Ensure you have **Streamlit** and **Bokeh** installed as well:

```bash
uv pip install streamlit bokeh
```

### 💡 Usage

Here's how to integrate a simple Bokeh line plot into your Streamlit app:

```python
from bokeh.plotting import figure
from streamlit_bokeh import streamlit_bokeh

# Data
x = [1, 2, 3, 4, 5]
y = [6, 7, 2, 4, 5]

# Create Bokeh figure
YOUR_BOKEH_FIGURE = figure(title="Simple Line Example",
                           x_axis_label="x",
                           y_axis_label="y")
YOUR_BOKEH_FIGURE.line(x, y, legend_label="Trend", line_width=2)

# Render in Streamlit
streamlit_bokeh(YOUR_BOKEH_FIGURE, use_container_width=True, theme="streamlit", key="my_unique_key")
```

### ⚙️ API reference

#### `streamlit_bokeh(figure, use_container_width=True, theme='streamlit', key=None)`

##### Parameters:

- **`figure`** (_bokeh.plotting.figure_): The Bokeh figure object to display.
- **`use_container_width`** (_bool_, optional): Whether to override the figure's native width with the width of the parent container. This is `True` by default.
- **`theme`** (_str_ or _None_, optional): The theme for the plot. This can be:
  - `"streamlit"` (default): Matches Streamlit's current theme, including light and dark mode.
  - One of Bokeh's built-in themes:
    - `"caliber"`
    - `"contrast"`
    - `"dark_minimal"`
    - `"light_minimal"`
    - `"night_sky"`
  - `None`: Applies no theme, so the figure renders exactly as Bokeh would draw it on its own.

  Any other value raises an error. Note that Bokeh's `"carbon"` theme is not supported: it exists in Bokeh's Python package but is not included in BokehJS, so it cannot be applied in the browser.

- **`key`** (_str_, optional but recommended): An optional string to give this element a stable identity. If this is `None` (default), this element's identity will be determined based on the values of the other parameters.

##### Theming and your own styling

Styling you set on the figure always wins over the theme. A theme only fills in what you left unspecified.

Because Bokeh builds one visual decision out of several properties — a line needs a colour, an alpha and a width to be drawn — setting only a colour could leave the theme supplying the alpha, which could hide the element you had just styled. So setting a **line** colour makes that line render at Bokeh's default opacity instead of the theme's:

```python
# Renders as fully opaque red, under every theme.
plot.xaxis.major_tick_line_color = "red"

# Set the matching alpha to control opacity yourself.
plot.xaxis.major_tick_line_color = "red"
plot.xaxis.major_tick_line_alpha = 0.25
```

This applies to line properties only — ticks, axis lines, grid lines, outlines, borders. Fill, text and hatch opacity is still left to the theme, because a theme's fill opacity can be keeping text on top of it readable. If you set `legend.background_fill_color`, for example, the theme keeps the background translucent; set `legend.background_fill_alpha` yourself if you want it opaque.

### 📚 Versioning

The versioning scheme for this custom component mirrors the Bokeh version, except for the patch number, which was reserved for bug fixes and new (mostly compatible) features.

For example, `3.6.x` mirrors a version of Bokeh that's `3.6.y`.

### 🙋 FAQ

**Q:** Can I embed multiple Bokeh plots on the same page?

- **A:** Yes! Just make sure each plot has a unique `key`.

**Q:** Does it support Bokeh widgets?

- **A:** No, `streamlit-bokeh` focuses on plots. For interactivity, use native Streamlit widgets.

**Q:** How do I adjust the plot size?

- **A:** Use `use_container_width=True` for responsive sizing, or set `width` and `height` on your Bokeh figure and pass `use_container_width=False`.

### 🛠️ Development

<details>
<summary>Instructions for building the archived code locally, for example in a fork</summary>

#### Prerequisites

- **Python** 3.10–3.13
- **Node.js** 24.x.y (see `.nvmrc`)
- **uv** (fast Python package manager)

#### 1) Create and activate a virtual environment

```bash
uv venv .venv
source .venv/bin/activate
```

#### 2) Install Python dependencies from `pyproject.toml`

```bash
# Minimal runtime install (editable)
uv pip install -e .

# Recommended for development (includes tests/tools)
uv pip install -e ".[devel]"
```

#### 3) Install and build the frontend

```bash
cd streamlit_bokeh/frontend
corepack enable
yarn install
yarn build          # one-time build to produce frontend/build assets

# Optional: frontend dev server
# Use `yarn dev:v2` to utilize the Custom Component v2 frontend (recommended).
# Use `yarn dev:v1` to utilize the Custom Component v1 frontend (legacy).
yarn dev:v2
```

#### 4) Run a local demo

```bash
streamlit run ./e2e_playwright/bokeh_chart_basics.py
```

#### 5) Run tests

Python end-to-end tests (Playwright):

```bash
# Build the package (clear dist/ first, so the glob below matches one wheel)
rm -rf dist
uv build
# Install the test dependencies and the package you just built.
# --reinstall matters on a rebuild: installing the same version again is
# otherwise a no-op, so the tests would run against the previous frontend build.
uv pip install -r e2e_playwright/test-requirements.txt
uv pip install --reinstall dist/*.whl
# Install browsers (first time only)
python -m playwright install --with-deps
# Run tests
pytest e2e_playwright -n auto
```

Frontend tests and type checks:

```bash
cd streamlit_bokeh/frontend
yarn test
yarn typecheck
```

#### 6) Build the Python package (optional)

```bash
uv build
ls dist/
```

</details>

---

## 📄 License

This project is licensed under the [Apache 2.0](LICENSE).
