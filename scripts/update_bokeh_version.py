# Copyright (c) Snowflake Inc. (2025)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import re
import subprocess

import requests
import semver
import toml

PYPROJECT_TOML_PATH = "pyproject.toml"
PACKAGE_PYPROJECT_TOML_PATH = "streamlit_bokeh/pyproject.toml"


def get_latest_bokeh_version():
    url = "https://pypi.org/pypi/bokeh/json"
    response = requests.get(url)
    response.raise_for_status()  # Raises an HTTPError if the status is not 200
    data = response.json()
    # This field will provide the latest stable version
    return data["info"]["version"]


def get_component_version():
    with open(PYPROJECT_TOML_PATH, "r") as f:
        pyproject_data = toml.load(f)

    # Extract version from pyproject.toml
    version = pyproject_data.get("project", {}).get("version")

    if version:
        return version
    else:
        raise ValueError("Component version not found in pyproject.toml")


def get_dependency_bokeh_version():
    with open(PYPROJECT_TOML_PATH, "r") as f:
        pyproject_data = toml.load(f)

    # Extract Bokeh version from dependencies list
    dependencies = pyproject_data.get("project", {}).get("dependencies", [])

    for dep in dependencies:
        match = re.search(r"bokeh\s*==\s*([\d\.]+)", dep)
        if match:
            return match.group(1)

    raise ValueError("Bokeh version not found in dependencies")


