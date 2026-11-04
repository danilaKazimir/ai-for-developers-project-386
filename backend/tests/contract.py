import json
import re
from pathlib import Path
from typing import Any, cast

import yaml
from httpx import Response
from jsonschema import Draft202012Validator, FormatChecker

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "api/generated/openapi.yaml"


def assert_contract_response(response: Response) -> None:
    contract = cast(dict[str, Any], yaml.safe_load(CONTRACT_PATH.read_text()))
    assert contract["openapi"] == "3.1.0"
    matching = [
        path
        for path in contract["paths"]
        if re.fullmatch(re.sub(r"\{[^}]+\}", "[^/]+", path), response.request.url.path)
    ]
    assert len(matching) == 1, f"No unique canonical operation for {response.request.url.path}"
    operation = contract["paths"][matching[0]][response.request.method.lower()]
    declared = operation["responses"][str(response.status_code)]
    media_type = response.headers["content-type"].split(";")[0]
    schema = declared["content"][media_type]["schema"]
    # Keep the canonical document as the reference root for #/components/schemas/...
    Draft202012Validator({**contract, **schema}, format_checker=FormatChecker()).validate(
        response.json()
    )
    if response.is_success and "requestBody" in operation:
        request_schema = operation["requestBody"]["content"]["application/json"]["schema"]
        Draft202012Validator(
            {**contract, **request_schema}, format_checker=FormatChecker()
        ).validate(json.loads(response.request.content))
