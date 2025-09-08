// Importamos las librerías
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Inicializamos la aplicación de Express
const app = express();
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});

// Middleware
app.use(express.json());
app.use(cors({
    origin: ["https://cloudi.site", "https://www.cloudi.site"]
}));


// Crear carpeta "uploads" si no existe
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Usar multer.memoryStorage() para procesar imágenes en memoria antes de guardarlas
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).array('imagenes', 5);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Base de datos simulada ---
const usuarios = [];

(async () => {
    // Hasheamos las contraseñas que pusiste en Render
    const pass1 = await bcrypt.hash(process.env.ADMIN_PASS1, 10);
    const pass2 = await bcrypt.hash(process.env.ADMIN_PASS2, 10);

    usuarios.push({
        _id: 'user1',
        usuario: 'cine',
        password: pass1,
        nombre: 'Cinepolis'
    });

    usuarios.push({
        _id: 'user2',
        usuario: 'juegos',
        password: pass2,
        nombre: 'PlayStore'
    });

    console.log('Usuarios inicializados con contraseñas encriptadas.');
})();


let productos = [
    { _id: 'prod1', userId: 'user1', tipo: 'cine', titulo: 'Como entrenar a tu dragon', descripcion: 'entrena a un dragon y se vuelve su amigo.', precio: 10500, imagenes: ['https://m.media-amazon.com/images/M/MV5BMzEzMTgwNzktYTk4ZC00ZTQ1LTllZGYtNzY4MTk2ZDM1MzA0XkEyXkFqcGc@._V1_.jpg'], duracion: '120 min', genero: 'Acción', fechaFuncion: "2025-08-14T11:00:00", trailer: 'https://www.youtube.com/embed/liGB1ssYn38?si=vDaH4btyekOwqQUx', rating: { promedio: 0, votos: 0 },
        clasificacionEdad: 'ATP' },
    { _id: 'prod2', userId: 'user2', tipo: 'electronica', nombre: 'Videojuego nuevo', descripcion: 'Último lanzamiento para PS5.', precio: 69.99, stock: 50, imagenes: ['videojuego.jpg'], marca: 'Sony', modelo: 'PS5' },
    {
        _id: 'prod3',
        userId: 'user1',
        tipo: 'cine',
        titulo: 'El Origen del Tiempo',
        descripcion: 'Un científico viaja a través de diferentes épocas para salvar a la humanidad.',
        precio: 1200,
        imagenes: ['https://m.media-amazon.com/images/M/MV5BZDYwMDU0NTktMjg1MC00ZWNiLWE2ZTQtYzczZWMxZGM3OTJmXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg'],
        duracion: '135 min',
        genero: 'Ciencia Ficción',
        fechaFuncion: "2025-12-01T20:00:00",
        trailer: 'https://www.youtube.com/embed/RV9L7ui9Cn8?si=Yk79TUEAWtYqhjKv',
        clasificacionEdad: 'ATP'
    },
    {
        _id: 'prod4',
        userId: 'user1',
        tipo: 'cine',
        titulo: 'Dracula 4',
        descripcion: 'Una aventura épica en un mundo de fantasía y magia.',
        precio: 1150,
        imagenes: ['https://pics.filmaffinity.com/Draacula_4_La_sombra_del_dragaon-113373549-large.jpg'],
        duracion: '140 min',
        genero: 'Fantasía',
        fechaFuncion: "2025-10-15T19:30:00",
        trailer: 'https://www.youtube.com/embed/mDfdNTf4FA0?si=0421HALUiy7KBIwT',
        clasificacionEdad: '+13'
    },
    { _id: 'prod5', userId: 'user1', tipo: 'recuerdos', titulo: 'Día del Cine Nacional', descripcion: 'Fotos de la celebración anual del Día del Cine Nacional con la comunidad.', imagenes: ['recuerdos1.jpg', 'recuerdos2.jpg'] },
    { _id: 'prod6', userId: 'user1', tipo: 'comision', nombre: 'Ana Gómez', cargo: 'Presidenta', biografia: 'Ana tiene más de 20 años de experiencia en la industria cinematográfica.' }
];


const generateObjectId = () => {
    const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16)).toLowerCase();
};

(async () => {
    usuarios[0].password = await bcrypt.hash('contraseña123', 10);
    usuarios[1].password = await bcrypt.hash('contraseña456', 10);
    console.log('Contraseñas encriptadas para el ejemplo.');
})();

