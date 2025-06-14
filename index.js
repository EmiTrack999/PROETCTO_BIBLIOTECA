const express = require('express');
const path = require('path');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Iniciando la aplicación de Express
const app = express();

// Middleware de sesión (esto debe ir después de la inicialización de `app`)
const session = require('express-session');
app.use(session({
    secret: 'mi_clave_secreta',
    resave: false,
    saveUninitialized: true
}));

// Middleware
app.use(express.static(path.join(__dirname, 'PruebasEmi', 'views')));
app.use(express.urlencoded({ extended: true }));

// Servir las imágenes de forma correcta
app.use('/imagenes', express.static(path.join(__dirname, 'PruebasEmi', 'views', 'imagenes')));


// Configuración de la base de datos MySQL
const conexion = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'biblioteca'
});
conexion.connect((error) => {
    if (error) {
        console.log("Error al conectar:", error);
    } else {
        console.log('Conectado a la base de datos "biblioteca"');
    }
});

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'PruebasEmi', 'views'));

// RUTAS PARA EL INICIO Y REGISTRO DE SESIÓN

// Página de inicio de sesión
app.get("/", (req, res) => {
    res.render("inicio_sesion", { mensaje: "" });
});

// Página de registro
app.get("/registrar", (req, res) => {
    res.render("vista_uno", { mensaje: "" });
});

// Procesar el registro de un nuevo usuario
app.post("/registrar", (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return res.render("vista_uno", { mensaje: "Faltan datos. Por favor completa todos los campos." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usuario)) {
        return res.render("vista_uno", { mensaje: "Correo electrónico no válido." });
    }

    const verificarCorreo = "SELECT * FROM usuarios WHERE usuario = ?";
    conexion.query(verificarCorreo, [usuario], (err, resultado) => {
        if (err) {
            console.error("Error al verificar correo:", err);
            return res.render("vista_uno", { mensaje: "Error al verificar el correo." });
        }

        if (resultado.length > 0) {
            return res.render("vista_uno", { mensaje: "Este correo ya está registrado." });
        }

        const sql = "INSERT INTO usuarios (usuario, contrasena) VALUES (?, ?)";
        conexion.query(sql, [usuario, contrasena], (err) => {
            if (err) {
                console.error("Error al registrar:", err);
                return res.render("vista_uno", { mensaje: "Error al registrar usuario." });
            }
            return res.redirect("/menu_principal?mensaje=¡Registro exitoso!");
        });
    });
});

// Página de login
app.get("/login", (req, res) => {
    res.render("inicio_sesion", { mensaje: "" });
});

// Procesar login de usuario
app.post("/login", (req, res) => {
    const { usuario, contrasena } = req.body;

    // Acceso directo para el admin SOLO con el correo
    if (usuario === "Biblioteca@Admin.com") {
        req.session.usuario = usuario;
        req.session.esAdmin = true;
        return res.redirect("/administracion");
    }

    // Para los demás usuarios, sí se requiere usuario y contraseña
    if (!usuario || !contrasena) {
        // Si el usuario es el admin, no mostrar este mensaje
        return res.render("inicio_sesion", { mensaje: "Por favor ingrese su correo y contraseña." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usuario)) {
        return res.render("inicio_sesion", { mensaje: "Correo electronico no valido." });
    }

    const verificarUsuario = "SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?";
    conexion.query(verificarUsuario, [usuario, contrasena], (err, resultado) => {
        if (err) {
            console.error("Error al verificar usuario:", err);
            return res.render("inicio_sesion", { mensaje: "Error al verificar el usuario." });
        }

        if (resultado.length === 0) {
            return res.render("inicio_sesion", { mensaje: "Correo o contraseña incorrectos." });
        }

        req.session.usuario = usuario;
        res.redirect("/menu_principal");
    });
});

// Ruta para omitir sesión e ingresar como invitado
app.get('/invitado', (req, res) => {
    req.session.usuario = null;
    req.session.invitado = true;
    res.redirect('/menu_principal');
});

// RUTAS PARA EL MENÚ PRINCIPAL

// Página principal de menú con libros
app.get("/menu_principal", (req, res) => {
    const mensaje = req.query.mensaje || '';
    const busqueda = req.query.q;
    const esInvitado = req.session.invitado === true;

    let sql = 'SELECT * FROM libros_admi';
    let valores = [];

    if (busqueda && busqueda.trim() !== '') {
        sql += ' WHERE id LIKE ? OR nombre LIKE ? OR autor LIKE ? OR categoria LIKE ?';
        valores = [`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`];
    }

    conexion.query(sql, valores, (error, results) => {
        if (error) {
            console.error("Error al consultar los libros:", error);
            return res.send("Error al consultar los libros.");
        }

        res.render("menu_principal", { mensaje, libros: results, q: busqueda, esInvitado });
    });
});

// Otras páginas
app.get("/maspopulares", (req, res) => {
    const sql = "SELECT * FROM libros_admi ORDER BY popularidad DESC LIMIT 5";
    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error("Error al obtener los libros más populares:", error);
            return res.render("maspopulares", { libros: [] }); // Mostrar página sin error
        }
        res.render("maspopulares", { libros: resultados });
    });
});

