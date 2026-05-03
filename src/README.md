# 🚀 Neon Divide — Motor de Juego (Next.js + TypeScript)

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)

Módulo de lógica de aplicación de Neon Divide: contiene las páginas de la aplicación Next.js, componentes de UI y el motor de juego basado en el patrón de Game Loop.

## 🧠 Contexto Pedagógico y Teórico
El App Router de Next.js 13+ introduce un paradigma de enrutamiento basado en el sistema de archivos, donde cada carpeta dentro de `app/` con un archivo `page.tsx` define una ruta. Este directorio `src/` implementa tres rutas principales: el menú principal (`/`), la partida activa (`/play`) y la tabla de clasificación (`/leaderboard`). El motor de juego aplica el patrón **Game Loop**, un ciclo de actualización continuo que procesa entrada, actualiza el estado del juego y re-renderiza cada frame, implementado como un custom hook de React (`useGameLoop.ts`).

## ⚙️ Tecnologías y Frameworks Aplicados
* **Next.js App Router**: Elegido por su renderizado híbrido (Server Components + Client Components), donde las páginas estáticas (menú, leaderboard) se renderizan en el servidor para SEO, mientras que la lógica de juego interactiva se ejecuta en el cliente.
* **TypeScript**: Provee tipado estático sobre JavaScript, crítico en un motor de juego donde los tipos de datos de entidades (posición, velocidad, estado) deben ser estrictamente definidos para evitar errores de runtime difíciles de depurar.
* **Canvas API + Custom Hooks**: `GameCanvas.tsx` usa el elemento `<canvas>` de HTML5 para renderizado 2D de alto rendimiento, gestionado por el hook `useGameLoop.ts` que abstraer el `requestAnimationFrame`.

*Desarrollado por Rubén Schnettler.*
