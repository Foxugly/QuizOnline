import logging

from drf_spectacular.utils import extend_schema_field
from question.models import Question
from question.serializers import QuestionInQuizQuestionSerializer, QuestionReadSerializer
from rest_framework import serializers
from wpref.serializers import UserSummarySerializer

from .models import QuizTemplate, QuizQuestion, Quiz, QuizQuestionAnswer

logger = logging.getLogger(__name__)


class ShowCorrectContextMixin:
    def __init__(self, *args, **kwargs):
        show_correct = kwargs.pop("show_correct", None)
        context = kwargs.get("context")
        if show_correct is not None:
            kwargs["context"] = {
                **(context or {}),
                "show_correct": show_correct,
            }
        super().__init__(*args, **kwargs)


class GenerateFromSubjectsInputSerializer(serializers.Serializer):
    title = serializers.CharField()
    subject_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    max_questions = serializers.IntegerField(required=False, default=10)
    with_duration = serializers.BooleanField(required=False, default=True)
    duration = serializers.IntegerField(required=False, allow_null=True, min_value=1, default=10)

    def validate(self, attrs):
        if not attrs.get("with_duration", True):
            attrs["duration"] = None
            return attrs

        if attrs.get("duration") is None:
            attrs["duration"] = 10
        return attrs


class BulkCreateFromTemplateInputSerializer(serializers.Serializer):
    quiz_template_id = serializers.IntegerField()
    user_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class CreateQuizInputSerializer(serializers.Serializer):
    quiz_template_id = serializers.IntegerField()


class QuizQuestionSerializer(ShowCorrectContextMixin, serializers.ModelSerializer):
    """
    ReprÃ©sente une question incluse dans un template de quiz.
    On expose quelques infos de la Question en read-only.
    """

    question_id = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(),
        source="question",
        write_only=True,
    )

    question = QuestionInQuizQuestionSerializer(read_only=True)

    class Meta:
        model = QuizQuestion
        fields = [
            "id",
            "quiz",
            "question",
            "question_id",
            "sort_order",
            "weight",
        ]
        read_only_fields = ["quiz", "question"]


class QuizTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer principal pour QuizTemplate (usage admin).
    - lecture : inclut les QuizQuestion avec la Question associÃ©e
    - Ã©criture : tu peux rester simple et gÃ©rer les QuizQuestion via des endpoints dÃ©diÃ©s.
    """

    questions_count = serializers.IntegerField(read_only=True)
    can_answer = serializers.BooleanField(read_only=True)
    quiz_questions = QuizQuestionSerializer(many=True, read_only=True)
    created_by = serializers.IntegerField(source="created_by_id", read_only=True)

    class Meta:
        model = QuizTemplate
        fields = [
            "id",
            "domain",
            "title",
            "slug",
            "mode",
            "description",
            "max_questions",
            "permanent",
            "started_at",
            "ended_at",
            "with_duration",
            "duration",
            "active",
            "created_at",
            "questions_count",
            "can_answer",
            "result_visibility",
            "result_available_at",
            "detail_visibility",
            "detail_available_at",
            "is_public",
            "created_by",
            "quiz_questions",
        ]
        read_only_fields = ["slug", "created_at", "questions_count", "can_answer"]


class QuizTemplateWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizTemplate
        fields = [
            "domain",
            "title",
            "mode",
            "description",
            "max_questions",
            "permanent",
            "started_at",
            "ended_at",
            "with_duration",
            "duration",
            "is_public",
            "active",
            "result_visibility",
            "result_available_at",
            "detail_visibility",
            "detail_available_at",
        ]


class QuizTemplatePartialSerializer(QuizTemplateWriteSerializer):
    domain = serializers.PrimaryKeyRelatedField(queryset=QuizTemplate._meta.get_field("domain").remote_field.model.objects.all(), required=False, allow_null=True)
    title = serializers.CharField(required=False)
    mode = serializers.ChoiceField(choices=QuizTemplate.MODE_CHOICES, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    max_questions = serializers.IntegerField(required=False, min_value=1)
    permanent = serializers.BooleanField(required=False)
    started_at = serializers.DateTimeField(required=False, allow_null=True)
    ended_at = serializers.DateTimeField(required=False, allow_null=True)
    with_duration = serializers.BooleanField(required=False)
    duration = serializers.IntegerField(required=False, min_value=1)
    is_public = serializers.BooleanField(required=False)
    active = serializers.BooleanField(required=False)
    result_visibility = serializers.ChoiceField(choices=QuizTemplate._meta.get_field("result_visibility").choices, required=False)
    result_available_at = serializers.DateTimeField(required=False, allow_null=True)
    detail_visibility = serializers.ChoiceField(choices=QuizTemplate._meta.get_field("detail_visibility").choices, required=False)
    detail_available_at = serializers.DateTimeField(required=False, allow_null=True)


class QuizQuestionWriteSerializer(serializers.ModelSerializer):
    question_id = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(),
        source="question",
        write_only=True,
    )

    class Meta:
        model = QuizQuestion
        fields = ["question_id", "sort_order", "weight"]

    def validate(self, attrs):
        quiz_template = self.context.get("quiz_template")
        if quiz_template is None:
            raise serializers.ValidationError("quiz_template manquant dans le context.")

        question = attrs.get("question")

        if question and not question.active:
            raise serializers.ValidationError({"question_id": "Cette question n'est pas active."})

        if question and quiz_template.domain_id and question.domain_id != quiz_template.domain_id:
            raise serializers.ValidationError(
                {"question_id": "Cette question n'appartient pas au domaine de ce quiz."}
            )

        if question:
            qs = QuizQuestion.objects.filter(quiz=quiz_template, question=question)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"question_id": "Cette question est dÃ©jÃ  dans ce template."})

        return attrs

    def create(self, validated_data):
        logger.debug("QuizQuestionWriteSerializer.create")
        quiz_template = self.context["quiz_template"]
        return QuizQuestion.objects.create(quiz=quiz_template, **validated_data)


class QuizQuestionPartialSerializer(QuizQuestionWriteSerializer):
    question_id = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(),
        source="question",
        write_only=True,
        required=False,
    )
    sort_order = serializers.IntegerField(required=False, min_value=1)
    weight = serializers.IntegerField(required=False, min_value=1)


class QuizQuestionAnswerSerializer(serializers.ModelSerializer):
    """
    RÃ©ponse Ã  une question dans un quiz donnÃ©.
    On travaille en nested sous /quiz/{quiz_id}/answer/
    """

    question_id = serializers.IntegerField(source="quizquestion.question_id", read_only=True)
    quizquestion_id = serializers.IntegerField(source="quizquestion.id", read_only=True)

    class Meta:
        model = QuizQuestionAnswer
        fields = [
            "id",
            "quiz",
            "quizquestion_id",
            "question_order",
            "question_id",
            "selected_options",
            "answered_at",
        ]
        read_only_fields = fields


class QuizQuestionReadSerializer(ShowCorrectContextMixin, serializers.ModelSerializer):
    question = serializers.SerializerMethodField()

    class Meta:
        model = QuizQuestion
        fields = ["id", "question", "sort_order", "weight"]

    @extend_schema_field(QuestionReadSerializer)
    def get_question(self, obj) -> dict:
        context = {
            **self.context,
            "show_correct": bool(self.context.get("show_correct", False)),
        }
        return QuestionReadSerializer(
            obj.question,
            context=context,
        ).data


class QuizListSerializer(serializers.ModelSerializer):
    """RÃ©sumÃ© lÃ©ger d'une session de quiz pour la liste."""

    quiz_template_title = serializers.CharField(source="quiz_template.title", read_only=True)
    quiz_template_description = serializers.CharField(source="quiz_template.description", read_only=True)
    mode = serializers.CharField(source="quiz_template.mode", read_only=True)
    max_questions = serializers.IntegerField(source="quiz_template.max_questions", read_only=True)
    can_answer = serializers.SerializerMethodField()
    user_summary = serializers.SerializerMethodField()
    with_duration = serializers.BooleanField(source="quiz_template.with_duration", read_only=True)
    duration = serializers.IntegerField(source="quiz_template.duration", read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "domain",
            "quiz_template",
            "quiz_template_title",
            "quiz_template_description",
            "user",
            "user_summary",
            "mode",
            "created_at",
            "started_at",
            "ended_at",
            "active",
            "can_answer",
            "max_questions",
            "with_duration",
            "duration",
        ]
        read_only_fields = [
            "created_at",
            "user",
            "user_summary",
            "can_answer",
            "quiz_template_title",
            "quiz_template_description",
            "mode",
            "max_questions",
            "with_duration",
            "duration",
        ]

    @extend_schema_field(UserSummarySerializer(allow_null=True))
    def get_user_summary(self, obj) -> dict | None:
        if obj.user_id is None:
            return None
        return {
            "id": obj.user_id,
            "username": obj.user.username,
        }

    def get_can_answer(self, obj) -> bool:
        return obj.can_answer


