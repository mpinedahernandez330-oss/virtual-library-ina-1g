-- Schema para Aiven (sin CREATE DATABASE ni USE)

CREATE TABLE IF NOT EXISTS categories (
  id   INT         NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL UNIQUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO categories (name) VALUES
  ('Programacion'),('Literatura'),('Ciencia'),
  ('Historia'),('Matematicas'),('Arte'),('Filosofia');

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
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO books (title, author, category, year, description, color, available, featured) VALUES
  ('Pinocho','Carlo Collodi','Literatura',1883,'La historia del muneco de madera.','#2d6cdf',1,1),
  ('Cenicienta','Charles Perrault','Literatura',1697,'El cuento de la joven bondadosa.','#d75a4a',1,1),
  ('El Principito','Antoine de Saint-Exupery','Literatura',1943,'Un joven principe viaja por el universo.','#1f8a70',1,1),
  ('Codigo Limpio','Robert C. Martin','Programacion',2008,'Buenas practicas para programar.','#1f8a70',1,0),
  ('Don Quijote de la Mancha','Miguel de Cervantes','Literatura',1605,'Las aventuras del caballero andante.','#2d6cdf',1,0);

CREATE TABLE IF NOT EXISTS users (
  id          INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  plan        ENUM('free','silver','diamond') NOT NULL DEFAULT 'free',
  plan_expiry DATETIME     DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO users (name, email, password, plan) VALUES
  ('Estudiante Demo','demo@gmail.com','123456','free'),
  ('Usuario Plata','plata@gmail.com','123456','silver'),
  ('Usuario Diamante','diamante@gmail.com','123456','diamond');

CREATE TABLE IF NOT EXISTS reviews (
  id         INT      NOT NULL AUTO_INCREMENT,
  book_id    INT      NOT NULL,
  user_id    INT      NOT NULL,
  rating     TINYINT  NOT NULL,
  text       TEXT     DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_book (user_id, book_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_history (
  id      INT      NOT NULL AUTO_INCREMENT,
  user_id INT      NOT NULL,
  book_id INT      NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE OR REPLACE VIEW v_book_stats AS
SELECT b.id, b.title, b.author, b.category,
  COUNT(DISTINCT h.id) AS total_reads,
  COUNT(DISTINCT r.id) AS total_reviews,
  ROUND(AVG(r.rating),1) AS avg_rating
FROM books b
LEFT JOIN reading_history h ON h.book_id = b.id
LEFT JOIN reviews r ON r.book_id = b.id
GROUP BY b.id;
