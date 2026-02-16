# Control de Finanzas Personales (Gmail a Google Sheets)

Este proyecto permite automatizar la gestión de finanzas personales mediante la lectura y extracción de datos de notificaciones bancarias enviadas por correo electrónico. El sistema identifica transacciones, procesa la información relevante y la consolida en una base de datos estructurada en Google Sheets.

### Entidades Soportadas Actualmente
| Servicio | Entidad |
| :--- | :--- |
| **Billeteras Digitales** | YAPE |
| **Banca** | BCP |

---

## Características Principales

* **Automatización Total:** Ejecución programada en segundo plano mediante Google Apps Script Triggers.
* **Arquitectura Modular:** Código diseñado para facilitar la integración de nuevas instituciones bancarias de forma ágil.
* **Categorización Inteligente:** Clasificación automática de gastos (Comida, Transporte, Servicios, etc.) basada en una tabla de configuración editable.
* **Detección de Duplicados:** Implementación de etiquetas en Gmail (`GASTO_REGISTRADO`) para asegurar que cada transacción se procese una sola vez.
* **Gestión Multidivisa:** Detección automática de moneda local (PEN) y moneda extranjera (USD).
* **Privacidad y Seguridad:** El script se ejecuta exclusivamente en el entorno de Google del usuario; los datos financieros nunca salen de su cuenta privada.

---

## Arquitectura Técnica (Flujo ETL)

El sistema opera bajo un flujo de procesamiento de datos estructurado:

1.  **Extract (Extracción):** El script busca hilos de correo no leídos que coincidan con los remitentes y asuntos oficiales de los bancos configurados.
2.  **Transform (Transformación):**
    * Parseo del cuerpo del mensaje (HTML/Texto) mediante expresiones regulares (**Regex**).
    * Normalización de fechas y estandarización de formatos numéricos.
    * Cruce de información con la hoja de configuración para asignación de categorías.
3.  **Load (Carga):** Los datos estructurados se insertan en la hoja de registro final.
4.  **Mark (Marcado):** Se etiqueta el correo procesado para excluirlo de futuras ejecuciones.

---

## Configuración del Entorno

### 1. Preparación de la Hoja de Cálculo
Cree un archivo de Google Sheets con las siguientes dos pestañas y sus respectivos encabezados en la fila 1:

**Pestaña: `DATA`** (Registro de movimientos)
`FECHA | EMPRESA | CATEGORÍA | BANCO | N° TARJETA | MONEDA | MONTO | ID OPERACIÓN`

**Pestaña: `CONFIG`** (Reglas de negocio)
`PALABRA CLAVE | CATEGORÍA ASIGNADA`

> **Nota:** En la columna "Palabra Clave" puede definir comercios específicos (ej. Netflix, Uber) o números de cuenta/tarjeta para una identificación precisa del origen del gasto.

### 2. Instalación del Script
1.  En su Google Sheet, navegue a **Extensiones** > **Apps Script**.
2.  Copie el contenido del archivo `code.gs` incluido en este repositorio.
3.  Reemplace cualquier código existente en el editor de Apps Script con el código copiado y guarde el proyecto.
4.  **Autorización:** Al ejecutar el script por primera vez, Google solicitará permisos de acceso a Gmail y Sheets. Este es un paso estándar de seguridad de Google Apps Script.

### 3. Automatización (Activadores)
Para que el proceso sea 100% autónomo, configure un activador (Trigger):
1.  Dentro de Apps Script, haga clic en el icono de **Activadores** (reloj).
2.  Seleccione **Añadir activador**.
3.  Configure:
    * **Función a ejecutar:** `ejecutarSistemaFinanzas`
    * **Fuente de evento:** `Según tiempo`
    * **Tipo de activador:** `Temporizador por minutos`
    * **Intervalo:** Se recomienda cada 15 o 30 minutos.

---

## Contribuciones y Escalabilidad

El diseño modular permite extender el soporte a otros bancos fácilmente. Para agregar una nueva entidad, se recomienda seguir este patrón:

1.  Replicar la lógica de la función `procesarBCP`.
2.  Adaptar las expresiones regulares a los patrones específicos del nuevo banco.
3.  Incluir la llamada a la nueva función dentro de la rutina principal `ejecutarSistemaFinanzas`.

---
