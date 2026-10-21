import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute } from '@angular/router';
import { ProjectContextService } from '../../core/project-context.service';

@Component({
  selector: 'app-project-section',
  imports: [MatCardModule],
  templateUrl: './project-section.html',
  styleUrl: './project-section.scss',
})
export class ProjectSection {
  private readonly route = inject(ActivatedRoute);
  readonly context = inject(ProjectContextService);
  readonly title = this.route.snapshot.data['title'] as string;
  readonly eyebrow = this.route.snapshot.data['eyebrow'] as string;
  readonly emptyTitle = this.route.snapshot.data['emptyTitle'] as string;
  readonly emptyDescription = this.route.snapshot.data['emptyDescription'] as string;
}
