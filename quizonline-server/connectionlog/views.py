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
        # ``__date`` is extracted in the project TIME_ZONE; the admin tool is
        # operated from that zone so range edges align. A superuser in another
        # timezone may see off-by-one-day inclusion at the boundaries.
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)
        return qs

    def create(self, request, *args, **kwargs):
        # Fire-and-forget capture: the SPA ignores the body. Return only the id
        # (the server-resolved ip/geo are the caller's own data, but there is no
        # need to echo them back).
        write = ConnectionEventWriteSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        ev = record_connection(user=request.user, request=request, client=write.validated_data)
        return Response({"id": ev.id}, status=status.HTTP_201_CREATED)
