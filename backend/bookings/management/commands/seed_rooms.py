from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from bookings.models import Room

User = get_user_model()

ROOMS = [
    {
        "name": "Standard Room",
        "description": "A cozy and comfortable room perfect for solo travelers or couples. Features a plush queen bed, modern en-suite bathroom, and a work desk.",
        "room_type": "standard",
        "price_per_night": 89.00,
        "capacity": 2,
        "amenities": "Wi-Fi, AC, TV, En-suite Bathroom, Work Desk",
        "image_url": "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
    },
    {
        "name": "Deluxe Room",
        "description": "Spacious and elegantly furnished with a king bed, sitting area, and premium amenities. Enjoy a panoramic city view from your private balcony.",
        "room_type": "deluxe",
        "price_per_night": 149.00,
        "capacity": 2,
        "amenities": "Wi-Fi, AC, Smart TV, Mini Bar, Private Balcony, City View",
        "image_url": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
    },
    {
        "name": "Ocean Suite",
        "description": "Breathtaking ocean views from this luxurious suite. Features a separate living room, king bed, jacuzzi tub, and premium furnishings throughout.",
        "room_type": "suite",
        "price_per_night": 299.00,
        "capacity": 2,
        "amenities": "Wi-Fi, AC, Smart TV, Jacuzzi, Ocean View, Butler Service, Mini Bar",
        "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    },
    {
        "name": "Family Room",
        "description": "Designed for families, this spacious room features one king bed and two twin beds. Includes a kitchenette, dining area, and child-friendly amenities.",
        "room_type": "family",
        "price_per_night": 199.00,
        "capacity": 4,
        "amenities": "Wi-Fi, AC, Smart TV, Kitchenette, Dining Area, Child Amenities",
        "image_url": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    },
    {
        "name": "Presidential Suite",
        "description": "The pinnacle of luxury. This palatial suite features two bedrooms, a grand living room, private dining area, and a wraparound terrace with panoramic views.",
        "room_type": "suite",
        "price_per_night": 599.00,
        "capacity": 4,
        "amenities": "Wi-Fi, AC, Smart TV x3, Private Terrace, Jacuzzi, Butler, Dining Room, Grand Piano",
        "image_url": "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
    },
    {
        "name": "Garden Villa",
        "description": "A private villa surrounded by lush tropical gardens. Features a private plunge pool, outdoor dining area, and a spacious open-plan interior.",
        "room_type": "villa",
        "price_per_night": 449.00,
        "capacity": 3,
        "amenities": "Wi-Fi, AC, Smart TV, Private Pool, Garden, Outdoor Dining, BBQ",
        "image_url": "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=800&q=80",
    },
]


class Command(BaseCommand):
    help = "Seed the database with sample rooms and an admin user"

    def handle(self, *args, **kwargs):
        # ── Create rooms ──────────────────────────────────────────────────────
        created_count = 0
        for room_data in ROOMS:
            room, created = Room.objects.get_or_create(
                name=room_data["name"],
                defaults=room_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✅ Created room: {room.name}"))
            else:
                self.stdout.write(f"  — Room already exists: {room.name}")

        # ── Create admin user ─────────────────────────────────────────────────
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@cloudstay.com",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Cloud",
                "last_name": "Admin",
            },
        )
        if created:
            admin_user.set_password("cloudstay123")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("  ✅ Created admin user: admin / cloudstay123"))
        else:
            self.stdout.write("  — Admin user already exists")

        # ── Create demo client ────────────────────────────────────────────────
        client_user, created = User.objects.get_or_create(
            username="demo",
            defaults={
                "email": "demo@cloudstay.com",
                "role": "client",
                "first_name": "Demo",
                "last_name": "User",
            },
        )
        if created:
            client_user.set_password("demo1234")
            client_user.save()
            self.stdout.write(self.style.SUCCESS("  ✅ Created demo client: demo / demo1234"))
        else:
            self.stdout.write("  — Demo user already exists")

        self.stdout.write(self.style.SUCCESS(
            f"\n🏨 Seed complete — {created_count} rooms created."
        ))
