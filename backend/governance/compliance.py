"""
InvestMitra Governance & SEBI Compliance Middleware
Mandatory fail-closed sanitization for all model and AI outputs.
"""

from typing import Dict, Any
from backend.sebi_compliance_guard import sanitize_text, sanitize_signal_output, SEBI_DISCLAIMER_TEXT


class SEBIComplianceViolationError(Exception):
    """Exception raised when an output violates mandatory compliance rules and cannot be sanitized."""
    pass


def enforce_sebi_compliance(output_data: Any) -> Any:
    """
    Mandatory fail-closed compliance check.
    Ensures no raw directive trading terms (BUY, SELL, TARGET PRICE) leave the backend.
    """
    if output_data is None:
        return {"status": "NO_DATA", "disclaimer": SEBI_DISCLAIMER_TEXT}

    try:
        if isinstance(output_data, str):
            sanitized = sanitize_text(output_data)
            return sanitized
        elif isinstance(output_data, dict):
            # If it's a signal dictionary, use signal sanitizer
            if "signal" in output_data or "action" in output_data:
                return sanitize_signal_output(output_data)
            
            # Recursive dict sanitization
            sanitized_dict = {}
            for key, val in output_data.items():
                if isinstance(val, str):
                    sanitized_dict[key] = sanitize_text(val)
                elif isinstance(val, list):
                    sanitized_dict[key] = [sanitize_text(item) if isinstance(item, str) else item for item in val]
                elif isinstance(val, dict):
                    sanitized_dict[key] = enforce_sebi_compliance(val)
                else:
                    sanitized_dict[key] = val
            
            sanitized_dict["disclaimer"] = SEBI_DISCLAIMER_TEXT
            return sanitized_dict
        elif isinstance(output_data, list):
            return [enforce_sebi_compliance(item) for item in output_data]
        else:
            return output_data
    except Exception as e:
        # FAIL CLOSED: Return safe default with error and disclaimer, never leak raw un-sanitized content on error
        return {
            "status": "COMPLIANCE_ENFORCED",
            "error": "Output sanitized under fail-closed security policy",
            "disclaimer": SEBI_DISCLAIMER_TEXT
        }
