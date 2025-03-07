const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Configuration
const config = {
  port: 3000,
  verboseLogging: false // Set to true for debugging, false for production
};

// Initialize Express app
const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

// Custom logger that respects the verboseLogging setting
const logger = {
  log: (...args) => {
    if (config.verboseLogging) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (config.verboseLogging) {
      console.error(...args);
    }
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// API endpoint for image analysis
app.post('/analyze-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    // Use the full path to your Python script
    const pythonScriptPath = path.join(__dirname, 'app.py');
    
    logger.log(`Executing: python3 "${pythonScriptPath}" "${imagePath}"`);
    
    // Execute the Python script
    exec(`python3 "${pythonScriptPath}" "${imagePath}"`, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error executing Python script: ${error.message}`);
        return res.status(500).json({ error: 'Failed to analyze image', details: error.message });
      }
      
      if (stderr) {
        logger.error(`Python script stderr: ${stderr}`);
      }
      
      // Try to parse the JSON output from the Python script
      try {
        logger.log("Python output:", stdout);
        const result = JSON.parse(stdout);
        
        // Ensure the result has all the expected fields
        const processedResult = {
          description: result.description || result.enhanced_caption || 'No description available.',
          colors: result.colors || [],
          sentiment: result.sentiment || 'Neutral',
          patterns: result.patterns || []
        };
        
        return res.json(processedResult);
      } catch (e) {
        logger.error('Error parsing Python script output:', e);
        logger.error('Raw output was:', stdout);
        
        // Only include rawOutput in error response if verbose logging is enabled
        const errorResponse = { 
          error: 'Failed to parse analysis result', 
          details: e.message
        };
        
        if (config.verboseLogging) {
          errorResponse.rawOutput = stdout;
        }
        
        return res.status(500).json(errorResponse);
      }
    });
  } catch (error) {
    logger.error('Error analyzing image:', error);
    res.status(500).json({ error: 'Failed to analyze image', details: error.message });
  }
});

// Start the server
app.listen(config.port, () => {
  console.log(`Image Analysis Server running on http://localhost:${config.port}`);
});