import {QuizList, QuizTemplate} from '../../../api/generated';
import {QuizTemplateAssignmentSessionDto} from '../../../services/quiz/quiz';

export interface UserQuizListItem extends QuizList {
  status: 'not_started' | 'in_progress' | 'answered';
}

export type QuizTemplateListItem = QuizTemplate & {
  is_public?: boolean;
  created_by?: number | null;
  domain?: number | null;
  created_by_username?: string;
  ownerLabel?: string;
  canManage?: boolean;
  canAssign?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewResults?: boolean;
};

export interface AssignableRecipient {
  id: number;
  username: string;
  role: 'owner' | 'manager' | 'member';
}

export interface QuizListToolbarState {
  search: string;
  isAdmin: boolean;
}

export interface QuizTemplateAssignDialogState {
  users: AssignableRecipient[];
  sessions: QuizTemplateAssignmentSessionDto[];
}
