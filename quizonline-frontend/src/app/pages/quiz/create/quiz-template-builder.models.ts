import {QuestionInQuizQuestion, QuestionRead} from '../../../api/generated';

export type SelectedQuestionRef = QuestionRead | QuestionInQuizQuestion;

export type SelectedQuizQuestion = {
  question: SelectedQuestionRef;
  weight: number;
  sort_order: number;
  quiz_question_id?: number;
};

export type QuestionLibraryCard = {
  question: QuestionRead;
  title: string;
  subjectsLabel: string;
};

export type SelectedQuestionCard = {
  title: string;
  subjectsLabel: string;
  questionId: number;
  item: SelectedQuizQuestion;
};
