from django.urls import path
from . import views

urlpatterns = [
    path('live/', views.live_traffic, name='traffic-live'),
    path('stats/', views.traffic_stats, name='traffic-stats'),
]
