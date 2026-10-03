-- =============================================================================
-- DOMCity: the notes of the refused sites list, in English
--
-- The note column of blocked_domains says under which heading an entry is filed.
-- The previous migration filled it in French; like category, it is in
-- English (Videos, French banks...). Entries added by hand are not touched.
-- Re-runnable: once translated, the notes no longer match anything here.
-- =============================================================================

update public.blocked_domains b
   set note = m.en
  from (values
  ('Vidéos', 'Videos'),
  ('Webcams', 'Webcams'),
  ('Abonnements et créateurs', 'Subscriptions and creators'),
  ('Studios', 'Studios'),
  ('Dessins et jeux', 'Drawings and games'),
  ('Images et forums', 'Images and forums'),
  ('Récits érotiques', 'Erotic stories'),
  ('Rencontres pour adultes et escortes', 'Adult dating and escorts'),
  ('Serveurs d''images et régies publicitaires pour adultes', 'Adult image servers and ad networks'),
  ('Extensions réservées aux adultes', 'Adult top-level domains'),
  ('Images choquantes', 'Shock sites'),
  ('Banques françaises', 'French banks'),
  ('Crédit agricole : caisses régionales', 'Credit Agricole regional banks'),
  ('Néobanques et banques en ligne', 'Neobanks and online banks'),
  ('Crédit à la consommation', 'Consumer credit'),
  ('Banques européennes', 'European banks'),
  ('Royaume-Uni', 'United Kingdom'),
  ('États-Unis', 'United States'),
  ('Canada', 'Canada'),
  ('Amérique latine', 'Latin America'),
  ('Afrique et Moyen-Orient', 'Africa and Middle East'),
  ('Asie et Océanie', 'Asia and Oceania'),
  ('Banques internationales', 'International banks'),
  ('Paiement et transfert d''argent', 'Payments and money transfers'),
  ('Bourse et placements', 'Brokers and investing'),
  ('Cryptomonnaies', 'Cryptocurrencies'),
  ('Assurances', 'Insurance'),
  ('Crédit et solvabilité', 'Credit bureaus'),
  ('Extensions des banques et assurances', 'Bank and insurance top-level domains'),
  ('Messageries', 'Email'),
  ('Discussions', 'Messaging'),
  ('Comptes et connexion', 'Accounts and sign-in'),
  ('Documents et stockage en ligne', 'Documents and cloud storage'),
  ('Mots de passe', 'Password managers'),
  ('Impôts et administration', 'Taxes and government'),
  ('Sécurité sociale, emploi et retraite', 'Social security, jobs and pensions'),
  ('Santé', 'Health'),
  ('Scolarité', 'School'),
  ('Espaces clients des opérateurs', 'Telecom customer accounts'),
  ('Rencontres', 'Dating'),
  ('Paris sportifs et poker en France', 'Betting and poker in France'),
  ('Paris et poker dans le monde', 'Betting and poker worldwide'),
  ('Casinos en ligne', 'Online casinos'),
  ('Loteries', 'Lotteries'),
  ('Extensions des jeux d''argent', 'Gambling top-level domains'),
  ('Pistage d''adresses IP', 'IP loggers'),
  ('Logiciels espions', 'Spyware'),
  ('Téléchargements piratés', 'Piracy downloads')
  ) as m (fr, en)
 where b.note = m.fr;
