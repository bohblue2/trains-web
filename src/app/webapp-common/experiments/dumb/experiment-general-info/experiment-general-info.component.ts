import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ISelectedExperiment} from '../../../../features/experiments/shared/experiment-info.model';
import {TIME_FORMAT_STRING} from '../../../constants';
import {ActivateEdit, DeactivateEdit} from '../../../../features/experiments/actions/experiments-info.actions';
import {Store} from '@ngrx/store';

@Component({
  selector   : 'sm-experiment-general-info',
  templateUrl: './experiment-general-info.component.html',
  styleUrls  : ['./experiment-general-info.component.scss']
})
export class ExperimentGeneralInfoComponent {
  constructor(private store: Store<any>) {}

  commentControl = new FormControl();

  private _experimentComment: string;

  @Input() experiment: ISelectedExperiment;
  @Input() editable: boolean;
  @Input() isExample: boolean;

  // TODO: remove ISelectedExperiment and use the form object...
  @Input() set experimentComment (experimentComment: string) {
    this._experimentComment = experimentComment;
    this.rebuildCommentControl(experimentComment);
  }

  get experimentComment() {
    return this._experimentComment;
  }

  @Output() commentChanged = new EventEmitter<string>();
  TIME_FORMAT_STRING = TIME_FORMAT_STRING;

  rebuildCommentControl(comment) {
    this.commentControl = new FormControl(comment);
  }

  commentValueChanged(value) {
    this.commentChanged.emit(value);
  }
  editExperimentComment(edit) {
    if (edit) {
      this.store.dispatch(new ActivateEdit('ExperimentComment'));
    } else {
      this.store.dispatch(new DeactivateEdit());
    }
  }

}
