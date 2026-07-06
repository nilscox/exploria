-- Custom SQL migration file, put your code below! --

-- The old model stored a flat set of "discussion paths" (what are now options).
-- Wrap them into a single question (using the event id as the question id, empty
-- content since none was captured back then) so the new nested shape holds.
UPDATE domain_events
SET type = 'QuestionsAsked',
    payload = jsonb_build_object(
      'questions', jsonb_build_array(
        jsonb_build_object(
          'id', id,
          'content', '',
          'options', (
            SELECT coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'id', option ->> 'id',
                  'label', option ->> 'label',
                  'description', coalesce(option ->> 'description', '')
                )
              ),
              '[]'::jsonb
            )
            FROM jsonb_array_elements(payload -> 'paths') AS option
          )
        )
      )
    )
WHERE type = 'DiscussionPathsSet';
--> statement-breakpoint
-- A selection referenced an option (pathId); its question is the most recent
-- question set emitted before it in the same session.
UPDATE domain_events e
SET type = 'AnswerSelected',
    payload = jsonb_build_object(
      'questionId', (
        SELECT s.id
        FROM domain_events s
        WHERE s.aggregate_id = e.aggregate_id
          AND s.type = 'QuestionsAsked'
          AND s.position < e.position
        ORDER BY s.position DESC
        LIMIT 1
      ),
      'optionId', e.payload ->> 'pathId',
      'content', '',
      'label', e.payload ->> 'label'
    )
WHERE e.type = 'DiscussionPathSelected';