class QuizSerializer(QuizListSerializer):
    """
    ReprÃ©sente une session de quiz (Quiz).
    """

    questions = serializers.SerializerMethodField()
    answers = QuizQuestionAnswerSerializer(many=True, read_only=True)
    total_answers = serializers.SerializerMethodField()
    correct_answers = serializers.SerializerMethodField()
    earned_score = serializers.SerializerMethodField()
    max_score = serializers.SerializerMethodField()

    class Meta(QuizListSerializer.Meta):
        fields = QuizListSerializer.Meta.fields + [
            "questions",
            "answers",
            "total_answers",
            "correct_answers",
            "earned_score",
            "max_score",
        ]
        read_only_fields = QuizListSerializer.Meta.read_only_fields

    def _is_admin(self) -> bool:
        req = self.context.get("request")
        if not req or not hasattr(req, "user"):
            return False
        u = req.user
        return bool(u and (u.is_staff or u.is_superuser))

    def _can_show_details(self, quiz) -> bool:
        return self._is_admin() or bool(quiz.quiz_template.can_show_details())

    def _can_show_result(self, quiz) -> bool:
        return self._is_admin() or bool(quiz.quiz_template.can_show_result())

    @extend_schema_field(QuizQuestionReadSerializer(many=True))
    def get_questions(self, obj) -> serializers.ModelSerializer:
        qt = obj.quiz_template
        show_details = self._can_show_details(obj)
        qs = (
            qt.quiz_questions
            .select_related("question")
            .prefetch_related("question__answer_options")
            .order_by("sort_order")
        )
        return QuizQuestionReadSerializer(
            qs,
            many=True,
            context={
                **self.context,
                "show_correct": show_details,
            },
        ).data

    def _answers_qs(self, obj):
        if not hasattr(obj, "_answers_cache"):
            obj._answers_cache = obj.answers.all()
        return obj._answers_cache

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_total_answers(self, obj) -> int:
        if not self._can_show_result(obj):
            return None
        return self._answers_qs(obj).count()

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_correct_answers(self, obj) -> int:
        if not self._can_show_result(obj):
            return None
        return self._answers_qs(obj).filter(is_correct=True).count()

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_earned_score(self, obj) -> float:
        if not self._can_show_result(obj):
            return None
        return sum(a.earned_score for a in self._answers_qs(obj))

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_max_score(self, obj) -> float:
        if not self._can_show_result(obj):
            return None
        return sum(a.max_score for a in self._answers_qs(obj))


class QuizUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = [
            "domain",
            "quiz_template",
            "user",
            "started_at",
            "ended_at",
            "active",
        ]


