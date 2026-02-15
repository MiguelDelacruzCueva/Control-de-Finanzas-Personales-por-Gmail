/**
 * -----------------------------------------------
 * PROYECTO : FINANZAS PERSONALES AUTOMATIZADO
 * AUTOR : MiguelDelacruzCueva
 * -----------------------------------------------
 */
const GLOBAL_CONFIG={
    // el script no mirara correos anteriores a esta fecha
    FECHA_MINIMA_BUSQUEDA: "2025/12/01",

    //nombres de las hojas
    HOJA_DATOS: "DATA",
    HOJA_CONFIG: "CONFIG",

    //etiqueta de gmail para no repetir el correo
    GMAIL_LABEL: "PROCESADO_APP_FINANZAS",

    //Datos YAPE
    YAPE_CELULAR: "999999999",
    //Datos BCP
    BCP_REMITENTE: "notificaciones@notificacionesbcp.com.pe"
    //Datos ...

};
/**
 * ---------------------------------
 * FUNCION PRINCIPAL (ORQUESTADOR)
 * ---------------------------------
 */
function ejecutarSistema(){
    var etiqueta = obtenerEtiqueta(GLOBAL_CONFIG.GMAIL_LABEL);
    if (!etiqueta)return;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hojaDatos = ss.getSheetByName(GLOBAL_CONFIG.HOJA_DATOS);
    var hojaConfig = ss.getSheetByName(GLOBAL_CONFIG.HOJA_CONFIG);

    if (!hojaDatos || !hojaConfig){
        Logger.log("ERROR CRITICO: no existen las hojas 'DATA' o  'CONFIG'.");
        return;
    }
    var reglasCategorias = cargarMapasCategorias(hojaConfig);

//******************************************************************* */
    //EJECUTA YAPE
    procesarModuloYape(hojaDatos,etiqueta,reglasCategorias);
    //EJECUTA BCP
    procesarModuloBCP(hojaDatos, etiqueta, reglasCategorias);
    //EJECUTAR ...

    //******************************************************************* */
}
/**
 * ------------------
 * MODULO YAPE
 * Soporta: Pagos de Servicios y Transferencias Personales
 * ------------------
 */
function procesarModuloYape(hoja, etiqueta, reglasCategorias) {
    // 1. CAMBIO DE ESTRATEGIA: Buscamos SOLO por remitente.
    // Quitamos el filtro de asunto en la búsqueda de Gmail para que no falle el "OR".
    var busqueda = 'from:notificaciones@yape.pe -label:' + GLOBAL_CONFIG.GMAIL_LABEL + ' after:' + GLOBAL_CONFIG.FECHA_MINIMA_BUSQUEDA;
    
    Logger.log("--- INICIANDO BÚSQUEDA YAPE ---");
    Logger.log("Query: " + busqueda);

    var hilos = GmailApp.search(busqueda, 0, 20);
    Logger.log("Hilos encontrados: " + hilos.length);

    if (hilos.length === 0) {
        Logger.log("No se encontraron correos nuevos de Yape.");
        return;
    }

    hilos.forEach(function(hilo) {
        // Obtenemos el asunto del hilo para validar si nos interesa
        var asunto = hilo.getFirstMessageSubject();
        
        // 2. FILTRO EN JAVASCRIPT (INFALIBLE)
        // Verificamos si el asunto contiene las palabras clave
        var esServicio = asunto.indexOf("servicio ha sido confirmado") > -1;
        var esTransferencia = asunto.indexOf("Por tu seguridad") > -1;

        if (esServicio || esTransferencia) {
            Logger.log("Procesando correo válido: " + asunto);
            
            hilo.getMessages().forEach(function(msg) {
                var cuerpo = msg.getPlainBody();

                // --------- EXTRACCIÓN DE DATOS -------------------------
                
                // 1. Monto (Regex flexible para ambos casos)
                var montoObj = extraerMonto(cuerpo);
                
                // 2. ID Operación
                var idOperacion = extraerRegex(cuerpo, /N(?:°|º|ro)(?: de)? operación(?: Yape)?\s*:?\s*(\d+)/i, "SinID");    
                // 3. Empresa
                var empresa = null;
                
                if (esServicio) {
                    // Lógica para SERVICIOS
                    empresa = extraerRegex(cuerpo, /Empresa\s*:\s*(.+)/i, null);
                } else {
                    // Lógica para TRANSFERENCIa
                    empresa = extraerRegex(cuerpo, /Nombre del Beneficiario\s*(.+)/i, null);
                    if (empresa) {
                        empresa = empresa.replace(/\*$/, "").trim();
                    } else {
                        // Intento secundario por si cambia el formato
                        empresa = "Transferencia Yape"; 
                    }
                }
                // Si aún así es null, ponemos genérico
                if (!empresa) empresa = "Yape Desconocido";
                // 4. Categoria
                var categoria = obtenerCategoria(empresa, reglasCategorias);
                // 5. Fecha
                var fechaRaw = extraerRegex(cuerpo, /Fecha y [Hh]ora.*?:?\s*(.+)/, "");
                var fechaObj = procesarFechaYape(fechaRaw);

                // --------- CARGA DE DATOS -------------------------------
                // Solo guardamos si encontramos un monto válido (> 0)
                if (montoObj.monto > 0) {
                    hoja.appendRow([
                        fechaObj.fecha,
                        fechaObj.hora,
                        empresa,
                        "YAPE",
                        GLOBAL_CONFIG.YAPE_CELULAR,
                        montoObj.moneda,
                        montoObj.monto,
                        idOperacion,
                        categoria
                    ]);
                    Logger.log("--> Guardado: " + empresa + " | " + montoObj.monto);
                } else {
                    Logger.log("--> ALERTA: Correo procesado pero no se encontró monto. Asunto: " + asunto);
                }
            });
            
            // Marcamos como procesado
            hilo.addLabel(etiqueta); 
            
        } else {
            Logger.log("Saltando correo irrelevante: " + asunto);
            // Opcional: Podrías marcarlo también para no volver a leerlo, 
        }
    });   
}
/**
 * ------------------------------------------
 * MODULO BCP
 * Soporta consumo de tarjeta y tranferencias
 * ------------------------------------------
 */
