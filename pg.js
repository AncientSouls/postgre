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
  insert_new_graph,
  create_view_construcor,
  create_graphtables_triger,
  create_graph_triger,
  drop_all
;

create_tables = `
  create table ancientGraphs (
    id serial,
    defaultGraphTable text
  );
  create table ancientLinksId (
    id serial,
    graphTableId integer,
    realId integer
  );
  create table ancientGraphParts (
    id serial,
    graphTable integer,
    localId integer,
    graph integer
  );
  create table ancientGraphTables (
    id serial,
    tableName text,
    idField text,
    sourceField text, 
    sourceFieldTable text DEFAULT '',
    targetField text,
    targetFieldTable text DEFAULT ''
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
`;

insert_data = `
  insert into someShitDocumets (id) values (1),(2),(3);
  insert into firstPart ("from", "to") values ('someShitDocumets/1',3);
  insert into secondPart ("source", "target") values ('someShitDocumets/2','someShitDocumets/3');
  insert into secondPart ("source", "target") values ('someShitDocumets/3','someShitDocumets/3');
  insert into ancientGraphTables (tableName, idField, sourceField, targetField, targetFieldTable) values 
    ('firstPart', 'number', 'from', 'to', 'someShitDocumets/'),
    ('secondPart', 'id', 'source', 'target', '');
  insert into ancientGraphParts (graph, graphTable) values (1,1), (1,2);
`;

insert_new_graph = `
  insert into ancientGraphs (id, defaultGraphTable) values (1,1);
`;

create_view_construcor = `
  CREATE OR REPLACE FUNCTION ancientViewConstrucor(gId integer) RETURNS setof record as $$
  	DECLARE
    	oneTable record;
      onePath record;
      gStructure record;
    BEGIN
    	create TEMP table ancientPaths ("id" text, "graphPartTableId" text, "source" text, "target" text, "graphPartTableName" text);
      for oneTable in 
      	select * from ancientGraphParts as gParts, ancientGraphTables as gTable where 
    			gParts.graph = gId and
      		gTable.id = gParts.graphTable
      LOOP
      	execute('insert into ancientPaths select lId.id as "id", currentTable.'
      	||oneTable.idField||' as "graphPartTableId", '''
      	||oneTable.sourceFieldTable||'''||cast (currentTable."'||oneTable.sourceField||'" as text), '''
      	||oneTable.targetFieldTable||'''||cast (currentTable."'||oneTable.targetField||E'" as text), '''
      	||oneTable.tableName||''' as "graphPartTableName" from '||oneTable.tableName||' as currentTable, ancientLinksId as lId
      	where currentTable.'||oneTable.idField||' = lId.realId
      	and lId.graphTableId = '||oneTable.graphTable);
      end loop;
      for onePath in 
    		select * from ancientPaths
          LOOP 
          	return next onePath;
          end loop;
      drop table ancientPaths;
      return;
    END;
  $$ LANGUAGE plpgsql;
`;


create_graphtables_trigers = `
  CREATE OR REPLACE FUNCTION ancientGraphTablesInsering() RETURNS TRIGGER AS $$
    BEGIN
      EXECUTE (' 
        insert into ancientLinksId(realId, graphTableId) 
          select "'||cast(NEW.idField as text)||'" as realId, '||cast(NEW.id as text)||' as graphTableId from '||cast(NEW.tableName as text)||';
      ');
      return NEW;
    END;
  $$ LANGUAGE plpgsql;
  
  CREATE TRIGGER graphtables_inputaudit
  AFTER INSERT ON ancientGraphTables
    FOR EACH ROW EXECUTE PROCEDURE ancientGraphTablesInsering(); 
  
  CREATE OR REPLACE FUNCTION ancientGraphTablesDeleting() RETURNS TRIGGER AS $$
    BEGIN
        DELETE from ancientLinksId where graphTableId = old.id;
        RETURN old;
    END;
  $$ LANGUAGE plpgsql;
      
  CREATE TRIGGER graphtables_deleteaudit
  AFTER delete ON ancientGraphTables
    FOR EACH ROW EXECUTE PROCEDURE ancientGraphTablesDeleting(); 
`;

create_graph_triger = `
  CREATE OR REPLACE FUNCTION createGraphView() RETURNS TRIGGER AS $$
    BEGIN
      EXECUTE (E'
        CREATE or REPLACE VIEW ancientViewGraph'||cast(NEW.id as text)||' AS 
        	SELECT * FROM ancientViewConstrucor ('||cast(NEW.id as text)||') as 
          	f("id" text, "graphPartTableId" text, "source" text, "target" text, "graphPartTableName" text);
        CREATE TRIGGER graph_audit
        INSTEAD OF INSERT ON ancientViewGraph'||cast(NEW.id as text)||'
          FOR EACH ROW EXECUTE PROCEDURE ancientGraphInsering();
      ');
		RETURN NEW;
    END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER graph_audit
  AFTER INSERT ON ancientGraphs
    FOR EACH ROW EXECUTE PROCEDURE createGraphView();
`;

drop_all = `
  drop table IF EXISTS firstPart;
  drop table IF EXISTS secondPart;
  drop table IF EXISTS someShitDocumets;
  drop table IF EXISTS ancientGraphs;
  drop table IF EXISTS ancientGraphParts;
  drop table IF EXISTS ancientGraphTables;
  drop table IF EXISTS ancientLinksId;
  drop view IF EXISTS ancientViewGraph1;
`;
check = `
select * from ancientViewGraph1;
`;

client.connect()

async.series([
  (next) => client.query(drop_all, next),
  (next) => client.query(create_tables, next),
  (next) => client.query(create_view_construcor, next),
  (next) => client.query(create_graphtables_trigers, next),
  (next) => client.query(create_graph_triger, next),
  (next) => client.query(insert_data, next),
  (next) => client.query(insert_new_graph, next),
  (next) => client.query(check, next),
  (next) => client.query(drop_all, next),
], (error, results) => {
    console.error(error);
    console.log(results[7]);
});