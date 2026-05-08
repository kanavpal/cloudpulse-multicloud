from rest_framework import serializers
from .models import Room, Booking


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    room_type = serializers.CharField(source='room.room_type', read_only=True)
    room_image = serializers.URLField(source='room.image_url', read_only=True)
    client_username = serializers.CharField(source='client.username', read_only=True)
    nights = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'room', 'room_name', 'room_type', 'room_image',
            'client', 'client_username',
            'check_in', 'check_out', 'guests', 'nights',
            'status', 'total_price', 'served_by_cloud', 'created_at',
        ]
        read_only_fields = ['id', 'client', 'total_price', 'served_by_cloud', 'created_at']

    def get_nights(self, obj):
        return obj.nights()


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['room', 'check_in', 'check_out', 'guests']

    def validate(self, data):
        if data['check_in'] >= data['check_out']:
            raise serializers.ValidationError("Check-out must be after check-in.")
        if data['guests'] < 1:
            raise serializers.ValidationError("At least 1 guest required.")
        return data
