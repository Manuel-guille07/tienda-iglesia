# 🗺️ Mapa del Proyecto: POS Cafetería Iglesia

Este documento describe la arquitectura y estructura de la carpeta `src/` del sistema de punto de venta (POS) y gestión de cafetería/chiringuito de la iglesia. Cada carpeta y archivo principal se detalla a continuación con una breve explicación de su función.

---

## 📁 Estructura General de Directorios

```text
src/
├── components/          # Componentes visuales de la interfaz de usuario
│   ├── auth/            # Pantalla y lógica visual de inicio de sesión con PIN
│   ├── closeout/        # Arqueo, cierre de turno e incidencias
│   ├── common/          # Componentes comunes de cabecera y navegación
│   ├── inventory/       # Gestión de insumos y recetas de cafetería
│   ├── layout/          # Estructura y contenedor principal de las vistas
│   ├── pos/             # Pantalla de venta, botonera rápida y cobro
│   ├── tabs/            # Gestión de fiados, saldos de hermanos y recibos
│   └── ui/              # Componentes visuales atómicos reutilizables
├── context/             # Contextos de React (multilenguaje i18n)
├── data/                # Datos iniciales mock y diccionarios de idiomas
│   └── i18n/            # Textos en español e inglés
├── store/               # Estados globales administrados con Zustand
├── types/               # Definiciones e interfaces de TypeScript
├── App.tsx              # Definición de rutas y control de acceso
├── index.css            # Estilos globales y configuración de Tailwind CSS
└── main.tsx             # Punto de entrada de la aplicación y registro PWA
```

---

## 🚦 Rutas y Estructura Principal

- **`src/main.tsx`**  
  Punto de entrada de la aplicación React. Inicializa el renderizado, monta el proveedor de idioma y registra el Service Worker para el funcionamiento como PWA.

- **`src/App.tsx`**  
  Configura las rutas principales mediante `react-router-dom`. Implementa la protección de rutas autenticadas y las restricciones de acceso por rol (`Pastor` y `Tesorería`).

- **`src/index.css`**  
  Define los estilos globales del proyecto usando Tailwind CSS, configurando la paleta de modo oscuro y las reglas tipográficas base.

---

## 🌐 Contextos (Context)

- **`src/context/LanguageContext.tsx`**  
  Proporciona el contexto global de internacionalización (i18n). Permite alternar entre español e inglés y ofrece la función `t()` para traducir textos dinámicamente.

---

## ⚡ Estados Globales (Zustand Stores)

- **`src/store/useAuthStore.ts`**  
  Administra el estado de autenticación, el usuario activo y la verificación de acceso mediante PIN táctil de 4 dígitos.

- **`src/store/usePOSStore.ts`**  
  Gestiona el carrito de compras, el catálogo de productos y el procesamiento de ventas, descontando automáticamente el stock de insumos y recetas.

- **`src/store/useTabStore.ts`**  
  Controla las cuentas de fiados y saldos prepago de los miembros de la iglesia. Permite registrar consumos a cuenta y generar textos formateados para recibos de WhatsApp.

- **`src/store/useCloseoutStore.ts`**  
  Maneja el registro de cierres de caja, arqueos físicos del turno, diario de incidencias y la exportación de reportes a archivos CSV y Google Sheets.

---

## 🖥️ Componentes Visuales

### 1. Punto de Venta (POS) — `src/components/pos/`
- **`POSScreen.tsx`**  
  Pantalla principal de ventas que organiza en una vista responsiva la botonera rápida, el catálogo de productos y el panel del carrito.
- **`QuickCafeteriaKeypad.tsx`**  
  Botonera rápida de acceso táctil ("1 toque") pensada para despachar con agilidad los cafés y bebidas más vendidos.
- **`ProductCatalog.tsx`**  
  Muestra la cuadrícula de productos con buscador por texto y filtros por categorías (cafetería, bebidas, snacks, donativos).
- **`CartPanel.tsx`**  
  Panel interactivo del carrito de compras que permite modificar cantidades, agregar notas de preparación (ej. leche de avena) y vaciar el pedido.
