var async = require('async');
var { Client } = require('pg');

var client = new Client({
  user: 'ubuntu',
  host: 'localhost',
  database: 'test',
  password: 'cloud9isawesome',
  port: 5432,
})

var 
  create_tables, 
  insert_data,
  create_view_construcor,
  create_graphtables_triger,
  create_graph_triger,
  create_graphpart_triger,
  drop_all
;

create_tables = `
  create table _ancientGraphTables (
    id serial UNIQUE,
    tableName text,
    idField text,
    sourceField text, 
    sourceFieldTable text DEFAULT '',
    targetField text,
    targetFieldTable text DEFAULT '',
    primary key (idField, sourceField, targetField, tableName)
  );
  create table _ancientGraphs (
    id serial UNIQUE,
    defaultGraphTable integer references _ancientGraphTables(id) ON DELETE SET NULL
  );
  create table _ancientGraphParts (
    id serial UNIQUE,
    graphTableId integer references _ancientGraphTables(id) ON DELETE CASCADE,
    graphId integer references _ancientGraphs(id) ON DELETE CASCADE,
    primary key (graphId, graphTableId)
  );
  create table _ancientLinksId (
    id serial UNIQUE,
    graphTableId integer references _ancientGraphTables(id) ON DELETE CASCADE,
    realId integer, 
    primary key (graphTableId, realId)
  );

  create table firstPart (
    "number" serial,
  	"from" text,
    "to" integer
  );
  create table secondPart (
    id serial,
  	"source" text,
    "target" text
  );
  create table someShitDocumets (
    id serial
  );
  create table someShitRights (
    username text,
    linkId integer
  );
`;

insert_data = `
  insert into someShitDocumets (id) values (1),(2),(3);
  insert into someShitRights (username,linkId) values ('ubuntu', 2);
  insert into firstPart ("from", "to") values ('someShitDocumets/1',3);
  insert into secondPart ("source", "target") values ('someShitDocumets/2','someShitDocumets/3');
  insert into secondPart ("source", "target") values ('someShitDocumets/3','someShitDocumets/3');
  insert into _ancientGraphTables (tableName, idField, sourceField, targetField, targetFieldTable) values 
    ('firstPart', 'number', 'from', 'to', 'someShitDocumets/'),
    ('secondPart', 'id', 'source', 'target', '');
  insert into _ancientGraphs (id, defaultGraphTable) values (1,1);
  insert into _ancientGraphParts (graphId, graphTableId) values (1,1), (1,2);
`;


create_graphtables_trigers = `
  CREATE OR REPLACE FUNCTION _ancientGraphTablesInsering() RETURNS TRIGGER AS $$
    BEGIN
      EXECUTE (' 
        insert into _ancientLinksId(realId, graphTableId) 
          select "'||NEW.idField||'" as realId, '||NEW.id::text||' as graphTableId from '||NEW.tableName||';
      ');
      return NEW;
    END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER graphtables_inputaudit
  AFTER INSERT ON _ancientGraphTables
    FOR EACH ROW EXECUTE PROCEDURE _ancientGraphTablesInsering(); 
    
  CREATE OR REPLACE FUNCTION _ancientGraphTablesUpdating() RETURNS TRIGGER AS $$
   DECLARE
      onePart record;
    BEGIN
      for onePart in 
        select graphId from _ancientGraphParts where graphTableId = OLD.id
      LOOP
        PERFORM _ancient_create_view(onePart.graphId);
      END LOOP;
      RETURN old;
    END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER graphtables_updateaudit
  AFTER delete ON _ancientGraphTables
    FOR EACH ROW EXECUTE PROCEDURE _ancientGraphTablesUpdating(); 
`;

create_graphpart_triger = `
  CREATE OR REPLACE FUNCTION createGraphView() RETURNS TRIGGER AS $$
    DECLARE
      graphId integer;
    BEGIN
      IF (TG_OP = 'DELETE') THEN
        graphId := OLD.graphId;
      ELSE
        graphId := NEW.graphId;
      END IF;
      PERFORM _ancient_create_view(graphId);
  		RETURN NEW;
    END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER graph_audit
  AFTER INSERT OR DELETE ON _ancientGraphParts
    FOR EACH ROW EXECUTE PROCEDURE createGraphView();
`;

