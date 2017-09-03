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
create_graph_triger,
drop_all;


create_tables = `create table ancientGraphs (
    id serial,
    defaultGraphTable text
);

create table ancientGraphParts (
    id serial,
    graphTable integer,
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
);`

insert_data = `insert into someShitDocumets (id) values (1),(2),(3);

insert into firstPart ("from", "to") values ('someShitDocumets/1',3);
insert into secondPart ("source", "target") values ('someShitDocumets/2','someShitDocumets/3');
insert into secondPart ("source", "target") values ('someShitDocumets/2','someShitDocumets/1');
insert into secondPart ("source", "target") values ('someShitDocumets/3','someShitDocumets/3');

insert into ancientGraphTables (tableName, idField, sourceField, targetField, targetFieldTable) values 
('firstPart', 'number', 'from', 'to', 'someShitDocumets/'),
('secondPart', 'id', 'source', 'target', '');

insert into ancientGraphParts (graph, graphTable) values 
(1,1), (1,2);

insert into ancientGraphs (id) values (1);
`;

create_view_construcor = `CREATE OR REPLACE FUNCTION ancientViewConstrucor(gId integer) RETURNS setof record as $$
	DECLARE
    	oneTable record;
        onePath record;
        gStructure record;
    BEGIN
    
    	create TEMP table ancientPaths ("id" text, "source" text, "target" text, "graphPartTable" text);
        for oneTable in 
        	select * from ancientGraphParts as gParts, ancientGraphTables as gTable where 
				gParts.graph = gId and
        		gTable.id = gParts.graphTable
        LOOP
        	execute('insert into ancientPaths select '
        	||oneTable.idField||' as "id", '''
        	||oneTable.sourceFieldTable||'''||cast ("'||oneTable.sourceField||'" as text), '''
        	||oneTable.targetFieldTable||'''||cast ("'||oneTable.targetField||E'" as text), '''
        	||oneTable.tableName||''' as "graphPartTable" from '||oneTable.tableName);
        end loop;
        for onePath in 
        		select * from ancientPaths
            LOOP   
            	return next onePath;
            end loop;
        return;
    END;
$$ LANGUAGE plpgsql;`


create_graph_triger = `
    CREATE OR REPLACE FUNCTION createGraphView() RETURNS TRIGGER AS $$
        BEGIN
          EXECUTE (E'
            CREATE or REPLACE VIEW ancientViewGraph'||cast(NEW.id as text)||' AS 
            	SELECT * FROM ancientViewConstrucor ('||cast(NEW.id as text)||') as 
                	f("id" text, "source" text, "target" text, "table" text);
                     ');
    		RETURN NEW;
        END;
    $$ LANGUAGE plpgsql;
    
    CREATE TRIGGER graph_audit
    AFTER INSERT ON ancientGraphs
        FOR EACH ROW EXECUTE PROCEDURE createGraphView();
`;

drop_all = `
    drop table firstPart;
    drop table secondPart;
    drop table someShitDocumets;
    drop table ancientGraphs;
    drop table ancientGraphParts;
    drop table ancientGraphTables;
    drop table ancientPaths;
    drop view ancientViewGraph1;
`;
check = `
    SELECT * from ancientViewGraph1;
`;

client.connect()

async.series([
    (next) => client.query(create_tables, next),
    (next) => client.query(create_view_construcor, next),
    (next) => client.query(create_graph_triger, next),
    (next) => client.query(insert_data, next),
    (next) => client.query(check, next),
], (error, results) => {
        console.error(error);
        console.log(results[4]);
        client.query(drop_all);
});


