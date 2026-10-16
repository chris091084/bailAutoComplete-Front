import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ElementAccordionComponent } from '../element-accordion/element-accordion.component';
import { PieceDto } from '../etat-des-lieux.model';

/** Une pièce du logement : son titre, son avancement, la liste de ses éléments. */
@Component({
  selector: 'app-piece-section',
  imports: [ElementAccordionComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="mb-4" [attr.aria-labelledby]="'piece-' + piece().id">
      <h2 class="h5 d-flex align-items-baseline gap-2 mb-2" [id]="'piece-' + piece().id">
        {{ piece().nom }}
        <small class="text-secondary fw-normal">
          {{ traites() }}/{{ piece().elements.length }} traités
        </small>
      </h2>
      <div class="d-grid gap-2" role="list">
        @for (element of piece().elements; track element.id) {
          <app-element-accordion [element]="element" />
        }
      </div>
    </section>
  `,
})
export class PieceSectionComponent {
  readonly piece = input.required<PieceDto>();

  readonly traites = computed(
    () =>
      this.piece().elements.filter((e) => e.statutValidation === 'valide').length,
  );
}