create_graph_triger = `
  CREATE OR REPLACE FUNCTION _ancientGraphDeleting() RETURNS TRIGGER AS $$
    BEGIN
      EXECUTE ('DROP VIEW _ancientViewGraph'||cast(old.id as text)||';');
        RETURN old;
    END;
  $$ LANGUAGE plpgsql;
      
  CREATE TRIGGER graph_deleting_audit
  AFTER delete ON _ancientGraphs
    FOR EACH ROW EXECUTE PROCEDURE _ancientGraphDeleting();
`;

create_view_construcor = `
  CREATE OR REPLACE FUNCTION _ancientGraphViewInserting() RETURNS TRIGGER AS $$
    BEGIN
    
    END;
  $$ LANGUAGE plpgsql;
  CREATE OR REPLACE FUNCTION _ancient_create_view(graph integer) RETURNS void AS $$
    DECLARE
      oneTable record;
      viewString text := '';
      FirstTime boolean := true;
    BEGIN
      for oneTable in 
        select gTable.*,gParts.graphTableId from _ancientGraphParts as gParts, _ancientGraphTables as gTable where 
      		gParts.graphId = graph and
        	gTable.id = gParts.graphTableId
      LOOP
        viewString := viewString||' union all ';
        if FirstTime THEN
          viewString := '';
          FirstTime := false;
        END IF; 
        viewString := viewString||'select lId.id as "id", currentTable.'
        	||oneTable.idField||' as "graphPartTableIdField", '''
        	||oneTable.sourceFieldTable||'''|| currentTable."'||oneTable.sourceField||'" as "source", '''
        	||oneTable.targetFieldTable||'''|| currentTable."'||oneTable.targetField||'" as "target", text '''
        	||oneTable.id||''' as "graphTableId" from '||oneTable.tableName||' as currentTable, _ancientLinksId as lId, someShitRights as rights
        	where currentTable.'||oneTable.idField||' = lId.realId
        	and lId.graphTableId = '||oneTable.graphTableId||'
        	and rights.username = current_user
        	and lId.id = rights.linkId
        	';
      END LOOP;
      EXECUTE ('
        CREATE OR REPLACE VIEW _ancientViewGraph'||graph||' as '|| viewString ||';
        
        DROP TRIGGER IF EXISTS graphview_insertaudit ON _ancientviewgraph'||graph||';
        CREATE TRIGGER graphview_insertaudit
        instead of insert ON _ancientViewGraph'||graph||'
          FOR EACH ROW EXECUTE PROCEDURE _ancientGraphViewInserting(); 
      ');
    END;
$$ LANGUAGE plpgsql;
`;

drop_all = `

  drop view IF EXISTS _ancientViewGraph1;
  drop view IF EXISTS _ancientViewGraph2;
  drop table IF EXISTS firstPart;
  drop table IF EXISTS secondPart;
  drop table IF EXISTS someShitDocumets;
  drop table IF EXISTS someShitRights;
  drop table IF EXISTS _ancientGraphParts;
  drop table IF EXISTS _ancientGraphs;
  drop table IF EXISTS _ancientLinksId;
  drop table IF EXISTS _ancientGraphTables;
`;
check = `
 select * from _ancientViewGraph1;
`;

client.connect()

async.series([
  (next) => client.query(drop_all, next),
  (next) => client.query(create_tables, next),
  (next) => client.query(create_view_construcor, next),
  (next) => client.query(create_graphtables_trigers, next),
  (next) => client.query(create_graphpart_triger, next),
  (next) => client.query(insert_data, next),
  (next) => client.query(check, next),
  (next) => client.query(drop_all, next),
], (error, results) => {
    console.error(error);
    console.log(results[6]);
});