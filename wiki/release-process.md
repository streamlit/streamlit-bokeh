<!--
Copyright (c) Snowflake Inc. (2025)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Release and patch process

This guide covers the engineering steps for publishing the `streamlit-bokeh`
package.

The checked-in workflows are the source of truth for what GitHub performs. If
this guide and a workflow disagree, follow the workflow and update this page.

## Before you start

- Decide which kind of release this is. `major.minor` mirror Bokeh, so bumping
  either is [Update Bokeh](#a-new-bokeh-version)'s job. The patch number is the
  component's own, for fixes against an unchanged Bokeh.
- Choose the full version without a `v` prefix, such as `3.10.1`.
- Keep one release in flight at a time. The publish workflow serialises on a
  `release` concurrency group, but two open `release/*` PRs are still confusing.
- The publish job runs in the protected `release` environment, which requires a
  reviewer. Whoever merges the PR should make sure someone is available to
  approve the deployment, or the release waits.

Branches and tags derive from the same version, and the tag carries a `v`:

```text
branch: release/3.10.1
tag:    v3.10.1
```

## Workflow reference

| Workflow | Use | Inputs | Result |
|----------|-----|--------|--------|
| [Create Release Branch](https://github.com/streamlit/streamlit-bokeh/actions/workflows/create-release-branch.yml) | Component patch release | `version` (optional), `dry_run` | Bumps both `pyproject.toml` files, pushes `release/<version>` and opens its PR |
| [Update Bokeh](https://github.com/streamlit/streamlit-bokeh/actions/workflows/update-bokeh.yml) | New Bokeh major or minor | none | Vendors the new BokehJS assets and opens a `release/<bokeh major>.<bokeh minor>.0` PR. Runs Tuesdays at 17:30 UTC, and can be dispatched |
| [Build, Test, and Release](https://github.com/streamlit/streamlit-bokeh/actions/workflows/release.yml) | Both release types | none — merging a `release/*` PR triggers it | Tests, builds, publishes to PyPI, tags `v<version>`, and creates the GitHub Release |

Both branch-creating workflows converge on the same publish workflow: merging a
`release/*` PR into `main` is what releases. Nothing else publishes.

The workflows validate version formats, branch and tag existence, and that the
declared versions agree with the branch name before changing anything.

## A component patch release

### 1. Dry run

Run [Create Release Branch](https://github.com/streamlit/streamlit-bokeh/actions/workflows/create-release-branch.yml)
with `dry_run` ticked. It resolves the version, bumps both files, prints the
diff, and stops without pushing. Worth doing whenever you are unsure what the
next patch will be.

### 2. Create the release branch

Run the same workflow with `dry_run` off:

- `version`: leave empty for the next patch, or enter a full version such as
  `3.10.1`
- `dry_run`: off

It refuses before touching anything if the version is not a canonical
`major.minor.patch`, is not greater than the current version, or if the tag or
branch already exists. `1.02.3` is rejected because PyPI normalises it to
`1.2.3`, which would leave the branch, tag and GitHub Release all disagreeing
with what shipped.

### 3. Review and merge the PR

Check that:

- CI ran on the PR, and passed.
- The generated release notes will read sensibly. They come from PR titles, so a
  vague title becomes a vague release note.
- Anything user-visible or breaking since the last release is called out.

Merging is the point of no return: it publishes.

### 4. Approve the deployment

Merging runs the TypeScript, pre-commit and Playwright suites against the
release branch first. The publish job then pauses for a `release` environment
reviewer, and once approved it builds, uploads to PyPI, pushes the tag, and
creates the GitHub Release.

It builds the merge commit rather than `main`, so what ships is what the tests
ran against, even if another PR merged while they were running.

### 5. Verify

- The version is on [PyPI](https://pypi.org/project/streamlit-bokeh/).
- The tag and the [GitHub Release](https://github.com/streamlit/streamlit-bokeh/releases)
  both exist, and the notes list the expected pull requests.
- `pip install streamlit-bokeh==<version>` resolves.

## A new Bokeh version

[Update Bokeh](https://github.com/streamlit/streamlit-bokeh/actions/workflows/update-bokeh.yml)
runs weekly, compares the vendored BokehJS against the latest release on PyPI,
and when they differ opens a `release/<bokeh major>.<bokeh minor>.0` PR that
vendors the new assets and sets the version. From there it is the same process:
review and merge the PR, then approve the deployment.

Because the patch number resets to `0`, a Bokeh bump cannot also carry a
component patch. Ship the Bokeh release first, then a patch release on top of it
if one is needed.

## Release notes

Notes are generated by GitHub from the pull requests merged since the previous
tag, shaped by [`.github/release.yml`](../.github/release.yml): a flat
"What's Changed" list with Dependabot excluded. There are no categories, so PR
titles are the only thing controlling how a release reads.

Notes can be edited by hand after the fact. Editing the Release does not affect
the published package.

## Handling failures

- **A validation step refuses:** stop and correct the repository state rather
  than working around the guard. The usual causes are a version that is already
  released, a non-canonical version, or a `pyproject.toml` that disagrees with
  the branch name.
- **CI fails on the release PR:** fix it on the release branch and push. Nothing
  has been published, and the branch can be rebuilt or deleted freely.
- **The publish job fails before the PyPI upload:** re-run it. Nothing external
  has changed.
- **The publish job fails after the PyPI upload:** re-running is safe. The
  upload step skips a version already on PyPI, and the Release step skips one
  that already exists, so a re-run completes the tag and Release without
  attempting to republish.
- **The published wheel is wrong:** PyPI versions are immutable and cannot be
  replaced. Yank the release on PyPI if it is harmful, and ship a new patch.
- **`merge_commit_sha is empty`:** GitHub had not populated the merge commit when
  the workflow started. Re-run the job; it refuses rather than fall back to
  `main`, which would publish a commit the tests never saw.
