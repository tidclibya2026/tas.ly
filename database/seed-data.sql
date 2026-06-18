-- =========================================================
-- TAS.LY - Seed Data
-- بيانات أولية لمنظومة الإيواء السياحي الليبية
-- =========================================================

-- أنواع منشآت الإيواء
INSERT INTO facility_types (name_ar, code) VALUES
('فندق', 'HOT'),
('قرية سياحية', 'VIL'),
('منتجع', 'RES'),
('شقق فندقية', 'APT'),
('نزل', 'HST'),
('مصيف موسمي', 'SEA')
ON CONFLICT (code) DO NOTHING;

-- البلديات الأساسية
INSERT INTO municipalities (name_ar, code) VALUES
('طرابلس المركز', 'TRP'),
('حي الأندلس', 'AND'),
('تاجوراء', 'TAJ'),
('جنزور', 'JAN'),
('بنغازي', 'BEN'),
('مصراتة', 'MIS'),
('الخمس', 'KHM'),
('زوارة', 'ZWR'),
('صبراتة', 'SBR'),
('شحات', 'SHA'),
('درنة', 'DRN'),
('طبرق', 'TBR'),
('سبها', 'SEB'),
('غدامس', 'GHD'),
('غريان', 'GRY'),
('نالوت', 'NLT')
ON CONFLICT (code) DO NOTHING;

-- المدن وربطها بالبلديات
INSERT INTO cities (municipality_id, name_ar)
SELECT m.id, v.name_ar
FROM (
    VALUES
        ('TRP', 'طرابلس'),
        ('AND', 'حي الأندلس'),
        ('TAJ', 'تاجوراء'),
        ('JAN', 'جنزور'),
        ('BEN', 'بنغازي'),
        ('MIS', 'مصراتة'),
        ('KHM', 'الخمس'),
        ('ZWR', 'زوارة'),
        ('SBR', 'صبراتة'),
        ('SHA', 'شحات'),
        ('DRN', 'درنة'),
        ('TBR', 'طبرق'),
        ('SEB', 'سبها'),
        ('GHD', 'غدامس'),
        ('GRY', 'غريان'),
        ('NLT', 'نالوت')
) AS v(municipality_code, name_ar)
JOIN municipalities m ON m.code = v.municipality_code
WHERE NOT EXISTS (
    SELECT 1
    FROM cities c
    WHERE c.municipality_id = m.id
      AND c.name_ar = v.name_ar
);

-- مستخدم مدير النظام التجريبي
-- ملاحظة: كلمة المرور هنا نص تجريبي، وفي النظام الحقيقي يجب حفظها مشفرة
INSERT INTO users (full_name, email, password_hash, role, status) VALUES
('مدير النظام', 'admin@tourism.gov.ly', 'CHANGE_THIS_PASSWORD_HASH', 'admin', 'active');

-- منشأة تجريبية أولى
INSERT INTO facilities (
    facility_code,
    name_ar,
    facility_type_id,
    municipality_id,
    city_id,
    address,
    latitude,
    longitude,
    owner_name,
    manager_name,
    phone,
    email,
    classification,
    affiliation,
    operational_status,
    data_status
) VALUES (
    'LY-ACC-HOT-TRP-000001',
    'فندق تجريبي',
    1,
    1,
    1,
    'طرابلس',
    32.8872000,
    13.1913000,
    'مالك تجريبي',
    'مدير تجريبي',
    '0910000000',
    'hotel@example.com',
    'ثلاث نجوم',
    'خاص',
    'يعمل',
    'approved'
);

-- الطاقة الاستيعابية للمنشأة التجريبية
INSERT INTO facility_capacity (
    facility_id,
    suites_count,
    rooms_count,
    beds_count,
    chalets_count,
    apartments_count,
    local_workers,
    foreign_workers,
    effective_from
) VALUES (
    1,
    5,
    80,
    160,
    0,
    0,
    20,
    5,
    CURRENT_DATE
);

-- ترخيص تجريبي
INSERT INTO licenses (
    facility_id,
    license_number,
    license_type,
    issue_date,
    expiry_date,
    license_status,
    renewal_count
) VALUES (
    1,
    'LY-LIC-2026-000001',
    'إذن مزاولة',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    'Active',
    0
);

-- مرافق أولية من ملف data/facilities.json
INSERT INTO facilities (
    facility_code,
    name_ar,
    facility_type_id,
    municipality_id,
    city_id,
    address,
    owner_name,
    manager_name,
    phone,
    classification,
    affiliation,
    operational_status,
    data_status
)
SELECT
    v.facility_code,
    v.name_ar,
    ft.id,
    m.id,
    c.id,
    v.address,
    v.owner_name,
    v.manager_name,
    v.phone,
    v.classification,
    v.affiliation,
    v.operational_status,
    'approved'
