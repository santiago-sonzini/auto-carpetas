import json
import os
import shutil
import re
from datetime import datetime
from PIL import Image
from tkinter import Tk, filedialog
import pprint # Usamos pprint para una impresión más legible

# --- Constantes ---
JSON_FILE_NAME = 'datos.json'
MIN_WIDTH = 100
MIN_HEIGHT = 100

def get_datetime_key(item):
    """
    Convierte el string 'fechaHora' en un objeto datetime para poder ordenar.
    Maneja dos formatos: 'HH:MM, DD/MM/YYYY' y 'HH:MM'.
    """
    fecha_hora_str = item.get('fechaHora', '')

    try:
        # Intenta analizar el formato completo: "15:06, 12/8/2025"
        return datetime.strptime(fecha_hora_str, '%H:%M, %d/%m/%Y')
    except ValueError:
        try:
            # Si falla, intenta analizar solo la hora: "15:10"
            time_obj = datetime.strptime(fecha_hora_str, '%H:%M').time()
            # Combina la hora con la fecha de hoy para poder comparar
            return datetime.combine(datetime.today().date(), time_obj)
        except ValueError:
            # Si ambos fallan (campo vacío o formato inválido),
            # devuelve una fecha muy antigua para que aparezca al principio.
            return datetime.min

def select_folder():
    """Abre un diálogo para que el usuario seleccione una carpeta."""
    root = Tk()
    root.withdraw()
    folder_path = filedialog.askdirectory(
        title="Selecciona la carpeta con las imágenes y el JSON"
    )
    return folder_path

def organizar_por_set(base_directory):
    """
    Función principal que lee un JSON, procesa mensajes y organiza las imágenes en carpetas de 'SET'.
    """
    json_path = os.path.join(base_directory, JSON_FILE_NAME)
    if not os.path.exists(json_path):
        return

    try:
        today_str = datetime.now().strftime('%d-%m-%Y')
        output_directory = os.path.join(base_directory, f"SETS PROCESADOS {today_str}")
        os.makedirs(output_directory, exist_ok=True)
    except OSError:
        return

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        return

    # --- Eliminación de duplicados de mensajes ---
    unique_data = []
    seen_entries = set()
    data_ordenada = sorted(data, key=get_datetime_key)
    pprint.pprint(data_ordenada)

    for item in data_ordenada:
        entry_id = (item.get('remitente'), item.get('fechaHora'))
        if entry_id not in seen_entries:
            seen_entries.add(entry_id)
            unique_data.append(item)

    # --- Procesamiento de sets ---
    collected_messages = []
    completed_sets = set()
    seen_images = set()

    for item in unique_data:
        text = item.get('texto', '').strip()
        images_in_message = item.get('imagenes', [])
        
        if images_in_message:
            collected_messages.append(item)
            # --- LÍNEA RESTAURADA ---
            # Muestra cuántas imágenes se acaban de añadir y el total en cola.
            total_acumulado = sum(len(msg.get('imagenes', [])) for msg in collected_messages)
            remitente = item.get('remitente', 'Desconocido')
            print(f"Acumulando {len(images_in_message)} imágen(es) de '{remitente}'. Total en cola: {total_acumulado} imágenes.")
        
        match = re.search(r'set\s+(\d+)\s*(.*)', text, re.IGNORECASE)

        if match and collected_messages:
            set_number = match.group(1)
            trigger_sender = item.get('remitente')

            if set_number in completed_sets:
                continue

            images_for_this_set = []
            messages_for_next_round = []
            for msg in collected_messages:
                if msg.get('remitente') == trigger_sender:
                    images_for_this_set.extend(msg.get('imagenes', []))
                else:
                    messages_for_next_round.append(msg)
            
            if not images_for_this_set:
                collected_messages = messages_for_next_round
                continue
            
            set_folder_name = f"SET{set_number}"
            set_folder_path = os.path.join(output_directory, set_folder_name)
            os.makedirs(set_folder_path, exist_ok=True)

            report_content = match.group(2).strip()
            if report_content:
                report_path = os.path.join(set_folder_path, 'reporte.txt')
                with open(report_path, 'w', encoding='utf-8') as f_report:
                    f_report.write(report_content)

            image_counter = 1
            copied_filenames_for_set = []

            for imagen_info in images_for_this_set:
                original_filename = imagen_info.get('nombre_archivo_descargado')
                if not original_filename or original_filename in seen_images:
                    continue

                source_path = os.path.join(base_directory, original_filename)
                if not os.path.exists(source_path):
                    continue

                try:
                    with Image.open(source_path) as img:
                        width, height = img.size
                        if width < MIN_WIDTH or height < MIN_HEIGHT:
                            continue
                except Exception:
                    continue

                file_extension = os.path.splitext(original_filename)[1]
                new_filename = f"{image_counter}{file_extension}"
                destination_path = os.path.join(set_folder_path, new_filename)

                try:
                    shutil.copy(source_path, destination_path)
                    copied_filenames_for_set.append(new_filename)
                    image_counter += 1
                    seen_images.add(original_filename)
                except Exception:
                    continue
            
            if copied_filenames_for_set:
                sorted_filenames = sorted(
                    copied_filenames_for_set,
                    key=lambda f: int(os.path.splitext(f)[0])
                )
                print(f"-> SET {set_number} procesado: {', '.join(sorted_filenames)}\n")

            completed_sets.add(set_number)
            collected_messages = messages_for_next_round

if __name__ == "__main__":
    working_directory = select_folder()
    if working_directory:
        organizar_por_set(working_directory)
        print("Proceso finalizado.")
    else:
        print("No se seleccionó ninguna carpeta.")