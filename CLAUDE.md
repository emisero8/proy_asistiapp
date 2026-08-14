# Guía de Desarrollo AsistíAPP (Full-Stack)

- **Build/Ejecución Frontend:** Gestionado por Figma Make harness (No uses npm run build/dev estándar a menos que se pida).
- **Stack Frontend:** React + TypeScript + Tailwind CSS v4.
- **Stack Backend:** Java + Spring Boot + PostgreSQL.
- **Iconos (Frontend):** lucide-react v0.487.0 (IMPORTANTE: Usa `CircleX`, NUNCA `XCircle`).
- **Archivo Principal Frontend:** Todo el código de componentes reside en `src/app/App.tsx`.

## 🎨 SISTEMA DE DISEÑO (FRONTEND - CRÍTICO)
Para estructurar componentes, utilizar colores (`--primary`, `--card`, etc.), espaciados y tipografías, **DEBES leer y aplicar estrictamente las reglas del archivo `DESIGN.md`** ubicado en este directorio. 
- Usa la sección "Component Patterns" del `DESIGN.md` para crear botones, inputs y tarjetas. No inventes clases de Tailwind.

## ⚙️ ARQUITECTURA Y DATOS (BACKEND - CRÍTICO)
Para cualquier tarea relacionada con la base de datos, creación de endpoints, lógica de negocio o integraciones, **DEBES leer el archivo `API.md`** ubicado en este directorio.
- **Seguridad:** Usa Spring Security con JWT Stateless. Verifica siempre los roles del sistema (`Administrador`, `Organizador`, `Staff_QR`, `Staff_Vendedor`).
- **Reglas de Negocio:** Respeta estrictamente los casos de uso definidos (ej. publicar un evento consume créditos, la validación de QR marca la entrada como usada).
- **Transacciones (ACID):** Usa `@Transactional` en los servicios que modifican datos para evitar sobreventa de entradas (controlando rigurosamente el `cupo_disponible` en la entidad `TANDA`).
- **Patrones de Código:** Usa siempre DTOs para las peticiones/respuestas (no expongas entidades JPA) e implementa manejo de errores global estructurado con `@ControllerAdvice`.

## 🛡️ AUDITORÍA DE SEGURIDAD
Si se solicita una revisión de seguridad de código, **DEBES leer el archivo `SECURITY.md`** y auditar estrictamente el fragmento de código proporcionado buscando vulnerabilidades (SQLi, XSS, CSRF, IDOR), sin modificar ni requerir la lectura del resto del proyecto.