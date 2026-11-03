from pathlib import Path
from typing import Any, cast

import yaml
from httpx import Response
from jsonschema import Draft202012Validator

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "api/generated/openapi.yaml"


def assert_contract_response(response: Response) -> None:
    contract = cast(dict[str, Any], yaml.safe_load(CONTRACT_PATH.read_text()))
    assert contract["openapi"] == "3.1.0"
    operation = contract["paths"][response.request.url.path][response.request.method.lower()]
    declared = operation["responses"][str(response.status_code)]
    media_type = response.headers["content-type"].split(";")[0]
    schema = declared["content"][media_type]["schema"]
    # Keep the canonical document as the reference root for #/components/schemas/...
    Draft202012Validator({**contract, **schema}).validate(response.json())
