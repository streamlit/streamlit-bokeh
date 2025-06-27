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

import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = SCRIPT_DIR.parent / "streamlit_bokeh/frontend"
OUTPUT_FILE = SCRIPT_DIR.parent / "NOTICES"
ADDITIONAL_LICENSES = [
    FRONTEND_DIR / "src/assets/fonts/Source-Sans-Pro.LICENSE",
    FRONTEND_DIR / "src/assets/bokeh/LICENSE.txt",
]

if __name__ == "__main__":
    with open(OUTPUT_FILE, "w") as outfile:
        subprocess.run(
            ["yarn", "licenses", "generate-disclaimer", "--production", "--recursive"],
            cwd=str(FRONTEND_DIR),
            stdout=outfile,
            stderr=subprocess.PIPE,
            check=True,
        )

        # Append the contents of the additional files
        for file_path in ADDITIONAL_LICENSES:
            outfile.write("\n\n")
            with open(file_path, "r") as infile:
                outfile.write(infile.read())
