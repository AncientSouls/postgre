drop table firstPart;
drop table secondPart;
drop table someShitDocumets;
drop table ancientGraphs;
drop view graph1;
drop table ancientGraphParts;
drop table ancientGraphTables;

create table ancientGraphs (
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
    sourceFieldTable text,
    targetField text,
    targetFieldTable text
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

CREATE OR REPLACE FUNCTION ancientViewConstrucor(gId integer) RETURNS setof record as $$
	DECLARE
    	oneTable record;
        onePath record;
        gStructure record;
    BEGIN
    
    	create TEMP table ancientPaths ("source" text, "target" text, "table" text);
    
        for oneTable in 
        	select * from ancientGraphParts as gParts, ancientGraphTables as gTable where 
				gParts.graph = gId and
        		gTable.id = gParts.graphTable
        LOOP
        	execute(E'
                    insert into AncientPaths 
                    	select cast ("'||oneTable.sourceField||'" as text), cast ("'
                    	||oneTable.targetField||E'" as text), cast (\''
                    	||oneTable.tableName||E'\' as text) as "table" from '||oneTable.tableName
            		);
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

CREATE OR REPLACE FUNCTION createGraphView() RETURNS TRIGGER AS $$
    BEGIN
        CREATE or REPLACE VIEW graph1 AS 
        	SELECT * FROM ancientViewConstrucor (1) as 
            	f("source" text, "target" text, "table" text);
		RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER graph_audit
AFTER INSERT ON ancientGraphs
    FOR EACH ROW EXECUTE PROCEDURE createGraphView();


insert into ancientGraphs (id) values (1);

insert into someShitDocumets (id) values (1),(2),(3);

insert into firstPart ("from", "to") values ('someShitDocumets/1',3);
insert into secondPart ("source", "target") values ('someShitDocumets/2','someShitDocumets/3');
insert into secondPart ("source", "target") values ('someShitDocumets/2','someShitDocumets/1');
insert into secondPart ("source", "target") values ('someShitDocumets/3','someShitDocumets/3');

insert into ancientGraphTables (tableName, idField, sourceField, targetField, targetFieldTable) values 
('firstPart', 'number', 'from', 'to', 'someShitDocumets'),
('secondPart', 'id', 'source', 'target', '');

insert into ancientGraphParts (graph, graphTable) values 
(1,1), (1,2);


insert into firstPart ("from", "to") values ('someShitDocumets/1',1);

select * from graph1;