const SECRET_KEY = process.env.SECRET_KEY;

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mensaje: 'Token no proporcionado' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ mensaje: 'Token inválido o expirado' });
        }
        req.user = user;
        next();
    });
};


const eliminarImagenes = (imagenes) => {
    if (imagenes && imagenes.length > 0) {
        imagenes.forEach(imagen => {
            const imagePath = path.join(uploadDir, imagen);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        });
    }
};

const procesarYGuardarImagenes = async (files) => {
    if (!files || files.length === 0) return [];

    const nombresDeImagenes = [];
    for (const file of files) {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const outputPath = path.join(uploadDir, filename);

        await sharp(file.buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .toFormat('webp', { quality: 80 })
            .toFile(outputPath);

        nombresDeImagenes.push(filename);
    }
    return nombresDeImagenes;
};

// --- RUTAS PÚBLICAS ---

// Obtener todos los recuerdos
app.get('/api/recuerdos', (req, res) => {
    const recuerdos = productos.filter(p => p.tipo === 'recuerdos');
    res.json(recuerdos);
});

// Obtener todos los miembros de la comisión directiva
app.get('/api/comision', (req, res) => {
    const comision = productos.filter(p => p.tipo === 'comision');
    res.json(comision);
});

// Obtener un recuerdo específico por ID
app.get('/api/recuerdos/:id', (req, res) => {
    const recuerdo = productos.find(p => p._id === req.params.id && p.tipo === 'recuerdos');
    if (recuerdo) {
        res.json(recuerdo);
    } else {
        res.status(404).json({ mensaje: 'Recuerdo no encontrado' });
    }
});

// Obtener un miembro específico de la comisión por ID
app.get('/api/comision/:id', (req, res) => {
    const miembro = productos.find(p => p._id === req.params.id && p.tipo === 'comision');
    if (miembro) {
        res.json(miembro);
    } else {
        res.status(404).json({ mensaje: 'Miembro no encontrado' });
    }
});

// --- RUTA PÚBLICA PARA OBTENER LA PELÍCULA ACTUAL ---
// --- RUTA PÚBLICA PARA OBTENER LA PELÍCULA ACTUAL O EL PRÓXIMO ESTRENO ---
app.get('/api/pelicula-actual', (req, res) => {
    const ahora = new Date();

    // --- Paso 1: Buscar la película más reciente que ya esté en cartelera ---
    let peliculasEnCartelera = productos.filter(p =>
        p.tipo === 'cine' &&
        p.fechaFuncion &&
        new Date(p.fechaFuncion) <= ahora
    );

    if (peliculasEnCartelera.length > 0) {
        // Si hay películas que ya pasaron, ordena para encontrar la más reciente y la devuelve
        peliculasEnCartelera.sort((a, b) => new Date(b.fechaFuncion) - new Date(a.fechaFuncion));
        res.json(peliculasEnCartelera[0]);
        return; // Termina la ejecución aquí
    }

    // --- Paso 2: Si no hay ninguna en cartelera, buscar el próximo estreno ---
    let proximosEstrenos = productos.filter(p =>
        p.tipo === 'cine' &&
        p.fechaFuncion &&
        new Date(p.fechaFuncion) > ahora
    );

    if (proximosEstrenos.length > 0) {
        // Si hay próximos estrenos, ordena para encontrar el más cercano y lo devuelve
        proximosEstrenos.sort((a, b) => new Date(a.fechaFuncion) - new Date(b.fechaFuncion));
        res.json(proximosEstrenos[0]);
        return; // Termina la ejecución aquí
    }

    // --- Paso 3: Si no hay ni actuales ni próximos, devuelve un error ---
    res.status(404).json({ mensaje: 'No hay ninguna película disponible en cartelera o como próximo estreno.' });
});

// --- RUTA PÚBLICA PARA OBTENER LOS PRÓXIMOS ESTRENOS ---
app.get('/api/proximos-estrenos', (req, res) => {
    const ahora = new Date();
    const proximosEstrenos = productos.filter(p =>
        p.tipo === 'cine' &&
        p.fechaFuncion &&
        new Date(p.fechaFuncion) > ahora
    );

    if (proximosEstrenos.length > 0) {
        // Ordenamos por fecha de estreno más cercana
        proximosEstrenos.sort((a, b) => new Date(a.fechaFuncion) - new Date(b.fechaFuncion));
        res.json(proximosEstrenos);
    } else {
        res.status(404).json({ mensaje: 'No hay próximos estrenos.' });
    }
});


// --- Rutas de la API ---
app.post('/login', async (req, res) => {
    const { usuario, password } = req.body;
    const user = usuarios.find(u => u.usuario === usuario);
    if (!user) return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    const passwordCorrecto = await bcrypt.compare(password, user.password);
    if (!passwordCorrecto) return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    const token = jwt.sign({ userId: user._id, username: user.usuario }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ mensaje: 'Inicio de sesión exitoso', token });
});