- **`PaymentModal.tsx`**  
  Modal que permite seleccionar el método de cobro (efectivo, datáfono, fiado, donativo o consumo interno) y confirmar la venta.
- **`ChangeCalculator.tsx`**  
  Calculadora rápida de cambio para cobros en efectivo con botones de billetes predefinidos y cálculo del cambio a devolver.

### 2. Fiados y Cuentas de Hermanos — `src/components/tabs/`
- **`TabsScreen.tsx`**  
  Vista para consultar la lista de clientes o ministerios, con indicadores de saldo prepago a favor y deuda pendiente.
- **`NewCustomerModal.tsx`**  
  Ventana modal con formulario para registrar un nuevo hermano o ministerio con su número de teléfono.
- **`WhatsAppReceiptModal.tsx`**  
  Modal que presenta una vista previa del recibo detallado con opciones para copiarlo al portapapeles o abrirlo directamente en WhatsApp.

### 3. Cierre de Caja e Incidencias — `src/components/closeout/`
- **`CloseoutScreen.tsx`**  
  Pantalla resumen del turno con métricas totales por método de pago, conteo de cafés servidos y opciones para exportar a CSV o Google Sheets.
- **`CashArqueoPanel.tsx`**  
  Panel para ingresar el efectivo contado físicamente en caja y calcular automáticamente el descuadre frente al efectivo esperado.
- **`IncidentListPanel.tsx`**  
  Lista cronológica de notas operativas e incidencias ocurridas durante el turno de servicio.
- **`IncidentModal.tsx`**  
  Formulario modal para reportar incidencias clasificadas por categorías (caja, maquinaria, inventario u otros).

### 4. Inventario Compuesto — `src/components/inventory/`
- **`InventoryScreen.tsx`**  
  Pantalla de control de inventario que permite monitorear insumos base (cápsulas, leche, vasos), reponer existencias y consultar las recetas de cada producto.

### 5. Autenticación — `src/components/auth/`
- **`LoginScreen.tsx`**  
  Pantalla de acceso táctil que permite seleccionar un perfil de usuario e ingresar su PIN de 4 dígitos mediante un teclado numérico en pantalla.

### 6. Estructura y Navegación — `src/components/layout/` & `src/components/common/`
- **`src/components/layout/AppLayout.tsx`**  
  Componente contenedor que integra la cabecera superior, la barra de navegación y el área donde se renderizan las distintas rutas.
- **`src/components/common/Header.tsx`**  
  Barra superior que muestra el título del sistema, estado de conexión online/offline, selector de idioma (ES/EN) y botón de cierre de sesión.
- **`src/components/common/Navigation.tsx`**  
  Barra de navegación adaptativa (subcabecera en escritorio y barra inferior fija en móviles) con control de visibilidad según el rol del usuario.

### 7. Componentes de UI Reutilizables — `src/components/ui/`
- **`Badge.tsx`**  
  Etiqueta visual pequeña para resaltar estados, roles y categorías con diferentes colores.
- **`Button.tsx`**  
  Botón reutilizable estilizado con soporte para variantes de color, iconos, tamaños e indicador de carga.
- **`Card.tsx`**  
  Contenedor visual con bordes redondeados y fondo oscuro para agrupar secciones de información.
- **`Modal.tsx`**  
  Ventana emergente accesible con fondo oscurecido y cierre mediante tecla Escape o botón de salida.
- **`Toaster.tsx`**  
  Configuración global de notificaciones emergentes (toasts) integrada con los estilos oscuros de la interfaz.

---

## 📦 Tipos y Datos Iniciales

- **`src/types/index.ts`**  
  Contiene todas las definiciones de TypeScript de la aplicación: modelos de usuario, productos, recetas, insumos, ventas, fiados y cierres de turno.
- **`src/data/initialData.ts`**  
  Almacena los datos semilla (mock) de usuarios con PIN, catálogo de cafetería, insumos de inventario y cuentas de miembros.
- **`src/data/i18n/dict.ts`**  
  Diccionarios con todas las cadenas de texto del sistema en español e inglés para la internacionalización.

