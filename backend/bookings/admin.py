from django.contrib import admin
from .models import Room, Booking


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'room_type', 'price_per_night', 'capacity', 'is_available']
    list_filter = ['room_type', 'is_available']
    search_fields = ['name']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'room', 'check_in', 'check_out', 'status', 'served_by_cloud', 'total_price']
    list_filter = ['status', 'served_by_cloud']
    search_fields = ['client__username', 'room__name']