app.get('/api/productos', verificarToken, (req, res) => {
    const userProducts = productos.filter(p => p.userId === req.user.userId);
    res.json(userProducts);
});

app.get('/api/pelicula/:id', (req, res) => {
    const pelicula = productos.find(p => p._id === req.params.id && p.tipo === 'cine');
    if (pelicula) {
        res.json(pelicula);
    } else {
        res.status(404).json({ mensaje: 'Película no encontrada' });
    }
});

app.post('/api/productos', verificarToken, upload, async (req, res) => {
    try {
        const nombresDeImagenes = await procesarYGuardarImagenes(req.files);

        const { tipo, stock_por_talla, ...rest } = req.body;
        let nuevoProducto = {
            _id: generateObjectId(),
            userId: req.user.userId,
            tipo,
            imagenes: nombresDeImagenes
        };

        switch(tipo) {
            case 'ropa':
                const { nombre, descripcion, precio, color, material } = rest;
                if (!nombre || !descripcion || !precio || !color || !stock_por_talla) {
                    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para el producto de ropa' });
                }
                const tallasConStock = JSON.parse(stock_por_talla);
                Object.assign(nuevoProducto, {
                    nombre,
                    descripcion,
                    precio: parseFloat(precio),
                    stock: Object.values(tallasConStock).reduce((sum, val) => sum + parseInt(val), 0),
                    tallas: Object.keys(tallasConStock),
                    stockPorTalla: tallasConStock,
                    color,
                    material
                });
                break;
            case 'electronica':
                const { nombre: nombreE, descripcion: descripcionE, precio: precioE, stock: stockE, marca, modelo, especificaciones_tecnicas } = rest;
                if (!nombreE || !descripcionE || !precioE || !stockE || !marca || !modelo) {
                    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para el producto de electrónica' });
                }
                Object.assign(nuevoProducto, {
                    nombre: nombreE,
                    descripcion: descripcionE,
                    precio: parseFloat(precioE),
                    stock: parseInt(stockE),
                    marca,
                    modelo,
                    especificaciones_tecnicas
                });
                break;
            case 'libros':
                const { titulo, descripcion: descripcionL, precio: precioL, stock: stockL, autor, editorial, isbn, genero } = rest;
                if (!titulo || !descripcionL || !precioL || !stockL || !autor) {
                    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para el producto de libros' });
                }
                Object.assign(nuevoProducto, {
                    titulo,
                    descripcion: descripcionL,
                    precio: parseFloat(precioL),
                    stock: parseInt(stockL),
                    autor,
                    editorial,
                    isbn,
                    genero
                });
                break;
        case 'cine':
            const {
                titulo: cineTitulo,
                descripcion: cineDescripcion,
                precio: cinePrecio,
                duracion,
                genero: cineGenero,
                fechaFuncion,
                trailer,
                clasificacionEdad
            } = rest;

            if (!cineTitulo || !cineDescripcion || !cinePrecio || !fechaFuncion || !clasificacionEdad) {
                return res.status(400).json({ mensaje: 'Faltan campos obligatorios para el producto de cine' });
            }

            Object.assign(nuevoProducto, {
                titulo: cineTitulo,
                descripcion: cineDescripcion,
                precio: parseFloat(cinePrecio),
                duracion,
                genero: cineGenero,
                fechaFuncion,
                trailer,
                clasificacionEdad
            });
            break;


            case 'recuerdos':
                const { titulo: tituloR, descripcion: descripcionR } = rest;
                if (!tituloR || !descripcionR) {
                    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para la Galería de Recuerdos' });
                }
                Object.assign(nuevoProducto, {
                    titulo: tituloR,
                    descripcion: descripcionR
                });
                break;
            case 'comision':
                const { nombre: nombreCo, cargo, biografia } = rest;
                if (!nombreCo || !cargo || !biografia) {
                    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para la Comisión Directiva' });
                }
                Object.assign(nuevoProducto, {
                    nombre: nombreCo,
                    cargo,
                    biografia
                });
                break;
            default:
                const { nombre: nombreG, descripcion: descripcionG, precio: precioG, stock: stockG, categoria, sku, peso, estado } = rest;
                if (!nombreG || !descripcionG || !precioG || !stockG) {
                    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para el producto genérico' });
                }
                Object.assign(nuevoProducto, {
                    nombre: nombreG,
                    descripcion: descripcionG,
                    precio: parseFloat(precioG),
                    stock: parseInt(stockG),
                    categoria,
                    sku,
                    peso: peso ? parseFloat(peso) : undefined,
                    estado
                });
                break;
        }

        productos.push(nuevoProducto);
        res.status(201).json(nuevoProducto);
    } catch (error) {
        console.error('Error al procesar el producto:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al crear el producto.' });
    }
});

