-- Drop existing tables if they exist to ensure clean state
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- Create countries table
CREATE TABLE countries (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cities table
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on country_code and lowercase name
CREATE UNIQUE INDEX cities_country_name_unique ON cities (country_code, LOWER(name));

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE countries;
ALTER PUBLICATION supabase_realtime ADD TABLE cities;

-- Insert world countries
INSERT INTO countries (code, name) VALUES
('AD', 'Andorra'),
('AE', 'United Arab Emirates'),
('AF', 'Afghanistan'),
('AG', 'Antigua and Barbuda'),
('AI', 'Anguilla'),
('AL', 'Albania'),
('AM', 'Armenia'),
('AO', 'Angola'),
('AQ', 'Antarctica'),
('AR', 'Argentina'),
('AS', 'American Samoa'),
('AT', 'Austria'),
('AU', 'Australia'),
('AW', 'Aruba'),
('AX', 'Åland Islands'),
('AZ', 'Azerbaijan'),
('BA', 'Bosnia and Herzegovina'),
('BB', 'Barbados'),
('BD', 'Bangladesh'),
('BE', 'Belgium'),
('BF', 'Burkina Faso'),
('BG', 'Bulgaria'),
('BH', 'Bahrain'),
('BI', 'Burundi'),
('BJ', 'Benin'),
('BL', 'Saint Barthélemy'),
('BM', 'Bermuda'),
('BN', 'Brunei'),
('BO', 'Bolivia'),
('BQ', 'Caribbean Netherlands'),
('BR', 'Brazil'),
('BS', 'Bahamas'),
('BT', 'Bhutan'),
('BV', 'Bouvet Island'),
('BW', 'Botswana'),
('BY', 'Belarus'),
('BZ', 'Belize'),
('CA', 'Canada'),
('CC', 'Cocos Islands'),
('CD', 'Democratic Republic of the Congo'),
('CF', 'Central African Republic'),
('CG', 'Republic of the Congo'),
('CH', 'Switzerland'),
('CI', 'Côte d''Ivoire'),
('CK', 'Cook Islands'),
('CL', 'Chile'),
('CM', 'Cameroon'),
('CN', 'China'),
('CO', 'Colombia'),
('CR', 'Costa Rica'),
('CU', 'Cuba'),
('CV', 'Cape Verde'),
('CW', 'Curaçao'),
('CX', 'Christmas Island'),
('CY', 'Cyprus'),
('CZ', 'Czech Republic'),
('DE', 'Germany'),
('DJ', 'Djibouti'),
('DK', 'Denmark'),
('DM', 'Dominica'),
('DO', 'Dominican Republic'),
('DZ', 'Algeria'),
('EC', 'Ecuador'),
('EE', 'Estonia'),
('EG', 'Egypt'),
('EH', 'Western Sahara'),
('ER', 'Eritrea'),
('ES', 'Spain'),
('ET', 'Ethiopia'),
('FI', 'Finland'),
('FJ', 'Fiji'),
('FK', 'Falkland Islands'),
('FM', 'Micronesia'),
('FO', 'Faroe Islands'),
('FR', 'France'),
('GA', 'Gabon'),
('GB', 'United Kingdom'),
('GD', 'Grenada'),
('GE', 'Georgia'),
('GF', 'French Guiana'),
('GG', 'Guernsey'),
('GH', 'Ghana'),
('GI', 'Gibraltar'),
('GL', 'Greenland'),
('GM', 'Gambia'),
('GN', 'Guinea'),
('GP', 'Guadeloupe'),
('GQ', 'Equatorial Guinea'),
('GR', 'Greece'),
('GS', 'South Georgia'),
('GT', 'Guatemala'),
('GU', 'Guam'),
('GW', 'Guinea-Bissau'),
('GY', 'Guyana'),
('HK', 'Hong Kong'),
('HM', 'Heard Island and McDonald Islands'),
('HN', 'Honduras'),
('HR', 'Croatia'),
('HT', 'Haiti'),
('HU', 'Hungary'),
('ID', 'Indonesia'),
('IE', 'Ireland'),
('IL', 'Israel'),
('IM', 'Isle of Man'),
('IN', 'India'),
('IO', 'British Indian Ocean Territory'),
('IQ', 'Iraq'),
('IR', 'Iran'),
('IS', 'Iceland'),
('IT', 'Italy'),
('JE', 'Jersey'),
('JM', 'Jamaica'),
('JO', 'Jordan'),
('JP', 'Japan'),
('KE', 'Kenya'),
('KG', 'Kyrgyzstan'),
('KH', 'Cambodia'),
('KI', 'Kiribati'),
('KM', 'Comoros'),
('KN', 'Saint Kitts and Nevis'),
('KP', 'North Korea'),
('KR', 'South Korea'),
('KW', 'Kuwait'),
('KY', 'Cayman Islands'),
('KZ', 'Kazakhstan'),
('LA', 'Laos'),
('LB', 'Lebanon'),
('LC', 'Saint Lucia'),
('LI', 'Liechtenstein'),
('LK', 'Sri Lanka'),
('LR', 'Liberia'),
('LS', 'Lesotho'),
('LT', 'Lithuania'),
('LU', 'Luxembourg'),
('LV', 'Latvia'),
('LY', 'Libya'),
('MA', 'Morocco'),
('MC', 'Monaco'),
('MD', 'Moldova'),
('ME', 'Montenegro'),
('MF', 'Saint Martin'),
('MG', 'Madagascar'),
('MH', 'Marshall Islands'),
('MK', 'North Macedonia'),
('ML', 'Mali'),
('MM', 'Myanmar'),
('MN', 'Mongolia'),
('MO', 'Macao'),
('MP', 'Northern Mariana Islands'),
('MQ', 'Martinique'),
('MR', 'Mauritania'),
('MS', 'Montserrat'),
('MT', 'Malta'),
('MU', 'Mauritius'),
('MV', 'Maldives'),
('MW', 'Malawi'),
('MX', 'Mexico'),
('MY', 'Malaysia'),
('MZ', 'Mozambique'),
('NA', 'Namibia'),
('NC', 'New Caledonia'),
('NE', 'Niger'),
('NF', 'Norfolk Island'),
('NG', 'Nigeria'),
('NI', 'Nicaragua'),
('NL', 'Netherlands'),
('NO', 'Norway'),
('NP', 'Nepal'),
('NR', 'Nauru'),
('NU', 'Niue'),
('NZ', 'New Zealand'),
('OM', 'Oman'),
('PA', 'Panama'),
('PE', 'Peru'),
('PF', 'French Polynesia'),
('PG', 'Papua New Guinea'),
('PH', 'Philippines'),
('PK', 'Pakistan'),
('PL', 'Poland'),
('PM', 'Saint Pierre and Miquelon'),
('PN', 'Pitcairn'),
('PR', 'Puerto Rico'),
('PS', 'Palestine'),
('PT', 'Portugal'),
('PW', 'Palau'),
('PY', 'Paraguay'),
('QA', 'Qatar'),
('RE', 'Réunion'),
('RO', 'Romania'),
('RS', 'Serbia'),
('RU', 'Russia'),
('RW', 'Rwanda'),
('SA', 'Saudi Arabia'),
('SB', 'Solomon Islands'),
('SC', 'Seychelles'),
('SD', 'Sudan'),
('SE', 'Sweden'),
('SG', 'Singapore'),
('SH', 'Saint Helena'),
('SI', 'Slovenia'),
('SJ', 'Svalbard and Jan Mayen'),
('SK', 'Slovakia'),
('SL', 'Sierra Leone'),
('SM', 'San Marino'),
('SN', 'Senegal'),
('SO', 'Somalia'),
('SR', 'Suriname'),
('SS', 'South Sudan'),
('ST', 'São Tomé and Príncipe'),
('SV', 'El Salvador'),
('SX', 'Sint Maarten'),
('SY', 'Syria'),
('SZ', 'Eswatini'),
('TC', 'Turks and Caicos Islands'),
('TD', 'Chad'),
('TF', 'French Southern Territories'),
('TG', 'Togo'),
('TH', 'Thailand'),
('TJ', 'Tajikistan'),
('TK', 'Tokelau'),
('TL', 'Timor-Leste'),
('TM', 'Turkmenistan'),
('TN', 'Tunisia'),
('TO', 'Tonga'),
('TR', 'Turkey'),
('TT', 'Trinidad and Tobago'),
('TV', 'Tuvalu'),
('TW', 'Taiwan'),
('TZ', 'Tanzania'),
('UA', 'Ukraine'),
('UG', 'Uganda'),
('UM', 'United States Minor Outlying Islands'),
('US', 'United States'),
('UY', 'Uruguay'),
('UZ', 'Uzbekistan'),
('VA', 'Vatican City'),
('VC', 'Kingstown'),
('VE', 'Venezuela'),
('VG', 'British Virgin Islands'),
('VI', 'U.S. Virgin Islands'),
('VN', 'Vietnam'),
('VU', 'Vanuatu'),
('WF', 'Wallis and Futuna'),
('WS', 'Samoa'),
('YE', 'Yemen'),
('YT', 'Mayotte'),
('ZA', 'South Africa'),
('ZM', 'Zambia'),
('ZW', 'Zimbabwe');

-- Insert cities for all requested countries using upsert
INSERT INTO cities (country_code, name) VALUES
-- Andorra (AD)
('AD', 'Andorra la Vella'),
('AD', 'Escaldes-Engordany'),
('AD', 'Encamp'),
('AD', 'Sant Julià de Lòria'),

-- United Arab Emirates (AE)
('AE', 'Dubai'),
('AE', 'Abu Dhabi'),
('AE', 'Sharjah'),
('AE', 'Al Ain'),
('AE', 'Ajman'),
('AE', 'Ras Al Khaimah'),
('AE', 'Fujairah'),

-- Afghanistan (AF)
('AF', 'Kabul'),
('AF', 'Kandahar'),
('AF', 'Herat'),
('AF', 'Mazar-i-Sharif'),
('AF', 'Jalalabad'),

-- Antigua and Barbuda (AG)
('AG', 'Saint John''s'),
('AG', 'All Saints'),
('AG', 'Liberta'),

-- Grenada (GD)
('GD', 'Saint George''s'),
('GD', 'Gouyave'),

-- Barbados (BB)
('BB', 'Bridgetown'),
('BB', 'Christ Church'),
('BB', 'Saint George''s'),

-- Bangladesh (BD)
('BD', 'Dhaka'),
('BD', 'Chittagong'),
('BD', 'Khulna'),
('BD', 'Rajshahi'),
('BD', 'Sylhet'),

-- Belgium (BE)
('BE', 'Brussels'),
('BE', 'Antwerp'),
('BE', 'Gent'),

-- Burkina Faso (BF)
('BF', 'Ouagadougou'),
('BF', 'Bobo-Dioulasso'),
('BF', 'Kaya'),

-- Bulgaria (BG)
('BG', 'Sofia'),
('BG', 'Plovdiv'),
('BG', 'Varna'),

-- Bahrain (BH)
('BH', 'Manama'),
('BH', 'Muharraq'),
('BH', 'Jiddah'),

-- Burundi (BI)
('BI', 'Bujumbura'),
('BI', 'Gitega'),
('BI', 'Bujumbura'),

-- Benin (BJ)
('BJ', 'Porto-Novo'),
('BJ', 'Cotonou'),
('BJ', 'Lome'),

-- Saint Barthélemy (BL)
('BL', 'Gustavia'),
('BL', 'Saint-Barthélemy'),

-- Bermuda (BM)
('BM', 'Hamilton'),
('BM', 'Bermuda'),

-- Brunei (BN)
('BN', 'Bandar Seri Begawan'),
('BN', 'Kuala Lumpur'),
('BN', 'Kuala Lumpur'),

-- Bolivia (BO)
('BO', 'La Paz'),
('BO', 'Sucre'),
('BO', 'Cochabamba'),

-- Caribbean Netherlands (BQ)
('BQ', 'Curacao'),
('BQ', 'Sint Maarten'),
('BQ', 'Aruba'),

-- Brazil (BR)
('BR', 'Brasília'),
('BR', 'Rio de Janeiro'),
('BR', 'São Paulo'),

-- Bahamas (BS)
('BS', 'Nassau'),
('BS', 'Freeport'),
('BS', 'Grand Bahama'),

-- Bhutan (BT)
('BT', 'Thimphu'),
('BT', 'Paro'),
('BT', 'Thimphu'),

-- Bouvet Island (BV)
('BV', 'Bouvet Island'),

-- Botswana (BW)
('BW', 'Gaborone'),
('BW', 'Francistown'),
('BW', 'Gaborone'),

-- Belarus (BY)
('BY', 'Minsk'),
('BY', 'Grodno'),
('BY', 'Minsk'),

-- Belize (BZ)
('BZ', 'Belmopan'),
('BZ', 'Belmopan'),
('BZ', 'Belmopan'),

-- Canada (CA)
('CA', 'Ottawa'),
('CA', 'Toronto'),
('CA', 'Montreal'),

-- Cocos Islands (CC)
('CC', 'Cocos Island'),
('CC', 'Cocos Island'),

-- Democratic Republic of the Congo (CD)
('CD', 'Kinshasa'),
('CD', 'Kinshasa'),
('CD', 'Kinshasa'),

-- Central African Republic (CF)
('CF', 'Bangui'),
('CF', 'Bangui'),
('CF', 'Bangui'),

-- Republic of the Congo (CG)
('CG', 'Brazzaville'),
('CG', 'Brazzaville'),
('CG', 'Brazzaville'),

-- Switzerland (CH)
('CH', 'Bern'),
('CH', 'Zurich'),
('CH', 'Geneva'),

-- Côte d'Ivoire (CI)
('CI', 'Yamoussoukro'),
('CI', 'Yamoussoukro'),
('CI', 'Yamoussoukro'),

-- Cook Islands (CK)
('CK', 'Aitutaki'),
('CK', 'Aitutaki'),
('CK', 'Aitutaki'),

-- Chile (CL)
('CL', 'Santiago'),
('CL', 'Santiago'),
('CL', 'Santiago'),

-- Cameroon (CM)
('CM', 'Yaoundé'),
('CM', 'Yaoundé'),
('CM', 'Yaoundé'),

-- China (CN)
('CN', 'Beijing'),
('CN', 'Shanghai'),
('CN', 'Shanghai'),

-- Colombia (CO)
('CO', 'Bogotá'),
('CO', 'Medellín'),
('CO', 'Bogotá'),

-- Costa Rica (CR)
('CR', 'San José'),
('CR', 'San José'),
('CR', 'San José'),

-- Cuba (CU)
('CU', 'Havana'),
('CU', 'Havana'),
('CU', 'Havana'),

-- Cape Verde (CV)
('CV', 'Praia'),
('CV', 'Praia'),
('CV', 'Praia'),

-- Curaçao (CW)
('CW', 'Willemstad'),
('CW', 'Willemstad'),
('CW', 'Willemstad'),

-- Christmas Island (CX)
('CX', 'Christmas Island'),
('CX', 'Christmas Island'),
('CX', 'Christmas Island'),

-- Cyprus (CY)
('CY', 'Nicosia'),
('CY', 'Nicosia'),
('CY', 'Nicosia'),

-- Czech Republic (CZ)
('CZ', 'Prague'),
('CZ', 'Prague'),
('CZ', 'Prague'),

-- Germany (DE)
('DE', 'Berlin'),
('DE', 'Munich'),
('DE', 'Frankfurt'),

-- Djibouti (DJ)
('DJ', 'Djibouti'),
('DJ', 'Djibouti'),
('DJ', 'Djibouti'),

-- Denmark (DK)
('DK', 'Copenhagen'),
('DK', 'Copenhagen'),
('DK', 'Copenhagen'),

-- Dominica (DM)
('DM', 'Roseau'),
('DM', 'Roseau'),
('DM', 'Roseau'),

-- Dominican Republic (DO)
('DO', 'Santo Domingo'),
('DO', 'Santo Domingo'),
('DO', 'Santo Domingo'),

-- Algeria (DZ)
('DZ', 'Algiers'),
('DZ', 'Algiers'),
('DZ', 'Algiers'),

-- Ecuador (EC)
('EC', 'Quito'),
('EC', 'Quito'),
('EC', 'Quito'),

-- Estonia (EE)
('EE', 'Tallinn'),
('EE', 'Tallinn'),
('EE', 'Tallinn'),

-- Egypt (EG)
('EG', 'Cairo'),
('EG', 'Cairo'),
('EG', 'Cairo'),

-- Western Sahara (EH)
('EH', 'El Aaiún'),
('EH', 'El Aaiún'),
('EH', 'El Aaiún'),

-- Eritrea (ER)
('ER', 'Asmara'),
('ER', 'Asmara'),
('ER', 'Asmara'),

-- Spain (ES)
('ES', 'Madrid'),
('ES', 'Madrid'),
('ES', 'Madrid'),

-- Ethiopia (ET)
('ET', 'Addis Ababa'),
('ET', 'Addis Ababa'),
('ET', 'Addis Ababa'),

-- Finland (FI)
('FI', 'Helsinki'),
('FI', 'Helsinki'),
('FI', 'Helsinki'),

-- Fiji (FJ)
('FJ', 'Suva'),
('FJ', 'Suva'),
('FJ', 'Suva'),

-- Falkland Islands (FK)
('FK', 'Stanley'),
('FK', 'Stanley'),
('FK', 'Stanley'),

-- Micronesia (FM)
('FM', 'Palikir'),
('FM', 'Palikir'),
('FM', 'Palikir'),

-- Faroe Islands (FO)
('FO', 'Tórshavn'),
('FO', 'Tórshavn'),
('FO', 'Tórshavn'),

-- France (FR)
('FR', 'Paris'),
('FR', 'Lyon'),
('FR', 'Marseille'),

-- Gabon (GA)
('GA', 'Libreville'),
('GA', 'Libreville'),
('GA', 'Libreville'),

-- United Kingdom (GB)
('GB', 'London'),
('GB', 'London'),
('GB', 'London'),

-- Grenada (GD)
('GD', 'Saint George''s'),
('GD', 'Gouyave'),

-- Georgia (GE)
('GE', 'Tbilisi'),
('GE', 'Tbilisi'),
('GE', 'Tbilisi'),

-- French Guiana (GF)
('GF', 'Cayenne'),
('GF', 'Cayenne'),
('GF', 'Cayenne'),

-- Guernsey (GG)
('GG', 'St. Peter Port'),
('GG', 'St. Peter Port'),
('GG', 'St. Peter Port'),

-- Ghana (GH)
('GH', 'Accra'),
('GH', 'Accra'),
('GH', 'Accra'),

-- Gibraltar (GI)
('GI', 'Gibraltar'),
('GI', 'Gibraltar'),
('GI', 'Gibraltar'),

-- Greenland (GL)
('GL', 'Nuuk'),
('GL', 'Nuuk'),
('GL', 'Nuuk'),

-- Gambia (GM)
('GM', 'Banjul'),
('GM', 'Banjul'),
('GM', 'Banjul'),

-- Guinea (GN)
('GN', 'Conakry'),
('GN', 'Conakry'),
('GN', 'Conakry'),

-- Guadeloupe (GP)
('GP', 'Basse-Terre'),
('GP', 'Basse-Terre'),
('GP', 'Basse-Terre'),

-- Equatorial Guinea (GQ)
('GQ', 'Malabo'),
('GQ', 'Malabo'),
('GQ', 'Malabo'),

-- Greece (GR)
('GR', 'Athens'),
('GR', 'Athens'),
('GR', 'Athens'),

-- South Georgia (GS)
('GS', 'King Edward Point'),
('GS', 'King Edward Point'),
('GS', 'King Edward Point'),

-- Guatemala (GT)
('GT', 'Guatemala City'),
('GT', 'Guatemala City'),
('GT', 'Guatemala City'),

-- Guam (GU)
('GU', 'Hagåtña'),
('GU', 'Hagåtña'),
('GU', 'Hagåtña'),

-- Guinea-Bissau (GW)
('GW', 'Bissau'),
('GW', 'Bissau'),
('GW', 'Bissau'),

-- Guyana (GY)
('GY', 'Georgetown'),
('GY', 'Georgetown'),
('GY', 'Georgetown'),

-- Hong Kong (HK)
('HK', 'Hong Kong'),
('HK', 'Hong Kong'),
('HK', 'Hong Kong'),

-- Heard Island and McDonald Islands (HM)
('HM', 'Heard Island'),
('HM', 'Heard Island'),
('HM', 'Heard Island'),

-- Honduras (HN)
('HN', 'Tegucigalpa'),
('HN', 'Tegucigalpa'),
('HN', 'Tegucigalpa'),

-- Croatia (HR)
('HR', 'Zagreb'),
('HR', 'Zagreb'),
('HR', 'Zagreb'),

-- Haiti (HT)
('HT', 'Port-au-Prince'),
('HT', 'Port-au-Prince'),
('HT', 'Port-au-Prince'),

-- Hungary (HU)
('HU', 'Budapest'),
('HU', 'Budapest'),
('HU', 'Budapest'),

-- Indonesia (ID)
('ID', 'Jakarta'),
('ID', 'Jakarta'),
('ID', 'Jakarta'),

-- Ireland (IE)
('IE', 'Dublin'),
('IE', 'Dublin'),
('IE', 'Dublin'),

-- Israel (IL)
('IL', 'Jerusalem'),
('IL', 'Jerusalem'),
('IL', 'Jerusalem'),

-- Isle of Man (IM)
('IM', 'Douglas'),
('IM', 'Douglas'),
('IM', 'Douglas'),

-- India (IN)
('IN', 'New Delhi'),
('IN', 'New Delhi'),
('IN', 'New Delhi'),

-- British Indian Ocean Territory (IO)
('IO', 'Diego Garcia'),
('IO', 'Diego Garcia'),
('IO', 'Diego Garcia'),

-- Iraq (IQ)
('IQ', 'Baghdad'),
('IQ', 'Baghdad'),
('IQ', 'Baghdad'),

-- Iran (IR)
('IR', 'Tehran'),
('IR', 'Tehran'),
('IR', 'Tehran'),

-- Iceland (IS)
('IS', 'Reykjavik'),
('IS', 'Reykjavik'),
('IS', 'Reykjavik'),

-- Italy (IT)
('IT', 'Rome'),
('IT', 'Rome'),
('IT', 'Rome'),

-- Jersey (JE)
('JE', 'Saint Helier'),
('JE', 'Saint Helier'),
('JE', 'Saint Helier'),

-- Jamaica (JM)
('JM', 'Kingston'),
('JM', 'Kingston'),
('JM', 'Kingston'),

-- Jordan (JO)
('JO', 'Amman'),
('JO', 'Amman'),
('JO', 'Amman'),

-- Japan (JP)
('JP', 'Tokyo'),
('JP', 'Tokyo'),
('JP', 'Tokyo'),

-- Kenya (KE)
('KE', 'Nairobi'),
('KE', 'Nairobi'),
('KE', 'Nairobi'),

-- Kyrgyzstan (KG)
('KG', 'Bishkek'),
('KG', 'Bishkek'),
('KG', 'Bishkek'),

-- Cambodia (KH)
('KH', 'Phnom Penh'),
('KH', 'Phnom Penh'),
('KH', 'Phnom Penh'),

-- Kiribati (KI)
('KI', 'Tarawa'),
('KI', 'Tarawa'),
('KI', 'Tarawa'),

-- Comoros (KM)
('KM', 'Moroni'),
('KM', 'Moroni'),
('KM', 'Moroni'),

-- Saint Kitts and Nevis (KN)
('KN', 'Basseterre'),
('KN', 'Basseterre'),
('KN', 'Basseterre'),

-- North Korea (KP)
('KP', 'Pyongyang'),
('KP', 'Pyongyang'),
('KP', 'Pyongyang'),

-- South Korea (KR)
('KR', 'Seoul'),
('KR', 'Seoul'),
('KR', 'Seoul'),

-- Kuwait (KW)
('KW', 'Kuwait City'),
('KW', 'Kuwait City'),
('KW', 'Kuwait City'),

-- Cayman Islands (KY)
('KY', 'George Town'),
('KY', 'George Town'),
('KY', 'George Town'),

-- Kazakhstan (KZ)
('KZ', 'Astana'),
('KZ', 'Astana'),
('KZ', 'Astana'),

-- Laos (LA)
('LA', 'Vientiane'),
('LA', 'Vientiane'),
('LA', 'Vientiane'),

-- Lebanon (LB)
('LB', 'Beirut'),
('LB', 'Beirut'),
('LB', 'Beirut'),

-- Saint Lucia (LC)
('LC', 'Castries'),
('LC', 'Castries'),
('LC', 'Castries'),

-- Liechtenstein (LI)
('LI', 'Vaduz'),
('LI', 'Vaduz'),
('LI', 'Vaduz'),

-- Sri Lanka (LK)
('LK', 'Sri Jayawardenepura Kotte'),
('LK', 'Sri Jayawardenepura Kotte'),
('LK', 'Sri Jayawardenepura Kotte'),

-- Liberia (LR)
('LR', 'Monrovia'),
('LR', 'Monrovia'),
('LR', 'Monrovia'),

-- Lesotho (LS)
('LS', 'Maseru'),
('LS', 'Maseru'),
('LS', 'Maseru'),

-- Lithuania (LT)
('LT', 'Vilnius'),
('LT', 'Vilnius'),
('LT', 'Vilnius'),

-- Luxembourg (LU)
('LU', 'Luxembourg City'),
('LU', 'Luxembourg City'),
('LU', 'Luxembourg City'),

-- Latvia (LV)
('LV', 'Riga'),
('LV', 'Riga'),
('LV', 'Riga'),

-- Libya (LY)
('LY', 'Tripoli'),
('LY', 'Tripoli'),
('LY', 'Tripoli'),

-- Morocco (MA)
('MA', 'Rabat'),
('MA', 'Rabat'),
('MA', 'Rabat'),

-- Monaco (MC)
('MC', 'Monaco'),
('MC', 'Monaco'),
('MC', 'Monaco'),

-- Moldova (MD)
('MD', 'Chisinau'),
('MD', 'Chisinau'),
('MD', 'Chisinau'),

-- Montenegro (ME)
('ME', 'Podgorica'),
('ME', 'Podgorica'),
('ME', 'Podgorica'),

-- Saint Martin (MF)
('MF', 'Marigot'),
('MF', 'Marigot'),
('MF', 'Marigot'),

-- Madagascar (MG)
('MG', 'Antananarivo'),
('MG', 'Antananarivo'),
('MG', 'Antananarivo'),

-- Marshall Islands (MH)
('MH', 'Majuro'),
('MH', 'Majuro'),
('MH', 'Majuro'),

-- North Macedonia (MK)
('MK', 'Skopje'),
('MK', 'Skopje'),
('MK', 'Skopje'),

-- Mali (ML)
('ML', 'Bamako'),
('ML', 'Bamako'),
('ML', 'Bamako'),

-- Myanmar (MM)
('MM', 'Naypyidaw'),
('MM', 'Naypyidaw'),
('MM', 'Naypyidaw'),

-- Mongolia (MN)
('MN', 'Ulaanbaatar'),
('MN', 'Ulaanbaatar'),
('MN', 'Ulaanbaatar'),

-- Macao (MO)
('MO', 'Macao'),
('MO', 'Macao'),
('MO', 'Macao'),

-- Northern Mariana Islands (MP)
('MP', 'Saipan'),
('MP', 'Saipan'),
('MP', 'Saipan'),

-- Martinique (MQ)
('MQ', 'Fort-de-France'),
('MQ', 'Fort-de-France'),
('MQ', 'Fort-de-France'),

-- Mauritania (MR)
('MR', 'Nouakchott'),
('MR', 'Nouakchott'),
('MR', 'Nouakchott'),

-- Montserrat (MS)
('MS', 'Plymouth'),
('MS', 'Plymouth'),
('MS', 'Plymouth'),

-- Malta (MT)
('MT', 'Valletta'),
('MT', 'Valletta'),
('MT', 'Valletta'),

-- Mauritius (MU)
('MU', 'Port Louis'),
('MU', 'Port Louis'),
('MU', 'Port Louis'),

-- Maldives (MV)
('MV', 'Male'),
('MV', 'Male'),
('MV', 'Male'),

-- Malawi (MW)
('MW', 'Lilongwe'),
('MW', 'Lilongwe'),
('MW', 'Lilongwe'),

-- Mexico (MX)
('MX', 'Mexico City'),
('MX', 'Mexico City'),
('MX', 'Mexico City'),

-- Malaysia (MY)
('MY', 'Kuala Lumpur'),
('MY', 'Kuala Lumpur'),
('MY', 'Kuala Lumpur'),

-- Mozambique (MZ)
('MZ', 'Maputo'),
('MZ', 'Maputo'),
('MZ', 'Maputo'),

-- Namibia (NA)
('NA', 'Windhoek'),
('NA', 'Windhoek'),
('NA', 'Windhoek'),

-- New Caledonia (NC)
('NC', 'Nouméa'),
('NC', 'Nouméa'),
('NC', 'Nouméa'),

-- Niger (NE)
('NE', 'Niamey'),
('NE', 'Niamey'),
('NE', 'Niamey'),

-- Norfolk Island (NF)
('NF', 'Norfolk Island'),
('NF', 'Norfolk Island'),
('NF', 'Norfolk Island'),

-- Nigeria (NG)
('NG', 'Abuja'),
('NG', 'Abuja'),
('NG', 'Abuja'),

-- Nicaragua (NI)
('NI', 'Managua'),
('NI', 'Managua'),
('NI', 'Managua'),

-- Netherlands (NL)
('NL', 'Amsterdam'),
('NL', 'Amsterdam'),
('NL', 'Amsterdam'),

-- Norway (NO)
('NO', 'Oslo'),
('NO', 'Oslo'),
('NO', 'Oslo'),

-- Nepal (NP)
('NP', 'Kathmandu'),
('NP', 'Kathmandu'),
('NP', 'Kathmandu'),

-- Nauru (NR)
('NR', 'Yaren'),
('NR', 'Yaren'),
('NR', 'Yaren'),

-- Niue (NU)
('NU', 'Alofi'),
('NU', 'Alofi'),
('NU', 'Alofi'),

-- New Zealand (NZ)
('NZ', 'Wellington'),
('NZ', 'Wellington'),
('NZ', 'Wellington'),

-- Oman (OM)
('OM', 'Muscat'),
('OM', 'Muscat'),
('OM', 'Muscat'),

-- Panama (PA)
('PA', 'Panama City'),
('PA', 'Panama City'),
('PA', 'Panama City'),

-- Peru (PE)
('PE', 'Lima'),
('PE', 'Lima'),
('PE', 'Lima'),

-- French Polynesia (PF)
('PF', 'Papeete'),
('PF', 'Papeete'),
('PF', 'Papeete'),

-- Papua New Guinea (PG)
('PG', 'Port Moresby'),
('PG', 'Port Moresby'),
('PG', 'Port Moresby'),

-- Philippines (PH)
('PH', 'Manila'),
('PH', 'Manila'),
('PH', 'Manila'),

-- Pakistan (PK)
('PK', 'Islamabad'),
('PK', 'Islamabad'),
('PK', 'Islamabad'),

-- Poland (PL)
('PL', 'Warsaw'),
('PL', 'Warsaw'),
('PL', 'Warsaw'),

-- Saint Pierre and Miquelon (PM)
('PM', 'Saint-Pierre'),
('PM', 'Saint-Pierre'),
('PM', 'Saint-Pierre'),

-- Pitcairn (PN)
('PN', 'Adamstown'),
('PN', 'Adamstown'),
('PN', 'Adamstown'),

-- Puerto Rico (PR)
('PR', 'San Juan'),
('PR', 'San Juan'),
('PR', 'San Juan'),

-- Palestine (PS)
('PS', 'Jerusalem'),
('PS', 'Jerusalem'),
('PS', 'Jerusalem'),

-- Portugal (PT)
('PT', 'Lisbon'),
('PT', 'Lisbon'),
('PT', 'Lisbon'),

-- Palau (PW)
('PW', 'Melekeok'),
('PW', 'Melekeok'),
('PW', 'Melekeok'),

-- Paraguay (PY)
('PY', 'Asunción'),
('PY', 'Asunción'),
('PY', 'Asunción'),

-- Qatar (QA)
('QA', 'Doha'),
('QA', 'Doha'),
('QA', 'Doha'),

-- Réunion (RE)
('RE', 'Saint-Denis'),
('RE', 'Saint-Denis'),
('RE', 'Saint-Denis'),

-- Romania (RO)
('RO', 'Bucharest'),
('RO', 'Bucharest'),
('RO', 'Bucharest'),

-- Serbia (RS)
('RS', 'Belgrade'),
('RS', 'Belgrade'),
('RS', 'Belgrade'),

-- Russia (RU)
('RU', 'Moscow'),
('RU', 'Moscow'),
('RU', 'Moscow'),

-- Rwanda (RW)
('RW', 'Kigali'),
('RW', 'Kigali'),
('RW', 'Kigali'),

-- Saudi Arabia (SA)
('SA', 'Riyadh'),
('SA', 'Jeddah'),
('SA', 'Mecca'),
('SA', 'Medina'),
('SA', 'Dammam'),
('SA', 'Khobar'),
('SA', 'Tabuk'),
('SA', 'Buraidah'),
('SA', 'Khamis Mushait'),
('SA', 'Hail'),
('SA', 'Najran'),
('SA', 'Jazan'),
('SA', 'Taif'),
('SA', 'Qatif'),
('SA', 'Jubail'),

-- Solomon Islands (SB)
('SB', 'Honiara'),
('SB', 'Honiara'),
('SB', 'Honiara'),

-- Seychelles (SC)
('SC', 'Victoria'),
('SC', 'Victoria'),
('SC', 'Victoria'),

-- Sudan (SD)
('SD', 'Khartoum'),
('SD', 'Khartoum'),
('SD', 'Khartoum'),

-- Sweden (SE)
('SE', 'Stockholm'),
('SE', 'Stockholm'),
('SE', 'Stockholm'),

-- Singapore (SG)
('SG', 'Singapore'),
('SG', 'Singapore'),
('SG', 'Singapore'),

-- Saint Helena (SH)
('SH', 'Saint Helena'),
('SH', 'Saint Helena'),
('SH', 'Saint Helena'),

-- Slovenia (SI)
('SI', 'Ljubljana'),
('SI', 'Ljubljana'),
('SI', 'Ljubljana'),

-- Svalbard and Jan Mayen (SJ)
('SJ', 'Longyearbyen'),
('SJ', 'Longyearbyen'),
('SJ', 'Longyearbyen'),

-- Slovakia (SK)
('SK', 'Bratislava'),
('SK', 'Bratislava'),
('SK', 'Bratislava'),

-- Sierra Leone (SL)
('SL', 'Freetown'),
('SL', 'Freetown'),
('SL', 'Freetown'),

-- San Marino (SM)
('SM', 'San Marino'),
('SM', 'San Marino'),
('SM', 'San Marino'),

-- Senegal (SN)
('SN', 'Dakar'),
('SN', 'Dakar'),
('SN', 'Dakar'),

-- Somalia (SO)
('SO', 'Mogadishu'),
('SO', 'Mogadishu'),
('SO', 'Mogadishu'),

-- Suriname (SR)
('SR', 'Paramaribo'),
('SR', 'Paramaribo'),
('SR', 'Paramaribo'),

-- South Sudan (SS)
('SS', 'Juba'),
('SS', 'Juba'),
('SS', 'Juba'),

-- São Tomé and Príncipe (ST)
('ST', 'São Tomé'),
('ST', 'São Tomé'),
('ST', 'São Tomé'),

-- El Salvador (SV)
('SV', 'San Salvador'),
('SV', 'San Salvador'),
('SV', 'San Salvador'),

-- Sint Maarten (SX)
('SX', 'Philipsburg'),
('SX', 'Philipsburg'),
('SX', 'Philipsburg'),

-- Syria (SY)
('SY', 'Damascus'),
('SY', 'Damascus'),
('SY', 'Damascus'),

-- Eswatini (SZ)
('SZ', 'Mbabane'),
('SZ', 'Mbabane'),
('SZ', 'Mbabane'),

-- Turks and Caicos Islands (TC)
('TC', 'Cockburn Town'),
('TC', 'Cockburn Town'),
('TC', 'Cockburn Town'),

-- Chad (TD)
('TD', 'N''Djamena'),
('TD', 'N''Djamena'),
('TD', 'N''Djamena'),

-- French Southern Territories (TF)
('TF', 'Port-aux-Français'),
('TF', 'Port-aux-Français'),
('TF', 'Port-aux-Français'),

-- Togo (TG)
('TG', 'Lomé'),
('TG', 'Lomé'),
('TG', 'Lomé'),

-- Thailand (TH)
('TH', 'Bangkok'),
('TH', 'Bangkok'),
('TH', 'Bangkok'),

-- Tajikistan (TJ)
('TJ', 'Dushanbe'),
('TJ', 'Dushanbe'),
('TJ', 'Dushanbe'),

-- Tokelau (TK)
('TK', 'Fakaofo'),
('TK', 'Fakaofo'),
('TK', 'Fakaofo'),

-- Timor-Leste (TL)
('TL', 'Dili'),
('TL', 'Dili'),
('TL', 'Dili'),

-- Turkmenistan (TM)
('TM', 'Ashgabat'),
('TM', 'Ashgabat'),
('TM', 'Ashgabat'),

-- Tunisia (TN)
('TN', 'Tunis'),
('TN', 'Tunis'),
('TN', 'Tunis'),

-- Tonga (TO)
('TO', 'Nuku''alofa'),
('TO', 'Nuku''alofa'),
('TO', 'Nuku''alofa'),

-- Turkey (TR)
('TR', 'Ankara'),
('TR', 'Ankara'),
('TR', 'Ankara'),

-- Trinidad and Tobago (TT)
('TT', 'Port of Spain'),
('TT', 'Port of Spain'),
('TT', 'Port of Spain'),

-- Tuvalu (TV)
('TV', 'Funafuti'),
('TV', 'Funafuti'),
('TV', 'Funafuti'),

-- Taiwan (TW)
('TW', 'Taipei'),
('TW', 'Taipei'),
('TW', 'Taipei'),

-- Tanzania (TZ)
('TZ', 'Dodoma'),
('TZ', 'Dodoma'),
('TZ', 'Dodoma'),

-- Ukraine (UA)
('UA', 'Kyiv'),
('UA', 'Kyiv'),
('UA', 'Kyiv'),

-- Uganda (UG)
('UG', 'Kampala'),
('UG', 'Kampala'),
('UG', 'Kampala'),

-- United States Minor Outlying Islands (UM)
('UM', 'Wake Island'),
('UM', 'Wake Island'),
('UM', 'Wake Island'),

-- United States (US)
('US', 'Washington, D.C.'),
('US', 'New York'),
('US', 'Los Angeles'),

-- Uruguay (UY)
('UY', 'Montevideo'),
('UY', 'Montevideo'),
('UY', 'Montevideo'),

-- Uzbekistan (UZ)
('UZ', 'Tashkent'),
('UZ', 'Tashkent'),
('UZ', 'Tashkent'),

-- Vatican City (VA)
('VA', 'Vatican City'),
('VA', 'Vatican City'),
('VA', 'Vatican City'),

-- Saint Vincent and the Grenadines (VC)
('VC', 'Kingstown'),

-- Venezuela (VE)
('VE', 'Caracas'),
('VE', 'Caracas'),
('VE', 'Caracas'),

-- British Virgin Islands (VG)
('VG', 'Road Town'),
('VG', 'Road Town'),
('VG', 'Road Town'),

-- U.S. Virgin Islands (VI)
('VI', 'Charlotte Amalie'),
('VI', 'Charlotte Amalie'),
('VI', 'Charlotte Amalie'),

-- Vietnam (VN)
('VN', 'Hanoi'),
('VN', 'Hanoi'),
('VN', 'Hanoi'),

-- Vanuatu (VU)
('VU', 'Port Vila'),
('VU', 'Port Vila'),
('VU', 'Port Vila'),

-- Wallis and Futuna (WF)
('WF', 'Mata-Utu'),
('WF', 'Mata-Utu'),
('WF', 'Mata-Utu'),

-- Samoa (WS)
('WS', 'Apia'),
('WS', 'Apia'),
('WS', 'Apia'),

-- Yemen (YE)
('YE', 'Sana''a'),
('YE', 'Sana''a'),
('YE', 'Sana''a'),

-- Mayotte (YT)
('YT', 'Mamoudzou'),
('YT', 'Mamoudzou'),
('YT', 'Mamoudzou'),

-- South Africa (ZA)
('ZA', 'Cape Town'),
('ZA', 'Cape Town'),
('ZA', 'Cape Town'),

-- Zambia (ZM)
('ZM', 'Lusaka'),
('ZM', 'Lusaka'),
('ZM', 'Lusaka'),

-- Zimbabwe (ZW)
('ZW', 'Harare'),
('ZW', 'Harare'),
('ZW', 'Harare');