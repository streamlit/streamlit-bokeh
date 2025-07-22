/**
 * Copyright (c) Snowflake Inc. (2025)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineConfig, loadEnv, UserConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

/**
 * Vite configuration for Streamlit React Component development
 *
 * @see https://vitejs.dev/config/ for complete Vite configuration options
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  const port = env.VITE_PORT ? parseInt(env.VITE_PORT) : 3001
  // TODO: Put this into env and read it in Python rather than needing to read
  // it from process.env
  const dev = process.env.DEV ? true : false

  return {
    base: "./",
    plugins: [react()],
    server: {
      port,
    },
    build: {
      minify: dev ? false : "esbuild",
      outDir: "build",
      sourcemap: dev,
      lib: {
        entry: "./src/index.ts",
        name: "MyComponent",
        formats: ["es"],
        fileName: "index-[hash]",
      },
      ...(!dev && {
        esbuild: {
          drop: ["console", "debugger"],
          minifyIdentifiers: true,
          minifySyntax: true,
          minifyWhitespace: true,
        },
      }),
    },
  } satisfies UserConfig
})
