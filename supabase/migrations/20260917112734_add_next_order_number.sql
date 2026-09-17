CREATE OR REPLACE FUNCTION next_order_number(p_store_id uuid)
RETURNS integer AS $
DECLARE v_next integer;
BEGIN
  UPDATE stores SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{last_order_number}',
    to_jsonb(COALESCE((settings->>'last_order_number')::int, 1000) + 1)
  )
  WHERE id = p_store_id
  RETURNING (settings->>'last_order_number')::int INTO v_next;
  RETURN v_next;
END;
$ LANGUAGE plpgsql;