app.put('/api/productos/:id', verificarToken, upload, async (req, res) => {
    try {
        const productId = req.params.id;
        const { tipo, ...updatedData } = req.body;

        const productIndex = productos.findIndex(p => p._id === productId && p.userId === req.user.userId);

        if (productIndex === -1) {
            return res.status(404).json({ mensaje: 'Producto no encontrado o no autorizado' });
        }

        const productoExistente = productos[productIndex];

        // Para productos de tipo ropa
        if (tipo === 'ropa' && updatedData.stock_por_talla) {
            updatedData.stockPorTalla = JSON.parse(updatedData.stock_por_talla);
            updatedData.tallas = Object.keys(updatedData.stockPorTalla);
            updatedData.stock = Object.values(updatedData.stockPorTalla).reduce((sum, val) => sum + parseInt(val), 0);
            delete updatedData.stock_por_talla;
        }

        // Para productos de tipo cine
        if (tipo === 'cine') {
            // Asegurarnos de que los campos específicos de cine se mantengan
            if (updatedData.fechaFuncion) {
                updatedData.fechaFuncion = new Date(updatedData.fechaFuncion).toISOString();
            }
        }

        if (req.files && req.files.length > 0) {
            eliminarImagenes(productoExistente.imagenes);
            updatedData.imagenes = await procesarYGuardarImagenes(req.files);
        }

        // Actualizar el producto manteniendo el tipo y el ID
        productos[productIndex] = {
            ...productoExistente,
            ...updatedData,
            tipo: productoExistente.tipo // Mantener el tipo original
        };

        res.json({ mensaje: 'Producto actualizado exitosamente', producto: productos[productIndex] });
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el producto.' });
    }
});

// --- RUTA PARA CALIFICAR UNA PELÍCULA ---
app.post('/api/peliculas/:id/calificar', (req, res) => {
    const peliculaId = req.params.id; // 1. Obtiene el ID de la película de la URL
    const { calificacion } = req.body; // 2. Obtiene la calificación (ej: 4) que envió el script

    // 3. Valida que la calificación sea un número válido
    if (!calificacion || calificacion < 1 || calificacion > 5) {
        return res.status(400).json({ mensaje: 'La calificación debe ser un número entre 1 y 5.' });
    }

    const peliculaIndex = productos.findIndex(p => p._id === peliculaId); // 4. Busca la película en el arreglo

    // 5. Si no la encuentra, devuelve un error
    if (peliculaIndex === -1) {
        return res.status(404).json({ mensaje: 'Película no encontrada.' });
    }

    const pelicula = productos[peliculaIndex];

    // 6. Si es el primer voto, crea el objeto 'rating'
    if (!pelicula.rating) {
        pelicula.rating = { promedio: 0, votos: 0 };
    }

    // 7. El cálculo matemático para el nuevo promedio
    const totalPuntosActuales = pelicula.rating.promedio * pelicula.rating.votos;
    const nuevosVotos = pelicula.rating.votos + 1;
    const nuevoPromedio = (totalPuntosActuales + calificacion) / nuevosVotos;

    // 8. Actualiza los datos de la película con los nuevos valores
    pelicula.rating.promedio = nuevoPromedio;
    pelicula.rating.votos = nuevosVotos;

    // 9. Devuelve el nuevo rating al script.js para que actualice la vista
    res.json(pelicula.rating);
});

app.delete('/api/productos/:id', verificarToken, (req, res) => {
    const productId = req.params.id;
    const productIndex = productos.findIndex(p => p._id === productId && p.userId === req.user.userId);

    if (productIndex === -1) {
        return res.status(404).json({ mensaje: 'Producto no encontrado o no autorizado' });
    }

    const productoAEliminar = productos[productIndex];
    eliminarImagenes(productoAEliminar.imagenes);

    productos.splice(productIndex, 1);

    res.json({ mensaje: 'Producto eliminado exitosamente' });
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

app.get("/healthz", (req, res) => res.sendStatus(200));
