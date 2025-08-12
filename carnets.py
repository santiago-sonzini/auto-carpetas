import os

def renombrar_archivos_secuencialmente(ruta_carpeta, nombre_base, inicio=1):
    """
    Renombra todos los archivos en una carpeta de forma secuencial.

    Args:
        ruta_carpeta (str): La ruta a la carpeta que contiene los archivos.
        nombre_base (str): El nombre base para los nuevos archivos.
        inicio (int): El número inicial para la secuencia de nombres.
    """
    try:
        # Obtener la lista de archivos en la carpeta
        archivos = os.listdir(ruta_carpeta)
        # Filtrar solo los archivos, excluyendo las subcarpetas
        archivos = [f for f in archivos if os.path.isfile(os.path.join(ruta_carpeta, f))]
        
        # Ordenar los archivos para un renombramiento predecible (opcional)
        archivos.sort()

        contador = inicio
        for nombre_archivo in archivos:
            # Separar el nombre del archivo de su extensión
            _, extension = os.path.splitext(nombre_archivo)
            
            # Crear el nuevo nombre del archivo
            nuevo_nombre = f"{nombre_base}_{contador}{extension}"
            
            # Construir las rutas completas de origen y destino
            ruta_origen = os.path.join(ruta_carpeta, nombre_archivo)
            ruta_destino = os.path.join(ruta_carpeta, nuevo_nombre)
            
            # Renombrar el archivo
            os.rename(ruta_origen, ruta_destino)
            
            print(f"Renombrado: '{nombre_archivo}' -> '{nuevo_nombre}'")
            
            contador += 1
        
        print("\n¡Proceso de renombrado completado exitosamente!")

    except FileNotFoundError:
        print(f"Error: La carpeta '{ruta_carpeta}' no fue encontrada.")
    except Exception as e:
        print(f"Ha ocurrido un error: {e}")

if __name__ == "__main__":
    # --- CONFIGURACIÓN ---
    # 1. Reemplaza con la ruta a tu carpeta
    carpeta_a_renombrar = "./carnets2" 
    
    # 2. Elige un nombre base para tus archivos
    nombre_base_deseado = "carnet"
    
    # 3. (Opcional) Elige un número para iniciar la secuencia
    numero_inicial = 1
    
    # --- EJECUCIÓN DEL SCRIPT ---
    renombrar_archivos_secuencialmente(carpeta_a_renombrar, nombre_base_deseado, numero_inicial)