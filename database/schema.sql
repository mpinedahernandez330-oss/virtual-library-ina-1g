-- =============================================================================
-- Virtual Library — Schema para XAMPP
-- Abrir phpMyAdmin en http://localhost/phpmyadmin
-- Ir a la pestana SQL y pegar todo este contenido
-- =============================================================================

CREATE DATABASE IF NOT EXISTS virtual_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE virtual_library;

-- Categorias
CREATE TABLE IF NOT EXISTS categories (
  id   INT         NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL UNIQUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO categories (name) VALUES
  ('Programacion'),('Literatura'),('Ciencia'),
  ('Historia'),('Matematicas'),('Arte'),('Filosofia');

-- Libros
CREATE TABLE IF NOT EXISTS books (
  id          INT           NOT NULL AUTO_INCREMENT,
  title       VARCHAR(120)  NOT NULL,
  author      VARCHAR(100)  NOT NULL,
  category    VARCHAR(60)   NOT NULL DEFAULT 'Programacion',
  year        SMALLINT      DEFAULT NULL,
  description TEXT          DEFAULT NULL,
  link        VARCHAR(500)  DEFAULT NULL,
  cover       VARCHAR(500)  DEFAULT NULL,
  color       VARCHAR(20)   DEFAULT '#1f8a70',
  available   TINYINT(1)    NOT NULL DEFAULT 1,
  favorite    TINYINT(1)    NOT NULL DEFAULT 0,
  featured    TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_category  (category),
  INDEX idx_featured  (featured),
  INDEX idx_available (available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO books (title, author, category, year, description, color, available, featured) VALUES
  ('Pinocho',                   'Carlo Collodi',             'Literatura',   1883, 'La historia del muneco de madera que suena con convertirse en un nino de verdad.', '#2d6cdf', 1, 1),
  ('Cenicienta',                'Charles Perrault',          'Literatura',   1697, 'El cuento de la joven bondadosa que gracias a su hada madrina encuentra el amor.',  '#d75a4a', 1, 1),
  ('Blancanieves',              'Hermanos Grimm',            'Literatura',   1812, 'Una princesa huye de su malvada madrastra y encuentra refugio con siete enanitos.', '#7c3aed', 1, 0),
  ('La Bella Durmiente',        'Charles Perrault',          'Literatura',   1697, 'Una princesa cae en un sueno profundo y solo el amor verdadero puede despertarla.', '#b7791f', 1, 0),
  ('La Caperucita Roja',        'Hermanos Grimm',            'Literatura',   1812, 'Una nina valiente enfrenta al lobo feroz en el camino hacia la casa de su abuela.', '#0f766e', 1, 0),
  ('El Principito',             'Antoine de Saint-Exupery', 'Literatura',   1943, 'Un joven principe viaja por el universo buscando el significado del amor y la amistad.', '#1f8a70', 1, 1),
  ('Codigo Limpio',             'Robert C. Martin',          'Programacion', 2008, 'Buenas practicas para crear programas claros, ordenados y faciles de mantener.',    '#1f8a70', 1, 0),
  ('Breve Historia del Tiempo', 'Stephen Hawking',           'Ciencia',      1988, 'Un recorrido accesible por el universo, los agujeros negros y el tiempo.',          '#b7791f', 1, 0),
  ('El Diario de Ana Frank',    'Ana Frank',                 'Historia',     1947, 'Testimonio personal de una joven durante la Segunda Guerra Mundial.',               '#d75a4a', 1, 0),
  ('Don Quijote de la Mancha',  'Miguel de Cervantes',       'Literatura',   1605, 'Las aventuras del caballero andante mas famoso de la literatura en espanol.',        '#2d6cdf', 1, 0);

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id          INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  plan        ENUM('free','silver','diamond') NOT NULL DEFAULT 'free',
  plan_expiry DATETIME     DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO users (name, email, password, plan) VALUES
  ('Estudiante Demo',   'demo@gmail.com',    '123456', 'free'),
  ('Usuario Plata',     'plata@gmail.com',   '123456', 'silver'),
  ('Usuario Diamante',  'diamante@gmail.com','123456', 'diamond');

-- Resenas
CREATE TABLE IF NOT EXISTS reviews (
  id         INT      NOT NULL AUTO_INCREMENT,
  book_id    INT      NOT NULL,
  user_id    INT      NOT NULL,
  rating     TINYINT  NOT NULL,
  text       TEXT     DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_book (user_id, book_id),
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Historial de lectura
CREATE TABLE IF NOT EXISTS reading_history (
  id      INT      NOT NULL AUTO_INCREMENT,
  user_id INT      NOT NULL,
  book_id INT      NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user (user_id),
  INDEX idx_book (book_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vista estadisticas
CREATE OR REPLACE VIEW v_book_stats AS
SELECT
  b.id, b.title, b.author, b.category,
  COUNT(DISTINCT h.id)   AS total_reads,
  COUNT(DISTINCT r.id)   AS total_reviews,
  ROUND(AVG(r.rating),1) AS avg_rating
FROM books b
LEFT JOIN reading_history h ON h.book_id = b.id
LEFT JOIN reviews r          ON r.book_id = b.id
GROUP BY b.id;
