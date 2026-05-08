from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("store.urls")),           # existing — health, whoami (UNCHANGED)
    path("api/auth/", include("users.urls")),
    path("api/", include("bookings.urls")),
    path("api/traffic/", include("traffic.urls")),
]