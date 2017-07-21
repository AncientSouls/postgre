DROP table paths;
DROP function _spreadBySpread(text,text,text,text);
DROP table spreadable;
DROP table spreads;
DROP table graphs;
DROP table graphFields;

create table paths (
    id SERIAL,
    source text, /*db/table/id*/
    target text, /*db/table/id*/
    type text
);

create table spreads (
    id serial,
    target text, /*db/table/id*/
    prev text, /*ref*/
    path text, /*ref*/
    root integer, /*id*/
    "spreaded" boolean DEFAULT false
);

create table graphs (
    id serial
);

create table spreadable (
    id serial,
    pathsGraphRef text, /*spreads: db/table*/
    spreadsGraphRef text /*paths: db/table*/
);

create table graphFields (
    graphRef text,
    tableRef text,
    idField text,
    fromField text, /*ref|id*/
    toField text, /*ref|id*/
    fromTable text, /*db|db/table*/
    toTable text /*db|db/table*/
);

insert into paths (source, target) values ('menzorg/documents/4','menzorg/documents/3'), ('menzorg/documents/3', 'menzorg/documents/2');
insert into graphs (id) values (1), (2);
insert into spreadable (pathsGraphRef, spreadsGraphRef) values 
('menzorg/graphs/1', 'menzorg/graphs/2');
insert into graphFields (graphRef, tableRef, idField, fromField, toField) values 
('menzorg/graphs/1', 'menorg/paths', 'id', 'source', 'target'),
('menzorg/graphs/2', 'menorg/spreads', 'id', '', 'target');

/* Распределиться на один шаг от данного спреда, по всем возможным спредеблам
CREATE FUNCTION spreadBySpread(spreadRef text) RETURNS void */

/* Распределиться на один шаг от данного спреда, согласно указанному спредеблу */
CREATE FUNCTION _spreadBySpread(spreadRef text, spreadableRef text, pathsTableRef text, spreadsTableRef text) RETURNS void
    AS $$ 
    	DECLARE 
        	spread record;
            spreadable record;
    	BEGIN
        	WHILE true LOOP
            
                SELECT * into spread from spreads where 
                	spreaded is not true and (
                    id = cast (split_part(spreadRef,'/', 3) as integer)
                )  LIMIT 1;
                
                if spread is null then EXIT; end if; 

                select * from spreadable where id = split_part(spreadableRef,'/', 3);

                    EXECUTE E'
                        insert into spreads (target, root, path, prev)
                            select \''||spreadables.pathToPrefix||E'\'||cast('||spreadables.pathToKey||E' as text) as target,
                            '||cast(split_part(spreadRef, '/', 3) as integer)||E' as root, 
                            \''||spreadables.target||E'/\'||cast(id as text) as path,
                            \''||spreadables.source||'/'||spread.id||E'\' as prev
                            from '|| split_part(spreadables.target, '/', 2)||' 
                            where '||spreadables.pathFromKey||E' = \''||spread.target||E'\' 
                            and cast('||spreadables.pathToKey||' as text) not in (
                                select target from '|| split_part(spreadables.source, '/', 2)||'
                            );';
        		Update spreads SET spreaded = true WHERE id = spread.id;
    		END LOOP; 
    	end;
    $$ LANGUAGE plpgsql;

select * from spreads;
