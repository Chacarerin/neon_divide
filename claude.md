## Proyecto: Neon Divide - Juego Arcade Moderno

**Entorno:** macOS (Apple Silicon M3)
**Objetivo:** Crear un juego web estilo Qix/Erix con estética Cyberpunk/VHS, desplegable en Vercel como pieza de portfolio.

**RESUMEN**

Desarrollar "Neon Divide", una modernización del clásico Erix. El jugador controla un cursor de luz neón que debe cerrar áreas del tablero para capturarlas, evitando enemigos caóticos. Incluye progresión roguelike (upgrades entre niveles), persistencia de datos (login, leaderboard) y una estética inmersiva de pantalla CRT de los 80s. El stack es 100% Next.js para simplificar el deploy en Vercel.

**ESTÉTICA & VIBE (Directriz Creativa):**
- **Estilo:** "VHS Cassette / 80s Arcade Cabinet / Cyberpunk".
- **Visuales:** Efectos de CRT (scanlines, curvatura de pantalla), aberración cromática y resplandor neón.
- **Paleta:** Fondo oscuro profundo con neones saturados que emiten luz.
- **UI:** Fuentes retro/monoespaciadas, menús con efectos de ruido estático o glitch.

**Mecánica Core:**
- El jugador controla un cursor que se mueve por los bordes seguros.
- Al entrar al vacío, deja un rastro (Trail).
- Al reconectar con una zona segura, el área encerrada se captura y rellena.
- **Victoria:** Capturar >75% del área.
- **Derrota:** Enemigo toca el cursor o el rastro mientras se dibuja.

**El "Twist" (Roguelike Progression):**
- Persistencia de datos (Login requerido).
- Sistema de "Runs": Juego continuo. Al completar un nivel, pausa y ofrece cartas de mejora (ej: "Speed Up", "Freeze Enemies").
- Global Leaderboard.

**REQUISITOS**

- Generar aplicación web según indicaciones.
- Estilo amigable y estéticamente atractivo con la dirección visual indicada.
- Responsivo: jugable en móvil (controles táctiles) pero optimizado para desktop.
- Sistema de usuarios con autenticación.
- Leaderboard global y persistencia de runs.

## ⚠️ LINEAMIENTOS OBLIGATORIOS PARA AGENTES

> [!CAUTION]
> **NUNCA usar SQLite.** Todos los proyectos deben usar **PostgreSQL** exclusivamente. En este caso, usaremos **NeonDB** (Postgres serverless compatible con Vercel).

> [!IMPORTANT]
> Los commits y operaciones de Git **SOLO** pueden ser autorizados por el propietario del repositorio. No realizar `git add`, `git commit` ni `git push` sin autorización explícita.

> ⚠️ **IMPORTANTE**: Respetar las indicaciones en este documento. Si bien existe un espíritu prescriptivo, debes respetar los lineamientos desde la planificación que aquí se detallan.

> Se debe crear en el directorio raíz un `bitacora.md` en donde se registre un historial de errores y soluciones, así como decisiones y grandes cambios. Esto permite retomar el trabajo por cualquier agente humano o IA, generando continuidad entre sesiones. Este archivo no será parte del repositorio. A diferencia del `readme.md` que sí será parte del repositorio y debe tener un tono académico.

### Convención de Base de Datos (NeonDB/PostgreSQL)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | String de conexión pooling a NeonDB |
| `DIRECT_URL` | String de conexión directa (para migraciones Prisma) |

> ⚠️ **IMPORTANTE PARA EL AGENTE IA**
>
> El despliegue es 100% manual por el usuario. La responsabilidad del agente termina en dejar el código listo para producción. NO realizar despliegues automáticos.

> ⚠️ **IMPORTANTE: OPTIMIZACIÓN Y CONTINUIDAD**
>
> **Dosificación del Trabajo:** No intentes generar todo el proyecto en una sola respuesta. Trabaja por fases completas.
> **Ahorro de Tokens:** Si una tarea es muy extensa, divide y documenta el estado en `bitacora.md` para continuar en la siguiente sesión sin perder contexto. La continuidad es clave.

### Archivos de Configuración Requeridos

1. **`prisma/schema.prisma`** - Modelo de datos (fuente de verdad).
2. **`.env.local`** - Variables de entorno (ignorado por .gitignore).
3. **`next.config.mjs`** - Configuración de Next.js.

### Dependencias Principales

```bash
npm install @clerk/nextjs @prisma/client zustand framer-motion
npm install -D prisma
```

---

## 2. Stack Tecnológico (Requisito Estricto)

- **Framework:** Next.js 15+ (App Router), React, TypeScript.
- **Estilos:** Tailwind CSS.
  - *Clave:* Usar `globals.css` para animaciones complejas (CRT flicker, Scanlines).
