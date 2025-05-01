const express = require('express');
const path = require('path');
const mysql = require('mysql');

const app = express();
app.use(express.static(path.join(__dirname, 'PruebasEmi', 'views')));
app.use(express.urlencoded({ extended: true }));

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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'PruebasEmi', 'views'));

app.get("/", (req, res) => {
    res.render("inicio_sesion", { mensaje: "" });
});

app.get("/registrar", (req, res) => {
    res.render("vista_uno", { mensaje: "" });
});

app.post("/registrar", (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return res.render("vista_uno", { mensaje: "Faltan datos." });
    }

    const verificarUsuario = "SELECT * FROM usuarios WHERE usuario = ?";
    conexion.query(verificarUsuario, [usuario], (err, resultado) => {
        if (err) {
            console.error("Error al verificar usuario:", err);
            return res.render("vista_uno", { mensaje: "Error al verificar el usuario." });
        }

        if (resultado.length > 0) {
            console.log("El usuario ya está registrado.");
            return res.render("vista_uno", { mensaje: "El usuario ya está registrado, por favor inicie sesión." });
        }

        const sql = "INSERT INTO usuarios (usuario, contrasena) VALUES (?, ?)";
        conexion.query(sql, [usuario, contrasena], (err, resultado) => {
            if (err) {
                console.error("Error al registrar:", err);
                return res.render("vista_uno", { mensaje: "Error al registrar usuario." });
            }
            console.log("Usuario registrado correctamente.");
            return res.redirect("/primerahoja?mensaje=Bienvenido, usuario registrado con éxito!");
        });
    });
});

app.get("/login", (req, res) => {
    res.render("inicio_sesion", { mensaje: "" });
});

app.post("/login", (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return res.render("inicio_sesion", { mensaje: "Por favor ingrese su usuario y contraseña." });
    }

    const verificarUsuario = "SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?";
    conexion.query(verificarUsuario, [usuario, contrasena], (err, resultado) => {
        if (err) {
            console.error("Error al verificar usuario:", err);
            return res.render("inicio_sesion", { mensaje: "Error al verificar el usuario." });
        }

        if (resultado.length === 0) {
            console.log("El usuario no está registrado.");
            return res.render("inicio_sesion", { mensaje: "El usuario no está o la contraseña no es la correcta" });
        }

        console.log("Inicio de sesión exitoso.");
        res.redirect("/primerahoja");
    });
});

// 🔎 Ruta principal con búsqueda filtrada
app.get("/primerahoja", (req, res) => {
    const mensaje = req.query.mensaje || '';
    const busqueda = req.query.q;

    let sql = 'SELECT * FROM libros_admi';
    let valores = [];

    if (busqueda && busqueda.trim() !== '') {
        sql += ' WHERE nombre LIKE ? OR autor LIKE ? OR genero LIKE ? OR año LIKE ?';
        valores = [`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`];
    }

    conexion.query(sql, valores, (error, results) => {
        if (error) {
            console.error("Error al consultar los libros:", error);
            return res.send("Error al consultar los libros.");
        }

        res.render("primerahoja", { mensaje, libros: results, q: busqueda });
    });
});

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

app.get("/carrito_usua", (req, res) => {
    const libros = [];
    res.render("carrito_usua", { libros });
});

let libros = [];
app.get("/administracion", (req, res) => {
    res.render("administracion", { libros });
});

app.get('/guardar_libro', (req, res) => {
    res.render('guardar_libro');
});

app.post("/guardar-libro", (req, res) => {
    const { id, nombre, autor, genero, año } = req.body;

    const sql = "INSERT INTO libros_admi (id, nombre, autor, genero, año) VALUES (?, ?, ?, ?, ?)";
    conexion.query(sql, [id, nombre, autor, genero, año], (err, resultado) => {
        if (err) {
            console.error("Error al guardar el libro:", err);
            return res.send("Error al guardar el libro.");
        }

        console.log("Libro guardado con éxito");
        res.redirect("/administracion");
    });
});

app.get('/comprar', (req, res) => {
    conexion.query('SELECT * FROM libros', (error, results) => {
        if (error) throw error;
        res.render('comprar', { libros: results });
    });
});

app.listen(4000, () => {
    console.log("Escuchando en http://localhost:4000");
});
