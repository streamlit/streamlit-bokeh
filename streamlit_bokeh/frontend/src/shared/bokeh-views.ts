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
 * Tears down the views from a previous `embed_item` call.
 *
 * Clearing the container element is not enough. `embed_item` builds a tree of
 * Bokeh views, and some of them attach DOM outside the container and register
 * listeners on `document`. Detaching the container orphans all of it:
 *
 *  - Hover tooltips are the visible symptom. `TooltipView._reposition` appends
 *    to `document.body.shadowRoot ?? document.body` and calls `showPopover()`,
 *    which promotes the element to the browser's top layer. Nothing in Bokeh
 *    calls `hidePopover()`; the only takedown path is removing the element.
 *  - The tooltip cannot clean itself up, because that needs a `move_exit` event
 *    to reach the hover tool, and `UIEventBus._trigger` returns early once its
 *    `hit_area` is disconnected. So the tooltip stays `visible: true` forever.
 *  - Removing the element by hand does not stick. `UIElementView` observes its
 *    own element with a `ResizeObserver`, and `_after_resize` calls
 *    `_reposition()` -- so detaching it resizes it to 0x0, which re-appends it
 *    and re-shows the popover. It also re-anchors against a detached target,
 *    whose bounding box is all zeros, which is why a stale tooltip jumps to the
 *    top-left of the viewport.
 *  - Beyond the tooltip, every view, `document` scroll listener and
 *    `ResizeObserver` from the previous embed stays alive. Reruns accumulate
 *    them without bound.
 *
 * Bokeh already provides the teardown: `embed_item` returns the `ViewManager`
 * for what it built, and `ViewManager.clear()` calls `remove()` on each root,
 * which cascades through `children_views()` down to the tooltip views. This
 * component simply discarded that return value.
 *
 * Call this before detaching the container, so views can unhook while their
 * elements are still connected.
 *
 * See streamlit/streamlit#15549.
 */

/** The part of Bokeh's `ViewManager` this component relies on. */
export interface BokehViewManager {
  clear(): void
}

/**
 * Calls `clear()` on `views` when it looks like a Bokeh `ViewManager`.
 *
 * Duck-typed on purpose: `embed_item`'s return value is not part of Bokeh's
 * documented surface, so a future version could stop returning it. Losing
 * teardown would be a slow leak; throwing on every render would break the
 * chart outright.
 */
export function destroyViews(views: unknown): void {
  const manager = views as BokehViewManager | null | undefined

  if (manager != null && typeof manager.clear === "function") {
    manager.clear()
  }
}
