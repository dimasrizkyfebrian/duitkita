-- Accounts / wallets (Feature A) — financial institution master data
--
-- There is no API for this table on purpose: banks and e-wallets are added
-- rarely, so they are maintained here instead. Run after 002_accounts.sql,
-- in every environment (development too — AutoMigrate creates the table but
-- never fills it).
--
-- Safe to re-run, and meant to be: rows are upserted by code, so adding a new
-- institution or renaming one is "edit this file, run it again". Never change
-- an existing code — accounts reference the row by id, but code is how this
-- file finds the row to update, so a changed code inserts a duplicate.
-- To retire an institution set is_active = false rather than deleting the
-- row: accounts already pointing at it keep working, it just stops being
-- offered for new accounts.
--
-- Logos: logo_path points at duitkita-web/public/institutions/<code>.svg.
-- A missing file is fine — the app falls back to the institution's initials —
-- so logos can be added one at a time. If a logo ends up as a .png instead,
-- change its path here and re-run.
--
-- sort_order: lower comes first in the picker. Gaps of 10 leave room to slot
-- new rows in without renumbering.

INSERT INTO public.financial_institutions (code, name, type, logo_path, sort_order, is_active)
VALUES
    -- Cash
    ('cash',        'Tunai',              'cash',    NULL,                            0,   true),

    -- Banks
    ('bca',         'BCA',                'bank',    '/institutions/bca.svg',         10,  true),
    ('bri',         'BRI',                'bank',    '/institutions/bri.svg',         20,  true),
    ('mandiri',     'Bank Mandiri',       'bank',    '/institutions/mandiri.svg',     30,  true),
    ('bni',         'BNI',                'bank',    '/institutions/bni.svg',         40,  true),
    ('bsi',         'BSI',                'bank',    '/institutions/bsi.svg',         50,  true),
    ('cimb',        'CIMB Niaga',         'bank',    '/institutions/cimb.svg',        60,  true),
    ('permata',     'PermataBank',        'bank',    '/institutions/permata.svg',     70,  true),
    ('danamon',     'Danamon',            'bank',    '/institutions/danamon.svg',     80,  true),
    ('ocbc',        'OCBC',               'bank',    '/institutions/ocbc.svg',        90,  true),
    ('maybank',     'Maybank',            'bank',    '/institutions/maybank.svg',     100, true),
    ('panin',       'Panin Bank',         'bank',    '/institutions/panin.svg',       110, true),
    ('btn',         'BTN',                'bank',    '/institutions/btn.svg',         120, true),
    ('mega',        'Bank Mega',          'bank',    '/institutions/mega.svg',        130, true),
    ('bankdki',     'Bank DKI',           'bank',    '/institutions/bankdki.svg',     140, true),
    ('bjb',         'bank bjb',           'bank',    '/institutions/bjb.svg',         150, true),
    ('bankjatim',   'Bank Jatim',         'bank',    '/institutions/bankjatim.svg',   160, true),
    ('bankjateng',  'Bank Jateng',        'bank',    '/institutions/bankjateng.svg',  170, true),

    -- Digital banks / digital spin-offs with their own account
    ('blu',         'blu by BCA Digital', 'bank',    '/institutions/blu.svg',         300, true),
    ('wondr',       'wondr by BNI',       'bank',    '/institutions/wondr.svg',       310, true),
    ('jago',        'Bank Jago',          'bank',    '/institutions/jago.svg',        320, true),
    ('jenius',      'Jenius',             'bank',    '/institutions/jenius.svg',      330, true),
    ('seabank',     'SeaBank',            'bank',    '/institutions/seabank.svg',     340, true),
    ('allo',        'Allo Bank',          'bank',    '/institutions/allo.svg',        350, true),
    ('neobank',     'neobank',            'bank',    '/institutions/neobank.svg',     360, true),
    ('superbank',   'Superbank',          'bank',    '/institutions/superbank.svg',   370, true),
    ('bankraya',    'Bank Raya',          'bank',    '/institutions/bankraya.svg',    380, true),
    ('saqu',        'Saqu',               'bank',    '/institutions/saqu.svg',        390, true),
    ('krom',        'Krom',               'bank',    '/institutions/krom.svg',        400, true),
    ('hana',        'Hana Bank',          'bank',    '/institutions/hana.svg',        410, true),
    ('aladin',      'Bank Aladin Syariah','bank',    '/institutions/aladin.svg',      440, true),

    -- E-wallets
    ('gopay',       'GoPay',              'ewallet', '/institutions/gopay.svg',       600, true),
    ('ovo',         'OVO',                'ewallet', '/institutions/ovo.svg',         610, true),
    ('dana',        'DANA',               'ewallet', '/institutions/dana.svg',        620, true),
    ('shopeepay',   'ShopeePay',          'ewallet', '/institutions/shopeepay.svg',   630, true),
    ('linkaja',     'LinkAja',            'ewallet', '/institutions/linkaja.svg',     640, true),
    ('isaku',       'i.saku',             'ewallet', '/institutions/isaku.svg',       650, true),
    ('doku',        'DOKU',               'ewallet', '/institutions/doku.svg',        680, true),
    ('flip',        'Flip',               'ewallet', '/institutions/flip.svg',        690, true),

    -- E-money cards
    ('brizzi',         'BRIZZI',            'ewallet', '/institutions/brizzi.svg',         700, true),
    ('flazz',          'Flazz BCA',         'ewallet', '/institutions/flazz.svg',          710, true),
    ('mandiri_emoney', 'Mandiri e-money',   'ewallet', '/institutions/mandiri_emoney.svg', 720, true),
    ('tapcash',        'TapCash',           'ewallet', '/institutions/tapcash.svg',        730, true)
ON CONFLICT (code) DO UPDATE SET
    name       = EXCLUDED.name,
    type       = EXCLUDED.type,
    logo_path  = EXCLUDED.logo_path,
    sort_order = EXCLUDED.sort_order,
    is_active  = EXCLUDED.is_active;
