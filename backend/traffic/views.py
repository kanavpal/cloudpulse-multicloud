from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import RequestLog


def is_admin(user):
    return user.is_authenticated and user.role == 'admin'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_traffic(request):
    """Last 60 requests — for the admin dashboard live table."""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=403)

    logs = RequestLog.objects.all()[:60]
    data = [
        {
            'id': log.id,
            'endpoint': log.endpoint,
            'method': log.method,
            'status_code': log.status_code,
            'response_time_ms': log.response_time_ms,
            'cloud_name': log.cloud_name,
            'is_booking': log.is_booking,
            'timestamp': log.timestamp.isoformat(),
        }
        for log in logs
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def traffic_stats(request):
    """Requests per cloud in the last 5 minutes — for live graph."""
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=403)

    from django.db.models import Count
    since = timezone.now() - timezone.timedelta(minutes=5)

    by_cloud = list(
        RequestLog.objects.filter(timestamp__gte=since)
        .values('cloud_name')
        .annotate(count=Count('id'))
    )
    bookings_today = RequestLog.objects.filter(
        is_booking=True,
        timestamp__date=timezone.now().date(),
    ).count()

    return Response({
        'by_cloud': by_cloud,
        'bookings_today': bookings_today,
        'since': since.isoformat(),
    })
