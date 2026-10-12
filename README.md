# Agenda de Contactos

Aplicación web para gestionar contactos (nombre, teléfono, email). Construida con **TypeScript, HTML y CSS puros**, sin frameworks ni empaquetador, usando el patrón **MVC** + una capa de servicio. Los datos persisten en `localStorage`.

## Requisitos

- Node.js 18+
- pnpm
- Python 3 (o cualquier servidor estático, solo para `pnpm start`)

## Uso

```bash
pnpm install   # instala TypeScript (única dependencia)
pnpm build     # compila src/ -> dist/
pnpm start     # sirve la app en localhost:8080
```

Otros scripts útiles: `pnpm watch` (recompila al guardar) y `pnpm typecheck` (solo revisa tipos).

> ⚠️ **No abras `index.html` con doble clic.** El proyecto usa módulos ES (`import`/`export`), y el navegador bloquea módulos cargados vía `file://` por CORS. Además, `crypto.randomUUID` solo funciona en contextos seguros (`http(s)` o `localhost`). Por eso es obligatorio servir los archivos por HTTP (`pnpm start`, Live Server, `npx serve`, etc.).

## Estructura

```
index.html
package.json
tsconfig.json
src/
  main.ts                        # arranca la app
  models/Contacto.ts             # entidad + interfaz IContacto
  views/ContactoView.ts          # única clase que toca el DOM
  controllers/ContactoController.ts  # CRUD, validación, búsqueda
  services/StorageService.ts     # único acceso a localStorage
  styles/styles.css
dist/                            # generado por `pnpm build` (no versionado)
```

Nota: los `import` en `src/` terminan en `.js` aunque los archivos sean `.ts`; es el requisito de los módulos ES nativos, y TypeScript lo resuelve igual.

## Arquitectura MVC

- **Modelo** (`Contacto`): datos y lógica propia del contacto, sin tocar DOM ni storage.
- **Vista** (`ContactoView`): renderiza, lee el formulario y notifica eventos vía callbacks (`alGuardar`, `alBuscar`, `alEditar`, `alEliminar`, `alCancelarEdicion`). No valida ni decide negocio.
- **Controlador** (`ContactoController`): toda la lógica — valida, normaliza, y coordina Vista ↔ Servicio.
- **Servicio** (`StorageService`): único punto de acceso a `localStorage`, con manejo de errores.
- El ensamblaje (inyección de dependencias) ocurre en `main.ts`.

## Validaciones

- **Nombre**: obligatorio, mínimo 2 caracteres (sin contar espacios extremos).
- **Teléfono**: formato de El Salvador — 8 dígitos que inicien con `2`, `6` o `7`. Acepta variantes (`71234567`, `7123-4567`, `+503 7123 4567`, `(503) 7123-4567`) y siempre se normaliza a `7123-4567`. No se permiten duplicados (excepto al editar el mismo contacto).
- **Email**: formato válido (`texto@dominio.ext`), se guarda en minúsculas.

## Requerimientos cumplidos

- CRUD completo con búsqueda en vivo por nombre o teléfono.
- Edición reutilizando el formulario, con "Cancelar edición".
- Eliminación con confirmación en modal.
- Validaciones de nombre, teléfono (formato SV + duplicados) y email.
- Vistas de tarjetas y tabla, estado vacío diferenciado, contador de contactos.
- Diseño propio adaptable a móvil (sin frameworks CSS).
- 4 clases (`Contacto`, `ContactoView`, `ContactoController`, `StorageService`), `IContacto`, modo `strict`, sin `any`, solo `tsc`.

## Cómo probar

1. Agrega un contacto válido (ej. María López, `+503 7123 4567`, `maria@correo.com`) → debe guardarse como `7123-4567`.
2. Repite el mismo teléfono → debe mostrar error de duplicado.
3. Prueba teléfono/email inválidos → deben mostrarse los errores correspondientes.
4. Busca `7123` → el listado y el contador deben filtrarse en vivo.
5. Edita un contacto → se actualiza sin duplicarse.
6. Elimina un contacto → debe pedir confirmación antes de borrar.
7. Cambia a vista Tabla y recarga (F5) → los datos deben persistir.
