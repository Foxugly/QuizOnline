from datetime import datetime, time, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from config.permissions import IsSuperUser
from .models import ConnectionEvent
from .serializers import ConnectionEventReadSerializer, ConnectionEventWriteSerializer
from .services import record_connection


class ConnectionEventViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                             viewsets.GenericViewSet):
    queryset = ConnectionEvent.objects.all()
    serializer_class = ConnectionEventReadSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsSuperUser()]

    def get_throttles(self):
        if self.action == "create":
            t = ScopedRateThrottle()
            t.scope = "connection_log"
            return [t]
        return []

    def get_queryset(self):
        qs = ConnectionEvent.objects.all()
        # Filter on datetime bounds against the raw ``created_at`` column so the
        # index is usable (``created_at__date`` wraps the column in a cast and
        # forces a full scan on this potentially large log table). Same
        # inclusive-day range as before, computed in the project TIME_ZONE: the
        # end day is included via ``< end + 1 day``. Invalid dates are ignored.
        tz = timezone.get_current_timezone()
        start = parse_date(self.request.query_params.get("start") or "")
        end = parse_date(self.request.query_params.get("end") or "")
        if start:
            qs = qs.filter(created_at__gte=timezone.make_aware(datetime.combine(start, time.min), tz))
        if end:
            qs = qs.filter(created_at__lt=timezone.make_aware(datetime.combine(end + timedelta(days=1), time.min), tz))
        return qs

    def create(self, request, *args, **kwargs):
        # Fire-and-forget capture: the SPA ignores the body. Return only the id
        # (the server-resolved ip/geo are the caller's own data, but there is no
        # need to echo them back).
        write = ConnectionEventWriteSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        ev = record_connection(user=request.user, request=request, client=write.validated_data)
        return Response({"id": ev.id}, status=status.HTTP_201_CREATED)
