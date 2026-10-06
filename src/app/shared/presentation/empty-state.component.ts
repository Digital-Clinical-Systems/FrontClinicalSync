import { Component, input } from '@angular/core';

@Component({
  selector: 'cs-empty',
  standalone: true,
  template: `
    <div class="empty">
      <p class="empty__title">{{ title() }}</p>
      <p class="muted">{{ detail() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly detail = input('');
}
