import {QuestionRead, QuizQuestionAnswer, QuizQuestionRead} from '../../api/generated';
import {QuizNavItem} from '../../components/quiz-nav/quiz-nav';

export function buildQuizNavItems(questions: QuizQuestionRead[]): QuizNavItem[] {
  return questions.map((quizQuestion, index) => ({
    index: quizQuestion.sort_order ?? index + 1,
    id: quizQuestion.question.id,
    answered: false,
    flagged: false,
    question: quizQuestion.question as QuestionRead,
    selectedOptionIds: [],
  }));
}

export function applyQuizAnswers(
  items: QuizNavItem[],
  answers: QuizQuestionAnswer[],
): QuizNavItem[] {
  const answersByOrder = new Map<number, QuizQuestionAnswer>();
  const answersByQuestionId = new Map<number, QuizQuestionAnswer>();

  for (const answer of answers) {
    answersByOrder.set(answer.question_order, answer);
    answersByQuestionId.set(answer.question_id, answer);
  }

  return items.map((item) => {
    const answer = answersByOrder.get(item.index) ?? answersByQuestionId.get(item.id);
    if (!answer) {
      return item;
    }

    return {
      ...item,
      answered: true,
      selectedOptionIds: answer.selected_options ?? [],
    };
  });
}

export function updateQuizNavItem(
  items: QuizNavItem[],
  index: number,
  changes: Partial<QuizNavItem>,
): QuizNavItem[] {
  return items.map((item) => (item.index === index ? {...item, ...changes} : item));
}

export function findQuizNavItem(items: QuizNavItem[], index: number): QuizNavItem | null {
  return items.find((item) => item.index === index) ?? null;
}
