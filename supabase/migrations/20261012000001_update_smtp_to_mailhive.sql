-- =======================================================
-- MIGRATION: Update Platform SMTP Configuration to Mailhive Africa
-- =======================================================

-- Update default platform SMTP settings to point to Mailhive Africa
INSERT INTO public.platform_settings (key, value)
VALUES (
    'smtp',
    jsonb_build_object(
        'provider', 'mailhive',
        'host', 'smtp.mailhive.africa',
        'port', 587,
        'sender', 'noreply@tradererp.com',
        'secure', false
    )
)
ON CONFLICT (key) DO UPDATE
SET value = jsonb_build_object(
    'provider', 'mailhive',
    'host', 'smtp.mailhive.africa',
    'port', 587,
    'sender', 'noreply@tradererp.com',
    'secure', false
);
