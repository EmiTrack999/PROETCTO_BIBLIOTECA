const express = require('express');
const path = require('path');
const mysql = require('mysql');

const app = express();
app.use(express.static(path.join(__dirname, 'PruebasEmi', 'views')));
app.use(express.urlencoded({ extended: true })); // Para leer datos de formularios

// Configuración de conexión a la base de datos
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

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'PruebasEmi', 'views'));

// Rutas principales
app.get("/", (req, res) => {
    res.render("inicio_sesion", { mensaje: "" });
});

// Ruta para la vista de registro (redirigir a esta página)
app.get("/registrar", (req, res) => {
    res.render("vista_uno", { mensaje: "" });
});

// Ruta para registrar un nuevo usuario
app.post("/registrar", (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        // Si faltan datos, muestra un mensaje en la página sin redirigir
        return res.render("vista_uno", { mensaje: "Faltan datos." });
    }

    // Verificar si el usuario ya existe
    const verificarUsuario = "SELECT * FROM usuarios WHERE usuario = ?";
    conexion.query(verificarUsuario, [usuario], (err, resultado) => {
        if (err) {
            console.error("Error al verificar usuario:", err);
            return res.render("vista_uno", { mensaje: "Error al verificar el usuario." });
        }

        if (resultado.length > 0) {
            // Si el usuario ya existe, muestra el mensaje de error en la misma página
            console.log("El usuario ya está registrado.");
            return res.render("vista_uno", { mensaje: "El usuario ya está registrado, por favor inicie sesión." });
        }

        // Si el usuario no existe, se procede a registrar
        const sql = "INSERT INTO usuarios (usuario, contrasena) VALUES (?, ?)";
        conexion.query(sql, [usuario, contrasena], (err, resultado) => {
            if (err) {
                console.error("Error al registrar:", err);
                return res.render("vista_uno", { mensaje: "Error al registrar usuario." });
            }
            console.log("Usuario registrado correctamente.");

            // Redirige a la siguiente página con el mensaje de bienvenida
            return res.redirect("/primerahoja?mensaje=Bienvenido, usuario registrado con éxito!");
        });
    });
});

// Ruta para la página de inicio de sesión (para comprobar si el usuario está registrado)
app.get("/login", (req, res) => {
    res.render("inicio_sesion", { mensaje: "" });
});

// Ruta para manejar el inicio de sesión
app.post("/login", (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return res.render("inicio_sesion", { mensaje: "Por favor ingrese su usuario y contraseña." });
    }

    // Verificar si el usuario existe y si la contraseña es correcta
    const verificarUsuario = "SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?";
    conexion.query(verificarUsuario, [usuario, contrasena], (err, resultado) => {
        if (err) {
            console.error("Error al verificar usuario:", err);
            return res.render("inicio_sesion", { mensaje: "Error al verificar el usuario." });
        }

        if (resultado.length === 0) {
            // Si el usuario no existe en la base de datos
            console.log("El usuario no está registrado.");
            return res.render("inicio_sesion", { mensaje: "El usuario no está registrado. Por favor, regístrese primero." });
        }

        // Si el usuario y la contraseña son correctos
        console.log("Inicio de sesión exitoso.");
        
        // Redirigir a la página principal o a la página que desees
        res.redirect("/primerahoja");
    });
});

// Ruta de la siguiente página donde se muestra el mensaje
app.get("/primerahoja", (req, res) => {
    const mensaje = req.query.mensaje || ''; // Obtener el mensaje de la URL
    res.render("primerahoja", { mensaje });
});











// Ruta de la vista principal (ya estaba definida)
app.get("/primerahoja", (req, res) => {
    const mensaje = req.query.mensaje || '';
    res.render("primerahoja", { mensaje });
});

// Nuevas rutas para redireccionar a las demás vistas del menú
app.get("/maspopulares", (req, res) => {
    res.render("maspopulares"); // Debes tener un archivo maspopulares.ejs
});

app.get("/categorias", (req, res) => {
    res.render("categorias"); // Debes tener un archivo categorias.ejs
});

app.get("/ayuda", (req, res) => {
    res.render("ayuda"); // Debes tener un archivo ayuda.ejs
});

app.get("/contactanos", (req, res) => {
    res.render("contactanos"); // Debes tener un archivo contactanos.ejs
});

app.get("/vender", (req, res) => {
    res.render("vender"); // Debes tener un archivo vender.ejs
});

// Servidor escuchando
app.listen(4000, () => {
    console.log("Escuchando en http://localhost:4000");
});

app.get('/comprar', (req, res) => {
    // Aquí debes consultar los libros desde la base de datos
    connection.query('SELECT * FROM libros', (error, results) => {
        if (error) throw error;
        res.render('comprar', { libros: results });
    });
});

app.post('/comprar', (req, res) => {
    const { libro_id, nombre_comprador, correo, direccion } = req.body;
    connection.query(
        'INSERT INTO compras (libro_id, nombre_comprador, correo, direccion) VALUES (?, ?, ?, ?)',
        [libro_id, nombre_comprador, correo, direccion],
        (error, results) => {
            if (error) throw error;
            res.send('Compra realizada con éxito.');
        }
    );
});

