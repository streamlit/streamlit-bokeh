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

/**
 * The base type of the returned state from a Bidi Component.
 * Users can extend this type to add their own state key/value pairs.
 *
 * @see BidiComponentState in lib/streamlit/components/v2/bidi_component.py
 */
export type BidiComponentState = Record<string, unknown>

export type ArrowData = Uint8Array<ArrayBufferLike> | null

// TODO: Expose this so that component authors can use it.
export type StV2ComponentArgs<
  ComponentState extends BidiComponentState = BidiComponentState,
  /**
   * The shape of the data passed to the component.
   * Users should provide this type for type safety.
   *
   * @see st.bidi_component in lib/streamlit/components/v2/__init__.py
   */
  DataShape = unknown,
> = {
  data: DataShape
  name: string
  parentElement: HTMLElement | ShadowRoot
  setStateValue: (
    name: keyof ComponentState,
    value: ComponentState[keyof ComponentState]
  ) => void
  setTriggerValue: (
    name: keyof ComponentState,
    value: ComponentState[keyof ComponentState]
  ) => void
  stKey: string
}

export type ComponentResult = {
  cleanup?: () => void
}
