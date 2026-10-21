import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  function run(component: HasUnsavedChanges, confirm: ReturnType<typeof vi.fn>) {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: { confirm } } }],
    });
    return TestBed.runInInjectionContext(() => unsavedChangesGuard(component, route, state, state));
  }

  it('permite salir sin mostrar confirmación cuando el formulario está limpio', () => {
    const confirm = vi.fn();
    expect(run({ hasUnsavedChanges: () => false }, confirm)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('respeta la decisión del usuario cuando existen cambios sin guardar', () => {
    const confirm = vi.fn(() => false);
    expect(run({ hasUnsavedChanges: () => true }, confirm)).toBe(false);
    expect(confirm).toHaveBeenCalledWith(
      'Tienes cambios sin guardar. ¿Quieres salir y descartarlos?',
    );
  });
});