def download_files(new_version, destination):
    files_to_download = [
        f"https://cdn.bokeh.org/bokeh/release/bokeh-mathjax-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-gl-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-api-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-tables-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-widgets-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-{new_version}.min.js",
        f"https://raw.githubusercontent.com/bokeh/bokeh/refs/tags/{new_version}/LICENSE.txt",
    ]

    # Ensure destination/bokeh directory exists
    os.makedirs(os.path.join(destination, "bokeh"), exist_ok=True)

    for url in files_to_download:
        filename = os.path.basename(url)
        print(f"Downloading {filename}")
        r = requests.get(url, stream=True)
        r.raise_for_status()
        with open(os.path.join(destination, "bokeh", filename), "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)


def update_pyproject_toml(new_version, old_bokeh_version, new_bokeh_version):
    """
    Update the project version and Bokeh dependency in the TOML files
    without disturbing comments, headers, or table ordering.

    We intentionally operate on raw text instead of round-tripping through
    a TOML serializer (which would drop comments and reformat sections).
    """
    for path in (PYPROJECT_TOML_PATH, PACKAGE_PYPROJECT_TOML_PATH):
        if not os.path.exists(path):
            raise FileNotFoundError(f"File {path} not found")

        with open(path, "r", encoding="utf-8") as f:
            contents = f.read()

        # 1) Update the [project] version line.
        #
        # All pyproject.toml files in this repo have a single `version = "..."`
        # entry under `[project]`. Anchoring at line-start ensures we don't
        # accidentally rewrite a value in another table or in comments.
        contents, replaced_version_count = re.subn(
            r'(?m)^(version\s*=\s*")([^"]+)(")',
            lambda m: f"{m.group(1)}{new_version}{m.group(3)}",
            contents,
            count=1,
        )

        if replaced_version_count == 0:
            raise ValueError(f"Could not find project version line in {path}")

        # 2) Update the Bokeh dependency version. This only has an effect in the
        # root pyproject, since the package-local pyproject does not currently
        # declare dependencies.
        if old_bokeh_version:
            contents = re.sub(
                rf"(bokeh\s*==\s*){re.escape(old_bokeh_version)}",
                rf"\g<1>{new_bokeh_version}",
                contents,
            )

        with open(path, "w", encoding="utf-8") as f:
            f.write(contents)


def update_test_requirements(
    old_bokeh_version, new_bokeh_version, old_version, new_version
):
    test_requirements_path = "e2e_playwright/test-requirements.txt"
    with open(test_requirements_path, "r") as f:
        test_requirements_contents = f.read()

    # Replace bokeh==old_bokeh_version with bokeh==new_bokeh_version
    if old_bokeh_version:
        test_requirements_contents = re.sub(
            rf"(bokeh\s*==\s*){old_bokeh_version}",
            rf"\g<1>{new_bokeh_version}",
            test_requirements_contents,
        )

        test_requirements_contents = re.sub(
            rf"(dist/streamlit_bokeh-){old_version}(-py3-none-any.whl)",
            rf"\g<1>{new_version}\g<2>",
            test_requirements_contents,
        )

    with open(test_requirements_path, "w") as f:
        f.write(test_requirements_contents)


def update_package_json(old_version, new_version):
    package_json_path = "streamlit_bokeh/frontend/package.json"
    with open(package_json_path, "r") as f:
        package_json_contents = f.read()

    # Replace bokeh==old_version with bokeh==new_version
    if old_version:
        package_json_contents = re.sub(
            rf"(\"version\": \"){old_version}(\")",
            rf"\g<1>{new_version}\g<2>",
            package_json_contents,
        )

    with open(package_json_path, "w") as f:
        f.write(package_json_contents)


def update_init_py(old_bokeh_version, new_bokeh_version):
    init_py_path = "streamlit_bokeh/__init__.py"
    with open(init_py_path, "r") as f:
        init_py_contents = f.read()

    # Replace bokeh==old_bokeh_version with bokeh==new_bokeh_version
    if old_bokeh_version:
        init_py_contents = re.sub(
            rf"(REQUIRED_BOKEH_VERSION = \"){old_bokeh_version}(\")",
            rf"\g<1>{new_bokeh_version}\g<2>",
            init_py_contents,
        )

    with open(init_py_path, "w") as f:
        f.write(init_py_contents)


def update_loader_imports(old_bokeh_version, new_bokeh_version):
    """
    Update versioned Bokeh asset import paths in the TypeScript loader to the new version.

    This replaces occurrences like `bokeh-3.8.0.min.js` with `bokeh-<new>.min.js`
    in `streamlit_bokeh/frontend/src/v2/loaders.ts`.
    """
    loader_path = "streamlit_bokeh/frontend/src/v2/loaders.ts"
    with open(loader_path, "r", encoding="utf-8") as f:
        contents = f.read()

    suffixes = ["mathjax", "gl", "api", "tables", "widgets", ""]
    for suffix in suffixes:
        old_str = (
            f"bokeh-{suffix}-{old_bokeh_version}.min.js"
            if suffix
            else f"bokeh-{old_bokeh_version}.min.js"
        )
        new_str = (
            f"bokeh-{suffix}-{new_bokeh_version}.min.js"
            if suffix
            else f"bokeh-{new_bokeh_version}.min.js"
        )
        contents = contents.replace(old_str, new_str)

    with open(loader_path, "w", encoding="utf-8") as f:
        f.write(contents)


def update_index_html(frontend_dir, old_version, new_version):
    """
    Update the index.html files to reference the new Bokeh asset version.
    Only the source Vite entry point (`frontend/index.html`) needs to be updated,
    since build artifacts are regenerated.
    """

    index_html_paths = [os.path.join(frontend_dir, "index.html")]

    cdn_suffixes = ["mathjax", "gl", "api", "tables", "widgets", ""]
    found_index = False

    for path in index_html_paths:
        if not os.path.exists(path):
            continue

        found_index = True
        with open(path, "r", encoding="utf-8") as f:
            html_content = f.read()

        if old_version:
            for suffix in cdn_suffixes:
                old_str = (
                    f"bokeh-{suffix}-{old_version}.min.js"
                    if suffix
                    else f"bokeh-{old_version}.min.js"
                )
                new_str = (
                    f"bokeh-{suffix}-{new_version}.min.js"
                    if suffix
                    else f"bokeh-{new_version}.min.js"
                )
                html_content = html_content.replace(old_str, new_str)

        with open(path, "w", encoding="utf-8") as f:
            f.write(html_content)

    if not found_index:
        print(
            "No index.html found under streamlit_bokeh/frontend. Skipping HTML update."
        )


def check_remote_branch_exists(remote: str, new_version: str) -> bool:
    branch_name = f"release/{new_version}"
    try:
        # List all remote branches
        result = subprocess.run(
            ["git", "ls-remote", "--heads", remote, branch_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )

        # Check if the branch exists in the output
        return bool(result.stdout.strip())
    except subprocess.CalledProcessError as e:
        print(f"Error checking remote branch: {e.stderr.strip()}")
        return False


if __name__ == "__main__":
    new_bokeh_version = get_latest_bokeh_version()
    new_bokeh_version_semver = semver.Version.parse(new_bokeh_version)
    old_bokeh_version = get_dependency_bokeh_version()

    old_version = get_component_version()
    old_version_semver = semver.Version.parse(old_version)

    new_version = f"{new_bokeh_version_semver.major}.{new_bokeh_version_semver.minor}.{old_version_semver.patch + 1}"
    if (
        old_version_semver.major != new_bokeh_version_semver.major
        or old_version_semver.minor != new_bokeh_version_semver.minor
    ):
        new_version = (
            f"{new_bokeh_version_semver.major}.{new_bokeh_version_semver.minor}.0"
        )

    print(f"Current local bokeh version: {old_bokeh_version}")
    print(f"Latest PyPI bokeh version: {new_bokeh_version}")
    print(f"Current component version: {old_version}")
    print(f"Latest component version: {new_version}")

    if new_bokeh_version == old_bokeh_version:
        print("No new version available")
        print("::set-output name=needs_update::false")
        exit(0)

    # check if there's a release branch for new_version
    if check_remote_branch_exists("origin", new_version):
        print(f"Release branch for {new_version} already exists")
        print("::set-output name=needs_update::false")
        exit(0)

    print("New version available!")
    public_dir = "streamlit_bokeh/frontend/public"
    frontend_dir = "streamlit_bokeh/frontend"

    # Remove original files from the public bokeh directory
    bokeh_dir = os.path.join(public_dir, "bokeh")
    os.makedirs(bokeh_dir, exist_ok=True)
    for filename in os.listdir(bokeh_dir):
        if "bokeh" in filename and filename.endswith(".js"):
            os.remove(os.path.join(bokeh_dir, filename))

    # Download new Bokeh assets into the public directory so they are served
    # from `/bokeh` at runtime.
    download_files(new_bokeh_version, public_dir)
    # Update the bokeh dependency version in index.html, TS loader and __init__.py
    update_index_html(frontend_dir, old_bokeh_version, new_bokeh_version)
    update_loader_imports(old_bokeh_version, new_bokeh_version)
    update_init_py(old_bokeh_version, new_bokeh_version)

    # Update the bokeh dependency version in pyproject.toml and test-requirements.txt
    update_pyproject_toml(new_version, old_bokeh_version, new_bokeh_version)
    update_test_requirements(
        old_bokeh_version, new_bokeh_version, old_version, new_version
    )

    # Update the component version in package.json
    update_package_json(old_version, new_version)

    print("::set-output name=needs_update::true")
    print(f"::set-output name=old_version::{old_version}")
    print(f"::set-output name=new_version::{new_version}")
    print(f"::set-output name=new_bokeh_version::{new_bokeh_version}")
