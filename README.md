
# 📊 TP Simulación - Generador y Analizador de Distribuciones Estadísticas

Este proyecto consiste en una **aplicación web interactiva** desarrollada con **React**, **Python (FastAPI)** y **Plotly**, diseñada para la **generación, visualización y análisis de distribuciones estadísticas** como:

- Distribución **Normal**
- Distribución **Exponencial**
- Distribución **Uniforme**
- Distribución **Poisson**

Además, incorpora herramientas para realizar **pruebas estadísticas** como:

- **Chi-Cuadrado**
- **Kolmogorov-Smirnov (KS)**

---

## 🚀 Tecnologías Utilizadas

- **Frontend:**
  - React
  - Plotly.js (para la visualización de histogramas)
  - TailwindCSS (opcional, si usaste para estilos)

- **Backend:**
  - Python
  - FastAPI
  - NumPy / SciPy para generación de datos y pruebas estadísticas

---

## 🧠 Funcionalidades Principales

- Selección del **modo de entrada**: generar desde API o archivo.
- Selección de la **distribución deseada**.
- Parámetros configurables como media, desvío, lambda, etc.
- Generación de hasta **50,000 números aleatorios**.
- Visualización de histogramas de densidad.
- Cálculo de estadísticas básicas: **media, desviación estándar, máximo, mínimo**.
- Descarga de datos en CSV.
- Ejecución de pruebas de bondad de ajuste: **Chi²** y **Kolmogorov-Smirnov**.

---

## 📷 Capturas de Pantalla

### 📈 Exponencial
![image](https://github.com/user-attachments/assets/7a40f16e-a9d5-46cd-b6d2-d2ec13523cbf)

### 📉 Uniforme
![image](https://github.com/user-attachments/assets/9a0f13c9-07ee-46c5-9f60-7399518f4ac7)
> Reemplazá las rutas con la correcta si vas a subir las imágenes en el repo, o usá Markdown directo con GitHub.

---

## 🧪 Pruebas

Incluye **tests unitarios** para verificar:
- Correcta generación de cada distribución
- Resultados esperados en estadísticas básicas
- Resultados de las pruebas de hipótesis

---

## 📁 Estructura del Proyecto

```
/frontend      → Aplicación React
/backend       → API FastAPI con lógica de generación y tests
/lib/distribs  → Librería de pruebas estadísticas en Python
```

---

## 🛠 Instalación y Uso

### Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tp-simulacion.git
cd tp-simulacion
```

### Backend (Python - FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```



### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

---

## ✍️ Autor


**Martín Castro**  
Estudiante de Ingeniería en Sistemas – UTN FRC  
Contacto: [LinkedIn](#) | [martinxr250](https://github.com/martinxr250)
