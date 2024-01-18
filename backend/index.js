const express = require('express');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/ImageUpload', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

// Define the MongoDB schema
const imageSchema = new mongoose.Schema({
  url: String,
});

// Create a Mongoose model based on the schema
const Image = mongoose.model('Image', imageSchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.originalname.slice(0, 10) + '-' + uniqueSuffix);
  },
});

const upload = multer({ storage: storage });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });

    // File has been uploaded successfully
    console.log('File uploaded to Cloudinary:', response.url);

    // Remove the locally saved temporary file
    fs.unlinkSync(localFilePath);

    // Save the URL to MongoDB
    const newImage = new Image({ url: response.url });
    await newImage.save();

    return response;
  } catch (error) {
    // Handle errors here
    console.error('Error uploading to Cloudinary:', error);

    // Remove the locally saved temporary file in case of an error
    fs.unlinkSync(localFilePath);

    return null;
  }
};

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Assuming your client is sending the file in a field named 'file'
    const { path } = req.file;

    const cloudinaryResponse = await uploadOnCloudinary(path);

    if (cloudinaryResponse) {
      // You can send a response to the client here if needed
      res.status(200).json({ imageUrl: cloudinaryResponse.url });
    } else {
      // Handle the case where the upload to Cloudinary failed
      res.status(500).json({ error: 'Error uploading to Cloudinary' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
