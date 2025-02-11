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

#!/usr/bin/env python

"""Send slack notifications"""

import os
import sys

import requests


def send_notification():
    """Create a slack message"""

    webhook = os.getenv("SLACK_WEBHOOK")

    if not webhook:
        raise Exception("Unable to retrieve SLACK_WEBHOOK")

    run_id = os.getenv("RUN_ID")
    workflow = sys.argv[1]
    message_key = sys.argv[2]
    additional_args = sys.argv[3:]
    payload = None

    if workflow == "update-bokeh":
        if message_key == "success":
            payload = {
                "text": f":tada: A new bokeh version is available! <{additional_args[0]}|See PR for details>."
            }
        else:
            payload = {
                "text": f":blobonfire: Bokeh update failed! - <https://github.com/streamlit/streamlit/actions/runs/{run_id}|Link to run>"
            }

    if workflow == "release":
        if message_key == "success":
            payload = {
                "text": f":rocket: Bokeh Custom Component Release was successful! - <https://github.com/streamlit/streamlit/actions/runs/{run_id}|Link to run>"
            }
        else:
            payload = {
                "text": f":blobonfire: Bokeh Custom Component Release was failed! - <https://github.com/streamlit/streamlit/actions/runs/{run_id}|Link to run>"
            }

    if payload:
        response = requests.post(webhook, json=payload)

        if response.status_code != 200:
            raise Exception(
                f"Unable to send slack message, HTTP response: {response.text}"
            )


def main():
    send_notification()


if __name__ == "__main__":
    main()
