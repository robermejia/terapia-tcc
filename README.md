# Terapia TCC - Bienestar Integral

[![Vista Previa](https://i.ibb.co/YgrS9KB/project-17.png)](https://terapia-tcc.onrender.com)

**Terapia TCC** es una aplicación web moderna diseñada para apoyar el bienestar emocional y mental a través de herramientas de Terapia Cognitivo-Conductual (TCC), complementadas con un enfoque opcional de espiritualidad católica.

🚀 **[Ver Despliegue en Vivo](https://terapia-tcc.onrender.com)**

## ✨ Características Principales

- **🧠 Registro TCC (Reestructuración Cognitiva):** Herramienta para identificar situaciones, pensamientos automáticos, distorsiones cognitivas y generar pensamientos alternativos de manera estructurada.
- **📊 Estadísticas y Seguimiento:** Visualiza tu progreso emocional, consistencia de uso y tipos de registros realizados a lo largo del tiempo.
- **🧘 Regulación Emocional:** Técnicas interactivas integradas como la respiración 4-7-8 y ejercicios de *Grounding* (5-4-3-2-1) para momentos de ansiedad.
- **🙏 Integración Espiritual (Opcional):** Acceso a frases motivacionales, oraciones y reflexiones católicas que pueden activarse desde los ajustes.
- **📅 Seguimiento de Hábitos:** Gestión optimista de hábitos diarios para mantener una rutina saludable.
- **🌓 Modo Oscuro/Claro:** Interfaz premium con soporte completo para temas, ajustable según la preferencia del usuario.
- **🔒 Privacidad y Sincronización:** Autenticación y almacenamiento en tiempo real mediante **Firebase**, asegurando que tus datos estén disponibles en cualquier dispositivo.
- **📥 Gestión de Datos:** Exportación de registros en formato JSON y CSV, así como importación de datos previos.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** [React.js](https://reactjs.org/) con [Vite](https://vitejs.dev/) para un desarrollo rápido y eficiente.
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) para un diseño responsivo, moderno y altamente personalizable.
- **Iconografía:** [Lucide React](https://lucide.dev/) para iconos vectoriales limpios y consistentes.
- **Backend/Base de Datos:** [Firebase Auth](https://firebase.google.com/docs/auth) y [Firestore](https://firebase.google.com/docs/firestore) para persistencia de datos segura y en tiempo real.
- **Utilidades:** `clsx` y `tailwind-merge` para gestión dinámica de clases CSS.

## 🚀 Instalación y Desarrollo Local

Si deseas ejecutar este proyecto localmente, sigue estos pasos:

1. **Clonar el repositorio:**
   ```bash
   git clone [url-del-repositorio]
   cd terapia-tcc
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Firebase:**
   Crea un proyecto en [Firebase Console](https://console.firebase.google.com/) y añade tus credenciales en un archivo `src/firebase.js`.

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Construir para producción:**
   ```bash
   npm run build
   ```

---
Diseñado con ❤️ para fomentar la salud mental y la paz interior.
