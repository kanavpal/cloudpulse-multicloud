import os
from django.http import JsonResponse


def health(request):
    return JsonResponse({"status": "UP"})


def whoami(request):
    return JsonResponse({
        "cloud": os.environ.get("CLOUD_NAME", "LOCAL"),
        "hostname": os.uname().nodename if hasattr(os, "uname") else "unknown",
        "region": os.environ.get("CLOUD_REGION", "unknown"),
    })