- **Game Engine:** Canvas API nativo (HTML5) en un componente React (`useRef`). *No usar Phaser ni librerías pesadas*.
- **Backend:** Next.js Server Actions.
- **Base de Datos:** NeonDB (PostgreSQL serverless).
- **ORM:** Prisma.
- **Auth:** Clerk (para autenticación rápida y segura).

---

## 3. Modelo de Datos (Prisma Schema)

```prisma
model User {
  id        String   @id @default(uuid())
  externalId String  @unique // ID de Clerk
  username  String   @unique
  bestScore Int      @default(0)
  coins     Int      @default(0) // Monetización futura (durmiente)
  runs      Run[]
  createdAt DateTime @default(now())
}

model Run {
  id        String   @id @default(uuid())
  userId    String
  score     Int      @default(0)
  level     Int      @default(1)
  // Array de upgrades activos: ["SPEED_BOOST_1", "SHIELD"]
  upgrades  Json     
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 4. Instrucciones de Implementación Paso a Paso

### Fase 1: Motor del Juego & Estética (Frontend)

1. **Setup CRT:** Crear un `layout.tsx` o componente envoltorio que aplique los efectos de post-procesado (CSS Scanlines, vignette, noise) sobre todo el juego.
2. **Componente `GameCanvas`:**
   * Manejar el loop con `requestAnimationFrame`.
   * **Estado:** `idle` (en borde) vs `drawing` (en vacío).
   * **Input:** Flechas del teclado / WASD.
   * **Renderizado:** Usar `ctx.shadowBlur` y `ctx.shadowColor` para que las líneas parezcan láseres de neón.

3. **Algoritmo de Captura (Qix Logic):**
   * Cuando el jugador cierra un bucle, usar *Flood Fill* (o BFS) desde la posición del "Boss Enemy".
   * El área que *contiene* al Boss permanece vacía; el área *opuesta* se marca como capturada/rellena.

### Fase 2: Backend & Lógica Roguelike

1. **Server Actions:**
   * `startGame()`: Crea una nueva entrada en `Run`.
   * `completeLevel(runId, levelScore)`: Valida el score, actualiza la Run, incrementa el nivel y devuelve opciones de Upgrade aleatorias.
   * `endRun(runId)`: Marca `isActive: false` y actualiza `User.bestScore` si aplica.

2. **Upgrades:** Definir una lista constante de mejoras en el backend y seleccionarlas al azar.

### Fase 3: Interfaz de Usuario (UI)

1. **HUD Retro:** Mostrar Score, Vidas y % Área con tipografía acorde a la estética sobre el Canvas.
2. **Modal de Nivel Completado:** Debe pausar el Canvas y mostrar las cartas de mejora. Estilo coherente con la dirección visual.
3. **Leaderboard:** Página estática (ISR) o dinámica que muestre el Top 10 de jugadores con estilo tabla de high-scores de arcade.

---

## 5. Estructura Final del Proyecto

```
neon-divide/
├── app/
│   ├── (auth)/
│   │   └── sign-in/[[...sign-in]]/page.tsx
│   ├── (game)/
│   │   ├── play/page.tsx
│   │   └── leaderboard/page.tsx
│   ├── actions/
│   │   └── game.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── game/
│   │   ├── GameCanvas.tsx
│   │   └── HUD.tsx
│   └── ui/
│       └── CRTEffect.tsx
├── lib/
│   ├── prisma.ts
│   └── game-engine/
├── prisma/
│   └── schema.prisma
├── .env.local           # Variables de entorno (NO subir a git)
├── .gitignore
├── bitacora.md          # Historial de desarrollo (NO subir a git)
├── claude.md            # Instructivo Agentes IA (NO subir a git)
├── readme.md            # Para git, tono académico
└── next.config.mjs
```

---

## 6. Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Ver base de datos
npx prisma studio

# Migraciones
npx prisma migrate dev --name init

# Lint
npm run lint
```

---

## 7. Entregable Esperado

Genera el código inicial para:

1. Estructura Next.js + Tailwind.
2. Archivo `globals.css` con las clases para el efecto CRT/VHS.
3. Esquema `schema.prisma`.
4. Componente `GameCanvas.tsx` con la lógica de movimiento y el esqueleto de la función de renderizado.

---

## 8. Diseño del Juego (Game Design)

### 8.1 Mecánicas de Movimiento

- El jugador se mueve **SOLO** por los bordes de la zona segura (área ya capturada).
- Al presionar tecla de acción, el jugador entra al "vacío" y deja un **trail**.
- El trail es vulnerable: si un enemigo lo toca = **Game Over**.
- Al reconectar el trail con zona segura, el área encerrada se captura.

