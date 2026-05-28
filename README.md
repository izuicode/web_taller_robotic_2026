# 🤖 ROBOLAB — Plataforma de Gamificación para Taller de Robótica

Una plataforma web completa de gamificación para talleres educativos de robótica. Diseño oscuro estilo cyber/futurista, totalmente funcional sin base de datos externa.

---

## 📁 Estructura del Proyecto

```
robotics-gamification/
├── server.js                 ← Servidor Express (todas las rutas API)
├── package.json
├── data/
│   ├── usuarios.json         ← Base de datos de usuarios
│   ├── equipos.json          ← Base de datos de equipos y desafíos
│   └── foro.json             ← Mensajes del foro/chat
└── public/
    └── views/
        ├── login.html        ← Pantalla de acceso
        ├── alumno.html       ← Panel del equipo (alumnos)
        └── admin.html        ← Dashboard del profesor
```

---

## 🚀 Instalación y Ejecución

### Requisitos
- Node.js v16+ instalado

### Pasos

1. **Entra a la carpeta del proyecto:**
   ```bash
   cd robotics-gamification
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Inicia el servidor:**
   ```bash
   npm start
   ```
   O con auto-recarga (desarrollo):
   ```bash
   npm run dev
   ```

4. **Abre en el navegador:**
   ```
   http://localhost:3000
   ```

---

## 👤 Usuarios de Prueba

| Usuario | Contraseña | Rol      | Equipo      |
|---------|-----------|----------|-------------|
| admin   | admin123  | Profesor | —           |
| luca    | 1234      | Alumno   | TEAM ALPHA  |
| vale    | 1234      | Alumno   | TEAM ALPHA  |
| mateo   | 1234      | Alumno   | TEAM OMEGA  |
| sofia   | 1234      | Alumno   | TEAM OMEGA  |
| emilio  | 1234      | Alumno   | TEAM SIGMA  |

---

## ✨ Funcionalidades

### Panel de Alumno
- 🏆 Header con nombre del equipo y contador animado de monedas
- ⚡ Checklist de desafíos con botón "Solicitar Revisión"
- 📚 Material de apoyo con links del profesor
- 💬 Foro con polling automático cada 8 segundos

### Panel del Profesor (Admin)
- ⚡ Crear desafíos para cualquier equipo con título, descripción, monedas y link
- ✓ Aprobar desafíos en revisión (suma monedas automáticamente)
- 👥 CRUD completo de alumnos: editar, crear, reasignar equipo, reset de contraseña
- 📊 Métricas visuales con barras de progreso por equipo
- 💬 Foro donde el profesor puede responder dudas

---

## 🗄️ Estructura de Datos

### usuarios.json
```json
{
  "id": "u001",
  "nombre": "Nombre Completo",
  "usuario": "login_user",
  "password": "contraseña",
  "rol": "admin" | "alumno",
  "id_equipo": "eq001" | null
}
```

### equipos.json
```json
{
  "id_equipo": "eq001",
  "nombre_equipo": "TEAM ALPHA",
  "monedas_decorativas": 150,
  "desafios": [
    {
      "id": "d001",
      "titulo": "Título del desafío",
      "descripcion": "Descripción detallada",
      "estado": "pendiente" | "revision" | "completado",
      "monedas_recompensa": 50,
      "link_material": "https://..."
    }
  ]
}
```

### foro.json
```json
{
  "id": "m001",
  "usuario": "Nombre",
  "equipo": "TEAM ALPHA",
  "rol": "admin" | "alumno",
  "mensaje": "Texto del mensaje",
  "timestamp": "2025-03-01T10:00:00.000Z"
}
```

---

## 🔌 Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/login` | Autenticación |
| POST | `/api/logout` | Cerrar sesión |
| GET | `/api/me` | Usuario actual |
| GET | `/api/equipos` | Listar equipos |
| GET | `/api/equipo/mio` | Equipo del alumno |
| GET | `/api/equipo/:id` | Equipo por ID |
| POST | `/api/desafio/crear` | Crear desafío (admin) |
| POST | `/api/desafio/solicitar-revision` | Solicitar revisión (alumno) |
| POST | `/api/desafio/aprobar` | Aprobar desafío (admin) |
| POST | `/api/desafio/eliminar` | Eliminar desafío (admin) |
| GET | `/api/alumnos` | Listar alumnos (admin) |
| POST | `/api/alumno/actualizar` | Editar alumno (admin) |
| POST | `/api/alumno/reset-password` | Reset contraseña (admin) |
| POST | `/api/alumno/crear` | Crear alumno (admin) |
| POST | `/api/alumno/eliminar` | Eliminar alumno (admin) |
| GET | `/api/foro` | Mensajes del foro |
| POST | `/api/foro/mensaje` | Publicar mensaje |
| GET | `/api/metricas` | Estadísticas de progreso |
