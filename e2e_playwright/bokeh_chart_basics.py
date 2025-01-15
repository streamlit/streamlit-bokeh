from bokeh.plotting import figure
from streamlit_bokeh_chart import streamlit_bokeh_chart

x = [1, 2, 3, 4, 5]
y = [6, 7, 2, 4, 5]

plot = figure(title="simple line example", x_axis_label="x", y_axis_label="y", width=400, height=300)
plot.line(x, y, legend_label="Trend", line_width=2)

streamlit_bokeh_chart(plot, use_container_width=False)

streamlit_bokeh_chart(plot, use_container_width=True)