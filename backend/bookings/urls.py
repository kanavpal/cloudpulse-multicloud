from django.urls import path
from . import views

urlpatterns = [
    # Public
    path('rooms/', views.room_list, name='room-list'),
    path('rooms/<int:pk>/', views.room_detail, name='room-detail'),

    # Client
    path('bookings/', views.my_bookings, name='my-bookings'),
    path('bookings/<int:pk>/cancel/', views.cancel_booking, name='cancel-booking'),

    # Admin
    path('admin/bookings/', views.admin_bookings, name='admin-bookings'),
    path('admin/bookings/stats/', views.admin_stats, name='admin-stats'),
]
