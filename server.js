const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const multer = require('multer');
const fileUpload = require('express-fileupload');

const app = express();
const port = 5000;
const upload = multer({ dest: 'uploads/' });

const excelDataSchema = new mongoose.Schema({
  filename: String,
  data: Object
});

const ExcelData = mongoose.model('ExcelData', excelDataSchema);

// Configuración de la base de datos
mongoose.connect('mongodb://localhost:27017/DigitalNaoReto2', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Conexión exitosa a la base de datos'))
  .catch(err => console.error('Error al conectar a la base de datos', err));

// Definir un modelo de usuario
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

const User = mongoose.model('User', userSchema);

// Configurar rutas de registro y inicio de sesión
app.use(express.json());

// Middleware para permitir solicitudes CORS
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    });
    await user.save();
    res.status(200).json({ message: 'Registro exitoso' });
  } catch (error) {
    console.error('Error al registrar al usuario', error);
    res.status(500).json({ error: 'Error al registrar al usuario' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const passwordMatch = await bcrypt.compare(req.body.password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ userId: user._id }, 'secret_key');
    console.log(user.name,"estoy en server name")
    res.status(200).json({ token, name: user.name });
  } catch (error) {
    console.error('Error al iniciar sesión', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});
app.get('/saludo',(req,res)=>{
    const {name} = req.query;
    res.status(200).json({message:`Hola ${name}`})
});


app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const workbook = XLSX.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  return res.json({ data });
  // Almacena los datos en MongoDB
  const excelData = new ExcelData({
    filename: file.originalname,
    data: data
  });
  await excelData.save();

  return res.json({ message: 'Archivo Excel almacenado en la base de datos' });
});

app.get('/excel-data', async (req, res) => {
  try {
    const excelData = await ExcelData.find();
    res.status(200).json(excelData);
  } catch (error) {
    console.error('Error al obtener los datos del archivo Excel', error);
    res.status(500).json({ error: 'Error al obtener los datos del archivo Excel' });
  }
});


app.put('/update', async (req, res) => {
  try {
    const { filename, updatedData } = req.body;
    await ExcelData.findOneAndUpdate({ filename }, { data: updatedData });
    res.status(200).json({ message: 'Datos actualizados correctamente' });
  } catch (error) {
    console.error('Error al actualizar los datos', error);
    res.status(500).json({ error: 'Error al actualizar los datos' });
  }
});


// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
