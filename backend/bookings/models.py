from django.conf import settings
from django.db import models


class Room(models.Model):
    ROOM_TYPE_CHOICES = [
        ('standard', 'Standard'),
        ('deluxe', 'Deluxe'),
        ('suite', 'Suite'),
        ('family', 'Family'),
        ('villa', 'Villa'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField()
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='standard')
    price_per_night = models.DecimalField(max_digits=8, decimal_places=2)
    capacity = models.IntegerField(default=2)
    is_available = models.BooleanField(default=True)
    image_url = models.URLField(max_length=500, blank=True)
    amenities = models.CharField(max_length=500, blank=True, help_text='Comma-separated list')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.room_type})"

    class Meta:
        ordering = ['price_per_night']


class Booking(models.Model):
    STATUS_CHOICES = [
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='bookings')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    served_by_cloud = models.CharField(max_length=50, default='LOCAL')  # set from CLOUD_NAME env
    created_at = models.DateTimeField(auto_now_add=True)

    def nights(self):
        return (self.check_out - self.check_in).days

    def save(self, *args, **kwargs):
        if self.check_in and self.check_out:
            self.total_price = self.room.price_per_night * self.nights()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Booking #{self.pk} — {self.client.username} — {self.room.name}"

    class Meta:
        ordering = ['-created_at']