class QuizPartialUpdateSerializer(QuizUpdateSerializer):
    domain = serializers.PrimaryKeyRelatedField(queryset=Quiz._meta.get_field("domain").remote_field.model.objects.all(), required=False, allow_null=True)
    quiz_template = serializers.PrimaryKeyRelatedField(queryset=QuizTemplate.objects.all(), required=False)
    user = serializers.PrimaryKeyRelatedField(queryset=Quiz._meta.get_field("user").remote_field.model.objects.all(), required=False, allow_null=True)
    started_at = serializers.DateTimeField(required=False, allow_null=True)
    ended_at = serializers.DateTimeField(required=False, allow_null=True)
    active = serializers.BooleanField(required=False)


class QuizQuestionAnswerWriteSerializer(serializers.ModelSerializer):
    question_id = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(),
        required=False,
        write_only=True,
        help_text="ID de la Question (optionnel)",
    )

    question_order = serializers.IntegerField(
        required=False,
        help_text="Ordre de la question dans le template (optionnel)",
    )

    class Meta:
        model = QuizQuestionAnswer
        fields = ["question_id", "question_order", "selected_options"]

    def validate(self, attrs):
        quiz = self.context.get("quiz")
        if not quiz:
            raise serializers.ValidationError("Quiz manquant dans le contexte.")

        if not quiz.can_answer:
            raise serializers.ValidationError({"detail": "Ce quiz n'est plus disponible pour rÃ©pondre."})

        if self.instance:
            if self.instance.quiz_id != quiz.id:
                raise serializers.ValidationError("RÃ©ponse hors du quiz courant.")
            return attrs

        has_qid = attrs.get("question_id") is not None
        has_order = attrs.get("question_order") is not None

        if not has_qid and not has_order:
            raise serializers.ValidationError(
                "Fournis au moins un des deux champs: 'question_id' et/ou 'question_order'."
            )

        qq_by_id = None
        qq_by_order = None

        if has_qid:
            question = attrs["question_id"]
            try:
                qq_by_id = QuizQuestion.objects.get(
                    quiz=quiz.quiz_template,
                    question=question,
                )
            except QuizQuestion.DoesNotExist:
                raise serializers.ValidationError(
                    {"question_id": "Cette question n'appartient pas au template de ce quiz."}
                )

        if has_order:
            order = attrs["question_order"]
            if order <= 0:
                raise serializers.ValidationError({"question_order": "Doit Ãªtre un entier positif."})
            try:
                qq_by_order = QuizQuestion.objects.get(
                    quiz=quiz.quiz_template,
                    sort_order=order,
                )
            except QuizQuestion.DoesNotExist:
                raise serializers.ValidationError(
                    {"question_order": "Aucune question Ã  cet ordre dans le template de ce quiz."}
                )

        if qq_by_id and qq_by_order and qq_by_id.pk != qq_by_order.pk:
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "question_id et question_order ne sont pas cohÃ©rents pour ce quiz."
                    ]
                }
            )

        qq = qq_by_id or qq_by_order
        attrs["quizquestion"] = qq
        attrs["question_order"] = qq.sort_order
        return attrs

    def create(self, validated_data):
        quiz = self.context["quiz"]

        selected = validated_data.pop("selected_options", [])
        validated_data.pop("question_id", None)
        qq = validated_data.pop("quizquestion")

        instance, created = QuizQuestionAnswer.objects.update_or_create(
            quiz=quiz,
            quizquestion=qq,
            defaults={
                "question_order": qq.sort_order,
            },
        )
        instance.selected_options.set(selected)
        return instance

    def update(self, instance, validated_data):
        selected = validated_data.pop("selected_options", None)
        validated_data.pop("question_id", None)
        validated_data.pop("question_order", None)
        validated_data.pop("quizquestion", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if selected is not None:
            instance.selected_options.set(selected)

        return instance


class QuizQuestionAnswerPartialSerializer(QuizQuestionAnswerWriteSerializer):
    selected_options = serializers.PrimaryKeyRelatedField(
        queryset=QuizQuestionAnswer._meta.get_field("selected_options").remote_field.model.objects.all(),
        many=True,
        required=False,
    )
