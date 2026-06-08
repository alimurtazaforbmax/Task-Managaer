from rest_framework.views import exception_handler

from apps.core.responses import error_response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    errors = response.data
    if isinstance(errors, dict) and "detail" in errors:
        message = str(errors["detail"])
        errors = {}
    elif isinstance(errors, list):
        message = errors[0] if errors else "Request failed"
        errors = {"non_field_errors": errors}
    else:
        message = "Validation failed"

    return error_response(message=message, errors=errors, status=response.status_code)
