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
('مصيف موسمي', 'SEA');

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
('نالوت', 'NLT');

-- المدن وربطها بالبلديات
INSERT INTO cities (municipality_id, name_ar) VALUES
(1, 'طرابلس'),
(2, 'حي الأندلس'),
(3, 'تاجوراء'),
(4, 'جنزور'),
(5, 'بنغازي'),
(6, 'مصراتة'),
(7, 'الخمس'),
(8, 'زوارة'),
(9, 'صبراتة'),
(10, 'شحات'),
(11, 'درنة'),
(12, 'طبرق'),
(13, 'سبها'),
(14, 'غدامس'),
(15, 'غريان'),
(16, 'نالوت');

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