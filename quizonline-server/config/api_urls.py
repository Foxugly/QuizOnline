# question/old_api_urls.py
from django.urls import path, include

from admin_api.stats_views import DashboardStatsView
from admin_api.system_views import SystemCheckView, SystemConfigView
from core.views import TestEmailView

app_name = 'api'
urlpatterns = [
    path("stats/dashboard/", DashboardStatsView.as_view(), name="stats-dashboard"),
    path("mail/test/", TestEmailView.as_view(), name="mail-test"),
    path("admin/system-config/", SystemConfigView.as_view(), name="system-config"),
    path("admin/system-check/", SystemCheckView.as_view(), name="system-check"),
    path("subject/", include(("subject.api_urls", "subject"), namespace="subject-api")),
    path("question/", include(("question.api_urls", "question"), namespace="question-api")),
    path("quiz/", include(("quiz.api_urls", "quiz"), namespace="quiz-api")),
    path("user/", include(("customuser.api_urls", "user"), namespace="user-api")),
    path("domain/", include(("domain.api_urls", "domain"), namespace="domain-api")),
    path("lang/", include(("language.api_urls", "lang"), namespace="lang-api")),
    path("translate/", include(("translation.api_urls", "translation"), namespace="translate-api")),
]
