from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ['-created_at']
    list_display = ['phone', 'full_name', 'role', 'status', 'is_staff', 'created_at']
    list_filter = ['role', 'status', 'is_staff']
    search_fields = ['phone', 'full_name']
    readonly_fields = ['id', 'created_at']

    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        ('Shaxsiy ma\'lumot', {'fields': ('full_name', 'telegram_chat_id')}),
        ('Rol va holat', {'fields': ('role', 'status')}),
        ('Ruxsatlar', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Sanalar', {'fields': ('created_at', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone', 'full_name', 'role', 'password1', 'password2'),
        }),
    )
    readonly_fields = ['id', 'created_at', 'last_login']
