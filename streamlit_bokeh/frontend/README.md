## Development

1. Run the development frontend server:
   ```bash
   # From `streamlit_bokeh/frontend`
   yarn run dev
   ```
1. In another terminal, run an app:
   ```bash
   # From the root of the repo
   DEV=1 streamlit run e2e_playwright/bokeh_chart_basics.py
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

## Production

1. Build the app:
   ```bash
   yarn run build
   ```
1. Run an app that uses the component:
   ```bash
   # From the root of the repo
   streamlit run e2e_playwright/bokeh_chart_basics.py
   ```
