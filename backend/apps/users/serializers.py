from django.contrib.auth import password_validation
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class PhoneTokenObtainPairSerializer(TokenObtainPairSerializer):
    """`phone` maydonini username sifatida ishlatadi (BACKEND_README §4)."""

    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': str(self.user.id),
            'full_name': self.user.full_name,
            'phone': self.user.phone,
            'role': self.user.role,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'phone', 'role', 'status',
            'telegram_chat_id', 'id_card_front', 'id_card_back', 'agreement_video', 'created_at',
        ]
        read_only_fields = ['id', 'role', 'created_at']


class WorkerCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[password_validation.validate_password])

    class Meta:
        model = User
        fields = ['id', 'full_name', 'phone', 'password', 'telegram_chat_id', 'status']
        read_only_fields = ['id', 'status']

    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(
            role=User.Role.WORKER,
            status=User.Status.PENDING,
            password=password,
            **validated_data,
        )


class WorkerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'phone', 'telegram_chat_id', 'status']


class RequestOtpSerializer(serializers.Serializer):
    phone = serializers.CharField()


class VerifyOtpSerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField(max_length=6, min_length=6)


class ConfirmResetPasswordSerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(validators=[password_validation.validate_password])