app.get("/categorias", (req, res) => {
    res.render("categorias");
});

app.get("/ayuda", (req, res) => {
    res.render("ayuda");
});

// Ruta POST para procesar el formulario (solo redirecciona)
app.post("/contactanos", (req, res) => {
    // No se guarda nada en base de datos
    res.redirect("/msj_re");
});

// Ruta GET para la vista de mensaje de respuesta
app.get("/msj_re", (req, res) => {
    res.render("msj_re"); // Asegúrate de tener views/msj_re.ejs
});




// --- CARRITO PROFESIONAL CON BASE DE DATOS ---

// Mostrar carrito del usuario
app.get('/carrito_usua', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    const usuario = req.session.usuario;
    const sql = `SELECT p.libro_id, p.cantidad, l.nombre, l.autor, l.id
                 FROM pedidos p
                 JOIN libros_admi l ON p.libro_id = l.id
                 WHERE p.usuario = ?`;
    conexion.query(sql, [usuario], (err, results) => {
        if (err) {
            console.error('Error al obtener el carrito:', err);
            return res.send('Error al obtener el carrito.');
        }
        // Agrega el precio fijo
        const carrito = results.map(libro => ({
            ...libro,
            precio: 250
        }));
        res.render('carrito_usua', { carrito });
    });
});

// Agregar libro al carrito
app.post('/agregar-al-carrito', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    const usuario = req.session.usuario;
    const { libro_id } = req.body;
    // Verifica si ya existe el libro en el carrito
    const sqlCheck = 'SELECT * FROM pedidos WHERE usuario = ? AND libro_id = ?';
    conexion.query(sqlCheck, [usuario, libro_id], (err, results) => {
        if (err) return res.send('Error al agregar al carrito.');
        if (results.length > 0) {
            // Si existe, actualiza la cantidad
            const sqlUpdate = 'UPDATE pedidos SET cantidad = cantidad + 1 WHERE usuario = ? AND libro_id = ?';
            conexion.query(sqlUpdate, [usuario, libro_id], (err2) => {
                if (err2) return res.send('Error al actualizar cantidad.');
                res.redirect('/carrito_usua');
            });
        } else {
            // Si no existe, inserta
            const sqlInsert = 'INSERT INTO pedidos (usuario, libro_id, cantidad) VALUES (?, ?, 1)';
            conexion.query(sqlInsert, [usuario, libro_id], (err3) => {
                if (err3) return res.send('Error al agregar libro.');
                res.redirect('/carrito_usua');
            });
        }
    });
});

