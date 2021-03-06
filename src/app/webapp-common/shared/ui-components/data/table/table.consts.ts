export enum ColHeaderTypeEnum {
  sort       = 'sort',
  sortFilter = 'sort-filter',
  checkBox   = 'checkbox',
  title      = 'none'
}

export type TableSortOrderEnum = 1 | -1;
export const TABLE_SORT_ORDER = {
  ASC : 1 as TableSortOrderEnum,
  DESC: -1 as TableSortOrderEnum,
};

declare type FilterMatchModeEnum = 'startsWith' | 'contains' | 'endsWidth' | 'equals' | 'notEquals' | 'in';


export interface ISmCol {
  id: string; // unique id, by default, will be use as the table data param (e.g name and data[name]).
  getter?: string;
  header?: string; // the title header.
  label?: string; // Labels to show in cards mode..
  hidden?: boolean; // the column visibility.
  static?: boolean;
  headerType?: ColHeaderTypeEnum;
  sortable?: boolean; // determine if the column shell be sortable
  searchableFilter?: boolean;
  filterable?: boolean; // determine if the column shell be filterable
  isFiltered?: boolean; // deprecated.
  isSorted?: boolean; // deprecated.
  filterMatchMode?: FilterMatchModeEnum; // the filter method.
  style?: {width?: string, minWidth?: string}; // the column style.
  headerStyleClass?: string; // the header css class name.
  bodyTemplateRef?: string; // redundant.
  bodyStyleClass?: string;
  disableDrag?: boolean; // Disable drag on this col
  metric_hash?: string;
  variant_hash?: string;
  valueType?: string;
  projectId?: string;

}
