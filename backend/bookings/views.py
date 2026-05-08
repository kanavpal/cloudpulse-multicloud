from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Room, Booking
from .serializers import RoomSerializer, BookingSerializer, BookingCreateSerializer


# ── Rooms (public) ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def room_list(request):
    rooms = Room.objects.filter(is_available=True)
    serializer = RoomSerializer(rooms, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def room_detail(request, pk):
    try:
        room = Room.objects.get(pk=pk)
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = RoomSerializer(room)
    return Response(serializer.data)


# ── Client Bookings ────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def my_bookings(request):
    if request.method == 'GET':
        bookings = Booking.objects.filter(client=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    # POST — create booking
    serializer = BookingCreateSerializer(data=request.data)
    if serializer.is_valid():
        booking = serializer.save(
            client=request.user,
            served_by_cloud=getattr(settings, 'CLOUD_NAME', 'LOCAL'),
        )
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_booking(request, pk):
    try:
        booking = Booking.objects.get(pk=pk, client=request.user)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

    if booking.status == 'cancelled':
        return Response({'error': 'Already cancelled'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = 'cancelled'
    booking.save()
    return Response(BookingSerializer(booking).data)


# ── Admin Endpoints ────────────────────────────────────────────────────────────

def is_admin(user):
    return user.is_authenticated and user.role == 'admin'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_bookings(request):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    bookings = Booking.objects.select_related('room', 'client').all()
    serializer = BookingSerializer(bookings, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    if not is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    from django.db.models import Count, Sum

    total = Booking.objects.count()
    confirmed = Booking.objects.filter(status='confirmed').count()
    cancelled = Booking.objects.filter(status='cancelled').count()

    by_cloud = list(
        Booking.objects.values('served_by_cloud')
        .annotate(count=Count('id'), revenue=Sum('total_price'))
        .order_by('served_by_cloud')
    )

    revenue = Booking.objects.filter(status='confirmed').aggregate(
        total=Sum('total_price')
    )['total'] or 0

    return Response({
        'total_bookings': total,
        'confirmed': confirmed,
        'cancelled': cancelled,
        'revenue': float(revenue),
        'by_cloud': by_cloud,
    })
