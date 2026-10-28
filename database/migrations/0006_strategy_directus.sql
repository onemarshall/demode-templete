-- Directus recognises only single-column collection primary keys. Keep domain
-- identifiers and scoped uniqueness unchanged; record_id is a presentation key.
-- Every dependent FK is captured and recreated explicitly, never dropped CASCADE.
DO $$
DECLARE
  names text[] := ARRAY[
    'strategy_brand_binding','strategy_engagement','strategy_session',
    'strategy_revision','strategy_version','strategy_source_head',
    'strategy_source_ref','strategy_document','strategy_approval',
    'strategy_fork_command','strategy_job_callback',
    'strategy_checkpoint_mirror','strategy_create_command'
  ];
  schema_name text := current_schema();
  target_oids oid[];
  table_name text;
  target_oid oid;
  constraint_row record;
  pk_columns text;
  pk_name text;
  pk_width integer;
BEGIN
  SELECT array_agg(to_regclass(format('%I.%I',schema_name,n))::oid)
  INTO target_oids FROM unnest(names) AS n;
  IF array_position(target_oids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Strategy core/job migrations must precede Directus compatibility';
  END IF;

  -- Take migration locks in a stable order before detaching any constraints.
  FOREACH table_name IN ARRAY names LOOP
    EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',schema_name,table_name);
  END LOOP;
  CREATE TEMP TABLE strategy_fk_transition (
    relation_oid oid NOT NULL, constraint_name text NOT NULL, definition text NOT NULL
  ) ON COMMIT DROP;
  INSERT INTO strategy_fk_transition
    SELECT conrelid,conname,pg_get_constraintdef(oid)
    FROM pg_constraint WHERE contype='f' AND confrelid=ANY(target_oids);

  FOR constraint_row IN SELECT * FROM strategy_fk_transition LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',constraint_row.relation_oid::regclass,constraint_row.constraint_name);
  END LOOP;

  FOREACH table_name IN ARRAY names LOOP
    target_oid := to_regclass(format('%I.%I',schema_name,table_name));
    SELECT c.conname,cardinality(c.conkey),
      (SELECT string_agg(quote_ident(a.attname),',' ORDER BY k.position)
       FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum,position)
       JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum)
      INTO pk_name,pk_width,pk_columns
      FROM pg_constraint c WHERE c.conrelid=target_oid AND c.contype='p';
    IF pk_width>1 THEN
      -- ADD COLUMN's default fills existing rows without updating their original
      -- immutable columns or invoking application UPDATE triggers.
      EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS record_id uuid NOT NULL DEFAULT gen_random_uuid()',schema_name,table_name);
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I UNIQUE (%s)',schema_name,table_name,table_name||'_ownership_unique',pk_columns);
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',schema_name,table_name,pk_name);
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I PRIMARY KEY(record_id)',schema_name,table_name,pk_name);
    ELSIF pk_width<>1 OR pk_columns<>'record_id' THEN
      RAISE EXCEPTION 'Unexpected Strategy primary key on %',table_name;
    END IF;
  END LOOP;

  FOR constraint_row IN SELECT * FROM strategy_fk_transition LOOP
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s',constraint_row.relation_oid::regclass,constraint_row.constraint_name,constraint_row.definition);
  END LOOP;
END $$;
