import json, os, re, shutil, tkinter as tk
from tkinter import filedialog, messagebox
from datetime import datetime, timedelta

def get_datetime(item):
    try:
        return datetime.strptime(item.get('fechaHora', ''), '%H:%M, %d/%m/%Y')
    except:
        try:
            return datetime.combine(datetime.today(), datetime.strptime(item.get('fechaHora', ''), '%H:%M').time())
        except:
            return None

def sel_carpeta(): 
    return filedialog.askdirectory(title="Selecciona carpeta con imágenes y datos.json")

def limpiar(n): 
    return re.sub(r'[\\/*?:"<>|]', "_", n)

def guardar(imgs, set_name, base, res):
    carpeta = os.path.join(res, limpiar(set_name))
    os.makedirs(carpeta, exist_ok=True)
    for img in imgs:
        src = os.path.join(base, img["nombre_archivo_descargado"])
        if os.path.exists(src):
            shutil.copy(src, carpeta)
        else:
            with open(os.path.join(carpeta, "imagenes_urls.txt"), "a", encoding="utf-8") as f:
                f.write(f'{img["nombre_archivo_descargado"]} -> {img["url_original"]}\n')

def organizar():
    base = sel_carpeta()
    if not base:
        return messagebox.showerror("Error", "No seleccionaste carpeta.")
    
    json_path = os.path.join(base, "datos.json")
    if not os.path.exists(json_path):
        return messagebox.showerror("Error", "No se encontró datos.json.")
    
    with open(json_path, "r", encoding="utf-8") as f:
        datos = json.load(f)
    
    datos = sorted([d for d in datos if get_datetime(d)], key=get_datetime)
    res = os.path.join(base, "resultados")
    os.makedirs(res, exist_ok=True)

    urls_vistas, textos_vistos = set(), set()

    i = 0
    while i < len(datos):
        item = datos[i]
        dt = get_datetime(item)
        remitente = item.get("remitente", "desconocido")
        
        # Buscar mensaje que contenga SET en un rango de 3 min
        if item["tipo"] == "texto" and re.search(r"\bSET\s+(\d+)\b", item["texto"], re.I):
            set_num = re.search(r"\bSET\s+(\d+)\b", item["texto"], re.I).group(1)
            actual_set = f"SET {set_num}"

            inicio = dt - timedelta(minutes=10)
            fin = dt + timedelta(minutes=10)

            grupo = [
                msg for msg in datos 
                if msg.get("remitente") == remitente and inicio <= get_datetime(msg) <= fin
            ]

            print(actual_set)
            print(grupo)


            imgs_set, textos_set = [], []
            for g in grupo:
                if g["tipo"] == "imagen":
                    for img in g["imagenes"]:
                        if img["url_original"] not in urls_vistas:
                            imgs_set.append(img)
                            urls_vistas.add(img["url_original"])
                elif g["tipo"] == "texto":
                    if g["texto"] not in textos_vistos:
                        textos_set.append(g["texto"])
                        textos_vistos.add(g["texto"])
            ##print("imgs_set", imgs_set)
            carpeta_set = os.path.join(res, limpiar(actual_set))
            os.makedirs(carpeta_set, exist_ok=True)
            
            if textos_set:
                with open(os.path.join(carpeta_set, "mensajes.txt"), "a", encoding="utf-8") as f:
                    f.write("\n\n".join(textos_set) + "\n")
            
            if imgs_set:
                guardar(imgs_set, actual_set, base, res)
        
        i += 1

    messagebox.showinfo("Completado", f"Organización completada en:\n{res}")

tk.Tk().withdraw()
organizar()
