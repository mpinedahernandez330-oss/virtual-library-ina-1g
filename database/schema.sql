-- ============================================================
-- Virtual Library INA 1G — Schema para Laragon / HeidiSQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS virtual_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE virtual_library;

-- Administradores
CREATE TABLE IF NOT EXISTS administradores (
  id        INT          NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  usuario   VARCHAR(150) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,
  activo    TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO administradores (nombre, apellidos, usuario, password) VALUES
  ('Jose David',      'Maravilla Pena',      'jose david maravilla pena',       '0310223542'),
  ('Josue Nahum',     'Villanueva Mendoza',  'josue nahum villanueva mendoza',   '0310223542'),
  ('Brayan Alexander','Garcia Fernandez',    'brayan alexander garcia fernandez','0310223542'),
  ('Miguel Antonio',  'Pineda Hernandez',    'miguel antonio pineda hernandez',  '0310223542');

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id     INT         NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO categorias (nombre) VALUES
  ('Programacion'),('Literatura'),('Ciencia'),
  ('Historia'),('Matematicas'),('Arte'),('Filosofia');

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT          NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100) NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  plan        ENUM('free','silver','diamond') NOT NULL DEFAULT 'free',
  plan_expiry BIGINT       DEFAULT NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO usuarios (nombre, email, password, plan) VALUES
  ('Estudiante Demo',   'demo@gmail.com',    '123456', 'free'),
  ('Usuario Plata',     'plata@gmail.com',   '123456', 'silver'),
  ('Usuario Diamante',  'diamante@gmail.com','123456', 'diamond');

-- Libros
CREATE TABLE IF NOT EXISTS libros (
  id          VARCHAR(30)  NOT NULL,
  titulo      VARCHAR(120) NOT NULL,
  autor       VARCHAR(100) NOT NULL,
  categoria   VARCHAR(60)  DEFAULT NULL,
  anio        SMALLINT     DEFAULT NULL,
  descripcion TEXT         DEFAULT NULL,
  enlace      VARCHAR(500) DEFAULT NULL,
  disponible  TINYINT(1)   NOT NULL DEFAULT 1,
  portada     VARCHAR(500) DEFAULT NULL,
  color       VARCHAR(20)  DEFAULT '#1f8a70',
  favorito    TINYINT(1)   NOT NULL DEFAULT 0,
  destacado   TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_categoria (categoria),
  INDEX idx_destacado (destacado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO libros (id, titulo, autor, categoria, anio, descripcion, color, disponible, destacado) VALUES
  ('1', 'Pinocho',                  'Carlo Collodi',            'Literatura',   1883, 'La historia del muneco de madera que suena con convertirse en un nino de verdad.', '#2d6cdf', 1, 1),
  ('2', 'Cenicienta',               'Charles Perrault',         'Literatura',   1697, 'El cuento de la joven bondadosa que gracias a su hada madrina encuentra el amor.',  '#d75a4a', 1, 1),
  ('3', 'Blancanieves',             'Hermanos Grimm',           'Literatura',   1812, 'Una princesa huye de su malvada madrastra y encuentra refugio con siete enanitos.', '#7c3aed', 1, 0),
  ('4', 'La Bella Durmiente',       'Charles Perrault',         'Literatura',   1697, 'Una princesa cae en un sueno profundo y solo el amor verdadero puede despertarla.', '#b7791f', 1, 0),
  ('5', 'La Caperucita Roja',       'Hermanos Grimm',           'Literatura',   1812, 'Una nina valiente enfrenta al lobo feroz en el camino hacia la casa de su abuela.', '#0f766e', 1, 0),
  ('6', 'El Principito',            'Antoine de Saint-Exupery', 'Literatura',   1943, 'Un joven principe viaja por el universo buscando el significado del amor y la amistad.', '#1f8a70', 1, 1),
  ('7', 'Codigo Limpio',            'Robert C. Martin',         'Programacion', 2008, 'Buenas practicas para crear programas claros, ordenados y faciles de mantener.', '#1f8a70', 1, 0),
  ('8', 'Breve Historia del Tiempo','Stephen Hawking',          'Ciencia',      1988, 'Un recorrido accesible por el universo, los agujeros negros y el tiempo.', '#b7791f', 1, 0),
  ('9', 'El Diario de Ana Frank',   'Ana Frank',                'Historia',     1947, 'Testimonio personal de una joven durante la Segunda Guerra Mundial.', '#d75a4a', 1, 0),
  ('10','Don Quijote de la Mancha', 'Miguel de Cervantes',      'Literatura',   1605, 'Las aventuras del caballero andante mas famoso de la literatura en espanol.', '#2d6cdf', 1, 0);

-- Resenas
CREATE TABLE IF NOT EXISTS resenas (
  id           INT      NOT NULL AUTO_INCREMENT,
  libro_id     VARCHAR(30) NOT NULL,
  user_email   VARCHAR(120) NOT NULL,
  nombre       VARCHAR(100) NOT NULL,
  calificacion TINYINT  NOT NULL DEFAULT 5,
  texto        TEXT     DEFAULT NULL,
  fecha        BIGINT   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_libro_user (libro_id, user_email),
  FOREIGN KEY (libro_id)   REFERENCES libros(id)    ON DELETE CASCADE,
  FOREIGN KEY (user_email) REFERENCES usuarios(email) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Historial de lecturas
CREATE TABLE IF NOT EXISTS historial_lecturas (
  id         INT         NOT NULL AUTO_INCREMENT,
  user_email VARCHAR(120) NOT NULL,
  libro_id   VARCHAR(30)  NOT NULL,
  leido_en   BIGINT       NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_user  (user_email),
  INDEX idx_libro (libro_id),
  FOREIGN KEY (user_email) REFERENCES usuarios(email) ON DELETE CASCADE,
  FOREIGN KEY (libro_id)   REFERENCES libros(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vista estadisticas
CREATE OR REPLACE VIEW v_book_stats AS
SELECT
  l.id, l.titulo, l.autor, l.categoria,
  COUNT(DISTINCT h.id)   AS total_lecturas,
  COUNT(DISTINCT r.id)   AS total_resenas,
  ROUND(AVG(r.calificacion),1) AS promedio
FROM libros l
LEFT JOIN historial_lecturas h ON h.libro_id = l.id
LEFT JOIN resenas r             ON r.libro_id = l.id
GROUP BY l.id;
