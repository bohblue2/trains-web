import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {castArray, cloneDeep} from 'lodash/fp';
import {catchError, flatMap, switchMap, withLatestFrom} from 'rxjs/operators';
import {MESSAGES_SEVERITY} from '../../../app.constants';
import {ApiWorkersService} from '../../../business-logic/api-services/workers.service';
import {Worker} from '../../../business-logic/model/workers/worker';
import {WORKER_STATS_PARAM_INFO} from '../workers-and-queues.consts';
import {WorkersGetActivityReportRequest} from '../../../business-logic/model/workers/workersGetActivityReportRequest';
import {WorkersGetActivityReportResponse} from '../../../business-logic/model/workers/workersGetActivityReportResponse';
import {WorkersGetStatsRequest} from '../../../business-logic/model/workers/workersGetStatsRequest';
import {RequestFailed} from '../../core/actions/http.actions';
import {AddMessage, DeactiveLoader} from '../../core/actions/layout.actions';
import * as workersActions from '../actions/workers.actions';
import {selectSelectedWorker, selectStats, selectStatsParams, selectStatsTimeFrame, selectWorkers, selectWorkersTableSortField, selectWorkersTableSortOrder} from '../reducers/index.reducer';
import {get} from 'lodash/fp';
import {addFullRangeMarkers, addStats, getLastTimestamp, Topic, removeFullRangeMarkers} from '../../shared/utils/statistics';
import {showStatsErrorNotice, hideNoStatsNotice} from '../actions/stats.actions';

function prepareStatsQuery(entitie: string, keys: { key: string }[], range: number, granularity: number): WorkersGetStatsRequest {
  const now = Math.floor((new Date).getTime() / 1000);
  return {
    from_date: now - range,
    to_date: now,
    worker_ids: entitie ? [entitie] : null,
    items: castArray(keys),
    interval: granularity
  };
}

@Injectable()
export class WorkersEffects {

  constructor(
    private actions: Actions,
    private workersApi: ApiWorkersService, private store: Store<any>) {
  }

  @Effect()
  getWorkers$ = this.actions.pipe(
    ofType(workersActions.GET_STATS_AND_WORKERS),
    withLatestFrom(
      this.store.select(selectSelectedWorker),
      this.store.select(selectWorkersTableSortOrder),
      this.store.select(selectWorkersTableSortField),
    ),
    switchMap(([action, selectedWorker, sortOrder, sortField]) => this.workersApi.workersGetAll({}).pipe(
      flatMap(res => {
        const actionsToFire = [
          new workersActions.SetWorkers(this.sortWorkers(sortOrder, sortField, res.workers)),
          new DeactiveLoader(action.type)];
        if (selectedWorker) {
          actionsToFire.push(
            new workersActions.SetSelectedWorkerFromServer(
              res.workers.find(
                worker => worker.id === selectedWorker.id)));
        }
        return actionsToFire;
      }),
      catchError(err => [new RequestFailed(err), new DeactiveLoader(action.type)])
      )
    )
  );

  @Effect()
  sortWorkers$ = this.actions.pipe(
    ofType(workersActions.WORKERS_TABLE_SORT_CHANGED),
    withLatestFrom(
      this.store.select(selectWorkersTableSortOrder),
      this.store.select(selectWorkersTableSortField),
      this.store.select(selectWorkers)
    ),
    flatMap(([action, sortOrder, sortField, workers]) => [new workersActions.SetWorkers(this.sortWorkers(sortOrder, sortField, workers))]),
  );

  @Effect()
  getStats$ = this.actions.pipe(
    ofType(workersActions.GET_STATS_AND_WORKERS),
    withLatestFrom(this.store.select(selectStats),
      this.store.select(selectStatsTimeFrame),
      this.store.select(selectStatsParams),
      this.store.select(selectSelectedWorker)
    ),
    switchMap(([action, currentStats, selectedRange, params, worker]: [workersActions.GetStatsAndWorkers, Topic[], string, string, Worker]) => {
      const payload = action.payload;
      const now = Math.floor((new Date()).getTime() / 1000);
      const keys = params.split(';').map(val => ({key: val}));
      const range = parseInt(selectedRange, 10);
      const granularity = Math.max(Math.floor(range / payload.maxPoints), worker ? 10 : 40);
      let timeFrame: number;

      currentStats = cloneDeep(currentStats);
      if (Array.isArray(currentStats) && currentStats.some(topic => topic.dates.length > 1)) {
        removeFullRangeMarkers(currentStats);
        timeFrame = now - getLastTimestamp(currentStats) + granularity;
      } else {
        timeFrame = range;
      }
      if (worker) {
        const req = prepareStatsQuery(worker.id, keys, timeFrame, granularity);
        return this.workersApi.workersGetStats(req).pipe(
          flatMap(res => {
            if (res) {
              res = addStats(currentStats, res.workers, payload.maxPoints, keys, 'worker', WORKER_STATS_PARAM_INFO);
              if (Array.isArray(res) && res.some(topic => topic.dates.length > 0)) {
                addFullRangeMarkers(res, now - range, now);
              }
            }
            return [new workersActions.SetStats({data: res})];
          }),
          catchError(err => [new RequestFailed(err),
            new workersActions.SetStats({data: []}),
            new AddMessage(MESSAGES_SEVERITY.WARN, 'Failed to fetching activity worker statistics')])
        );
      } else {
        const req: WorkersGetActivityReportRequest = {
          from_date: now - timeFrame,
          to_date: now,
          interval: granularity
        };

        return this.workersApi.workersGetActivityReport(req).pipe(
          flatMap((res: WorkersGetActivityReportResponse) => {
            let result = null;
            if (res) {
              const statsData = [{
                activity: '',
                metrics: [{
                  metric: 'total',
                  dates: res.total.dates,
                  stats: [{
                    aggregation: 'count',
                    values: res.total.counts
                  }]
                }, {
                  metric: 'active',
                  dates: res.active.dates,
                  stats: [{
                    aggregation: 'count',
                    values: res.active.counts
                  }]
                }]
              }];
              result = addStats(currentStats, statsData, payload.maxPoints,
                [{key: 'active'}, {key: 'total'}], 'activity',
                {
                  total: {title: 'Total Workers', multiply: 1},
                  active: {title: 'Active Workers', multiply: 1}
                });
            }
            if (Array.isArray(result) && result.some(topic => topic.dates.length > 0)) {
              addFullRangeMarkers(result, now - range, now);
            }
            return [new workersActions.SetStats({data: result}), hideNoStatsNotice()];
          }),
          catchError(err => [new RequestFailed(err),
            new workersActions.SetStats({data: []}),
            showStatsErrorNotice()])
        );
      }
    })
  );

  private sortWorkers(sortOrder, sortField, workers) {
    const sortedWorkers = [...workers];
    return sortedWorkers.sort((workerA, workerB) => {
      const fieldValA = get(sortField, workerA);
      const fieldValB = get(sortField, workerB);
      return sortOrder * ((!fieldValA || (fieldValA > fieldValB)) ? 1 : -1);
    });
  }
}