function procesarModuloBCP(hoja, etiqueta, mapaConfiguracion) {
    var busqueda = 'from:' + GLOBAL_CONFIG.BCP_REMITENTE + ' -label:' + GLOBAL_CONFIG.GMAIL_LABEL + ' after:' + GLOBAL_CONFIG.FECHA_MINIMA_BUSQUEDA;
    
    var hilos = GmailApp.search(busqueda, 0, 20);

    hilos.forEach(function(hilo) {
        var asunto = hilo.getFirstMessageSubject().toLowerCase();
        
        // --- 1. FILTRO DE SEGURIDAD  ---
        if (asunto.indexOf("recibiste") > -1 || 
            asunto.indexOf("recepción") > -1 || 
            asunto.indexOf("abono") > -1 || 
            asunto.indexOf("te yapearon") > -1) {
            
            hilo.addLabel(etiqueta); 
            return; 
        }

        // --- 2. VERIFICACIÓN DOBLE DE GASTO ---
        var esGasto = (asunto.indexOf("realizaste") > -1 || 
                       asunto.indexOf("consumo") > -1 || 
                       asunto.indexOf("transferencia") > -1 || 
                       asunto.indexOf("pago") > -1 ||
                       asunto.indexOf("constancia") > -1);

        if (esGasto) {
            hilo.getMessages().forEach(function(msg) {
                var cuerpo = msg.getPlainBody();
                // --- 3. FILTRO DE EMERGENCIA EN EL CUERPO ---
                if (cuerpo.indexOf("monto recibido") > -1 || cuerpo.indexOf("recibiste un yapeo") > -1) {
                    return; 
                }

                // --- A. EXTRACCIÓN EMPRESA ---
                var empresa = null;
                empresa = extraerRegex(cuerpo, /Enviado a\s*(.+)/i, null); // QR
                if (!empresa) empresa = extraerRegex(cuerpo, /Empresa\s*:?\s*(.+)/i, null);
                if (!empresa) empresa = extraerRegex(cuerpo, /Beneficiario\s*:?\s*(.+)/i, null);
                if (!empresa) empresa = extraerRegex(cuerpo, /Entidad\s*:?\s*(.+)/i, null);
                if (!empresa) empresa = extraerRegex(cuerpo, /Destinatario\s*:?\s*(.+)/i, "BCP Varios");
                empresa = empresa.replace(/\.$/, "").trim(); 

                // --- B. EXTRACCIÓN Y MAPEO TARJETA (LÓGICA SEGURA) ---
                var tarjetaFinal = "BCP Genérica";
                
                var matchCuenta = cuerpo.match(/(?:Desde|Cuenta|Tarjeta|Cargo).*?(\*{4}\s*\d{4})/i);
                if (matchCuenta) {
                   
                    var digitosEncontrados = matchCuenta[1].replace(/\D/g, ''); 
                    
                    // BUSCAMOS EN LA HOJA CONFIG 
                    if (mapaConfiguracion[digitosEncontrados]) {
                        tarjetaFinal = "****" + mapaConfiguracion[digitosEncontrados];
                    } else {
                        tarjetaFinal = "****" + digitosEncontrados;
                    }
                }

                // --- C. EXTRACCIÓN MONTO ---
                var montoObj = extraerMonto(cuerpo);
                if (montoObj.monto === 0) {
                     var matchBCP = cuerpo.match(/(?:Total|Monto enviado).*?(S\/|US\$)\s*([\d.]+)/i);
                     if(matchBCP) {
                         montoObj.moneda = matchBCP[1].trim() === "$" ? "USD" : matchBCP[1].trim();
                         montoObj.monto = parseFloat(matchBCP[2]);
                     }
                }

                // --- D. ID Y FECHA ---
                var idOperacion = extraerRegex(cuerpo, /Número de operación[\s\S]{0,30}?(\d{6,})/i, "SinID");
                var fechaRaw = extraerRegex(cuerpo, /Fecha y [Hh]ora.*?:?\s*(.+)/, "");
                var fechaObj = procesarFechaBCP(fechaRaw);

                // --- E. CATEGORÍA ---
                var categoria = obtenerCategoria(empresa, mapaConfiguracion);

                // --- GUARDAMOS DATOS ---
                if (montoObj.monto > 0) {
                    hoja.appendRow([
                        fechaObj.fecha,
                        fechaObj.hora,
                        empresa,
                        "BCP",
                        tarjetaFinal,
                        montoObj.moneda,
                        montoObj.monto,
                        idOperacion,
                        categoria
                    ]);
                }
            });
            hilo.addLabel(etiqueta);
        }
    });
}

