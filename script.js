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
function procesarModuloBCP(hoja, etiqueta, reglasCategorias) {
    // ESTRATEGIA RED AMPLIA: Traemos todo lo del BCP nuevo
    var busqueda = 'from:' + GLOBAL_CONFIG.BCP_REMITENTE + ' -label:' + GLOBAL_CONFIG.GMAIL_LABEL + ' after:' + GLOBAL_CONFIG.FECHA_MINIMA_BUSQUEDA;
    
    Logger.log("--- INICIANDO BÚSQUEDA BCP ---");
    var hilos = GmailApp.search(busqueda, 0, 20);

    hilos.forEach(function(hilo) {
        // Filtro de Seguridad: Solo procesamos si el asunto dice "consumo", "transferencia" o "constancia"
        var asunto = hilo.getFirstMessageSubject().toLowerCase();
        
        // Puedes agregar más palabras clave aquí si descubres nuevos tipos de correos BCP
      
            
            hilo.getMessages().forEach(function(msg) {
                var cuerpo = msg.getPlainBody();

                // --------- EXTRACCIÓN DE DATOS BCP -------------------------
                
                // 1. Monto (BCP a veces pone "Total del consumo: S/...")
                // Este regex busca S/ o US$ seguido de números
                var montoObj = extraerMonto(cuerpo);
                
                // Si extraerMonto genérico falla, intentamos buscar "Total del consumo" específico
                if (montoObj.monto === 0) {
                     var matchBCP = cuerpo.match(/Total del consumo\s*(S\/|US\$)\s*([\d.]+)/);
                     if(matchBCP) {
                         montoObj.moneda = matchBCP[1].trim() === "$" ? "USD" : matchBCP[1].trim();
                         montoObj.monto = parseFloat(matchBCP[2]);
                     }
                }

                // 2. ID Operación
                var idOperacion = extraerRegex(cuerpo, /Número de operación\s*:?\s*(\d+)/i, "SinID");
                
                
                
                // 4. Tarjeta (BCP suele mostrar "****1234")
                // Buscamos 4 dígitos precedidos por asteriscos
                var tarjeta = extraerRegex(cuerpo, /\*+(\d{4})/, "BCP"); 

                // 5. Fecha y Hora (BCP usa formato largo: "12 de febrero de 2026...")
                var fechaRaw = extraerRegex(cuerpo, /Fecha y [Hh]ora.*?:?\s*(.+)/, "");
                var fechaObj = procesarFechaBCP(fechaRaw); // Usamos un helper específico para BCP

                // 6. Categoría
                var categoria = obtenerCategoria(empresa, reglasCategorias);

                // --------- CARGA DE DATOS -------------------------------
                if (montoObj.monto > 0) {
                    hoja.appendRow([
                        fechaObj.fecha,
                        fechaObj.hora,
                        empresa,
                        "BCP",           // Banco
                        tarjeta,         // N° Tarjeta (Dinámico)
                        montoObj.moneda,
                        montoObj.monto,
                        idOperacion,
                        categoria
                    ]);
                }
            });
            // Marcamos procesado
            hilo.addLabel(etiqueta);
        }
    });
}

/**
 * ------------------------------------------
 * HERRAMIENTAS O LOS HELPERS REUTILIZABLES
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