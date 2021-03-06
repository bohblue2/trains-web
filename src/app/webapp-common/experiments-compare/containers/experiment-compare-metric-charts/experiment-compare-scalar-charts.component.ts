import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {ExperimentGraph} from '../../../tasks/tasks.model';
import {select, Store} from '@ngrx/store';
import {IExperimentInfoState} from '../../../../features/experiments/reducers/experiment-info.reducer';
import {distinctUntilChanged, filter, map, tap} from 'rxjs/operators';
import {selectRouterParams} from '../../../core/reducers/router-reducer';
import {isEqual} from 'lodash/fp';
import {mergeMultiMetrics} from '../../../tasks/tasks.utils';
import {scrollToElement} from '../../../shared/utils/shared-utils';
import {GetMultiScalarCharts, ResetExperimentMetrics, SetExperimentMetricsSearchTerm, SetExperimentSettings, SetSelectedExperiments} from '../../actions/experiments-compare-charts.actions';
import {selectCompareSelectedSettingsSmoothWeight, selectCompareSelectedSettingsxAxisType, selectCompareTasksScalarCharts, selectExperimentMetricsSearchTerm, selectRefreshing, selectSelectedExperimentSettings, selectSelectedSettingsHiddenScalar, selectShowScalarsOptions} from '../../reducers';
import {ScalarKeyEnum} from '../../../../business-logic/model/events/scalarKeyEnum';
import {toggleShowScalarOptions} from '../../actions/compare-header.actions';


@Component({
  selector   : 'sm-experiment-compare-scalar-charts',
  templateUrl: './experiment-compare-scalar-charts.component.html',
  styleUrls  : ['./experiment-compare-scalar-charts.component.scss']
})
export class ExperimentCompareScalarChartsComponent implements OnInit, OnDestroy {

  public smoothWeight$: Observable<number>;
  public xAxisType$: Observable<string>;
  public showSettingsBar$: Observable<boolean>;
  private selectRefreshing$: Observable<{ refreshing: boolean, autoRefresh: boolean }>;
  private routerParams$: Observable<any>;
  public metrics$: Observable<any>;
  public experimentSettings$: Observable<any>;
  public searchTerm$: Observable<string>;
  public listOfHidden: Observable<Array<any>>;

  private metricsSubscription: Subscription;
  private settingsSubscription: Subscription;
  private routerParamsSubscription: Subscription;
  private refreshingSubscription: Subscription;
  private xAxisSub: Subscription;

  public graphList: any = {};
  public selectedGraph: string = null;
  private taskIds: Array<string>;
  public graphs: { [key: string]: ExperimentGraph };
  public refreshDisabled = false;
  public showSettingsBar: boolean = false;

  constructor(private store: Store<IExperimentInfoState>, private changeDetection: ChangeDetectorRef) {
    this.listOfHidden = this.store.pipe(select(selectSelectedSettingsHiddenScalar));
    this.searchTerm$ = this.store.pipe(select(selectExperimentMetricsSearchTerm));
    this.showSettingsBar$ = this.store.pipe(select(selectShowScalarsOptions));
    this.smoothWeight$ = this.store.select(selectCompareSelectedSettingsSmoothWeight);
    this.xAxisType$ = this.store.select(selectCompareSelectedSettingsxAxisType);
    this.selectRefreshing$ = this.store.select(selectRefreshing);
    this.metrics$ = this.store.pipe(
      select(selectCompareTasksScalarCharts),
      filter(metrics => !!metrics),
      distinctUntilChanged()
    );
    this.experimentSettings$ = this.store.pipe(
      select(selectSelectedExperimentSettings),
      filter(settings => !!settings),
      map(settings => settings ? settings.selectedScalar : null),
      distinctUntilChanged()
    );

    this.routerParams$ = this.store.pipe(
      select(selectRouterParams),
      filter(params => !!params.ids),
      distinctUntilChanged(),
      tap(() => this.refreshDisabled = true)
    );
    this.xAxisSub = this.xAxisType$
      .pipe(filter((axis) => !!axis))
      .subscribe((axis) => this.store.dispatch(new GetMultiScalarCharts({taskIds: this.taskIds, cached: true})));
  }

  ngOnInit() {
    this.metricsSubscription = this.metrics$
      .subscribe((metricsWrapped) => {
        this.refreshDisabled = false;
        const metrics = metricsWrapped.metrics || {};
        this.graphList = metrics;
        const merged = mergeMultiMetrics(metrics);
        if (!this.graphs || !isEqual(merged, this.graphs)) {
          this.graphs = merged;
        }
        this.changeDetection.detectChanges();
      });

    this.settingsSubscription = this.experimentSettings$
      .subscribe((selectedMetric) => {
        this.selectedGraph = selectedMetric;
        scrollToElement(this.selectedGraph);
      });

    this.routerParamsSubscription = this.routerParams$
      .subscribe(params => {
        if (!this.taskIds || this.taskIds.join(',') !== params.ids) {
          this.taskIds = params.ids.split(',');
          this.store.dispatch(new SetSelectedExperiments({selectedExperiments: this.taskIds}));
          this.store.dispatch(new GetMultiScalarCharts({taskIds: this.taskIds}));
        }
      });

    this.refreshingSubscription = this.selectRefreshing$.pipe(filter(({refreshing}) => refreshing))
      .subscribe(({autoRefresh}) => this.store.dispatch(new GetMultiScalarCharts({taskIds: this.taskIds, autoRefresh})));
  }

  ngOnDestroy() {
    this.metricsSubscription.unsubscribe();
    this.settingsSubscription.unsubscribe();
    this.routerParamsSubscription.unsubscribe();
    this.xAxisSub.unsubscribe();
    this.refreshingSubscription.unsubscribe();
    this.resetMetrics();
  }

  metricSelected(id) {
    this.store.dispatch(new SetExperimentSettings({id: this.taskIds, changes: {selectedScalar: id}}));
  }

  hiddenListChanged(hiddenList) {
    this.store.dispatch(new SetExperimentSettings({id: this.taskIds, changes: {hiddenMetricsScalar: hiddenList}}));
  }

  searchTermChanged(searchTerm: string) {
    this.store.dispatch(new SetExperimentMetricsSearchTerm({searchTerm: searchTerm}));
  }

  resetMetrics() {
    this.store.dispatch(new ResetExperimentMetrics());
  }

  changeSmoothness($event: any) {
    this.store.dispatch(new SetExperimentSettings({id: this.taskIds, changes: {smoothWeight: $event}}));
  }

  changeXAxisType($event: ScalarKeyEnum) {
    this.store.dispatch(new SetExperimentSettings({id: this.taskIds, changes: {xAxisType: $event}}));
  }

  toggleSettingsBar() {
    this.store.dispatch(toggleShowScalarOptions());
  }
}
