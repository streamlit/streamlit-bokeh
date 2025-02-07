# streamlit-bokeh

A lightweight Python package that seamlessly integrates **Bokeh** plots into **Streamlit** apps, allowing for interactive, customizable, and responsive visualizations with minimal effort.

## 🚀 Features

- Effortlessly embed Bokeh figures in Streamlit apps.
- Responsive layout support with `use_container_width`.
- Customizable themes (`streamlit` (which supports both light and dark mode) or [Bokeh Themes](https://docs.bokeh.org/en/latest/docs/reference/themes.html))

---

## 📦 Installation

```bash
pip install streamlit-bokeh
```

Ensure you have **Streamlit** and **Bokeh** installed as well:

```bash
pip install streamlit bokeh
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

### `streamlit_bokeh(figure, use_container_width=False, theme='streamlit', key=None)`

#### Parameters:

- **`figure`** (_bokeh.plotting.figure_): The Bokeh figure object to render.
- **`use_container_width`** (_bool_, optional): Adjust the plot to fit the container's full width. Default is `True`.
- **`theme`** (_str_, optional): Theme for the plot. Options:
  - `"streamlit"` (default): Matches Streamlit's current theme.
  - Bokeh Theme name including:
    - `caliber`
    - `light_minimal`
    - `dark_minimal`
    - `contrast`
- **`key`** (_str_, optional but recommended): Unique key to differentiate multiple figures in the same app.

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

## 📝 Contributing

Feel free to file issues in [our Streamlit Repository](https://github.com/streamlit/streamlit-bokeh/issues/new/choose).

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
