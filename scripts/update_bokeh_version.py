# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
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
import requests
import semver

SETUP_PY_PATH = "setup.py"


def get_latest_bokeh_version():
    url = "https://pypi.org/pypi/bokeh/json"
    response = requests.get(url)
    response.raise_for_status()  # Raises an HTTPError if the status is not 200
    data = response.json()
    return data["info"]["version"]


def get_component_version():
    with open(SETUP_PY_PATH, "r") as f:
        setup_content = f.read()

    # Extract version from setup.py
    match = re.search(r"version\s*=\s*['\"]([\d\.]+)(['\"])", setup_content)

    if match:
        return match.group(1)
    else:
        raise ValueError("Bokeh version not found in the file")


def get_dependency_bokeh_version():
    with open(SETUP_PY_PATH, "r") as f:
        setup_content = f.read()

    # Extract Bokeh version from dependency line (e.g., bokeh==2.4.3)
    match = re.search(r"bokeh\s*==\s*([\d\.]+)", setup_content)

    if match:
        return match.group(1)
    else:
        raise ValueError("Bokeh version not found in the file")


def download_files(new_version, destination):
    files_to_download = [
        f"https://cdn.bokeh.org/bokeh/release/bokeh-mathjax-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-gl-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-api-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-tables-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-widgets-{new_version}.min.js",
        f"https://cdn.bokeh.org/bokeh/release/bokeh-{new_version}.min.js",
    ]

    for url in files_to_download:
        filename = os.path.basename(url)
        print(f"Downloading {filename}")
        r = requests.get(url, stream=True)
        r.raise_for_status()
        with open(os.path.join(destination, "bokeh", filename), "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)


def update_setup_py(new_version, old_bokeh_version, new_bokeh_version):
    with open(SETUP_PY_PATH, "r") as f:
        setup_content = f.read()

    # Replace package version in `version='...'`
    # This pattern is naive; adapt as needed for your file structure.
    setup_content = re.sub(
        r"(version\s*=\s*['\"])([\d\.]+)(['\"])",
        rf"\g<1>{new_version}\g<3>",
        setup_content,
    )

    # Replace bokeh==old_version with bokeh==new_version
    if old_bokeh_version:
        setup_content = re.sub(
            rf"(bokeh\s*==\s*){old_bokeh_version}",
            rf"\g<1>{new_bokeh_version}",
            setup_content,
        )

    with open(SETUP_PY_PATH, "w") as f:
        f.write(setup_content)


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


def update_index_html(public_dir, old_version, new_version):
    index_html_path = os.path.join(public_dir, "index.html")
    if os.path.exists(index_html_path):
        with open(index_html_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        # If old_version is known, do a direct replacement
        if old_version:
            # Replace each script reference with the new version
            cdn_suffixes = ["mathjax", "gl", "api", "tables", "widgets", ""]
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

        with open(index_html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
    else:
        print("No index.html found in frontend/public. Skipping HTML update.")


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

    print("New version available!")
    public_dir = "streamlit_bokeh/frontend/public"

    # Remove original files
    bokeh_dir = os.path.join(public_dir, "bokeh")
    for filename in os.listdir(bokeh_dir):
        if "bokeh" in filename and filename.endswith(".js"):
            os.remove(os.path.join(bokeh_dir, filename))

    download_files(new_bokeh_version, public_dir)
    # Update the bokeh dependency version in index.html and __init__.py
    update_index_html(public_dir, old_bokeh_version, new_bokeh_version)
    update_init_py(old_bokeh_version, new_bokeh_version)

    # Update the bokeh dependency version and component version in setup.py and test-requirements.txt
    update_setup_py(new_version, old_bokeh_version, new_bokeh_version)
    update_test_requirements(
        old_bokeh_version, new_bokeh_version, old_version, new_version
    )

    # Update the component version in package.json
    update_package_json(old_version, new_version)

    print("::set-output name=needs_update::true")
    print(f"::set-output name=old_version::{old_version}")
    print(f"::set-output name=new_version::{new_version}")
