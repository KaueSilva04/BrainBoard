const projectCovers = [
  '/assets/project-cover.jpg',
  '/assets/project-cover-alt-1.jpg',
  '/assets/project-cover-2.jpg',
  '/assets/project-cover-3.jpg',
  '/assets/project-cover-05.webp',
  '/assets/project-cover-06.webp',
  '/assets/project-cover-07.webp',
  '/assets/project-cover-08.webp',
  '/assets/project-cover-09.webp',
  '/assets/project-cover-10.webp',
  '/assets/project-cover-11.webp',
] as const;

/** Keep the same original artwork assigned to a project across lists and reloads. */
export function getProjectCover(projectId: string): string {
  const hash = Array.from(projectId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return projectCovers[hash % projectCovers.length];
}