// Actualizar cantidad de un libro en el carrito
app.post('/actualizar-cantidad', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    const usuario = req.session.usuario;
    const { libro_id, cantidad } = req.body;
    const sql = 'UPDATE pedidos SET cantidad = ? WHERE usuario = ? AND libro_id = ?';
    conexion.query(sql, [cantidad, usuario, libro_id], (err) => {
        if (err) return res.send('Error al actualizar cantidad.');
        res.redirect('/carrito_usua');
    });
});

// Eliminar libro del carrito
app.post('/eliminar-del-carrito', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    const usuario = req.session.usuario;
    const { libro_id } = req.body;
    const sql = 'DELETE FROM pedidos WHERE usuario = ? AND libro_id = ?';
    conexion.query(sql, [usuario, libro_id], (err) => {
        if (err) return res.send('Error al eliminar libro.');
        res.redirect('/carrito_usua');
    });
});

// Ruta para procesar la compra y mostrar agradecimiento
app.post('/finalizar-compra', (req, res) => {
    const { nombre_comprador, correo } = req.body;

    // Limpiar el carrito después de la compra
    const usuario = req.session.usuario;
    const sql = 'DELETE FROM pedidos WHERE usuario = ?';
    conexion.query(sql, [usuario], (err) => {
        if (err) return res.send('Error al finalizar la compra.');
        res.render('agradecimiento', { nombre_comprador, correo });
    });
});

// Procesar la compra desde el carrito
app.post('/comprar', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    const { nombre_comprador, correo, direccion } = req.body;
    if (!nombre_comprador || !correo || !direccion) {
        return res.status(400).send("Faltan datos para completar la compra.");
    }
    const usuario = req.session.usuario;

    // Buscar el libro comprado (puedes ajustar esto si es más de uno)
    const sqlLibro = 'SELECT l.* FROM pedidos p JOIN libros_admi l ON p.libro_id = l.id WHERE p.usuario = ? LIMIT 1';
    conexion.query(sqlLibro, [usuario], (err, results) => {
        if (err || results.length === 0) {
            return res.send('Error al obtener el libro para enviar.');
        }
        const libro = results[0];
        // Usar el campo archivo_pdf para la ruta del PDF
        let pdfPath = null;
        let pdfExists = false;
        if (libro.archivo_pdf) {
            pdfPath = path.join(__dirname, 'PruebasEmi', 'views', 'imagenes', libro.archivo_pdf);
            try {
                pdfExists = fs.existsSync(pdfPath);
            } catch (e) { pdfExists = false; }
        }

        // Configurar el transporte de nodemailer (puedes usar Gmail u otro servicio)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'TUCORREO@gmail.com', // Cambia por tu correo
                pass: 'TUPASSWORD' // Cambia por tu contraseña o app password
            }
        });

        // Opciones del correo
        const mailOptions = {
            from: 'TUCORREO@gmail.com',
            to: correo,
            subject: `Tu libro: ${libro.nombre}`,
            text: `¡Gracias por tu compra! Adjuntamos el libro "${libro.nombre}" en PDF.`,
            attachments: pdfExists ? [{ filename: libro.archivo_pdf, path: pdfPath }] : []
        };

        transporter.sendMail(mailOptions, (error, info) => {
            // Limpiar el carrito después de la compra
            const sql = 'DELETE FROM pedidos WHERE usuario = ?';
            conexion.query(sql, [usuario], (err2) => {
                if (err2) return res.send('Error al finalizar la compra.');
                // Link de descarga si existe el PDF
                const linkDescarga = pdfExists ? `/imagenes/${libro.archivo_pdf}` : null;
                res.render('descarga_libro', { linkDescarga });
            });
        });
    });
});

// RUTAS PARA ADMINISTRACIÓN

// Página de administración
app.get("/administracion", (req, res) => {
    const libros = [];
    res.render("administracion", { libros });
});

// Página para ingresar la contraseña del administrador
app.get("/contra_admi", (req, res) => {
    res.render("contra_admi", { error: null });
});

