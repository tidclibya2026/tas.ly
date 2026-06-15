-- =========================================================
-- TAS.LY - Tourism Accommodation System Libya
-- Database Schema - Version 1
-- منظومة الإيواء السياحي الليبية
-- =========================================================

-- جدول أنواع منشآت الإيواء
CREATE TABLE facility_types (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL
);

-- جدول البلديات
CREATE TABLE municipalities (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL
);

-- جدول المدن
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    municipality_id INT REFERENCES municipalities(id),
    name_ar VARCHAR(150) NOT NULL
);

-- جدول المنشآت الرئيسي
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    facility_code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    facility_type_id INT REFERENCES facility_types(id),
    municipality_id INT REFERENCES municipalities(id),
    city_id INT REFERENCES cities(id),

    address TEXT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    owner_name VARCHAR(255),
    operator_name VARCHAR(255),
    manager_name VARCHAR(255),

    phone VARCHAR(50),
    email VARCHAR(150),
    website VARCHAR(255),

    classification VARCHAR(50),
    affiliation VARCHAR(50),
    operational_status VARCHAR(50),

    establishment_date DATE,
    data_status VARCHAR(50) DEFAULT 'draft',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الطاقة الاستيعابية
CREATE TABLE facility_capacity (
    id SERIAL PRIMARY KEY,
    facility_id INT REFERENCES facilities(id) ON DELETE CASCADE,

    suites_count INT DEFAULT 0,
    rooms_count INT DEFAULT 0,
    beds_count INT DEFAULT 0,
    chalets_count INT DEFAULT 0,
    apartments_count INT DEFAULT 0,

    local_workers INT DEFAULT 0,
    foreign_workers INT DEFAULT 0,

    effective_from DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول التراخيص
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    facility_id INT REFERENCES facilities(id) ON DELETE CASCADE,

    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_type VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    license_status VARCHAR(50),

    renewal_count INT DEFAULT 0,
    certificate_file VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول التصنيف السياحي
CREATE TABLE classifications (
    id SERIAL PRIMARY KEY,
    facility_id INT REFERENCES facilities(id) ON DELETE CASCADE,

    old_classification VARCHAR(50),
    new_classification VARCHAR(50),

    classification_date DATE,
    inspection_date DATE,

    committee_report_file VARCHAR(255),
    reasons TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول التفتيش والرقابة
CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    facility_id INT REFERENCES facilities(id) ON DELETE CASCADE,

    inspection_date DATE NOT NULL,
    inspection_type VARCHAR(100),
    inspector_name VARCHAR(255),

    result VARCHAR(100),
    violations TEXT,
    recommendations TEXT,
    follow_up_date DATE,

    status VARCHAR(50),
    report_file VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الإشغال الشهري والليالي السياحية
CREATE TABLE monthly_occupancy (
    id SERIAL PRIMARY KEY,
    facility_id INT REFERENCES facilities(id) ON DELETE CASCADE,

    year INT NOT NULL,
    month INT NOT NULL,

    available_rooms INT DEFAULT 0,
    available_beds INT DEFAULT 0,

    rented_room_nights INT DEFAULT 0,
    guest_nights INT DEFAULT 0,

    libyan_guests INT DEFAULT 0,
    arab_guests INT DEFAULT 0,
    foreign_guests INT DEFAULT 0,

    room_income DECIMAL(14,2) DEFAULT 0,
    occupancy_rate DECIMAL(5,2),

    report_status VARCHAR(50) DEFAULT 'draft',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(facility_id, year, month)
);

-- جدول المستندات والمرفقات
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,

    facility_id INT REFERENCES facilities(id) ON DELETE CASCADE,
    license_id INT REFERENCES licenses(id) ON DELETE SET NULL,

    document_type VARCHAR(100),
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    mime_type VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول المستخدمين
CREATE TABLE users (
    id SERIAL PRIMARY KEY,

    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    role VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل العمليات
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,

    user_id INT REFERENCES users(id),
    action VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id INT,

    old_value TEXT,
    new_value TEXT,

    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- بيانات أولية
-- =========================================================


INSERT INTO facility_types (name_ar, code) VALUES
('فندق', 'HOT'),
('قرية سياحية', 'VIL'),
('منتجع', 'RES'),
('شقق فندقية', 'APT'),
('نزل', 'HST'),
('مصيف موسمي', 'SEA');

INSERT INTO municipalities (name_ar, code) VALUES
('طرابلس المركز', 'TRP'),
('بنغازي', 'BEN'),
('مصراتة', 'MIS'),
('الخمس', 'KHM'),
('زوارة', 'ZWR'),
('شحات', 'SHA'),
('سبها', 'SEB');
INSERT INTO facility_types ...