from rest_framework.permissions import BasePermission

from .models import User


class IsSuperAdmin(BasePermission):
    message = "Bu amal faqat super_admin uchun ruxsat etilgan"

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.SUPER_ADMIN
        )


class IsWorker(BasePermission):
    message = "Bu amal faqat ishchi (worker) uchun ruxsat etilgan"

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.WORKER
        )
