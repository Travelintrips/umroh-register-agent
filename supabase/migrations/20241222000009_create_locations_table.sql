-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_locations_city_id ON locations(city_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE locations;

-- Create SELECT policy for locations table
CREATE POLICY "Allow public read access to locations"
ON locations FOR SELECT
USING (true);

-- Seed locations data for Jakarta (assuming Jakarta city exists)
-- First, let's find Jakarta's city_id
DO $$
DECLARE
    jakarta_city_id UUID;
BEGIN
    -- Get Jakarta city ID
    SELECT id INTO jakarta_city_id FROM cities WHERE name = 'Jakarta' AND country_code = 'ID';
    
    -- Only insert if Jakarta exists
    IF jakarta_city_id IS NOT NULL THEN
        INSERT INTO locations (city_id, name) VALUES
        (jakarta_city_id, 'Terminal 1A - Domestic Arrival'),
        (jakarta_city_id, 'Terminal 1B - Domestic Arrival'),
        (jakarta_city_id, 'Terminal 1C - Domestic Arrival'),
        (jakarta_city_id, 'Terminal 2D - Domestic Arrival'),
        (jakarta_city_id, 'Terminal 2E - Domestic Arrival'),
        (jakarta_city_id, 'Terminal 2F - International Arrival Hall'),
        (jakarta_city_id, 'Terminal 3 - International Arrival (Gate G6 / Area Umum)'),
        (jakarta_city_id, 'Terminal 1A - Domestic Departure'),
        (jakarta_city_id, 'Terminal 1B - Domestic Departure'),
        (jakarta_city_id, 'Terminal 1C - Domestic Departure'),
        (jakarta_city_id, 'Terminal 2D - Domestic Departure'),
        (jakarta_city_id, 'Terminal 2E - Domestic Departure'),
        (jakarta_city_id, 'Terminal 2F - International Departure Check-in'),
        (jakarta_city_id, 'Terminal 3 - International Departure (Check-in & Imigrasi)'),
        (jakarta_city_id, 'Terminal 2F - International Transfer Desk'),
        (jakarta_city_id, 'Terminal 3 - International Transfer Area'),
        (jakarta_city_id, 'Soekarno-Hatta Airport - Main Entrance'),
        (jakarta_city_id, 'Soekarno-Hatta Airport - Parking Area A'),
        (jakarta_city_id, 'Soekarno-Hatta Airport - Parking Area B'),
        (jakarta_city_id, 'Soekarno-Hatta Airport - Hotel Area')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
