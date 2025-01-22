import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

const useTheme = jest.fn()

window.Bokeh = {
  Themes: {
    "caliber": null,
    "dark_minimal": null,
    "light_minimal": null,
    "contrast": null,
    "night_sky": null,
  },
  require: (name) => {
    if (name === "core/properties") {
      return {
        use_theme: useTheme
      }
    }

    return {}
  }
}