FROM (
    VALUES
        ('LY-ACC-HOT-BEN-000001', 'فندق الريان', 'HOT', 'BEN', 'بنغازي', 'بنغازي', 'محمد علي', 'أحمد سالم', '094-0834000', 'ثلاث نجوم', 'خاص', 'يعمل'),
        ('LY-ACC-RES-BEN-000002', 'منتجع الماسة', 'RES', 'BEN', 'بنغازي', 'بنغازي', 'علي حسن', 'خالد عمر', '092-4737500', 'أربع نجوم', 'خاص', 'يعمل'),
        ('LY-ACC-APT-BEN-000003', 'شقق العون', 'APT', 'BEN', 'بنغازي', 'بنغازي', 'بدر سالم', 'يوسف بدر', '094-5565545', 'نجمتان', 'خاص', 'يعمل')
) AS v(facility_code, name_ar, facility_type_code, municipality_code, city_name_ar, address, owner_name, manager_name, phone, classification, affiliation, operational_status)
JOIN facility_types ft ON ft.code = v.facility_type_code
JOIN municipalities m ON m.code = v.municipality_code
JOIN cities c ON c.municipality_id = m.id AND c.name_ar = v.city_name_ar
ON CONFLICT (facility_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    facility_type_id = EXCLUDED.facility_type_id,
    municipality_id = EXCLUDED.municipality_id,
    city_id = EXCLUDED.city_id,
    address = EXCLUDED.address,
    owner_name = EXCLUDED.owner_name,
    manager_name = EXCLUDED.manager_name,
    phone = EXCLUDED.phone,
    classification = EXCLUDED.classification,
    affiliation = EXCLUDED.affiliation,
    operational_status = EXCLUDED.operational_status,
    data_status = EXCLUDED.data_status,
    updated_at = CURRENT_TIMESTAMP;

-- الطاقة الاستيعابية للمرافق الأولية
UPDATE facility_capacity fc
SET
    suites_count = v.suites_count,
    rooms_count = v.rooms_count,
    beds_count = v.beds_count,
    chalets_count = v.chalets_count,
    apartments_count = v.apartments_count,
    local_workers = v.local_workers,
    foreign_workers = v.foreign_workers
FROM (
    VALUES
        ('LY-ACC-HOT-BEN-000001', 0, 80, 160, 0, 0, 20, 5),
        ('LY-ACC-RES-BEN-000002', 0, 50, 100, 20, 0, 30, 10),
        ('LY-ACC-APT-BEN-000003', 0, 30, 60, 0, 15, 15, 3)
) AS v(facility_code, suites_count, rooms_count, beds_count, chalets_count, apartments_count, local_workers, foreign_workers)
JOIN facilities f ON f.facility_code = v.facility_code
WHERE fc.facility_id = f.id;

INSERT INTO facility_capacity (
    facility_id,
    suites_count,
    rooms_count,
    beds_count,
    chalets_count,
    apartments_count,
    local_workers,
    foreign_workers,
    effective_from
)
SELECT
    f.id,
    v.suites_count,
    v.rooms_count,
    v.beds_count,
    v.chalets_count,
    v.apartments_count,
    v.local_workers,
    v.foreign_workers,
    CURRENT_DATE
FROM (
    VALUES
        ('LY-ACC-HOT-BEN-000001', 0, 80, 160, 0, 0, 20, 5),
        ('LY-ACC-RES-BEN-000002', 0, 50, 100, 20, 0, 30, 10),
        ('LY-ACC-APT-BEN-000003', 0, 30, 60, 0, 15, 15, 3)
) AS v(facility_code, suites_count, rooms_count, beds_count, chalets_count, apartments_count, local_workers, foreign_workers)
JOIN facilities f ON f.facility_code = v.facility_code
WHERE NOT EXISTS (
    SELECT 1
    FROM facility_capacity fc
    WHERE fc.facility_id = f.id
);

-- تراخيص أولية للمرافق الموجودة في ملف البيانات
INSERT INTO licenses (
    facility_id,
    license_number,
    license_type,
    issue_date,
    expiry_date,
    license_status,
    renewal_count
)
SELECT
    f.id,
    v.license_number,
    'إذن مزاولة',
    v.issue_date,
    v.expiry_date,
    v.license_status,
    0
FROM (
    VALUES
        ('LY-ACC-HOT-BEN-000001', 'LY-LIC-2026-000002', DATE '2026-01-01', DATE '2026-12-31', 'Active'),
        ('LY-ACC-RES-BEN-000002', 'LY-LIC-2026-000003', DATE '2026-01-01', DATE '2026-12-31', 'Active'),
        ('LY-ACC-APT-BEN-000003', 'LY-LIC-2026-000004', DATE '2026-01-01', DATE '2026-12-31', 'Active')
) AS v(facility_code, license_number, issue_date, expiry_date, license_status)
JOIN facilities f ON f.facility_code = v.facility_code
ON CONFLICT (license_number) DO UPDATE SET
    facility_id = EXCLUDED.facility_id,
    license_type = EXCLUDED.license_type,
    issue_date = EXCLUDED.issue_date,
    expiry_date = EXCLUDED.expiry_date,
    license_status = EXCLUDED.license_status,
    renewal_count = EXCLUDED.renewal_count;
