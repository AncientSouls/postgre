DROP table paths;
DROP table paths2;
DROP function spreadbyspread(text);
DROP table spreadable;
DROP table spreads;

create table paths (
    id SERIAL,
    source text, /*db/table/id*/
    target text, /*db/table/id*/
    type text
);

create table paths2 (
    id SERIAL,
    a integer, /*db/table/id*/
    b text, /*db/table/id*/
    type text
);
create table spreadable (
    source text, /*spreads: db/table*/
    target text, /*paths: db/table*/
    pathFromKey text, /*keyName*/
    pathFromPrefix text default '', /*db/table*/
    pathToKey text, /*keyName*/
    pathToPrefix text default '', /*db/table*/
    pathIdKey text /*keyName*/
);
create table spreads (
    id serial,
    target text, /*db/table/id*/
    prev text, /*ref*/
    path text, /*ref*/
    root integer, /*id*/
    "spreaded" boolean DEFAULT false
);

CREATE FUNCTION spreadBySpread(spreadRef text) RETURNS void
    AS $$ 
    	DECLARE 
        	spread record;
            spreadables record;
    	BEGIN
        	WHILE true LOOP
            
                SELECT * into spread from spreads where 
                	spreaded is not true and (
                    id = cast (split_part(spreadRef,'/', 3) as integer) or 
                    root = cast (split_part(spreadRef,'/', 3) as integer)
                )  LIMIT 1;
                
                if spread is null then EXIT; end if; 

                FOR spreadables in (select * from spreadable where source = split_part(spreadRef,'/', 1)||'/'||split_part(spreadRef,'/', 2)) LOOP
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
        		END LOOP;
        		Update spreads SET spreaded = true WHERE id = spread.id;
    		END LOOP; 
    	end;
    $$ LANGUAGE plpgsql;

insert into paths (source, target) values ('menzorg/documents/4','menzorg/documents/3'), ('menzorg/documents/2', 'menzorg/documents/1');
insert into paths2 (a, b) values (2,'menzorg/documents/3');
insert into spreadable (source, target, pathFromKey, pathToPrefix, pathToKey) values 
('menzorg/spreads', 'menzorg/paths', 'source', '', 'target'), 
('menzorg/spreads', 'menzorg/paths2', 'b', 'menzorg/documents/', 'a');
    
DO $$
DECLARE 
root text;
BEGIN

	insert into spreads (target) values ('menzorg/documents/4') RETURNING 'menzorg/spreads/'||id INTO root;
    PERFORM * FROM spreadBySpread(root);
    
END$$;

select * from spreads;
