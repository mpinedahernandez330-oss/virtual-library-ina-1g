# 📚 Virtual Library INA 1G

## Sistema de Gestión de Biblioteca Digital

**Virtual Library INA 1G** es una aplicación web desarrollada como proyecto académico para facilitar el acceso, búsqueda, lectura y organización de libros digitales para estudiantes.

El sistema permite explorar un catálogo de libros, buscar y filtrar contenido, guardar favoritos, escribir reseñas, consultar el historial de lectura y administrar diferentes planes de suscripción.

---

## 👥 Equipo de Desarrollo

- **William Josué Bolaños Sánchez** — 1G03
- **Bryan Alexander García Fernández** — 1G10
- **José David Maravilla Peña** — 1G22
- **Miguel Antonio Pineda Hernández** — 1G35
- **Josué Nahum Villanueva Mendoza** — 1G42

**Grupo Académico:** INA 1G  
**Tutor Académico:** Prof. Vladimir Alfaro Orantes Alfaro  
**Versión:** 1.0  
**Fecha:** Agosto de 2026

---

# 📖 Descripción del Proyecto

Virtual Library INA 1G es una biblioteca digital orientada a estudiantes.

La plataforma fue diseñada para que los usuarios puedan:

- Crear una cuenta.
- Iniciar sesión.
- Recuperar su contraseña.
- Explorar el catálogo de libros.
- Buscar libros en tiempo real.
- Filtrar libros por categoría.
- Ordenar los resultados.
- Leer libros mediante un visor integrado.
- Guardar libros como favoritos.
- Calificar libros de 1 a 5 estrellas.
- Escribir reseñas.
- Consultar reseñas de otros usuarios.
- Consultar el historial de lectura.
- Administrar el perfil personal.
- Consultar planes de suscripción.
- Realizar simulaciones de pago.
- Consultar la fecha de vencimiento del plan.
- Utilizar modo claro y modo oscuro.

También cuenta con un panel privado para administradores.

---

# ✨ Características Principales

## 👤 Usuarios

Los usuarios pueden registrarse utilizando un correo electrónico `@gmail.com`.

La contraseña debe tener como mínimo 6 caracteres.

El sistema evita registrar nuevamente un correo electrónico que ya exista.

---

## 🔐 Inicio de Sesión

La página de inicio de sesión permite:

- Introducir correo electrónico.
- Introducir contraseña.
- Mostrar u ocultar la contraseña.
- Ingresar al catálogo.
- Crear una cuenta.
- Recuperar contraseña.

El catálogo está protegido y requiere una sesión válida.

---

# 🔑 Recuperación de Contraseña

El sistema cuenta con una opción de **Recuperar contraseña**.

El usuario debe:

1. Entrar a `login.html`.
2. Seleccionar **Recuperar contraseña**.
3. Introducir la información solicitada.
4. Seguir las instrucciones mostradas por el sistema.
5. Regresar al inicio de sesión.

> La recuperación de contraseña forma parte de una simulación académica y no representa el sistema real de recuperación de cuentas de Google o Gmail.

---

# 📚 Catálogo

El catálogo constituye la parte principal de la aplicación.

Cada libro puede mostrar:

- Portada.
- Título.
- Autor.
- Categoría.
- Año de publicación.
- Descripción.
- Calificación.
- Cantidad de reseñas.

La barra superior también puede mostrar información del usuario, plan activo y cantidad de libros disponibles.

---

# 🔎 Buscar y Filtrar Libros

La búsqueda funciona en tiempo real.

El usuario puede buscar utilizando:

- Título.
- Autor.
- Categoría.

No es necesario recargar la página para actualizar los resultados.

También es posible utilizar filtros por categoría.

Ejemplos:

- Programación
- Matemáticas
- Literatura
- Ciencia
- Historia

---

# ↕️ Ordenar Resultados

Los libros pueden organizarse mediante diferentes criterios:

- Por título.
- Por autor.
- Por año.

La búsqueda, los filtros y el ordenamiento pueden utilizarse conjuntamente.

---

# 📖 Leer un Libro

Cuando un libro tiene un enlace válido de Google Drive, el sistema puede mostrarlo mediante un visor integrado.

Proceso:

1. Buscar el libro.
2. Seleccionar **Leer**.
3. Esperar la carga del visor.
4. Utilizar los controles disponibles.
5. Cerrar el visor cuando termine la lectura.

La apertura del libro se registra automáticamente en el historial.

Si un libro no posee un enlace válido de Google Drive, el sistema muestra la información del libro en lugar del visor.

---

# ⭐ Favoritos

Los usuarios pueden guardar libros como favoritos.

Para agregar un libro:

1. Localizar el libro.
2. Presionar la estrella `☆`.
3. La estrella cambiará a `★`.

Para quitarlo:

1. Presionar nuevamente la estrella `★`.

También existe una opción para mostrar únicamente los libros favoritos.

---

# ⭐ Calificaciones y Reseñas

Los usuarios pueden calificar los libros utilizando una escala de:

**1 a 5 estrellas**

También pueden escribir un comentario opcional.

El comentario tiene un límite máximo de:

**200 caracteres**

Cada usuario puede realizar una reseña por libro y posteriormente editarla.

---

# 💬 Consultar Reseñas

Los usuarios pueden consultar las opiniones realizadas por otros estudiantes.

