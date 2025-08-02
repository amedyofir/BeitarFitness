-- Update squad_players table with sample profile picture URLs for testing
-- Note: Replace these URLs with actual profile picture URLs when available

-- Using different placeholder services for better reliability
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=1' WHERE player_id = '226640a5-fb1a-4bfc-ba28-c35032b10ded'; -- Omer Atzili
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=2' WHERE player_id = '18b6f89f-16d8-459d-81fc-66336261965d'; -- Yarden Cohen
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=3' WHERE player_id = 'c368170d-a759-4aa3-ace7-09f8718910c8'; -- Nehorai Dabush
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=4' WHERE player_id = 'ba754fa4-21a1-4874-9846-e18ffb5d1c51'; -- Ori Dahan
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=5' WHERE player_id = 'a213a09d-08e1-4598-a76e-afd7f062bd5c'; -- Liel Deri
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=6' WHERE player_id = '397d7b0b-cbd0-4efc-8625-21907161f971'; -- Jhonboco Kalu
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=7' WHERE player_id = '5acb478a-e5f1-4b96-96cf-1ea590c6f6c5'; -- Silva Kani
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=8' WHERE player_id = 'be863d21-2be7-4d37-8b5c-f198fe9b3ed3'; -- Brayen Karabali
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=9' WHERE player_id = '6de13d20-0bcb-43e2-b205-edf236e144b0'; -- Nadav Markovich
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=10' WHERE player_id = '07dda858-6741-45ea-8802-f786786be204'; -- Dor Micha
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=11' WHERE player_id = '5912e577-63cd-4d22-916a-8a1f1d7869fb'; -- Leon Mizrahi
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=12' WHERE player_id = 'ea400188-4cca-4c98-9b18-3c097f8968a7'; -- Gregory Morozov
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=13' WHERE player_id = 'fba1b6fb-ce9c-4680-89d8-2073e9e29cb0'; -- Timothy Mozi
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=14' WHERE player_id = 'a50ad460-51a7-4668-a2b5-fed5ed5c064b'; -- Yarden Shua
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=15' WHERE player_id = '7b5060f5-21c3-475a-b096-38bde1c60666'; -- Ailison Tavares
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=16' WHERE player_id = '3df067d9-1140-4527-9706-c73c32eb0634'; -- Levi Yarin
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=17' WHERE player_id = 'fc85d303-d147-4e9c-807c-f41caf738bd7'; -- Aviel Zargari
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=18' WHERE player_id = '98a1a78d-bebd-4e7b-b787-09bdc41cbb5b'; -- Zohar Zesano
UPDATE squad_players SET profile_picture_url = 'https://picsum.photos/150/150?random=19' WHERE player_id = 'dbe82a20-d6e6-4526-b82d-e3d24f7a0b40'; -- Adi yona

-- Verify the updates
SELECT player_id, first_name, last_name, profile_picture_url 
FROM squad_players 
WHERE profile_picture_url IS NOT NULL
ORDER BY first_name, last_name; 