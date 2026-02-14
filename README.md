# Control-de-Finanzas-Personales-por-Gmail
lee las notificaciones del correo donde llegan los recibos de un uso de tarjeta o alguna cuenta bancaria y los registra en una base de datos , en donde ayuda a ver de una mejor manera los pagos echos en cada cuenta y de esa manera llevar un mejor control de finanzas. Los medios actualizados que puede registrar son de :
|  YAPE  |  BCP  |
Características Principales

    100% Automatizado: Se ejecuta en segundo plano mediante Triggers de tiempo (cada 5 min).

    Multibanco: Código modular y escalable, diseñado para la integración ágil de nuevos bancos.

    Categorización Inteligente: Asigna categorías (Comida, Transporte, Servicios) basándose en una hoja de configuración editable por el usuario.

    Detección de Duplicados: Utiliza etiquetas de Gmail para asegurar que cada transacción se registre una única vez.

    Manejo de Divisas: Detecta y registra automáticamente si la compra fue en Soles (PEN) o Dólares (USD).

    Privacidad Total: El código se ejecuta en la cuenta de Google del usuario. Los datos financieros nunca salen de su entorno privado.

🛠️ Arquitectura Técnica

El flujo de datos sigue el siguiente proceso:

    Extract (Extracción): El script busca en Gmail hilos no leídos que coincidan con los patrones de los bancos (remitente y asunto).

    Transform (Transformación):

        - Se parsea el cuerpo del correo (HTML/Text) usando Regex.

        - Se normalizan fechas (de texto natural a objetos Date).

        - Se limpian montos y se estandarizan monedas.

        - Se consulta la hoja CONFIG para asignar una categoría.

    Load (Carga): Los datos estructurados se insertan en la hoja REGISTRO.

    Mark (Marcado): Se aplica una etiqueta en Gmail (GASTO_REGISTRADO) para excluir el correo de futuros procesos.

📋 Pre-requisitos

    Una cuenta de Google (Gmail + Google Sheets).

    Recibir notificaciones de consumo de tus bancos por correo electrónico.

⚙️ Instalación y Configuración

Sigue estos pasos para desplegar el proyecto en tu cuenta:
1. Preparar la Hoja de Cálculo

Crea un nuevo Google Sheet y configura dos pestañas:

Hoja 1: DATA (Aquí se guardarán los datos).
Encabezados en la Fila 1:
FECHA | EMPRESA | CATEGORÍA | BANCO | N° TARJETA | MONEDA | MONTO | ID OPERACIÓN
<img width="799" height="332" alt="imagen" src="https://github.com/user-attachments/assets/009aef0c-80ff-4608-afcb-f66044f9e7a2" />


Hoja 2: CONFIG (Aquí definirás tus reglas).
Encabezados en la Fila 1:
PALABRA CLAVE | CATEGORÍA ASIGNADA
Ejemplos (Fila 2 en adelante):
Uber | Transporte
Rappi | Comida
Netflix | Suscripciones
Numero de cuenta | numero de su tarjeta
Esto ultimo se agrego porque se detecto que algunos bancos tambien suelen poner el numero de cuenta con le que se pago en vez de la tarjeta, lo cual evitara pensar que son diferentes cuentas 
<img width="351" height="145" alt="imagen" src="https://github.com/user-attachments/assets/464e0187-91bd-4565-8aec-fee04d9d580c" />


2. Instalar el Script
   DATO: Es probable que aparezca una alerta de autorización al abrir Apps Script. Este es un paso de seguridad nativo de Google para otorgar permisos a la extensión; su uso es completamente seguro. 

    En tu Google Sheet, ve a Extensiones > Apps Script.
   <img width="582" height="96" alt="imagen" src="https://github.com/user-attachments/assets/bd4191f0-69a1-4d64-9395-225ec64738d0" />


    Copia el contenido del archivo code.gs de este repositorio.

    Pega el código en el editor.
   <img width="1002" height="576" alt="imagen" src="https://github.com/user-attachments/assets/bff1595d-961a-4417-bf5f-ed9694d5fe10" />




4. Configurar el Trigger (Automatización)

    En el panel izquierdo de Apps Script, ve a Activadores (Reloj).

    Añadir activador:

    Función: ejecutarSistemaFinanzas

    Fuente: Según tiempo

    Tipo: Por minutos (Cada 15 o 30 minutos).

    Guarda y autoriza los permisos de Gmail y Sheets.
   <img width="1354" height="494" alt="imagen" src="https://github.com/user-attachments/assets/f241c482-4328-4ebd-8ef0-ebc697268320" />



🤝 Contribuciones (Cómo agregar más bancos)

El código es modular. Para agregar un nuevo banco, asi que eres libre de configuraralo , si quieres agregar el codigo de el banco que usas , sientete libre de implementar

    Copia la función procesarBCP.

    Renómbrala a procesarInterbank.

    Ajusta las Regex para que coincidan con el formato del correo de Interbank.

    Agrega la llamada a la función principal ejecutarSistemaFinanzas.
Siéntete libre de usarlo y modificarlo para tus propias finanzas.