// Verificar contraseña del administrador
app.post("/contra_admi", (req, res) => {
    const password = req.body.password;

    if (
        password === "AdminEmiliano" ||
        password === "vladimir" ||
        password === "AdminEstrella" ||
        password === "AdminOmar" ||
        password === "AdminNaomi"
    ) {
        return res.redirect("/administracion");
    } else {
        return res.render("contra_admi", { error: "Contraseña incorrecta" });
    }
});

// RUTAS PARA LIBROS

// Página para guardar un libro
app.get('/guardar_libro', (req, res) => {
    res.render('guardar_libro');
});

// Guardar libro en la base de datos
app.post("/guardar-libro", (req, res) => {
    const { id, nombre, autor, categoria, descripcion, contenido } = req.body;
    // Generar el PDF automáticamente
    const nombreArchivo = `${nombre.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, 'PruebasEmi', 'views', 'imagenes', nombreArchivo);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    doc.fontSize(18).text(nombre, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Autor: ${autor}`);
    doc.fontSize(12).text(`Categoría: ${categoria}`);
    doc.moveDown();
    doc.fontSize(12).text(descripcion);
    doc.moveDown();
    doc.fontSize(12).text(contenido);
    doc.end();
    stream.on('finish', () => {
        // Guardar en la base de datos incluyendo el nombre del PDF
        const sql = "INSERT INTO libros_admi (id, nombre, autor, categoria, descripcion, archivo_pdf, contenido) VALUES (?, ?, ?, ?, ?, ?, ?)";
        conexion.query(sql, [id, nombre, autor, categoria, descripcion, nombreArchivo, contenido], (err, resultado) => {
            if (err) {
                console.error("Error al guardar el libro:", err);
                return res.send("Error al guardar el libro.");
            }
            console.log("Libro guardado con éxito");
            res.redirect("/administracion");
        });
    });
});

// Página de compra de libros
app.get('/comprar', (req, res) => {
    const libroId = req.query.id;
    if (libroId) {
        // Mostrar solo el libro seleccionado para compra individual
        const sql = 'SELECT * FROM libros_admi WHERE id = ?';
        conexion.query(sql, [libroId], (error, results) => {
            if (error || results.length === 0) {
                return res.send("Error al obtener el libro para comprar.");
            }
            const libro = results[0];
            libro.precio = 250;
            res.render('comprar', { libro });
        });
    } else {
        res.redirect('/menu_principal');
    }
});

app.get('/compra_individual', (req, res) => {
    const libroId = req.query.id;
    if (libroId) {
        const sql = 'SELECT * FROM libros_admi WHERE id = ?';
        conexion.query(sql, [libroId], (error, results) => {
            if (error || results.length === 0) {
                return res.send("Error al obtener el libro para comprar.");
            }
            const libro = results[0];
            res.render('compra_individual', { libro });
        });
    } else {
        res.redirect('/menu_principal');
    }
});

app.get('/categoria/:nombre', (req, res) => {
    const categoria = req.params.nombre;

    const sql = "SELECT * FROM libros_admi WHERE categoria = ?";
    conexion.query(sql, [categoria], (err, resultados) => {
        if (err) {
            console.error("Error al buscar por categoría:", err);
            return res.send("Error al buscar por categoría.");
        }

        res.render("menu_principal", {
            mensaje: `Mostrando resultados para la categoría: ${categoria}`,
            libros: resultados,
            q: ""
        });
    });
});

//ayuda al cliente
app.post("/enviar-ayuda", (req, res) => {
    const { nombre, correo, mensaje } = req.body;

    const sql = "INSERT INTO ayuda (nombre, correo, mensaje) VALUES (?, ?, ?)";
    conexion.query(sql, [nombre, correo, mensaje], (err, resultado) => {
        if (err) {
            console.error("Error al guardar el mensaje:", err);
            return res.send("Error al guardar el mensaje.");
        }

        res.redirect('/msj_re');  
    });
});

