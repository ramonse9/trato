import { Component } from '@angular/core';

@Component({
  selector: 'app-project-entry',
  template: '<p class="loading-entry" aria-live="polite">Abriendo tu proyecto…</p>',
  styles: '.loading-entry { padding: 2rem; color: #567067; }',
})
export class ProjectEntry {}
