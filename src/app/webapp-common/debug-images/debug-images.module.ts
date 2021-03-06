import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { ExperimentCompareSharedModule } from '../experiments-compare/shared/experiment-compare-shared.module';
import { ImageDisplayerComponent } from '../experiments/dumb/image-displayer/image-displayer.component';
import { SMSharedModule } from '../shared/shared.module';
import { UiComponentsModule } from '../shared/ui-components/ui-components.module';
import { DebugImageSnippetComponent } from './debug-image-snippet/debug-image-snippet.component';
import { DebugImagesEffects } from './debug-images-effects';
import { debugImagesReducer } from './debug-images-reducer';
import { DebugImagesViewComponent } from './debug-images-view/debug-images-view.component';
import { DebugImagesComponent } from './debug-images.component';

const declerations = [DebugImagesComponent, DebugImagesViewComponent, ImageDisplayerComponent, DebugImageSnippetComponent];

@NgModule({
  declarations   : declerations,
  exports        : declerations,
  imports        : [
    UiComponentsModule,
    SMSharedModule,
    CommonModule,
    ExperimentCompareSharedModule,
    ScrollingModule,
    StoreModule.forFeature('debugImages', debugImagesReducer),
    EffectsModule.forFeature([DebugImagesEffects])
  ]
})
export class DebugImagesModule {
}
