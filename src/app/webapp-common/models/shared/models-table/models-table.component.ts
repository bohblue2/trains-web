import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, HostListener, Input, Output, ViewChild} from '@angular/core';
import {ICONS} from '../../../../app.constants';
import {ColHeaderTypeEnum, ISmCol, TableSortOrderEnum} from '../../../shared/ui-components/data/table/table.consts';
import {get} from 'lodash/fp';
import {ITableModel} from '../models.model';
import {MODELS_FRAMEWORK_LABELS, MODELS_READY_LABELS, MODELS_TABLE_COL_FIELDS} from '../models.const';
import {FilterMetadata} from 'primeng/api/filtermetadata';
import {BaseTableView} from '../../../shared/ui-components/data/table/base-table-view';
import {User} from '../../../../business-logic/model/users/user';
import {sortByArr} from '../../../shared/pipes/show-selected-first.pipe';
import {Observable} from 'rxjs';
import {selectProjectTags} from '../../../core/reducers/projects.reducer';
import {Store} from '@ngrx/store';
import {addTag} from '../../actions/models-menu.actions';
import {ModelMenuComponent} from '../../../../features/models/containers/model-menu/model-menu.component';
import {TIME_FORMAT_STRING} from '../../../constants';
import {getSysTags} from '../../model.utils';
import {TableComponent} from '../../../shared/ui-components/data/table/table.component';
import { MODELS_TABLE_COLS } from '../../models.consts';

