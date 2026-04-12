import {QuestionInQuizQuestionDto, QuestionReadDto} from '../../../api/generated';

export type SelectedQuestionRef = QuestionReadDto | QuestionInQuizQuestionDto;

export type SelectedQuizQuestion = {
  question: SelectedQuestionRef;
  weight: number;
  sort_order: number;
  quiz_question_id?: number;
};

export type QuestionLibraryCard = {
  question: QuestionReadDto;
  title: string;
  subjectsLabel: string;
};

export type SelectedQuestionCard = {
  title: string;
  subjectsLabel: string;
  questionId: number;
  item: SelectedQuizQuestion;
};
