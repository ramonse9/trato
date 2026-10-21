import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  const window = inject(DOCUMENT).defaultView;
  return window?.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?') ?? false;
};
