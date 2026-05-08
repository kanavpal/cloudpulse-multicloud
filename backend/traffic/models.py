from django.db import models


class RequestLog(models.Model):
    endpoint = models.CharField(max_length=300)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField(default=200)
    response_time_ms = models.IntegerField(default=0)
    cloud_name = models.CharField(max_length=50, default='LOCAL')
    is_booking = models.BooleanField(default=False)   # True if /api/bookings/ POST
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.cloud_name}] {self.method} {self.endpoint} → {self.status_code}"

    class Meta:
        ordering = ['-timestamp']
