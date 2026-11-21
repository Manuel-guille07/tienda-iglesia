# Reglas del Proyecto — Tienda Iglesia (POS Cafetería)

Estas reglas son obligatorias y aplican a todas las tareas y conversaciones en este repositorio.

## 1. Idioma
- Responder **siempre en español** en todas las explicaciones, preguntas, planes, resúmenes y comentarios dirigidos al usuario.

## 2. Trabajo exclusivo en `dev`
- Trabajar **solo en la rama y entorno `dev`**.
- No realizar ediciones de código, commits, merges ni despliegues directamente sobre `main` ni en producción.
- Antes de empezar cualquier cambio de código, verificar la rama actual (`git branch --show-current`): si no es `dev`, avisar al usuario y confirmar antes de cambiar o crear la rama `dev`.

## 3. Diseño Quiet Luxury
- Respetar estrictamente el sistema de diseño **Quiet Luxury** definido en `src/index.css`.
- Usar las variables semánticas `--ql-*` (`--ql-bg-app`, `--ql-bg-card`, `--ql-bg-elevated`, `--ql-bg-muted`, `--ql-border`, `--ql-border-strong`, `--ql-text-primary`, `--ql-text-secondary`, `--ql-text-muted`, `--ql-accent-bg`, `--ql-accent-text`, `--ql-shadow`) y las clases `.ql-*` en lugar de colores rígidos que rompan el tema.
- Asegurar coherencia visual y contraste sobrio tanto en modo claro (`html[data-theme="light"]`) como en modo oscuro (`html[data-theme="dark"]`).
- Evitar colores estridentes, gradientes llamativos o estilos genéricos ajenos a la estética sobria, cálida y minimalista del proyecto.

## 4. Base de datos de producción intocable
- **Nunca tocar la base de datos de producción** bajo ninguna circunstancia.
- No ejecutar consultas de escritura, migraciones, cambios de esquema, limpiezas, seeds ni pruebas contra el proyecto/instancia de Supabase de producción.
- No modificar ni utilizar `.env.production` para tareas de desarrollo o pruebas; operar únicamente contra el entorno de desarrollo.
