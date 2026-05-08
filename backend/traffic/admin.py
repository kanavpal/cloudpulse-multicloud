from django.contrib import admin
from .models import RequestLog


@admin.register(RequestLog)
class RequestLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'cloud_name', 'method', 'endpoint', 'status_code', 'response_time_ms', 'is_booking']
    list_filter = ['cloud_name', 'method', 'is_booking']
