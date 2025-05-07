const express = require('express');
const path = require('path');
const mysql = require('mysql');

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

    if (!usuario || !contrasena) {
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

        res.redirect("/menu_principal");
    });
});

// RUTAS PARA EL MENÚ PRINCIPAL

// Página principal de menú con libros
app.get("/menu_principal", (req, res) => {
    const mensaje = req.query.mensaje || '';
    const busqueda = req.query.q;

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

        res.render("menu_principal", { mensaje, libros: results, q: busqueda });
    });
});

// Otras páginas
app.get("/maspopulares", (req, res) => {
    res.render("maspopulares");
});

app.get("/categorias", (req, res) => {
    res.render("categorias");
});

app.get("/ayuda", (req, res) => {
    res.render("ayuda");
});

app.get("/contactanos", (req, res) => {
    res.render("contactanos");
});

app.get('/carrito_usua', (req, res) => {
    // Verificar si el carrito existe en la sesión
    if (!req.session.carrito) {
        req.session.carrito = []; // Si no existe, inicializa el carrito
    }

    // Renderiza la vista del carrito y pasa los libros en el carrito
    res.render('carrito_usua', { carrito: req.session.carrito });
});




app.get('/mensaje-recibido', (req, res) => {
    res.render('msj_re');
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
    const { id, nombre, autor, categoria, descripcion } = req.body;

    const sql = "INSERT INTO libros_admi (id, nombre, autor, categoria,descripcion) VALUES (?, ?, ?, ?, ?)";
    conexion.query(sql, [id, nombre, autor, categoria,descripcion], (err, resultado) => {
        if (err) {
            console.error("Error al guardar el libro:", err);
            return res.send("Error al guardar el libro.");
        }

        console.log("Libro guardado con éxito");
        res.redirect("/administracion");
    });
});

// Página de compra de libros
app.get('/comprar', (req, res) => {
    conexion.query('SELECT * FROM libros', (error, results) => {
        if (error) throw error;
        res.render('comprar', { libros: results });
    });
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

        res.redirect('/mensaje-recibido');  
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


//consulta libro por id
app.get('/libro/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM libros_admi WHERE id = ?';
    conexion.query(sql, [id], (err, resultados) => {
        if (err) return res.send("Error al obtener el libro.");
        if (resultados.length === 0) return res.status(404).send("Libro no encontrado");

        const libro = resultados[0];

        let vista = 'detalle_libro_generico';
        switch (libro.nombre.toLowerCase()) {
            case '¿Amar o depender?':
                
                vista = 'detalleslibro';
                break;
            
        }

        res.render(vista, { libro });
    });
});

app.get('/carrito_usua', (req, res) => {
    const libroId = req.query.agregar;  // Obtener el parámetro 'agregar'
    
    // Si el parámetro 'agregar' está presente
    if (libroId) {
        // Aquí deberías obtener el libro desde la base de datos por su ID
        const sql = 'SELECT * FROM libros_admi WHERE id = ?';
        conexion.query(sql, [libroId], (err, resultado) => {
            if (err) {
                console.error("Error al obtener el libro:", err);
                return res.send("Error al obtener el libro.");
            }
            if (resultado.length > 0) {
                const libro = resultado[0];
                
                // Inicializa el carrito si no existe
                if (!req.session.carrito) {
                    req.session.carrito = [];
                }

                // Verifica si el libro ya está en el carrito
                const libroExistente = req.session.carrito.find(l => l.id === libro.id);
                if (libroExistente) {
                    libroExistente.cantidad += 1;  // Incrementa la cantidad
                } else {
                    libro.cantidad = 1;  // Si no está en el carrito, lo agrega con cantidad 1
                    req.session.carrito.push(libro);
                }
            }

            // Después de agregar el libro, redirige al carrito
            res.redirect('/carrito_usua');
        });
    } else {
        // Si no hay parámetro 'agregar', solo renderiza el carrito
        res.render('carrito', { carrito: req.session.carrito || [] });
    }
});





// INICIAR EL SERVIDOR
app.listen(4000, () => {
    console.log("Escuchando en http://localhost:4000");
});
