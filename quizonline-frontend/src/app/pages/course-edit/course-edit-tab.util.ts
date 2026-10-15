import {CourseEditTab} from '../../app.routes-paths';

const TABS: readonly CourseEditTab[] = ['info', 'content', 'enrollment', 'analytics'];

export function parseCourseEditTab(raw: string | null): CourseEditTab {
  if (raw === 'structure') {
    return 'content';
  }
  return (TABS as readonly string[]).includes(raw ?? '') ? (raw as CourseEditTab) : 'info';
}
