from rest_framework.response import Response


def success_response(data=None, message="", status=200):
    return Response({"success": True, "data": data, "message": message}, status=status)


def error_response(message="", errors=None, status=400):
    payload = {"success": False, "data": errors or {}, "message": message}
    return Response(payload, status=status)
