## Development

1. Run the development frontend server:
   ```bash
   # From `streamlit_bokeh/frontend`
   yarn run dev
   ```
1. In another terminal, run an app:
   ```bash
   # From the root of the repo
   streamlit run e2e_playwright/bokeh_chart_basics.py
   ```

## Testing

- Run the tests in dev (watch) mode:
  ```bash
  yarn run test:dev
  ```
- Run the tests:
  ```bash
  yarn run test
  ```
