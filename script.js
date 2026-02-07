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