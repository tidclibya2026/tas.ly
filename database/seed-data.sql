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
    classification,
    operational_status,
    data_status
)
SELECT
    v.facility_code,
    v.name_ar,
    ft.id,
    m.id,
    c.id,
    v.city_name_ar,
    v.classification,
    v.operational_status,
    'approved'
FROM (
    VALUES
        ('LY-ACC-HOT-BEN-000001', 'فندق الريان', 'HOT', 'BEN', 'بنغازي', 'ثلاث نجوم', 'يعمل'),
        ('LY-ACC-RES-BEN-000002', 'منتجع الماسة', 'RES', 'BEN', 'بنغازي', 'أربع نجوم', 'يعمل'),
        ('LY-ACC-APT-BEN-000003', 'شقق العون', 'APT', 'BEN', 'بنغازي', 'نجمتان', 'يعمل')
) AS v(facility_code, name_ar, facility_type_code, municipality_code, city_name_ar, classification, operational_status)
JOIN facility_types ft ON ft.code = v.facility_type_code
JOIN municipalities m ON m.code = v.municipality_code
JOIN cities c ON c.municipality_id = m.id AND c.name_ar = v.city_name_ar
ON CONFLICT (facility_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    facility_type_id = EXCLUDED.facility_type_id,
    municipality_id = EXCLUDED.municipality_id,
    city_id = EXCLUDED.city_id,
    address = EXCLUDED.address,
    classification = EXCLUDED.classification,
    operational_status = EXCLUDED.operational_status,
    data_status = EXCLUDED.data_status,
    updated_at = CURRENT_TIMESTAMP;

-- الطاقة الاستيعابية للمرافق الأولية
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
    0,
    v.rooms_count,
    v.beds_count,
    0,
    0,
    0,
    0,
    CURRENT_DATE
FROM (
    VALUES
        ('LY-ACC-HOT-BEN-000001', 80, 160),
        ('LY-ACC-RES-BEN-000002', 50, 100),
        ('LY-ACC-APT-BEN-000003', 30, 60)
) AS v(facility_code, rooms_count, beds_count)
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
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    v.license_status,
    0
FROM (
    VALUES
        ('LY-ACC-HOT-BEN-000001', 'LY-LIC-2026-000002', 'Active'),
        ('LY-ACC-RES-BEN-000002', 'LY-LIC-2026-000003', 'Active'),
        ('LY-ACC-APT-BEN-000003', 'LY-LIC-2026-000004', 'Active')
) AS v(facility_code, license_number, license_status)
JOIN facilities f ON f.facility_code = v.facility_code
ON CONFLICT (license_number) DO UPDATE SET
    facility_id = EXCLUDED.facility_id,
    license_type = EXCLUDED.license_type,
    expiry_date = EXCLUDED.expiry_date,
    license_status = EXCLUDED.license_status,
    renewal_count = EXCLUDED.renewal_count;
