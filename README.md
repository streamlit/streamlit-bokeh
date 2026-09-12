# streamlit-bokeh

A lightweight Python package that seamlessly integrates **Bokeh** plots into **Streamlit** apps, allowing for interactive, customizable, and responsive visualizations with minimal effort.

## Filing Issues

Please file [bug reports](https://github.com/streamlit/streamlit/issues/new?template=bug_report.yml) and [enhancement requests](https://github.com/streamlit/streamlit/issues/new?template=feature_request.yml) through our main Streamlit repo.

## 🚀 Features

- Effortlessly embed Bokeh figures in Streamlit apps.
- Responsive layout support with `use_container_width`.
- Customizable themes (`streamlit` (which supports both light and dark mode) or [Bokeh Themes](https://docs.bokeh.org/en/latest/docs/reference/themes.html))

---

## 📦 Installation

```bash
uv pip install streamlit-bokeh
```

Ensure you have **Streamlit** and **Bokeh** installed as well:

```bash
uv pip install streamlit bokeh
```

---

## 🛠️ Development

### Prerequisites

- **Python** 3.10–3.13
- **Node.js** 24.x.y (see `.nvmrc`)
- **uv** (fast Python package manager)

### 1) Create and activate a virtual environment

```bash
uv venv .venv
source .venv/bin/activate
```

### 2) Install Python dependencies from `pyproject.toml`

```bash
# Minimal runtime install (editable)
uv pip install -e .

# Recommended for development (includes tests/tools)
uv pip install -e ".[devel]"
```

### 3) Install and build the frontend

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

### 4) Run a local demo

```bash
streamlit run ./e2e_playwright/bokeh_chart_basics.py
```

### 5) Run tests

Python end-to-end tests (Playwright):

```bash
# Build the package (clear dist/ first, so the glob below matches one wheel)
rm -rf dist
uv build
# Install the test dependencies and the package you just built
uv pip install -r e2e_playwright/test-requirements.txt
uv pip install dist/*.whl
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

### 6) Build the Python package (optional)

```bash
uv build
ls dist/
```

---

## 💡 Usage

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

---

## ⚙️ API Reference

### `streamlit_bokeh(figure, use_container_width=True, theme='streamlit', key=None)`

#### Parameters:

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

#### Theming and your own styling

Styling you set on the figure always wins over the theme. A theme only fills in what you left unspecified.

Because Bokeh builds one visual decision out of several properties — a line needs a colour, an alpha and a width to be drawn — setting only a colour used to leave the theme supplying the alpha, which could hide the element you had just styled. Setting a **line** colour now makes that line render at Bokeh's default opacity instead of the theme's:

```python
# Renders as fully opaque red, under every theme.
plot.xaxis.major_tick_line_color = "red"

# Set the matching alpha to control opacity yourself.
plot.xaxis.major_tick_line_color = "red"
plot.xaxis.major_tick_line_alpha = 0.25
```

This applies to line properties only — ticks, axis lines, grid lines, outlines, borders. Fill, text and hatch opacity is still left to the theme, because a theme's fill opacity can be keeping text on top of it readable. If you set `legend.background_fill_color`, for example, the theme keeps the background translucent; set `legend.background_fill_alpha` yourself if you want it opaque.

---

## 🖼️ Example

```bash
streamlit run app.py
```

Where `app.py` contains:

```python
import streamlit as st
from bokeh.plotting import figure
from streamlit_bokeh import streamlit_bokeh

# Sample Data
x = [1, 2, 3, 4, 5]
y = [2, 4, 8, 16, 32]

# Create Plot
p = figure(title="Exponential Growth", x_axis_label="x", y_axis_label="y")
p.line(x, y, legend_label="Growth", line_width=3, color="green")

# Display in Streamlit
streamlit_bokeh(p, use_container_width=True, key="plot1")
```

---

## 📚 Versioning

We designed the versioning scheme for this custom component to mirror the Bokeh version with the exception of the patch number. We reserve that so we can make bug fixes and new (mostly compatible) features.

For example, `3.6.x` will mirror a version of Bokeh that's `3.6.y`.

---

## 📝 Contributing

Feel free to file issues in [our Streamlit Repository](https://github.com/streamlit/streamlit/issues/new/choose).

Contributions are welcome 🚀, however, please inform us before building a feature.

---

## 📄 License

This project is licensed under the [Apache 2.0](LICENSE).

---

## 🙋 FAQ

**Q:** Can I embed multiple Bokeh plots on the same page?

- **A:** Yes! Just make sure each plot has a unique `key`.

**Q:** Does it support Bokeh widgets?

- **A:** Currently, `streamlit-bokeh` focuses on plots. For widget interactivity, consider combining with native Streamlit widgets.

**Q:** How do I adjust the plot size?

- **A:** Use `use_container_width=True` for responsive sizing, or manually set `plot_width` and `plot_height` in your Bokeh figure.

---

Happy Streamlit-ing! 🎉