/**
 * --------------------------------------------------------------
 * HELPER FECHA BCP
 * Convierte: "11 de febrero de 2026 - 02:56 PM" -> Date Object
 * --------------------------------------------------------------
 */
function procesarFechaBCP(texto) {
    var resultado = {fecha: new Date(), hora: "00:00"};
    
    // BCP usa nombres completos en español
    var meses = {
        "enero":0, "febrero":1, "marzo":2, "abril":3, "mayo":4, "junio":5, 
        "julio":6, "agosto":7, "septiembre":8, "octubre":9, "noviembre":10, "diciembre":11
    };

    try {
        // Regex para: (11) de (febrero) de (2026) [- ó nada] (02):(56) (PM)
        var partes = texto.match(/(\d+)\s+de\s+([a-zA-Z]+)\s+de\s+(\d+).*?(\d+):(\d+)\s+(AM|PM)/i);
        
        if (partes) {
            var dia = parseInt(partes[1]);
            var mes = meses[partes[2].toLowerCase()];
            var anio = parseInt(partes[3]);
            var hora = parseInt(partes[4]);
            var min = parseInt(partes[5]);
            var ampm = partes[6].toUpperCase();

            // Conversión 12h -> 24h
            var hora24 = hora;
            if (ampm === "PM" && hora < 12) hora24 += 12;
            if (ampm === "AM" && hora === 12) hora24 = 0;

            resultado.fecha = new Date(anio, mes, dia, hora24, min);
            var horaStr = (hora24 < 10 ? "0" + hora24 : hora24) + ":" + (min < 10 ? "0" + min : min);
            resultado.hora = horaStr;
        }
    } catch(e) {
        Logger.log("ERROR FECHA BCP (" + texto + "): " + e);
    }
    return resultado;
}

/**
 * ------------------------------------------
 * HELPERS FECHA YAPE 
 * -----------------------------------------
 * Parsea la fecha de Yape: "30 Ene. 2026 - 01:56 pm" a objetos separados
 */
