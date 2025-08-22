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
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors());

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
const usuarios = [
    {
        _id: 'user1',
        usuario: 'cine',
        password: 'contraseña_segura_encriptada_con_bcrypt',
        nombre: 'Cinepolis'
    },
    {
        _id: 'user2',
        usuario: 'juegos',
        password: 'contraseña_segura_encriptada_con_bcrypt_2',
        nombre: 'PlayStore'
    }
];

let productos = [
    { _id: 'prod1', userId: 'user1', tipo: 'cine', titulo: 'Como entrenar a tu dragon', descripcion: 'entrena a un dragon y se vuelve su amigo.', precio: 10500, stock: 100, imagenes: ['https://m.media-amazon.com/images/M/MV5BMzEzMTgwNzktYTk4ZC00ZTQ1LTllZGYtNzY4MTk2ZDM1MzA0XkEyXkFqcGc@._V1_.jpg'], duracion: '120 min', genero: 'Acción', fechaFuncion: "2025-08-14T11:00:00", trailer: 'https://www.youtube.com/embed/liGB1ssYn38?si=vDaH4btyekOwqQUx',
        clasificacionEdad: 'ATP' },
    { _id: 'prod2', userId: 'user2', tipo: 'electronica', nombre: 'Videojuego nuevo', descripcion: 'Último lanzamiento para PS5.', precio: 69.99, stock: 50, imagenes: ['videojuego.jpg'], marca: 'Sony', modelo: 'PS5' },
    { 
        _id: 'prod3', 
        userId: 'user1', 
        tipo: 'cine', 
        titulo: 'El Origen del Tiempo', 
        descripcion: 'Un científico viaja a través de diferentes épocas para salvar a la humanidad.', 
        precio: 1200, 
        stock: 150, 
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
        stock: 120, 
        imagenes: ['https://pics.filmaffinity.com/Draacula_4_La_sombra_del_dragaon-113373549-large.jpg'], 
        duracion: '140 min', 
        genero: 'Fantasía', 
        fechaFuncion: "2025-10-15T19:30:00",
        trailer: 'https://www.youtube.com/embed/mDfdNTf4FA0?si=0421HALUiy7KBIwT',
        clasificacionEdad: '+13'
    }
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

const SECRET_KEY = 'tu-clave-secreta-muy-larga-y-segura';

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

// --- RUTA PÚBLICA PARA OBTENER LA PELÍCULA ACTUAL ---
app.get('/api/pelicula-actual', (req, res) => {
    const ahora = new Date();
    // Filtramos las películas de cine que ya tienen una fecha de función pasada
    const peliculasEnCartelera = productos.filter(p => 
        p.tipo === 'cine' && 
        p.fechaFuncion && 
        new Date(p.fechaFuncion) <= ahora
    );

    if (peliculasEnCartelera.length > 0) {
        // Encontramos la película más reciente
        peliculasEnCartelera.sort((a, b) => new Date(b.fechaFuncion) - new Date(a.fechaFuncion));
        res.json(peliculasEnCartelera[0]);
    } else {
        res.status(404).json({ mensaje: 'No hay ninguna película en cartelera.' });
    }
});

// --- RUTA PÚBLICA PARA OBTENER LOS PRÓXIMOS ESTRENOS ---
app.get('/api/proximos-estrenos', (req, res) => {
    const ahora = new Date();
    // Filtramos las películas de cine que tienen una fecha de función futura
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
// >>>>> NUEVA RUTA PÚBLICA PARA OBTENER PELÍCULA POR ID <<<<<
app.get('/api/pelicula/:id', (req, res) => {
    const pelicula = productos.find(p => p._id === req.params.id && p.tipo === 'cine');
    if (pelicula) {
        res.json(pelicula);
    } else {
        res.status(404).json({ mensaje: 'Película no encontrada' });
    }
});
// >>>>> FIN NUEVA RUTA <<<<<


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
            // ... dentro de app.post('/api/productos')
            case 'cine':
    const { titulo: tituloC, descripcion: descripcionC, precio: precioC, stock: stockC, duracion, genero: generoC, fechaFuncion, trailer, clasificacionEdad } = rest;
    if (!tituloC || !descripcionC || !precioC || !stockC || !duracion || !fechaFuncion || !trailer || !clasificacionEdad) {
        return res.status(400).json({ mensaje: 'Faltan campos obligatorios para el producto de cine' });
    }
    Object.assign(nuevoProducto, {
        titulo: tituloC,
        descripcion: descripcionC,
        precio: parseFloat(precioC),
        stock: parseInt(stockC),
        duracion,
        genero: generoC,
        fechaFuncion,
        trailer,
        clasificacionEdad
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
// Agrega esta nueva ruta en server.js
app.get('/api/pelicula/:id', (req, res) => {
    const pelicula = productos.find(p => p._id === req.params.id && p.tipo === 'cine');
    if (pelicula) {
        res.json(pelicula);
    } else {
        res.status(404).json({ mensaje: 'Película no encontrada' });
    }
});
app.put('/api/productos/:id', verificarToken, upload, async (req, res) => {
    try {
        const productId = req.params.id;
        const { tipo, stock_por_talla, ...updatedData } = req.body;
        
        const productIndex = productos.findIndex(p => p._id === productId && p.userId === req.user.userId);
        
        if (productIndex === -1) {
            return res.status(404).json({ mensaje: 'Producto no encontrado o no autorizado' });
        }
        
        const productoExistente = productos[productIndex];
        
        if (tipo === 'ropa' && stock_por_talla) {
            updatedData.stockPorTalla = JSON.parse(stock_por_talla);
            updatedData.tallas = Object.keys(updatedData.stockPorTalla);
            updatedData.stock = Object.values(updatedData.stockPorTalla).reduce((sum, val) => sum + parseInt(val), 0);
        }
        
        if (req.files && req.files.length > 0) {
            eliminarImagenes(productoExistente.imagenes);
            updatedData.imagenes = await procesarYGuardarImagenes(req.files);
        }
        
        productos[productIndex] = { ...productoExistente, ...updatedData };
        
        res.json({ mensaje: 'Producto actualizado exitosamente', producto: productos[productIndex] });
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el producto.' });
    }
});


// >>>>> NUEVA RUTA PARA PROCESAR COMPRA Y DESCONTAR STOCK <<<<<
app.post('/api/comprar-entradas', (req, res) => {
    const { peliculaId, cantidad } = req.body;

    if (!peliculaId || !cantidad) {
        return res.status(400).json({ mensaje: 'Faltan datos para la compra.' });
    }

    const productIndex = productos.findIndex(p => p._id === peliculaId && p.tipo === 'cine');

    if (productIndex === -1) {
        return res.status(404).json({ mensaje: 'Película no encontrada.' });
    }

    if (productos[productIndex].stock >= cantidad) {
        productos[productIndex].stock -= cantidad;
        res.json({ 
            mensaje: 'Compra exitosa', 
            stockRestante: productos[productIndex].stock 
        });
    } else {
        res.status(400).json({ 
            mensaje: 'No hay suficientes entradas disponibles.',
            stockRestante: productos[productIndex].stock
        });
    }
});
// >>>>> FIN NUEVA RUTA <<<<<
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