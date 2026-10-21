import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { ProjectContextService } from './project-context.service';

export const workspaceEntryGuard: CanActivateFn = async () => {
  const projects = inject(ProjectContextService);
  const router = inject(Router);
  await projects.initialize();
  const active = projects.activeProject();

  return active
    ? router.createUrlTree(['/p', active.id, 'today'])
    : router.createUrlTree(['/projects']);
};

export const projectGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const projects = inject(ProjectContextService);
  const router = inject(Router);
  const loaded = await projects.initialize();
  const projectId = route.paramMap.get('projectId');

  return loaded && projectId && projects.selectProject(projectId)
    ? true
    : router.createUrlTree(['/projects']);
};
