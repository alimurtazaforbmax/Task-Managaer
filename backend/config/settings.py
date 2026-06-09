import os
from datetime import timedelta
from pathlib import Path

from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="django-insecure-dev-key-change-in-prod")
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="192.168.11.209").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "apps.accounts",
    "apps.projects",
    "apps.tasks",
    "apps.bugs",
    "apps.tickets",
    "apps.core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

AUTH_USER_MODEL = "accounts.User"

DATABASE_URL = config("DATABASE_URL", default="sqlite:///db.sqlite3")
if DATABASE_URL.startswith("sqlite"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    import urllib.parse

    url = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": url.path[1:],
            "USER": url.username,
            "PASSWORD": url.password,
            "HOST": url.hostname,
            "PORT": url.port or 5432,
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}

if DEBUG:
    # Allow login from any LAN IP (localhost, 192.168.x.x, Docker 172.x, etc.)
    CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=True, cast=bool)
else:
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in config(
            "CORS_ALLOWED_ORIGINS",
            default=(
                "http://localhost:5173,"
                "http://127.0.0.1:5173,"
                "http://192.168.11.209:5173,"
                "http://172.17.16.1:5173,"
                "http://192.168.11.113:3173"
            ),
        ).split(",")
        if origin.strip()
    ]

SPECTACULAR_SETTINGS = {
    "TITLE": "BetaFlow API",
    "VERSION": "1.0.0",
}

CELERY_BROKER_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"

USE_S3 = config("USE_S3", default=False, cast=bool)
MAX_IMAGE_SIZE_MB = 10
MAX_VIDEO_SIZE_MB = 50
MAX_DOCUMENT_SIZE_MB = 25

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
ALLOWED_DOCUMENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
]

VAPID_PUBLIC_KEY = config(
    "VAPID_PUBLIC_KEY",
    default="BJALfx-wmL_5O9SFRsYaQbbbdwDdcnf6rjyQu6cPmbzPRJ5FT7uvmnmacJvo2GJ-ZDKlY7xBiS62wSPZyXCyO5w",
)
_vapid_key_path = BASE_DIR / "config" / "vapid_private.pem"
if _vapid_key_path.exists():
    VAPID_PRIVATE_KEY = _vapid_key_path.read_text(encoding="utf-8")
else:
    VAPID_PRIVATE_KEY = config("VAPID_PRIVATE_KEY", default="")
VAPID_ADMIN_EMAIL = config("VAPID_ADMIN_EMAIL", default="mailto:admin@taskmanager.local")

if USE_S3:
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="us-east-1")
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = True
