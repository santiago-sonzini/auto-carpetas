(() => {
    // --- Selectores adaptados para la estructura de WhatsApp Web (agosto de 2025) ---
    // ¡Estos son los selectores clave que hemos actualizado!
    const SELECTOR_GRUPO_MENSAJES = 'div[role="group"]';
    const SELECTOR_REMITENTE_GRUPO = '._amla span[dir="auto"]'; // Remitente para un grupo de mensajes
    const SELECTOR_METADATA_INDIVIDUAL = '[data-pre-plain-text]'; // Remitente para un mensaje de texto normal
    const SELECTOR_TEXTO_MENSAJE = 'span.selectable-text.copyable-text';
    const SELECTOR_IMAGEN = 'img[src^="blob:"]'; // El más fiable: busca la URL que empieza con "blob:"
    const SELECTOR_HORA = 'span.x1rg5ohu'; // Selector para la hora del mensaje

    // --- Funciones de descarga (sin cambios) ---
    function descargarContenido(contenido, nombreArchivo) {
        try {
            const blob = new Blob([contenido], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log(`✅ Archivo JSON generado: ${nombreArchivo}`);
        } catch (error) {
            console.error(`❌ Error al generar el archivo JSON:`, error);
        }
    }

    async function descargarImagen(url, nombreArchivo) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error de red: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = nombreArchivo || 'imagen.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
            console.log(`✅ Descarga exitosa: ${nombreArchivo}`);
        } catch (error) {
            console.error(`❌ Falló la descarga de "${nombreArchivo}". Razón: ${error.message}. URL: ${url}`);
        }
    }

    // --- Lógica Principal Mejorada ---
    const main = document.querySelector('#main');
    if (!main) {
        console.error("❌ No encontré el contenedor principal de mensajes (#main).");
        return;
    }

    // Buscamos tanto grupos de mensajes como mensajes individuales
    const todosLosMensajes = main.querySelectorAll(`${SELECTOR_GRUPO_MENSAJES}, div.x9f619`);
    console.log(`🔎 Encontrados ${todosLosMensajes.length} elementos de mensaje (grupos o individuales).`);
    
    let contadorImagenesDescargadas = 0;
    const resultadosParaJson = [];

    todosLosMensajes.forEach((mensajeNode, i) => {
        let remitente = "Remitente Desconocido";
        let fechaHora = "Fecha Desconocida";
        let texto = "";
        const imagenes = [];

        // Intentamos obtener la hora primero, ya que suele estar presente
        const horaElement = mensajeNode.querySelector(SELECTOR_HORA);
        if (horaElement) {
            fechaHora = horaElement.innerText;
        }

        // CASO 1: Es un grupo de mensajes (como el de tus imágenes)
        if (mensajeNode.matches(SELECTOR_GRUPO_MENSAJES)) {
            const remitenteElement = mensajeNode.querySelector(SELECTOR_REMITENTE_GRUPO);
            if (remitenteElement) {
                remitente = remitenteElement.innerText.trim();
            }
            // El texto podría ser el "caption" de la imagen, que es un span similar
            const textoCaption = mensajeNode.querySelector(SELECTOR_TEXTO_MENSAJE);
            if (textoCaption) {
                texto = textoCaption.innerText.trim();
            }
        } 
        // CASO 2: Es un mensaje de texto individual (lógica anterior)
        else {
            const metaDataElement = mensajeNode.querySelector(SELECTOR_METADATA_INDIVIDUAL);
            if (metaDataElement) {
                const prePlainText = metaDataElement.getAttribute('data-pre-plain-text') || "";
                const matchPre = prePlainText.match(/^\[(.*?)\]\s*(.*?):\s*$/);
                if (matchPre && matchPre[1] && matchPre[2]) {
                    fechaHora = matchPre[1];
                    remitente = matchPre[2].trim();
                }
            }
            const textoSpan = mensajeNode.querySelector(SELECTOR_TEXTO_MENSAJE);
            if(textoSpan) {
                texto = textoSpan.innerText.trim();
            }
        }

        // Buscamos todas las imágenes dentro del nodo actual (sea grupo o individual)
        const imgs = mensajeNode.querySelectorAll(SELECTOR_IMAGEN);
        [...new Set(Array.from(imgs).map(img => img.src))].forEach((url) => {
             if (url && url.startsWith('blob:')) {
                const remitenteSanitizado = remitente.replace(/[^a-zA-Z0-9\s.-]/g, '').trim() || 'desconocido';
                const fechaSanitizada = fechaHora.replace(/[/,:]/g, '-').replace(/\s/g, '_');
                const nombreArchivo = `${fechaSanitizada}_${remitenteSanitizado}_img${contadorImagenesDescargadas}.jpg`;
                
                imagenes.push({ url_original: url, nombre_archivo_descargado: nombreArchivo });
                
                setTimeout(() => descargarImagen(url, nombreArchivo), contadorImagenesDescargadas * 500);
                contadorImagenesDescargadas++;
            }
        });
        
        // Solo añadimos al JSON si hay contenido real
        if (texto.trim() !== "" || imagenes.length > 0) {
            resultadosParaJson.push({
                remitente,
                fechaHora,
                texto,
                imagenes
            });
        }
    });

    // --- Generación del reporte final y JSON ---
    if (resultadosParaJson.length > 0) {
        const contenidoJson = JSON.stringify(resultadosParaJson, null, 2);
        descargarContenido(contenidoJson, 'datos.json');
        alert(`Proceso completado.\n\nSe inició la descarga de ${contadorImagenesDescargadas} imágenes y 1 archivo JSON.\n\n¡Recuerda permitir las descargas múltiples!`);
    } else {
        alert("🤷‍♂️ No se encontraron mensajes con texto o imágenes para procesar. Desplázate en el chat para cargar más mensajes y vuelve a intentarlo.");
    }
})();