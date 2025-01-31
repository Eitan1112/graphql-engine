import { getQualifiedTable } from '../../Data/ManageTable/utils';
import { DriverInfo } from '../../DataSource';
import {
  InconsistentMetadata,
  InconsistentObject,
} from '../../hasura-metadata-api';
import {
  Metadata,
  MetadataFunction,
  MetadataTable,
  QualifiedFunction,
  Table,
} from '../../hasura-metadata-types';
import { DataSourceNode, DatabaseItemNode } from './types';

type InconsistentData = {
  inconsistentSources: InconsistentObject[];
  inconsistentTables: InconsistentObject[];
  inconsistentFunctions: InconsistentObject[];
};

export const adaptInconsistentObjects = (m: InconsistentMetadata) =>
  m.inconsistent_objects.reduce<InconsistentData>(
    (acc, entry) => {
      if (entry.type === 'source') acc.inconsistentSources.push(entry);

      if (entry.type === 'table') acc.inconsistentTables.push(entry);

      if (entry.type === 'function') acc.inconsistentFunctions.push(entry);

      return acc;
    },
    {
      inconsistentSources: [],
      inconsistentTables: [],
      inconsistentFunctions: [],
    }
  );

export const getSourceTreeId = (dataSourceName: string) =>
  JSON.stringify({ dataSourceName });

export const getTableTreeId = ({
  dataSourceName,
  table,
}: {
  dataSourceName: string;
  table: Table;
}) =>
  JSON.stringify({
    dataSourceName,
    table,
  });

export const getFunctionTreeId = ({
  dataSourceName,
  func,
}: {
  dataSourceName: string;
  func: QualifiedFunction;
}) =>
  JSON.stringify({
    dataSourceName,
    func,
  });

export type DatabaseItemParams = {
  dataSourceName: string;
  item: unknown;
  type: 'table' | 'function';
};
// generic wrapper that can handle func or tables for convenience
export const getDatabaseItemTreeId = ({
  dataSourceName,
  item,
  type,
}: DatabaseItemParams) =>
  type === 'function'
    ? getFunctionTreeId({ dataSourceName, func: item })
    : getTableTreeId({ dataSourceName, table: item });

const tableToNode = (
  t: MetadataTable,
  dataSourceName: string
): DatabaseItemNode => ({
  id: getTableTreeId({
    dataSourceName,
    table: t.table,
  }),
  type: 'table',
  table: t.table,
  dataSourceName,
  name: getQualifiedTable(t.table).join(' / '),
});

const functionToNode = (
  f: MetadataFunction,
  dataSourceName: string
): DatabaseItemNode => ({
  id: getFunctionTreeId({
    dataSourceName,
    func: f.function,
  }),
  type: 'function',
  dataSourceName,
  function: f.function,
  name: getQualifiedTable(f.function).join(' / '),
});

export const adaptSourcesIntoTreeData =
  (m: Metadata) =>
  (drivers: DriverInfo[], inconsistentData: InconsistentData) =>
    m.metadata.sources.map<DataSourceNode>(source => {
      return {
        id: getSourceTreeId(source.name),
        dataSourceName: source.name,
        name: source.name,
        driver: source.kind,
        releaseType: drivers?.find(driver => source.kind === driver.name)
          ?.release,
        inconsistentObject: inconsistentData.inconsistentSources.find(
          i => i.definition === source.name
        ),
        children: [
          ...source.tables.map(t => tableToNode(t, source.name)),
          ...(source.functions ?? []).map(f => functionToNode(f, source.name)),
        ],
      };
    });