### 8.2 Sistema de Puntaje

| Acción | Puntos |
|--------|--------|
| Capturar 75% del área | Base del nivel |
| Por cada 1% extra sobre 75% | Bonus proporcional |
| Capturar >90% | Multiplicador x2 |
| Atrapar enemigo dentro del área | Bonus significativo |
| Completar nivel sin daño | Bonus adicional |

**Multiplicadores:**
- Streak de niveles sin morir: Multiplicador incremental
- Speed bonus: Completar nivel rápido otorga bonus

### 8.3 Enemigos

**Básicos:**
- **Drifter:** Se mueve en línea recta, rebota en bordes.
- **Chaser:** Sigue al jugador lentamente.
- **Sparx:** Se mueve SOLO por los bordes de la zona segura (caza al jugador en su territorio).

**Boss (uno por nivel):**
- **Core:** El "ancla" del flood fill. No puede ser eliminado, solo encerrado.
- Si capturas al Boss dentro de tu área: Bonus masivo pero riesgo alto.

**Spawners (niveles avanzados):**
- Generan enemigos cada X segundos.
- Deben ser encerrados para desactivarlos.

### 8.4 Sistema de Upgrades (Roguelike)

Al completar un nivel, el jugador elige 1 de 3 cartas aleatorias:

| Upgrade | Efecto | Rareza |
|---------|--------|--------|
| Speed Boost | +% velocidad movimiento | Común |
| Trail Shield | El trail aguanta 1 hit sin morir | Rara |
| Slow Zone | Enemigos en tu área van más lento | Común |
| Magnet | Atrae power-ups cercanos | Común |
| Double Capture | Captura cuenta x2 para el % | Épica |
| Freeze Frame | Congela enemigos brevemente al entrar al vacío | Rara |
| Ghost Trail | Trail invisible para enemigos por tiempo limitado | Épica |

**Probabilidades de Rareza:**
- Común: Mayor probabilidad
- Rara: Probabilidad media
- Épica: Probabilidad baja

### 8.5 Progresión de Niveles

| Rango | Enemigos | Velocidad | Objetivo |
|-------|----------|-----------|----------|
| 1-3 | Solo Drifters | Lento | Tutorial implícito |
| 4-6 | +Chasers | Normal | Introducir amenaza directa |
| 7-10 | +Sparx | Rápido | Dominar los bordes |
| 11+ | Spawners + Mix | Variable | Supervivencia |

**Escalado Infinito:**
- Cada ciertos niveles: Aumenta velocidad enemigos
- Sin límite de niveles (endless mode)

### 8.6 Power-ups en Nivel (Items)

Aparecen aleatoriamente en el vacío (incentivan riesgo):

| Item | Efecto |
|------|--------|
| ⚡ Turbo | Velocidad temporal x2 |
| 🛡️ Shield | Invulnerabilidad temporal |
| ❄️ Freeze | Congela enemigos |
| 💎 Gem | Puntos extra |
| ⏱️ Time Bonus | Tiempo extra (si hay timer) |

### 8.7 Condiciones de Game Over

- Enemigo toca al jugador directamente.
- Enemigo toca el trail mientras el jugador está dibujando.
- (Opcional, modo hardcore) Tiempo límite por nivel.

### 8.8 Persistencia

- Al morir: Se guarda el Run (score, nivel alcanzado, upgrades usados).
- High Score personal y global (Leaderboard).
- Posible futuro: "Continue?" con moneda virtual (monetización).

### 8.9 Recursos y Assets (Audio)

- **Estrategia:** No detenerse en diseño sonoro complejo.
- **Fuente:** Utilizar packs gratuitos libres de regalías (ej: **Kenney.nl Assets**, paquetes "Sci-Fi" o "Interface Sounds").
- **Requerido:**
  - BGM: Loop Synthwave simple.
  - SFX: Captura de área, Muerte, Dash/Movimiento, UI Click.

### 8.10 Testing (Calidad Core)

- **Unit Tests (Vitest/Jest):** OBLIGATORIO cubrir con pruebas unitarias la lógica del **algoritmo de captura (Flood Fill)** y detección de colisiones.
- **Razón:** Son los puntos críticos de bugs en juegos estilo Qix. La UI no requiere tests unitarios estrictos, pero la lógica matemática sí.

### 8.11 Performance Budget

- **Objetivo:** 60 FPS estables en un laptop promedio (ej: MacBook Air M1).
- **Restricción:**
  - No usar miles de objetos en el DOM (todo gameplay en Canvas).
  - Efectos CRT en CSS optimizados (usar `will-change`, `transform`).
  - Lógica de juego separada del ciclo de renderizado de React (no abusar de `useState` para updates por frame).
