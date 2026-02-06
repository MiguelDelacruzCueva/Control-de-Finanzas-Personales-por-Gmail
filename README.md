# Control-de-Finanzas-Personales-por-Gmail
lee las notificaciones del correo donde llegan los recibos de un uso de tarjeta o alguna cuenta bancaria y los registra en una base de datos , en donde ayuda a ver de una mejor manera los gstaos registraods a ciertas cuentas bancarias y llevar un control de ellas
Características Principales

    100% Automatizado: Se ejecuta en segundo plano mediante Triggers de tiempo (cada 15 min).

    Multibanco: Soporte actual para BCP (Banco de Crédito del Perú) y Yape. Fácilmente extensible a otros bancos.

    Categorización Inteligente: Asigna categorías (Comida, Transporte, Servicios) basándose en una hoja de configuración editable por el usuario.

    Detección de Duplicados: Utiliza etiquetas de Gmail para asegurar que cada transacción se registre una única vez.

    Manejo de Divisas: Detecta y registra automáticamente si la compra fue en Soles (PEN) o Dólares (USD).

    Privacidad Total: El código se ejecuta en la cuenta de Google del usuario. Los datos financieros nunca salen de su entorno privado.

🛠️ Arquitectura Técnica

El flujo de datos sigue el siguiente proceso:

    Extract (Extracción): El script busca en Gmail hilos no leídos que coincidan con los patrones de los bancos (remitente y asunto).

    Transform (Transformación):

        Se parsea el cuerpo del correo (HTML/Text) usando Regex.

        Se normalizan fechas (de texto natural a objetos Date).

        Se limpian montos y se estandarizan monedas.

        Se consulta la hoja CONFIG para asignar una categoría.

    Load (Carga): Los datos estructurados se insertan en la hoja REGISTRO.

    Mark (Marcado): Se aplica una etiqueta en Gmail (GASTO_REGISTRADO) para excluir el correo de futuros procesos.

📋 Pre-requisitos

    Una cuenta de Google (Gmail + Google Sheets).

    Recibir notificaciones de consumo de tus bancos por correo electrónico.

⚙️ Instalación y Configuración

Sigue estos pasos para desplegar el proyecto en tu cuenta:
1. Preparar la Hoja de Cálculo

Crea un nuevo Google Sheet y configura dos pestañas:

Hoja 1: REGISTRO (Aquí se guardarán los datos).
Encabezados en la Fila 1:
FECHA | EMPRESA | CATEGORÍA | BANCO | N° TARJETA | MONEDA | MONTO | ID OPERACIÓN

Hoja 2: CONFIG (Aquí definirás tus reglas).
Encabezados en la Fila 1:
PALABRA CLAVE | CATEGORÍA ASIGNADA
Ejemplos (Fila 2 en adelante):
Uber | Transporte
Rappi | Comida
Netflix | Suscripciones

2. Instalar el Script

    En tu Google Sheet, ve a Extensiones > Apps Script.

    Copia el contenido del archivo code.gs de este repositorio.

    Pega el código en el editor.

    Edita la constante USER_CONFIG al inicio del código con tus datos (ej. tu número de celular para Yape).

3. Configurar el Trigger (Automatización)

    En el panel izquierdo de Apps Script, ve a Activadores (Reloj).

    Añadir activador:

    Función: ejecutarSistemaFinanzas

    Fuente: Según tiempo

    Tipo: Por minutos (Cada 15 o 30 minutos).

    Guarda y autoriza los permisos de Gmail y Sheets.

🤝 Contribuciones (Cómo agregar más bancos)

El código es modular. Para agregar un nuevo banco (ej. Interbank):

    Copia la función procesarBCP.

    Renómbrala a procesarInterbank.

    Ajusta las Regex para que coincidan con el formato del correo de Interbank.

    Agrega la llamada a la función principal ejecutarSistemaFinanzas.
Siéntete libre de usarlo y modificarlo para tus propias finanzas.