@Component({
  selector       : 'sm-models-table',
  templateUrl    : './models-table.component.html',
  styleUrls      : ['./models-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelsTableComponent extends BaseTableView {
  readonly MODELS_TABLE_COL_FIELDS = MODELS_TABLE_COL_FIELDS;
  readonly MODELS_FRAMEWORK_OPTIONS = Object.entries(MODELS_FRAMEWORK_LABELS).map(([key, val]) => ({label: val, value: key}));
  readonly MODELS_READY_OPTIONS = Object.entries(MODELS_READY_LABELS).map(([key, val]) => ({label: val, value: key}));
  readonly MODELS_ALL_FILTER_OPTIONS = {
    framework: [],
    ready    : this.MODELS_READY_OPTIONS,
    users    : [],
    tags     : [],
  };
  readonly ICONS = ICONS;
  public userSearchValue: string;
  public tagSearchValue: string;
  public frameworkFiltersValue: any;
  public readyFiltersValue: any;
  public userFiltersValue: any;

  public tagsFiltersValue: any;
  public systemTagsFiltersValue: any;
  public menuOpen: boolean;
  public allFiltersValue: { framework: any; ready: any; users: any, tags: any };
  public sortOrder = 1;

  public contextModel: ITableModel;
  public tags$: Observable<string[]>;
  private _selectedModels: ITableModel[];
  private _models: ITableModel[];
  private _enableMultiSelect: boolean;
  private _tablesCols: ISmCol[];
  public getSysTags = getSysTags;

  @Input() set models(models: ITableModel[]) {
    this._models = models;
    if (this.contextModel) {
      this.contextModel = this.models.find(model => model.id === this.contextModel.id);
    }
  }

  get models() {
    return this._models;
  }

  @Input() noMoreModels: boolean;

  @Input() set tableCols(tableCols: ISmCol[]) {
    tableCols[0].hidden = this.enableMultiSelect === false;
    this._tablesCols = tableCols;
  }

  get tableCols() {
    return this._tablesCols;
  }

  @Input() set onlyPublished(only: boolean) {
    const readyCol = this.tableCols.find(col => col.id === MODELS_TABLE_COL_FIELDS.READY);
    readyCol.hidden = only;
  }

  @Input() set enableMultiSelect(enable: boolean) {
    this._enableMultiSelect = enable;
    if (this.tableCols) {
      this.tableCols[0].hidden = enable === false;
    }
  }

  get enableMultiSelect() {
    return this._enableMultiSelect;
  }

  @Input() set selectedModels(selection) {
    this._selectedModels = selection;
    this.updateSelectionState();
  }

  get selectedModels() {
    return this._selectedModels;
  }

  @Input() set colRatio(ratio: number) {
    if (ratio) {
      this.tableCols.forEach(col => {
        if (col.headerType != ColHeaderTypeEnum.checkBox && col.style?.width?.endsWith('px')) {
          const width = parseInt(col.style.width, 10);
          col.style.width = ratio * width + 'px';
        }
      });
    }
  }

  private _selectedModel;
  @Input() set selectedModel(model) {
    if(model !== this._selectedModel) {
      window.setTimeout(() => this.table.focusSelected());
    }
    this._selectedModel = model;
  }

  get selectedModel() {
    return this._selectedModel;
  }

  @Input() set tableFilters(filters: { [s: string]: FilterMetadata }) {
    this.frameworkFiltersValue = get([MODELS_TABLE_COL_FIELDS.FRAMEWORK, 'value'], filters) || [];
    this.readyFiltersValue = get([MODELS_TABLE_COL_FIELDS.READY, 'value'], filters) || [];
    this.userFiltersValue = get([MODELS_TABLE_COL_FIELDS.USER, 'value'], filters) || [];
    this.tagsFiltersValue = get([MODELS_TABLE_COL_FIELDS.TAGS, 'value'], filters) || [];
    this.systemTagsFiltersValue = get(['system_tags', 'value'], filters) || [];
    this.allFiltersValue = {framework: this.frameworkFiltersValue, ready: this.readyFiltersValue, users: this.userFiltersValue, tags: this.tagsFiltersValue};
  }

  @Input() set users(users: User[]) {
    this.MODELS_ALL_FILTER_OPTIONS.users = users.map(user => ({label: user.name ? user.name : 'Unknown User', value: user.id}));
    this.sortOptionalUsersList();
  }

  @Input() set frameworks(frameworks: string[]) {
    const frameworksAndActiveFilter = Array.from(new Set(frameworks.concat(this.frameworkFiltersValue)));
    this.MODELS_ALL_FILTER_OPTIONS.framework = frameworksAndActiveFilter.map(framework => ({
      label: framework ? framework :
        (framework === null ? '(No framework)' : 'Unknown'), value: framework
    }));
    this.sortOptionalFrameworksList();
  }

  @Input() set tags(tags) {
    const tagsAndActiveFilter = Array.from(new Set(tags.concat(this.tagsFiltersValue)));
    this.MODELS_ALL_FILTER_OPTIONS.tags = tagsAndActiveFilter.map(tag => ({label: tag===null? 'No tag':tag , value: tag}));
    this.sortOptionalTagsList();
  }

  @Input() systemTags = [] as string[];
  get validSystemTags() {
    return this.systemTags.filter(tag => tag !== 'archived');
  }

  @Input() set split(size: number) {
    this.table?.resize();
  }

  @Output() modelsSelectionChanged = new EventEmitter<Array<ITableModel>>();
  @Output() modelSelectionChanged = new EventEmitter<ITableModel>();
  @Output() loadMoreModels = new EventEmitter();
  @Output() tagsMenuOpened = new EventEmitter();
  @Output() sortedChanged = new EventEmitter<{ sortOrder: TableSortOrderEnum; colId: ISmCol['id'] }>();
  @Output() filterChanged = new EventEmitter() as EventEmitter<{ col: ISmCol; value: any }>;
  @ViewChild('table', {static: true}) table: TableComponent;
  @ViewChild('contextMenu') contextMenu: ModelMenuComponent;
  SYSTEM_TAGS_OPTIONS = [{label: 'DEV', value: 'development'}];
  TIME_FORMAT_STRING = TIME_FORMAT_STRING;
  public readonly initialColumns = MODELS_TABLE_COLS;

  @HostListener('document:click', ['$event'])
  clickHandler(event) {
    if (event.button != 2) { // Bug in firefox: right click triggers `click` event
      this.menuOpen = false;
    }
  }

  constructor(private changeDetector: ChangeDetectorRef, private store: Store<any>) {
    super();
    this.tags$ = this.store.select(selectProjectTags);
    this.entitiesKey = 'models';
    this.selectedEntitiesKey = 'selectedModels';
  }

  afterTableInit() {
    if (this._selectedModel) {
      this.table.scrollToElement(this._selectedModel);
    }
  }

  sortOptionalUsersList() {
    this.MODELS_ALL_FILTER_OPTIONS.users.sort((a, b) => sortByArr(a.value, b.value, this.userFiltersValue));
  }

  sortOptionalTagsList() {
    this.MODELS_ALL_FILTER_OPTIONS.tags.sort((a, b) => sortByArr(a.value, b.value, this.tagsFiltersValue));
  }

  sortOptionalFrameworksList() {
    this.MODELS_ALL_FILTER_OPTIONS.framework.sort((a, b) => sortByArr(a.value, b.value, [null].concat(this.frameworkFiltersValue)));
  }

  onRowSelectionChanged(event) {
    this.modelSelectionChanged.emit(event.data);
  }

  scrollTableToTop() {
    this.table.table.scrollTo({top: 0});
  }

  tableFilterChanged(col: ISmCol, event) {
    if (event.col === 'users') {
      event.col = 'user.name';
    }
    this.filterChanged.emit({col, value: event.value});
    this.scrollTableToTop();
  }

  tableAllFiltersChanged(event) {
    this.filterChanged.emit({col: {id: event.col}, value: event.value});
    this.scrollTableToTop();
  }

  onLoadMoreClicked() {
    this.loadMoreModels.emit();
  }

  onSortChanged(sortOrder, colId: ISmCol['id']) {
    this.sortedChanged.emit({sortOrder, colId});
    this.scrollTableToTop();
  }

  get sortableCols() {
    return this.tableCols.filter(col => col.sortable);
  }

  getColName(colId: ISmCol['id']) {
    return this.tableCols.find(col => colId === col.id)?.header;
  }

  rowSelectedChanged(checked, model) {
    if (checked.value) {
      this.modelsSelectionChanged.emit([...this.selectedModels, model]);
    } else {
      this.modelsSelectionChanged.emit(this.selectedModels.filter((selectedModel) => selectedModel.id !== model.id));
    }
  }

  selectAll(checked) {
    const notAllAreSelected = this.models.length !== this.selectedModels.length && this.selectedModels.length > 1;
    if (!checked.value || notAllAreSelected) {
      this.modelsSelectionChanged.emit([]);
    } else {
      this.modelsSelectionChanged.emit(this.models);
    }
  }

  emitSelection(selection: any[]) {
    this.modelsSelectionChanged.emit(selection);
  }

  userSearchValueChanged(searchTerm) {
    this.userSearchValue = searchTerm;
  }

  tagSearchValueChanged(searchTerm) {
    this.tagSearchValue = searchTerm;
  }


  searchValueChanged($event: any) {
    if ($event.key === 'users') {
      this.userSearchValueChanged($event.value);
    }
    if ($event.key === 'tags') {
      this.tagSearchValueChanged($event.value);
    }
  }

  addTag(tag: string) {
    this.store.dispatch(addTag({
      tag,
      models: this.selectedModels.length > 1 ? this.selectedModels : [this.contextModel]
    }));
  }

  openContextMenu(data) {
    this.contextModel = this.models.find(model => model.id === data.rowData.id);
    if (!this.selectedModels.map(model => model.id).includes(this.contextModel.id)) {
      this.emitSelection([this.contextModel]);
    }
    const event = data.e as MouseEvent;
    event.preventDefault();
    this.contextMenu?.openMenu({x: event.clientX, y: event.clientY});
  }
}