Las reseñas se muestran comenzando por las más recientes.

Esto permite conocer las opiniones de otros lectores antes de seleccionar un libro.

---

# 🕘 Historial de Lectura

Cada vez que un usuario abre un libro, la aplicación registra automáticamente la actividad.

El perfil puede mostrar hasta:

**20 lecturas recientes**

El historial incluye información como:

- Portada.
- Título.
- Autor.
- Fecha de actividad.

---

# 👤 Perfil

La página `perfil.html` permite consultar información personal y estadísticas.

Incluye:

- Avatar con iniciales.
- Nombre del usuario.
- Correo electrónico.
- Plan activo.
- Fecha de vencimiento.
- Cantidad de libros leídos.
- Cantidad de favoritos.
- Cantidad de reseñas.
- Historial de las últimas 20 lecturas.
- Reseñas realizadas por el usuario.

---

# 💎 Planes de Suscripción

El sistema cuenta con tres planes:

| Plan | Precio simulado | Duración | Lecturas | Descargas |
|------|-----------------|----------|----------|-----------|
| Gratis | $0.00 | Sin caducidad | Máximo 5 por día | ❌ |
| Plata | $2.50 | 3 semanas | Ilimitadas | ❌ |
| Diamante | $5.00 | 1 mes | Ilimitadas | ✅ |

Los precios son únicamente de demostración académica.

---

# 💳 Simulación de Pago

Los planes Plata y Diamante cuentan con un flujo de pago simulado.

El proceso consiste en:

1. Seleccionar un plan.
2. Abrir el formulario de pago.
3. Revisar el plan seleccionado.
4. Completar los campos demostrativos.
5. Confirmar la operación.
6. Activar el plan.

> ⚠️ Este sistema NO realiza cobros reales y no está conectado con bancos ni servicios financieros.

**Nunca introduzcas información bancaria real en el formulario de demostración.**

---

# 🔄 Vencimiento y Renovación

Los planes Plata y Diamante tienen una fecha de vencimiento.

El sistema muestra una alerta cuando faltan:

**3 días para el vencimiento.**

El usuario puede consultar la fecha de vencimiento desde su perfil y realizar nuevamente el proceso de renovación.

---

# 🌓 Modo Claro y Oscuro

La aplicación cuenta con dos temas visuales:

- ☀️ Modo claro
- 🌙 Modo oscuro

El usuario puede cambiar el tema desde la barra de navegación.

---

# 🛠️ Panel de Administrador

El sistema cuenta con un panel privado para administradores.

El administrador puede:

- Agregar libros.
- Editar libros.
- Eliminar libros.
- Destacar libros.
- Gestionar categorías.
- Consultar estadísticas.
- Administrar el catálogo.

El acceso administrativo está restringido a usuarios autorizados.

---

# ➕ Agregar Libros

El administrador puede registrar nuevos libros mediante un formulario.

Los datos principales incluyen:

- Título.
- Autor.
- Categoría.
- Año.
- Portada.
- Enlace de Google Drive.
- Descripción.
- Disponibilidad.

La portada debe tener un tamaño máximo de:

**2 MB**

---

# ✏️ Editar Libros

El administrador puede seleccionar un libro y modificar sus datos.

Después de realizar los cambios debe guardar la información y comprobar que el catálogo muestre correctamente los nuevos datos.

---

# 🗑️ Eliminar Libros

Los administradores pueden eliminar libros.

Antes de confirmar una eliminación se recomienda comprobar cuidadosamente que se haya seleccionado el libro correcto.

---

# ⭐ Destacar Libros

Los administradores pueden marcar determinados libros como destacados.

Los libros destacados pueden aparecer en las primeras posiciones del catálogo.

---

# 🏷️ Gestionar Categorías

El administrador puede:

- Crear categorías.
- Eliminar categorías.
- Organizar las clasificaciones de los libros.

Las categorías permiten encontrar más fácilmente los libros dentro del catálogo.

---

# 📊 Estadísticas Globales

El panel administrativo cuenta con estadísticas generales.

Entre ellas:

- Total de usuarios.
- Total de lecturas.
- Total de reseñas.
- Top 5 de libros más leídos.

Estas estadísticas permiten conocer el uso general de la biblioteca.

---

# 🗄️ Base de Datos

El proyecto utiliza una base de datos para almacenar la información de la aplicación.

Entre los datos gestionados se encuentran:

- Usuarios.
- Administradores.
- Categorías.
- Libros.
- Reseñas.
- Historial de lecturas.

La configuración de la base de datos se encuentra dentro de los archivos correspondientes del proyecto.

---

# 💻 Tecnologías Utilizadas

El proyecto utiliza tecnologías web y herramientas de desarrollo como:

- HTML
- CSS
- JavaScript
- Node.js
- MySQL
- Laragon
- HeidiSQL
- Git
- GitHub

---

# 📁 Estructura Principal del Proyecto

```text
virtual-library-ina-1g/
│
├── backend/
│
├── base de datos/
│
├── index.html
├── login.html
├── perfil.html
├── planes.html
├── welcome.html
├── administrador.html
│
├── style.css
│
├── admin.js
├── api.js
├── perfil.js
├── planes.js
├── script.js
├── user.js
│
├── package.json
├── package-lock.json
└── README.md