//usuarios registrados
app.get('/usuarios', (req, res) => {
    const sql = 'SELECT * FROM usuarios';  // Obtener todos los usuarios
    conexion.query(sql, (err, resultados) => {
        if (err) {
            console.error("Error al obtener los usuarios:", err);  // Imprime el error completo
            return res.send(`Error al obtener los usuarios: ${err.message}`);
        }

        console.log("Usuarios obtenidos:", resultados);  // Esto te permitirá ver los usuarios en la consola

        res.render('usuarios', { usuarios: resultados });  // Renderiza la vista 'usuarios' con los datos
    });
});

//ayudas registradas
app.get('/ayuda_admin', (req, res) => {
    const sql = 'SELECT * FROM ayuda';
    conexion.query(sql, (err, resultados) => {
        if (err) {
            console.error("Error al obtener las ayudas:", err);
            return res.send(`Error al obtener las ayudas: ${err.message}`);
        }

        console.log("Mensajes de ayuda obtenidos:", resultados);
        res.render('ayuda_admin', { ayuda: resultados });  
    });
});

// CRUD Libros
app.get('/crud_libros', (req, res) => {
    const sql = 'SELECT * FROM libros_admi';
    conexion.query(sql, (err, libros) => {
        if (err) {
            console.error('Error al obtener los libros:', err);
            return res.render('crud_libros', { libros: [] });
        }
        res.render('crud_libros', { libros });
    });
});

// CRUD Usuarios
app.get('/crud_usuarios', (req, res) => {
    const sql = 'SELECT * FROM usuarios';
    conexion.query(sql, (err, usuarios) => {
        if (err) {
            console.error('Error al obtener los usuarios:', err);
            return res.render('crud_usuarios', { usuarios: [] });
        }
        res.render('crud_usuarios', { usuarios });
    });
});

// Eliminar usuario por correo (usuario)
app.post('/eliminar_usuario/:usuario', (req, res) => {
    const usuario = req.params.usuario;
    const sql = 'DELETE FROM usuarios WHERE usuario = ?';
    conexion.query(sql, [usuario], (err) => {
        if (err) {
            console.error('Error al eliminar usuario:', err);
            return res.redirect('/crud_usuarios?error=1');
        }
        res.redirect('/crud_usuarios');
    });
});

// CRUD Administradores (ejemplo: usuarios con campo especial o tabla admins)
app.get('/crud_admis', (req, res) => {
    // Suponiendo que los administradores están en la tabla 'usuarios' con un campo 'esAdmin' = 1
    const sql = 'SELECT * FROM usuarios WHERE esAdmin = 1';
    conexion.query(sql, (err, admis) => {
        if (err) {
            console.error('Error al obtener los administradores:', err);
            return res.render('crud_admis', { admis: [] });
        }
        res.render('crud_admis', { admis });
    });
});

//consulta libro por id
app.get('/libro/:id', (req, res) => {
    const id = req.params.id;
    const usuario = req.session.usuario;
    const sql = 'SELECT * FROM libros_admi WHERE id = ?';
    conexion.query(sql, [id], (err, resultados) => {
        if (err) return res.send("Error al obtener el libro.");
        if (resultados.length === 0) return res.status(404).send("Libro no encontrado");

        const libro = resultados[0];
        let usuarioHaComprado = false;
        if (usuario) {
            // Verificar si el usuario ya compró este libro
            const sqlCompra = 'SELECT * FROM pedidos WHERE usuario = ? AND libro_id = ?';
            conexion.query(sqlCompra, [usuario, id], (err2, res2) => {
                if (!err2 && res2.length > 0) usuarioHaComprado = true;
                let vista = 'detalle_libro_generico';
                switch (libro.nombre.toLowerCase()) {
                    case '¿amar o depender?':
                        vista = 'detalleslibro';
                        break;
                }
                res.render(vista, { libro, usuarioHaComprado });
            });
        } else {
            let vista = 'detalle_libro_generico';
            switch (libro.nombre.toLowerCase()) {
                case '¿amar o depender?':
                    vista = 'detalleslibro';
                    break;
            }
            res.render(vista, { libro, usuarioHaComprado });
        }
    });
});

