import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {ActionReducer, StoreModule, USER_PROVIDED_META_REDUCERS} from '@ngrx/store';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {environment} from '../../environments/environment';
import {messagesReducer} from '../webapp-common/core/reducers/messages-reducer';
import {recentTasksReducer} from './reducers/recent-tasks-reducer';
import {sourcesReducer} from './reducers/sources-reducer';
import {viewReducer} from './reducers/view-reducer';
import {AUTH_PREFIX, USERS_PREFIX, VIEW_PREFIX} from '../app.constants';
import {merge, pick} from 'lodash/fp';
import {usersReducer} from '../webapp-common/core/reducers/users-reducer';
import {projectsReducer} from '../webapp-common/core/reducers/projects.reducer';
import {EffectsModule} from '@ngrx/effects';
import {SmSyncStateSelectorService} from '../webapp-common/core/services/sync-state-selector.service';
import {routerReducer} from '../webapp-common/core/reducers/router-reducer';
import {LayoutEffects} from '../webapp-common/core/effects/layout.effects';
import {ProjectsEffects} from '../webapp-common/core/effects/projects.effects';
import {RouterEffects} from '../webapp-common/core/effects/router.effects';
import {CommonUserEffects} from '../webapp-common/core/effects/users.effects';
import {UserEffects} from './effects/users.effects';
import {CommonAuthEffectsService} from '../webapp-common/core/effects/common-auth-effects.service';
import {createLocalStorageReducer} from '../webapp-common/core/meta-reducers/local-storage-reducer';
import {UsageStatsService} from './Services/usage-stats.service';
import {usageStatsReducer} from './reducers/usage-stats.reducer';
import {commonAuthReducer} from '../webapp-common/core/reducers/common-auth-reducer';
import {PROJECTS_PREFIX} from '../webapp-common/core/actions/projects.actions';


export const reducers = {
  auth: commonAuthReducer,
  router: routerReducer,
  messages: messagesReducer,
  recentTasks: recentTasksReducer,
  views: viewReducer,
  sources: sourcesReducer,
  users: usersReducer,
  rootProjects: projectsReducer,
  userStats: usageStatsReducer
};

const syncedKeys = [
  'auth.S3BucketCredentials',
  'datasets.selectedVersion',
  'datasets.selected',
  'projects.selectedProjectId',
  'projects.selectedProject',
  'views.availableUpdates',
  'views.showSurvey'
];
const key = '_saved_state_';

const actionsPrefix = [AUTH_PREFIX, USERS_PREFIX, VIEW_PREFIX, PROJECTS_PREFIX];

if (!localStorage.getItem(key)) {
  localStorage.setItem(key, '{}');
}

export function localStorageReducer(reducer: ActionReducer<any>): ActionReducer<any> {
  return function (state, action) {

    let nextState = reducer(state, action);

    // TODO: lil hack to fix ngrx bug in preload strategy that dispatch store/init multiple times.
    if (action.type === '@ngrx/store/init') {
      const savedState = JSON.parse(localStorage.getItem(key));
      nextState = merge(nextState, savedState);
    }

    if (state === nextState) {
      return nextState;
    }

    if (actionsPrefix && !actionsPrefix.some(ap => action.type.startsWith(ap))) {
      return nextState;
    }

    localStorage.setItem(key, JSON.stringify(pick(syncedKeys, nextState)));

    return nextState;
  };
}

export function setViewPreferencesReducer(reducer: ActionReducer<any>): ActionReducer<any> {
  return createLocalStorageReducer('view', ['views.autoRefresh'] , [VIEW_PREFIX])(reducer);
}

export function setRootProjectPreferencesReducer(reducer: ActionReducer<any>): ActionReducer<any> {
  return createLocalStorageReducer('rootProjects', ['rootProjects.tagsColors'] , [PROJECTS_PREFIX])(reducer);
}

export function getMetaReducers() {
  return [localStorageReducer, setRootProjectPreferencesReducer, setViewPreferencesReducer];
}

@NgModule({
  imports: [
    StoreModule.forRoot(reducers, {
      runtimeChecks: {
        strictStateImmutability: true,
        strictActionImmutability: true,
        strictStateSerializability: true,
        strictActionSerializability: true
      }
    }),
    EffectsModule.forRoot([LayoutEffects, CommonUserEffects, UserEffects,
      RouterEffects, ProjectsEffects, CommonAuthEffectsService]),
    !environment.production ? StoreDevtoolsModule.instrument({
      maxAge: 25 //  Retains last 25 states
    }) : [],
    HttpClientModule,
  ],
  providers: [
    SmSyncStateSelectorService,
    UsageStatsService,
    {
      provide: USER_PROVIDED_META_REDUCERS,
      useFactory: getMetaReducers,
    },
  ],
  declarations: [],
  exports: []
})
export class SMCoreModule {
}
