# AsistíAPP — Arquitectura y modelo de datos actuales

Diagramas armados a partir del código (`master`, commit `420f2e2`, 27/11/2026). Los diagramas en PNG de `docs/entrega/` son de la etapa de diseño y se conservan como se entregaron.

## 1. Componentes

```mermaid
flowchart LR
  U[Navegador: comprador, organizador, staff, admin]
  F[SPA React + TypeScript]
  U --> F
  subgraph API["API REST - Spring Boot"]
    S[Filtros: límite de peticiones y JWT]
    C[Controladores y DTOs]
    N[Servicios]
    R[Repositorios JPA]
    J[Tareas programadas]
    A[Auditoría con AOP]
    S --> C --> N --> R
    J --> N
    A -.-> N
  end
  F -->|HTTPS, JSON, JWT| S
  R --> DB[(PostgreSQL)]
  N <-->|preferencias, pagos, reembolsos, OAuth| MP[Mercado Pago]
  MP -->|webhook firmado| C
  N -->|SMTP| M[Correo]
  N --> CL[Cloudinary]
```

| Pieza | Demo online | Local |
|---|---|---|
| Frontend | Vercel | Vite en `localhost:5173` |
| Backend | Render (Docker) | Maven en `localhost:8080` |
| Base | Neon | PostgreSQL |
| Correo | Brevo | MailHog |

## 2. Capas del backend

| Paquete | Responsabilidad |
|---|---|
| `controllers` | Reciben el pedido, validan el DTO y exigen el rol. |
| `services` | Reglas de negocio y transacciones. |
| `repositories` | Acceso a datos con Spring Data JPA; bloqueos pesimistas. |
| `models` | Entidades, enums y DTOs. |
| `security` | JWT, límite de peticiones y auditoría. |
| `config` | Configuración y arranque. |
| `exceptions` | Errores de negocio y manejador global. |

## 3. Modelo de datos

Línea continua: relación mapeada en JPA o por herencia. Línea punteada: relación lógica, guardada como un número sin clave foránea.

```mermaid
erDiagram
  usuarios ||--o| organizadores : "herencia"
  usuarios ||--o| staff_qr : "herencia"
  usuarios ||--o| staff_vendedores : "herencia"
  eventos ||--o{ tandas : "tiene"
  tandas ||--o{ entradas : "emite"
  organizadores ||..o{ eventos : "organiza"
  organizadores ||..o{ staff_vendedores : "emplea"
  eventos ||..o{ staff_vendedores : "asignado a"
  eventos ||..o{ staff_qr : "asignado a"
  tandas ||..o{ transacciones_pago : "se compra en"
  transacciones_pago ||..o{ entradas : "genera"
  staff_vendedores ||..o{ entradas : "vende"
  staff_qr ||..o{ entradas : "valida"
  organizadores ||..o{ movimientos_credito : "registra"
  organizadores ||..o{ transacciones_credito : "compra"
  paquetes_credito ||..o{ transacciones_credito : "se elige en"
  transacciones_credito ||..o| movimientos_credito : "acredita"
  organizadores ||..o| cuentas_mercadopago : "vincula"
  organizadores ||..o{ intentos_vinculacion_mp : "inicia"
  usuarios ||..o{ tokens_recuperacion : "pide"
  usuarios ||..o{ notificaciones : "recibe"
  usuarios ||..o{ log_auditoria : "emite"

  usuarios {
    bigint id PK
    string email UK
    string password_hash
    enum rol
    enum estado
  }
  organizadores {
    bigint id_usuario PK
    int saldo_creditos
    int max_entradas_por_comprador
  }
  staff_qr {
    bigint id_usuario PK
    bigint id_evento
  }
  staff_vendedores {
    bigint id_usuario PK
    bigint id_organizador
    bigint id_evento
    int tope_entradas
  }
  eventos {
    bigint id PK
    bigint id_organizador
    string nombre
    date fecha_evento
    enum estado
    string url_publica UK
  }
  tandas {
    bigint id PK
    bigint id_evento FK
    double precio
    int cupo_maximo
    int cupo_disponible
    boolean solo_emision
  }
  entradas {
    bigint id PK
    bigint id_tanda FK
    string codigo_qr UK
    enum estado
    enum canal_venta
    double precio_venta
  }
  transacciones_pago {
    bigint id PK
    string external_reference UK
    string mercadopago_payment_id UK
    int cantidad
    double monto_total
    enum estado
  }
  transacciones_credito {
    bigint id PK
    string external_reference UK
    string mercadopago_payment_id UK
    enum estado
  }
  movimientos_credito {
    bigint id PK
    enum tipo_movimiento
    int monto
    int saldo_resultante
  }
  paquetes_credito {
    bigint id PK
    int cantidad_creditos
    double precio
    enum estado
  }
  cuentas_mercadopago {
    bigint id PK
    bigint id_organizador UK
    string access_token_cifrado
    enum estado
  }
  intentos_vinculacion_mp {
    string state PK
    bigint id_organizador
  }
  tokens_recuperacion {
    bigint id PK
    string token UK
    boolean usado
  }
  notificaciones {
    bigint id PK
    bigint id_usuario_destino
    boolean leida
  }
  log_auditoria {
    bigint id PK
    bigint id_emisor
    string accion
  }
  configuraciones_sistema {
    bigint id PK
    string clave UK
    string valor
  }
```

## 4. Estados

| Enum | Valores |
|---|---|
| Rol | `Administrador`, `Organizador`, `Staff_QR`, `Staff_Vendedor` |
| Usuario | `Activo`, `Suspendido`, `Inactivo` |
| Evento | `Borrador`, `Publicado`, `Cancelado` ("finalizado" se calcula: 12 horas después del inicio) |
| Entrada | `Pagada`, `Usada`, `Anulada` |
| Orden de pago | `Pendiente`, `Aprobada`, `Rechazada`, `Expirada`, `Reembolsada` |
| Movimiento de créditos | `Bienvenida`, `Recarga`, `Consumo_Publicacion`, `Consumo_Tanda`, `Devolucion_Tanda` |
| Canal de venta | `Online`, `Manual` |

```mermaid
stateDiagram-v2
  [*] --> Pagada: pago confirmado, venta en puerta o emisión
  Pagada --> Usada: el Staff QR valida el ingreso
  Pagada --> Anulada: el Organizador la anula
```

## 5. Identificadores

Las claves primarias son números `Long` autoincrementales (`intentos_vinculacion_mp` usa su `state`). Lo que sale del sistema usa valores no adivinables: `codigo_qr` (texto `QR-` seguido de un UUID sin guiones) y `external_reference` de las órdenes (UUID).
