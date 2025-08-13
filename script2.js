(() => {
    // --- Selectores adaptados para la estructura de WhatsApp Web (agosto de 2025) ---
    const SELECTOR_GRUPO_MENSAJES = 'div[role="group"]';
    const SELECTOR_REMITENTE_GRUPO = '._amla span[dir="auto"]';
    const SELECTOR_METADATA_INDIVIDUAL = '[data-pre-plain-text]';
    const SELECTOR_TEXTO_MENSAJE = 'span.selectable-text.copyable-text';
    const SELECTOR_IMAGEN = 'img[src^="blob:"]';
    const SELECTOR_HORA = 'span.x1rg5ohu';

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
        } catch (error) {
            console.error(`❌ Falló la descarga de "${nombreArchivo}". Razón: ${error.message}. URL: ${url}`);
        }
    }

    // --- Lógica Principal Corregida ---
    const main = document.querySelector('#main');
    if (!main) {
        console.error("❌ No encontré el contenedor principal de mensajes (#main).");
        return;
    }

    const todosLosMensajes = main.querySelectorAll(`${SELECTOR_GRUPO_MENSAJES}, div.x9f619`);
    console.log(`🔎 Encontrados ${todosLosMensajes.length} elementos de mensaje (grupos o individuales).`);

    // Contadores para el recuento final
    let contadorImagenes = 0;
    let contadorTextos = 0;
    let idMensaje = 0; // Para un ID único en el JSON
    const resultadosParaJson = [];

    todosLosMensajes.forEach((mensajeNode) => {
        let remitente = "Remitente Desconocido";
        let fechaHora = "Fecha Desconocida";

        // Obtener datos comunes (remitente y hora) del nodo de mensaje
        const horaElement = mensajeNode.querySelector(SELECTOR_HORA);
        if (horaElement) {
            fechaHora = horaElement.innerText;
        }

        if (mensajeNode.matches(SELECTOR_GRUPO_MENSAJES)) {
            const remitenteElement = mensajeNode.querySelector(SELECTOR_REMITENTE_GRUPO);
            if (remitenteElement) {
                remitente = remitenteElement.innerText.trim();
            }
        } else {
            const metaDataElement = mensajeNode.querySelector(SELECTOR_METADATA_INDIVIDUAL);
            if (metaDataElement) {
                const prePlainText = metaDataElement.getAttribute('data-pre-plain-text') || "";
                const matchPre = prePlainText.match(/^\[(.*?)\]\s*(.*?):\s*$/);
                if (matchPre && matchPre[1] && matchPre[2]) {
                    fechaHora = matchPre[1];
                    remitente = matchPre[2].trim();
                }
            }
        }

        // ==================================================================
        // NUEVA LÓGICA: Separar texto e imágenes en entradas diferentes
        // ==================================================================

        // 1. PROCESAR EL TEXTO DEL MENSAJE (si existe)
        const textoElemento = mensajeNode.querySelector(SELECTOR_TEXTO_MENSAJE);
        if (textoElemento && textoElemento.innerText.trim() !== "") {
            resultadosParaJson.push({
                id: idMensaje++,
                tipo: 'texto',
                remitente,
                fechaHora,
                texto: textoElemento.innerText.trim(),
                imagenes: []
            });
            contadorTextos++; // Incrementar contador de textos
        }

        // 2. PROCESAR LAS IMÁGENES DEL MENSAJE (si existen)
        const imgs = mensajeNode.querySelectorAll(SELECTOR_IMAGEN);
        const urlsUnicas = [...new Set(Array.from(imgs).map(img => img.src))];

        urlsUnicas.forEach((url) => {
            if (url && url.startsWith('blob:')) {
                const remitenteSanitizado = remitente.replace(/[^a-zA-Z0-9\s.-]/g, '').trim() || 'desconocido';
                const fechaSanitizada = fechaHora.replace(/[/,:]/g, '-').replace(/\s/g, '_');
                const nombreArchivo = `${fechaSanitizada}_${remitenteSanitizado}_img${contadorImagenes}.jpg`;

                // Crear una entrada separada para CADA imagen
                resultadosParaJson.push({
                    id: idMensaje++,
                    tipo: 'imagen',
                    remitente,
                    fechaHora,
                    texto: '', // El texto está en su propia entrada
                    imagenes: [{
                        url_original: url,
                        nombre_archivo_descargado: nombreArchivo
                    }]
                });

                // Descargar la imagen
                setTimeout(() => descargarImagen(url, nombreArchivo), contadorImagenes * 300); // Espaciado para evitar bloqueos
                contadorImagenes++; // Incrementar contador de imágenes
            }
        });
    });

    // --- Generación del reporte final y JSON ---
    if (resultadosParaJson.length > 0) {
        const contenidoJson = JSON.stringify(resultadosParaJson, null, 2);
        descargarContenido(contenidoJson, 'chat_exportado.json');

        console.log("--- PROCESO FINALIZADO ---");
        console.log(`Total de mensajes de texto extraídos: ${contadorTextos}`);
        console.log(`Total de imágenes encontradas: ${contadorImagenes}`);

        alert(
            `Proceso completado.\n\n` +
            `RECuento:\n` +
            `- ${contadorTextos} mensajes de texto.\n` +
            `- ${contadorImagenes} imágenes.\n\n` +
            `Se inició la descarga de las imágenes y de 1 archivo JSON ("chat_exportado.json") con todos los datos.\n\n` +
            `¡Recuerda permitir las descargas múltiples en tu navegador!`
        );
    } else {
        alert("🤷‍♂️ No se encontraron mensajes con texto o imágenes para procesar. Desplázate en el chat para cargar más mensajes y vuelve a intentarlo.");
    }

})();