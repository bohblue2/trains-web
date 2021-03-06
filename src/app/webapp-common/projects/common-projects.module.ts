import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CommonProjectsPageComponent} from './containers/projects-page/common-projects-page.component';
import {SMSharedModule} from '../shared/shared.module';
import {EffectsModule} from '@ngrx/effects';
import {CommonProjectsEffects} from './common-projects.effects';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ProjectsListComponent} from './dumb/projects-list/projects-list.component';
import {ProjectsHeaderComponent} from './dumb/projects-header/projects-header.component';
import {ProjectCreateDialogModule} from '../shared/project-create-dialog/project-create-dialog.module';
import {ProjectsSharedModule} from '../../features/projects/shared/projects-shared.module';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
    imports: [
        CommonModule,
        SMSharedModule,
        FormsModule,
        ReactiveFormsModule,
        ProjectCreateDialogModule,
        ProjectsSharedModule,
        EffectsModule.forFeature([CommonProjectsEffects]),
        SharedModule,
    ],
  declarations   : [CommonProjectsPageComponent, ProjectsListComponent, ProjectsHeaderComponent],
  exports        : [CommonProjectsPageComponent, ProjectsListComponent, ProjectsHeaderComponent]
})
export class CommonProjectsModule {
}
