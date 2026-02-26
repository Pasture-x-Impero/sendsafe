-- Merge duplicate contact groups (same name, case-insensitive, same user)
-- For each duplicate set: keep the oldest group, move all memberships to it, delete the rest.
DO $$
DECLARE
  dup RECORD;
  winner_id uuid;
BEGIN
  FOR dup IN
    SELECT user_id, lower(name) AS name_lower
    FROM contact_groups
    GROUP BY user_id, lower(name)
    HAVING count(*) > 1
  LOOP
    -- Keep the oldest group as the canonical one
    SELECT id INTO winner_id
    FROM contact_groups
    WHERE user_id = dup.user_id AND lower(name) = dup.name_lower
    ORDER BY created_at ASC
    LIMIT 1;

    -- Move memberships from duplicate groups to the winner (ignore if already a member)
    INSERT INTO contact_group_memberships (contact_id, group_id)
    SELECT m.contact_id, winner_id
    FROM contact_group_memberships m
    JOIN contact_groups g ON g.id = m.group_id
    WHERE g.user_id = dup.user_id
      AND lower(g.name) = dup.name_lower
      AND g.id != winner_id
    ON CONFLICT (contact_id, group_id) DO NOTHING;

    -- Remove memberships belonging to duplicate groups
    DELETE FROM contact_group_memberships
    WHERE group_id IN (
      SELECT id FROM contact_groups
      WHERE user_id = dup.user_id
        AND lower(name) = dup.name_lower
        AND id != winner_id
    );

    -- Delete the duplicate groups
    DELETE FROM contact_groups
    WHERE user_id = dup.user_id
      AND lower(name) = dup.name_lower
      AND id != winner_id;
  END LOOP;
END $$;

-- Prevent future duplicates: unique index on (user_id, lower(name))
CREATE UNIQUE INDEX IF NOT EXISTS contact_groups_user_id_name_lower_unique
  ON contact_groups (user_id, lower(name));