function procesarFechaYape(texto){
var resultado = {fecha: new Date(), hora: "00:00"};
var meses = {"Ene":0, "Feb":1, "Mar":2, "Abr":3, "May":4, "Jun":5, "Jul":6, "Ago":7, "Set":8, "Oct":9, "Nov":10, "Dic":11,
    "enero":0, "febrero":1, "marzo":2, "abril":3, "mayo":4, "junio":5, "julio":6, "agosto":7, "septiembre":8, "octubre":9, "noviembre":10, "diciembre":11
};

try{
    var partes = texto.match(/(\d+)\s+([a-zA-Záéíóú]+)\.?\s+(\d+).*?(\d+):(\d+)\s+([ap]\.?\s*m\.?)/i);
    if (partes){
        var dia = parseInt(partes[1]);
        var nombreMes = partes[2].toLowerCase().replace('.', '');
        var mes = meses[partes[2]];
        if (mes === undefined) mes = meses[nombreMes.substring(0,3)]; 
        var anio = parseInt(partes[3]);
        var hora = parseInt(partes[4]);
        var min = parseInt(partes[5]);
        var ampm = partes[6].toLowerCase().replace(/\./g, '').replace(/\s/g, '');
        //ajuste de hora 24h para el objeto date
        var hora24 = hora;
        if (ampm === "pm" && hora < 12) hora24 += 12;
        if (ampm === "am" && hora === 12) hora24 = 0;
        //creamos objeto Date paa la columna fecha
        resultado.fecha = new Date(anio,mes,dia,hora24,min);
        //formateamos string 
        var horaStr = (hora24 < 10? "0" + hora24 : hora24) + ":" + (min < 10 ? "0" + min : min);
        resultado.hora = horaStr;
    }
}catch(e) {
    Logger.log("ERROR FECHA YAPE ("+ texto +"): "+ e);
}
return resultado;
}
/**
 * 
 * HERRAMIENTAS 
 */
// Cargar la hoja CONFIG en memoria para buscar rapido
function cargarMapasCategorias(hoja){
    var mapa = {};
    var ultimaFila = hoja.getLastRow();
    if (ultimaFila > 1){
        var datos = hoja.getRange(2,1,ultimaFila - 1,2).getValues();// esto lee la columna A y B
        for  (var i=0; i< datos.length; i++){
            var key = String(datos[i][0]).toLowerCase().trim();
            var val = String(datos[i][1]).trim();
            if (key) mapa[key] = val;
        }       
    }
    return mapa;
}
 
function obtenerCategoria (empresa,mapa){
    empresa = empresa.toLowerCase();
    //buscamos si alguna palabra esta dentro del nombre de la empresa
    for (var key in mapa ){
        if(empresa.indexOf(key) > -1){
            return mapa[key];
        }
    }
    return "sin categoria";
}
//extrator generico 
function extraerRegex ( texto,regex,def) {
    var m = texto.match(regex);
    return m ? m[1].trim() : def;
}
//extractor de monto 
function extraerMonto (texto){
    var match = texto.match(/(S\/|US\$|\$)\s*([\d.]+)/);
    var moneda = "S/";
    var monto = 0.00;
    if(match){
        if (match[1].indexOf("$") > -1) moneda = "USD";
        monto = parseFloat(match[2]);
    }
    return {moneda:moneda, monto:monto};
}
//etiqueta en el gmail
function obtenerEtiqueta(nombre) {
    try{
        var label = GmailApp.getUserLabelByName(nombre);
        if (!label) label = GmailApp.createLabel(nombre);
        return label;
    }catch(e){
        Logger.log("Error etiqueta: "+e);
        return null;
    }
}

/**
 * ==================================================================
 * SECCIÓN DE INSTALACIÓN AUTOMÁTICA (SETUP)
 * Ejecuta esto UNA VEZ para crear el Formulario y vincularlo solo.
 * ==================================================================
 */
function instalarSistemaManual() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaConfig = ss.getSheetByName(GLOBAL_CONFIG.HOJA_CONFIG);
  
  if (!hojaConfig) {
    Browser.msgBox("Error: Primero crea la hoja CONFIG.");
    return;
  }
  // 1. Obtener Categorías de tu Excel para ponerlas en el Form
  // Asumimos que están en la Columna B de CONFIG (desde fila 2)
  var rangos = hojaConfig.getRange(2, 2, hojaConfig.getLastRow() - 1, 1).getValues();
  var categorias = rangos.flat().filter(String); // Limpiar vacíos
  // Quitamos duplicados por si acaso
  categorias = [...new Set(categorias)];
  
  if (categorias.length === 0) categorias = ["Comida", "Transporte", "Varios"]; // Default

  // 2. Crear el Formulario
  var form = FormApp.create('Gastos Rápidos (Manual)');
  


}