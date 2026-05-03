# 🚀 Neon Divide — Schema de Base de Datos (Prisma + NeonDB)

[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/NeonDB-PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)](#)

Definición del esquema de base de datos del juego Neon Divide usando Prisma ORM sobre NeonDB (PostgreSQL serverless), gestionando la persistencia de usuarios y partidas.

## 🧠 Contexto Pedagógico y Teórico
Prisma adopta el paradigma **Schema-First**: el archivo `schema.prisma` es la fuente de verdad única tanto para la estructura de la base de datos como para los tipos TypeScript generados automáticamente. Esto elimina la desincronización entre el modelo de datos en código y el esquema real de la BD, un problema recurrente en arquitecturas tradicionales. NeonDB se seleccionó como proveedor de PostgreSQL serverless para escalar a cero fuera de los horarios de uso.

## ⚙️ Tecnologías y Frameworks Aplicados
* **Prisma ORM**: Seleccionado sobre alternatives como Drizzle o TypeORM por su generación automática de tipos TypeScript, su cliente type-safe y su sistema de migraciones declarativo, lo que reduce drásticamente los errores de integración entre capa de datos y lógica de aplicación.
* **NeonDB (PostgreSQL Serverless)**: Usa la estrategia de conexión `directUrl` para migraciones y `url` para consultas en tiempo de ejecución, optimizando el manejo del pool de conexiones en un entorno serverless.

## 🛠️ Desglose Técnico (El "Cómo")
El schema define dos modelos con relación 1:N:
* **`User`**: Almacena identidad del jugador vía `externalId` (Clerk Auth), mejor puntuación, monedas (monetización futura) y relación con sus partidas.
* **`Run`**: Representa una sesión de juego individual con puntuación, nivel, estado activo y un campo JSON `upgrades` para almacenar el inventario de mejoras del jugador de forma flexible.

*Desarrollado por Rubén Schnettler.*
