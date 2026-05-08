import time
from django.conf import settings
from .models import RequestLog


class RequestLogMiddleware:
    """Automatically logs every request to RequestLog table."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        elapsed_ms = int((time.time() - start) * 1000)

        # Skip Django admin and static file requests
        path = request.path
        if path.startswith('/admin/') or path.startswith('/static/'):
            return response

        try:
            RequestLog.objects.create(
                endpoint=path,
                method=request.method,
                status_code=response.status_code,
                response_time_ms=elapsed_ms,
                cloud_name=getattr(settings, 'CLOUD_NAME', 'LOCAL'),
                is_booking=(path == '/api/bookings/' and request.method == 'POST'),
            )
        except Exception:
            pass  # Never break the request if logging fails

        return response
