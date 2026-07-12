import {QuizListDto} from '../../../api/generated/model/quiz-list';
import {QuizTemplateDto} from '../../../api/generated/model/quiz-template';

export interface UserQuizListItem extends QuizListDto {
  status: 'not_started' | 'in_progress' | 'answered';
}

export type QuizTemplateListItem = QuizTemplateDto & {
  is_public?: boolean;
  created_by?: number | null;
  domain?: number | null;
  created_by_name?: string;
  ownerLabel?: string;
  canManage?: boolean;
  canAssign?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewResults?: boolean;
};

export interface AssignableRecipient {
  id: number;
  name: string;
  role: 'owner' | 'manager' | 'member';
}
