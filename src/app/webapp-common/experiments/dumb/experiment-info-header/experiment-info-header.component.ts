import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {TaskStatusEnum} from '../../../../business-logic/model/tasks/taskStatusEnum';
import {TaskTypeEnum} from '../../../../business-logic/model/tasks/taskTypeEnum';
import {ISelectedExperiment} from '../../../../features/experiments/shared/experiment-info.model';
import {getSystemTags, isDevelopment} from '../../../../features/experiments/shared/experiments.utils';
import {Observable} from 'rxjs';
import {Store} from '@ngrx/store';
import {selectProjectTags} from '../../../core/reducers/projects.reducer';
import {getTags} from '../../../core/actions/projects.actions';
import {addTag, removeTag} from '../../actions/common-experiments-menu.actions';
import {TagsMenuComponent} from '../../../shared/ui-components/tags/tags-menu/tags-menu.component';
import {MenuComponent} from '../../../shared/ui-components/panel/menu/menu.component';
import {ActivateEdit, DeactivateEdit} from '../../../../features/experiments/actions/experiments-info.actions';

@Component({
  selector   : 'sm-experiment-info-header',
  templateUrl: './experiment-info-header.component.html',
  styleUrls  : ['./experiment-info-header.component.scss']
})
export class ExperimentInfoHeaderComponent {

  readonly TaskStatusEnum = TaskStatusEnum;
  readonly TaskTypeEnum   = TaskTypeEnum;

  public viewId: boolean;
  public tags$: Observable<string[]>;
  public isDev = false;
  public systemTags = [] as string[];

  @Input() editable: boolean = true;
  @Input() infoData;
  @Input() backdropActive    = false;
  @Input() showMenu: boolean;
  @Input() showMinimize: boolean;
  @Output() experimentNameChanged = new EventEmitter<string>();
  @Output() minimizeClicked = new EventEmitter();
  @ViewChild('tagMenu') tagMenu: MenuComponent;
  @ViewChild('tagsMenuContent') tagMenuContent: TagsMenuComponent;

  constructor(private store: Store<any>) {
    this.tags$ = this.store.select(selectProjectTags);
  }

  private _experiment: ISelectedExperiment;
  private previousId: string;

  get experiment() {
    return this._experiment;
  }

  @Input() set experiment(experiment: ISelectedExperiment) {
    this._experiment = experiment;
    this.isDev = isDevelopment(experiment);
    this.systemTags = getSystemTags(experiment);
    if (experiment?.id !== this.previousId) {
      this.viewId = false;
    }
    this.previousId = experiment?.id;
  }


  onNameChanged(name) {
    this.experimentNameChanged.emit(name);
  }

  openTagMenu(event: MouseEvent) {
    if (!this.tagMenu) {
      return;
    }
    this.store.dispatch(getTags());
    this.tagMenu.position = {x: event.clientX, y: event.clientY};
    window.setTimeout(() => {
      this.tagMenu.openMenu();
      this.tagMenuContent.focus();
    });
  }

  addTag(tag: string) {
    this.store.dispatch(addTag({tag, experiments: [this.experiment]}));
  }

  removeTag(tag: string) {
    this.store.dispatch(removeTag({tag, experiments: [this.experiment]}));
  }

  tagsMenuClosed() {
    this.tagMenuContent.clear();
  }

  editExperimentName(edit) {
    if (edit) {
      this.store.dispatch(new ActivateEdit('ExperimentName'));
    } else {
      this.store.dispatch(new DeactivateEdit());
    }
  }

  showID() {
    this.viewId = true;
  }
}