// Página para ver todos los libros y sus precios
app.get("/ver_precios", (req, res) => {
    const sql = "SELECT * FROM libros_admi";
    conexion.query(sql, (error, libros) => {
        if (error) {
            console.error("Error al consultar los libros:", error);
            return res.send("Error al consultar los libros.");
        }
        res.render("ver_precios", { libros });
    });
});

// ASOCIACIÓN AUTOMÁTICA DE PDFS A LIBROS (EJECUTAR SOLO UNA VEZ O CUANDO AGREGUES NUEVOS PDFS)
app.get('/asociar-pdfs', (req, res) => {
    const pdfDir = path.join(__dirname, 'PruebasEmi', 'views', 'imagenes');
    fs.readdir(pdfDir, (err, files) => {
        if (err) return res.send('Error al leer la carpeta de PDFs');
        // Solo archivos PDF
        const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        conexion.query('SELECT id, nombre FROM libros_admi', (err, libros) => {
            if (err) return res.send('Error al leer libros de la base de datos');
            let actualizados = 0;
            libros.forEach(libro => {
                // Buscar PDF que contenga el nombre del libro (ignorando mayúsculas/minúsculas y espacios)
                const nombreNormalizado = libro.nombre.replace(/\s+/g, '').toLowerCase();
                const pdfMatch = pdfs.find(pdf => pdf.replace(/\s+/g, '').toLowerCase().includes(nombreNormalizado));
                if (pdfMatch) {
                    conexion.query('UPDATE libros_admi SET archivo_pdf = ? WHERE id = ?', [pdfMatch, libro.id], (err2) => {
                        if (!err2) actualizados++;
                    });
                }
            });
            setTimeout(() => {
                res.send(`Asociación automática terminada. PDFs asociados: ${actualizados}`);
            }, 1000);
        });
    });
});

// AGREGAR AUTOMÁTICAMENTE LOS PDFs COMO LIBROS EN LA BASE DE DATOS
app.get('/agregar-pdfs-a-bd', (req, res) => {
    const pdfDir = path.join(__dirname, 'PruebasEmi', 'views', 'imagenes');
    fs.readdir(pdfDir, (err, files) => {
        if (err) return res.send('Error al leer la carpeta de PDFs');
        // Solo archivos PDF
        const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        let agregados = 0;
        let procesados = 0;
        if (pdfs.length === 0) return res.send('No se encontraron archivos PDF para agregar.');
        pdfs.forEach(pdf => {
            // Usar el nombre del archivo (sin extensión) como nombre del libro
            const nombreLibro = pdf.replace(/\.pdf$/i, '');
            // Verificar si ya existe un libro con ese archivo_pdf
            conexion.query('SELECT * FROM libros_admi WHERE archivo_pdf = ?', [pdf], (err, results) => {
                if (err) { procesados++; if (procesados === pdfs.length) res.send(`Libros agregados automáticamente: ${agregados}`); return; }
                if (results.length === 0) {
                    // Insertar libro básico
                    conexion.query(
                        "INSERT INTO libros_admi (nombre, autor, categoria, descripcion, archivo_pdf, contenido) VALUES (?, ?, ?, ?, ?, ?)",
                        [nombreLibro, 'Desconocido', 'Sin categoría', 'Libro importado automáticamente.', pdf, ''],
                        (err2) => {
                            if (!err2) agregados++;
                            procesados++;
                            if (procesados === pdfs.length) {
                                res.send(`Libros agregados automáticamente: ${agregados}`);
                            }
                        }
                    );
                } else {
                    procesados++;
                    if (procesados === pdfs.length) {
                        res.send(`Libros agregados automáticamente: ${agregados}`);
                    }
                }
            });
        });
    });
});

// INICIAR EL SERVIDOR
app.listen(4000, () => {
    console.log("Escuchando en http://localhost:4000");
});
