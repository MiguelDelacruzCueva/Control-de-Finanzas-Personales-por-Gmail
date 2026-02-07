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

    //Datos fijo de yape por ejemplo
    YAPE_CELULAR: "999999999"

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

    //por ahora solo yape
    procesarModuloYape(hojaDatos,etiqueta,reglasCategorias);
}
/**
 * ------------------
 * MODULO YAPE
 * ------------------
 */
function procesarModuloYape(hoja,etiqueta,reglasCategorias){
    //aqui construimos la busqueda usando la variable global de fecha
    var busqueda = 'from:notificaciones@yape.pe subject:"Tu yapeo de servicio ha sido confirmado" - label:'+GLOBAL_CONFIG.GMAIL_LABEL + 'after:'+GLOBAL_CONFIG.FECHA_MINIMA_BUSQUEDA;

    //primero traeremos un bloque de 20 correos para no saturar 
    var hilos = GmailApp.search(busqueda, 0,20);

    //recorreremos cada hilo encontrado
    hilos.forEach(function(hilo){
        var mensajes= hilo.getMenssages();

        mensajes.forEach(function(msg){
            var cuerpo = msg.getPlainBody();
//---------extraccion de datos-------------------------
            // 1. monto y moneda
            var montoObj = extraerMonto(cuerpo);
            // 2. ID operacion
            var idOperacion = extraerRegex(cuerpo,/Nº de operacion Yape:\s*(\d+)/, "SinID");
            //3. Empresa
            var empresa = extraerRegex(cuerpo, /Empresa:\s*(.+)/, "YapeVarios");
            //4. Categoria (buscamos de config)
            var categoria = obtenerCategoria(empresa, reglasCategorias);
            //5. fecha y hora separadas
            var fechaRaw = extraerRegex(cuerpo,/Fecha y hora:\s*(.+)/,"");
            var fechaOBj = procesarFechaYape(fechaRaw);
//---------carga de datos-------------------------------
            hoja.appendRow([
                fechaOBj.fecha,
                fechaOBj.hora,
                empresa,
                "YAPE",
                GLOBAL_CONFIG.YAPE_CELULAR,
                montoObj.moneda,
                montoObj,monto,
                idOperacion,
                categoria
            ]);

        });
        hilo.addLabel(etiqueta);//esto marcara como procesado en el gmail
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
var meses = {"Ene":0, "Feb":1, "Mar":2, "Abr":3, "May":4, "Jun":5, "Jul":6, "Ago":7, "Set":8, "Oct":9, "Nov":10, "Dic":11};

try{
    var partes = texto .match(/(\d+)\s+([A-Z][a-z]+)\.?\s+(\d+)\s+-\s+(\d+):(\d+)\s+(am|pm)/i);
    if (partes){
        var dia = parseInt(partes[1]);
        var mes = meses[partes[2]];
        var anio = parseInt(partes[3]);
        var hora = parseInt(partes[4]);
        var min = parseInt(partes[5]);
        var ampm = partes[6].toLowerCase();
        //ajuste de hora 24h para el objeto date
        var hora24 = hora;
        if (ampm === "pm" && hora < 12) hora24 += 12;
        if (ampm === "am" && hora === 12) hora24 = 0;
        //creamos objeto Date paa la columna fecha
        resultado.fecha = new Date(anio,mes,dia,hora24,min);
        //formateamos string 
        var horaStr = (hora24 < 10? "O" + hora24 : hora24) + ":" + (min < 10 ? "O" + min : min);
        resultado.hora = horaStr;
    }
}catch(e) {
    Logger.log("ERROR PARSEANDO FECHA YAPE"+ e);
}
return resultado;
}
// Cargar la hoja CONFIG en memoria para buscar rapido
function cargarMapasCategorias(hoja){
    var mapa = {};
    var ultimaFila = hoja.getLastRow();
    if (ultimaFila > 1){
        var datos = hoja.getRange(2,1,ultimaFila - 1,2).getValues();// esto lee la columna A y B
        for  (var i=0; i< datos.lenght; i++){
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