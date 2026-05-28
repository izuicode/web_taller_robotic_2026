// ============================================================
// server.js - Servidor Principal del Taller de Robótica
// Backend: Node.js + Express
// Base de datos: Archivos JSON locales en /data/
// ============================================================

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ─── Rutas a los archivos JSON (base de datos) ───────────────
const DATA_DIR = path.join(__dirname, 'data');
const USUARIOS_PATH = path.join(DATA_DIR, 'usuarios.json');
const EQUIPOS_PATH = path.join(DATA_DIR, 'equipos.json');
const FORO_PATH = path.join(DATA_DIR, 'foro.json');

// ─── Helpers: Leer y escribir JSON ───────────────────────────

// Lee un archivo JSON y retorna su contenido como objeto JS
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error leyendo ${filePath}:`, e.message);
    return [];
  }
}

// Escribe un objeto JS como JSON en el archivo especificado
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error(`Error escribiendo ${filePath}:`, e.message);
    return false;
  }
}

// Genera un ID único simple basado en timestamp + random
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// ─── Middlewares ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones en memoria
app.use(session({
  secret: 'robotica-taller-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Middleware de autenticación: verifica sesión activa
function requireAuth(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect('/');
  }
  next();
}

// Middleware de rol admin
function requireAdmin(req, res, next) {
  if (!req.session.usuario || req.session.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

// ─── RUTAS DE VISTAS (HTML) ───────────────────────────────────

// GET / → Página de login
app.get('/', (req, res) => {
  if (req.session.usuario) {
    return req.session.usuario.rol === 'admin'
      ? res.redirect('/admin')
      : res.redirect('/alumno');
  }
  res.sendFile(path.join(__dirname, 'public', 'views', 'login.html'));
});

// GET /alumno → Panel del alumno
app.get('/alumno', requireAuth, (req, res) => {
  if (req.session.usuario.rol !== 'alumno') return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'public', 'views', 'alumno.html'));
});

// GET /admin → Panel del administrador/profesor
app.get('/admin', requireAuth, (req, res) => {
  if (req.session.usuario.rol !== 'admin') return res.redirect('/alumno');
  res.sendFile(path.join(__dirname, 'public', 'views', 'admin.html'));
});

// ─── API: AUTENTICACIÓN ───────────────────────────────────────

// POST /api/login → Valida credenciales y crea sesión
// Lee usuarios.json, busca el usuario, compara password
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;

  // LECTURA: usuarios.json
  const usuarios = readJSON(USUARIOS_PATH);
  const user = usuarios.find(u => u.usuario === usuario && u.password === password);

  if (!user) {
    return res.json({ success: false, error: 'Usuario o contraseña incorrectos' });
  }

  // Guardar datos en sesión (sin password)
  req.session.usuario = {
    id: user.id,
    nombre: user.nombre,
    usuario: user.usuario,
    rol: user.rol,
    id_equipo: user.id_equipo
  };

  res.json({ success: true, rol: user.rol });
});

// POST /api/logout → Destruye la sesión
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/me → Retorna datos del usuario actual en sesión
app.get('/api/me', requireAuth, (req, res) => {
  res.json(req.session.usuario);
});

// ─── API: EQUIPOS ─────────────────────────────────────────────

// GET /api/equipos → Lista todos los equipos
// LECTURA: equipos.json
app.get('/api/equipos', requireAuth, (req, res) => {
  const equipos = readJSON(EQUIPOS_PATH);
  res.json(equipos);
});

// GET /api/equipo/mio → Retorna el equipo del alumno logueado
// LECTURA: equipos.json - filtra por id_equipo de la sesión
app.get('/api/equipo/mio', requireAuth, (req, res) => {
  if (req.session.usuario.rol !== 'alumno') {
    return res.status(403).json({ error: 'Solo para alumnos' });
  }
  const equipos = readJSON(EQUIPOS_PATH);
  const equipo = equipos.find(e => e.id_equipo === req.session.usuario.id_equipo);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
  res.json(equipo);
});

// GET /api/equipo/:id → Retorna un equipo específico por ID
// LECTURA: equipos.json
app.get('/api/equipo/:id', requireAuth, (req, res) => {
  const equipos = readJSON(EQUIPOS_PATH);
  const equipo = equipos.find(e => e.id_equipo === req.params.id);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
  res.json(equipo);
});

// ─── API: DESAFÍOS ────────────────────────────────────────────

// POST /api/desafio/crear → Admin crea un nuevo desafío para un equipo
// LECTURA + ESCRITURA: equipos.json
app.post('/api/desafio/crear', requireAdmin, (req, res) => {
  const { id_equipo, titulo, descripcion, monedas_recompensa, link_material } = req.body;

  if (!id_equipo || !titulo || !descripcion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // LECTURA: equipos.json
  const equipos = readJSON(EQUIPOS_PATH);
  const idx = equipos.findIndex(e => e.id_equipo === id_equipo);

  if (idx === -1) return res.status(404).json({ error: 'Equipo no encontrado' });

  const nuevoDesafio = {
    id: generateId('d'),
    titulo,
    descripcion,
    estado: 'pendiente',
    monedas_recompensa: parseInt(monedas_recompensa) || 0,
    link_material: link_material || ''
  };

  // Agrega el desafío al array del equipo
  equipos[idx].desafios.push(nuevoDesafio);

  // ESCRITURA: equipos.json
  writeJSON(EQUIPOS_PATH, equipos);

  res.json({ success: true, desafio: nuevoDesafio });
});

// POST /api/desafio/solicitar-revision → Alumno solicita revisión de un desafío
// ESCRITURA: equipos.json - cambia estado a "revision"
app.post('/api/desafio/solicitar-revision', requireAuth, (req, res) => {
  const { id_desafio } = req.body;
  const id_equipo = req.session.usuario.id_equipo;

  // LECTURA: equipos.json
  const equipos = readJSON(EQUIPOS_PATH);
  const equipo = equipos.find(e => e.id_equipo === id_equipo);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

  const desafio = equipo.desafios.find(d => d.id === id_desafio);
  if (!desafio) return res.status(404).json({ error: 'Desafío no encontrado' });

  if (desafio.estado !== 'pendiente') {
    return res.status(400).json({ error: 'El desafío no está en estado pendiente' });
  }

  // Cambia estado a "revision" (esperando aprobación del admin)
  desafio.estado = 'revision';

  // ESCRITURA: equipos.json
  writeJSON(EQUIPOS_PATH, equipos);

  res.json({ success: true });
});

// POST /api/desafio/aprobar → Admin aprueba un desafío y suma monedas al equipo
// LECTURA + ESCRITURA: equipos.json
app.post('/api/desafio/aprobar', requireAdmin, (req, res) => {
  const { id_equipo, id_desafio } = req.body;

  // LECTURA: equipos.json
  const equipos = readJSON(EQUIPOS_PATH);
  const equipo = equipos.find(e => e.id_equipo === id_equipo);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

  const desafio = equipo.desafios.find(d => d.id === id_desafio);
  if (!desafio) return res.status(404).json({ error: 'Desafío no encontrado' });

  // Marca como completado y suma las monedas al equipo
  desafio.estado = 'completado';
  equipo.monedas_decorativas += desafio.monedas_recompensa;

  // ESCRITURA: equipos.json
  writeJSON(EQUIPOS_PATH, equipos);

  res.json({ success: true, monedas_totales: equipo.monedas_decorativas });
});

// POST /api/desafio/eliminar → Admin elimina un desafío
// LECTURA + ESCRITURA: equipos.json
app.post('/api/desafio/eliminar', requireAdmin, (req, res) => {
  const { id_equipo, id_desafio } = req.body;

  // LECTURA: equipos.json
  const equipos = readJSON(EQUIPOS_PATH);
  const equipo = equipos.find(e => e.id_equipo === id_equipo);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

  equipo.desafios = equipo.desafios.filter(d => d.id !== id_desafio);

  // ESCRITURA: equipos.json
  writeJSON(EQUIPOS_PATH, equipos);
  res.json({ success: true });
});

// ─── API: ALUMNOS (CRUD) ──────────────────────────────────────

// GET /api/alumnos → Lista todos los alumnos (sin passwords)
// LECTURA: usuarios.json - filtra por rol alumno
app.get('/api/alumnos', requireAdmin, (req, res) => {
  const usuarios = readJSON(USUARIOS_PATH);
  const alumnos = usuarios
    .filter(u => u.rol === 'alumno')
    .map(({ password, ...rest }) => rest); // No enviar passwords al frontend
  res.json(alumnos);
});

// POST /api/alumno/actualizar → Admin actualiza nombre o equipo de un alumno
// LECTURA + ESCRITURA: usuarios.json
app.post('/api/alumno/actualizar', requireAdmin, (req, res) => {
  const { id, nombre, id_equipo } = req.body;

  // LECTURA: usuarios.json
  const usuarios = readJSON(USUARIOS_PATH);
  const idx = usuarios.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Actualiza solo los campos enviados
  if (nombre) usuarios[idx].nombre = nombre;
  if (id_equipo !== undefined) usuarios[idx].id_equipo = id_equipo;

  // ESCRITURA: usuarios.json
  writeJSON(USUARIOS_PATH, usuarios);

  res.json({ success: true });
});

// POST /api/alumno/reset-password → Admin resetea la contraseña a "1234"
// LECTURA + ESCRITURA: usuarios.json
app.post('/api/alumno/reset-password', requireAdmin, (req, res) => {
  const { id } = req.body;

  // LECTURA: usuarios.json
  const usuarios = readJSON(USUARIOS_PATH);
  const idx = usuarios.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Resetea password a valor genérico
  usuarios[idx].password = '1234';

  // ESCRITURA: usuarios.json
  writeJSON(USUARIOS_PATH, usuarios);

  res.json({ success: true, mensaje: 'Contraseña reseteada a: 1234' });
});

// POST /api/alumno/crear → Admin crea un nuevo alumno
// LECTURA + ESCRITURA: usuarios.json
app.post('/api/alumno/crear', requireAdmin, (req, res) => {
  const { nombre, usuario, id_equipo } = req.body;
  if (!nombre || !usuario) {
    return res.status(400).json({ error: 'Nombre y usuario son requeridos' });
  }

  // LECTURA: usuarios.json
  const usuarios = readJSON(USUARIOS_PATH);

  // Verifica que el nombre de usuario no exista
  if (usuarios.find(u => u.usuario === usuario)) {
    return res.status(400).json({ error: 'Ese nombre de usuario ya existe' });
  }

  const nuevo = {
    id: generateId('u'),
    nombre,
    usuario,
    password: '1234', // Contraseña inicial genérica
    rol: 'alumno',
    id_equipo: id_equipo || null
  };

  usuarios.push(nuevo);

  // ESCRITURA: usuarios.json
  writeJSON(USUARIOS_PATH, usuarios);

  res.json({ success: true, alumno: { ...nuevo, password: undefined } });
});

// POST /api/alumno/eliminar → Admin elimina un alumno
// LECTURA + ESCRITURA: usuarios.json
app.post('/api/alumno/eliminar', requireAdmin, (req, res) => {
  const { id } = req.body;

  // LECTURA: usuarios.json
  let usuarios = readJSON(USUARIOS_PATH);
  usuarios = usuarios.filter(u => u.id !== id);

  // ESCRITURA: usuarios.json
  writeJSON(USUARIOS_PATH, usuarios);
  res.json({ success: true });
});

// ─── API: FORO ────────────────────────────────────────────────

// GET /api/foro → Retorna todos los mensajes del foro
// LECTURA: foro.json
app.get('/api/foro', requireAuth, (req, res) => {
  const mensajes = readJSON(FORO_PATH);
  // Ordenar por timestamp ascendente
  mensajes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  res.json(mensajes);
});

// POST /api/foro/mensaje → Publica un nuevo mensaje en el foro
// LECTURA + ESCRITURA: foro.json
app.post('/api/foro/mensaje', requireAuth, (req, res) => {
  const { mensaje } = req.body;

  if (!mensaje || mensaje.trim() === '') {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  const user = req.session.usuario;

  // Obtener nombre del equipo del usuario
  let nombreEquipo = 'General';
  if (user.id_equipo) {
    const equipos = readJSON(EQUIPOS_PATH);
    const equipo = equipos.find(e => e.id_equipo === user.id_equipo);
    if (equipo) nombreEquipo = equipo.nombre_equipo;
  }

  const nuevoMensaje = {
    id: generateId('m'),
    usuario: user.nombre,
    equipo: nombreEquipo,
    rol: user.rol,
    mensaje: mensaje.trim(),
    timestamp: new Date().toISOString()
  };

  // LECTURA: foro.json
  const mensajes = readJSON(FORO_PATH);
  mensajes.push(nuevoMensaje);

  // ESCRITURA: foro.json
  writeJSON(FORO_PATH, mensajes);

  res.json({ success: true, mensaje: nuevoMensaje });
});

// ─── API: MÉTRICAS ────────────────────────────────────────────

// GET /api/metricas → Retorna estadísticas de progreso por equipo
// LECTURA: equipos.json
app.get('/api/metricas', requireAdmin, (req, res) => {
  const equipos = readJSON(EQUIPOS_PATH);

  const metricas = equipos.map(e => {
    const total = e.desafios.length;
    const completados = e.desafios.filter(d => d.estado === 'completado').length;
    const enRevision = e.desafios.filter(d => d.estado === 'revision').length;
    const pendientes = e.desafios.filter(d => d.estado === 'pendiente').length;
    const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

    return {
      id_equipo: e.id_equipo,
      nombre_equipo: e.nombre_equipo,
      monedas: e.monedas_decorativas,
      total_desafios: total,
      completados,
      en_revision: enRevision,
      pendientes,
      porcentaje_completado: porcentaje
    };
  });

  res.json(metricas);
});

// ─── INICIO DEL SERVIDOR ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   🤖 TALLER DE ROBÓTICA - SERVIDOR ACTIVO   ║
  ║   Puerto: http://localhost:${PORT}             ║
  ║   Datos en: ./data/*.json                    ║
  ╚══════════════════════════════════════════════╝
  `);
});
