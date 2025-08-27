ALTER TABLE handling_bookings 
ADD COLUMN IF NOT EXISTS member_discount NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS user_discount NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bagasi_tambahan TEXT DEFAULT NULL;

COMMENT ON COLUMN handling_bookings.member_discount IS 'Member discount percentage applied to the booking';
COMMENT ON COLUMN handling_bookings.user_discount IS 'User discount amount applied to the booking';
COMMENT ON COLUMN handling_bookings.bagasi_tambahan IS 'Additional baggage information in format "quantity x price"';
