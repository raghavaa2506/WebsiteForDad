// server.js - Node.js Backend Server with MongoDB Integration
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/pnv_sastry_db';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to MongoDB successfully');
    console.log('Database:', mongoose.connection.name);
})
.catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
});

// Document Schema
const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: function() {
            return this.type === 'text';
        }
    },
    content: {
        type: String,
        required: function() {
            return this.type === 'text';
        }
    },
    originalName: {
        type: String,
        required: function() {
            return this.type === 'file';
        }
    },
    fileName: {
        type: String,
        required: function() {
            return this.type === 'file';
        }
    },
    filePath: {
        type: String,
        required: function() {
            return this.type === 'file';
        }
    },
    mimeType: String,
    fileSize: Number,
    description: String,
    type: {
        type: String,
        enum: ['text', 'file'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
documentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Document = mongoose.model('Document', documentSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename while preserving extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF, XLS, XLSX'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Save text content
app.post('/api/text', async (req, res) => {
    try {
        const { title, content, description } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const document = new Document({
            title,
            content,
            description,
            type: 'text'
        });
        
        const savedDocument = await document.save();
        
        res.status(201).json({
            message: 'Text saved successfully',
            document: savedDocument
        });
        
    } catch (error) {
        console.error('Error saving text:', error);
        res.status(500).json({ error: 'Failed to save text' });
    }
});

// Upload file
app.post('/api/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const { description, originalName } = req.body;
        
        const document = new Document({
            originalName: originalName || req.file.originalname,
            fileName: req.file.filename,
            filePath: req.file.path,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            description,
            type: 'file'
        });
        
        const savedDocument = await document.save();
        
        res.status(201).json({
            message: 'File uploaded successfully',
            document: savedDocument
        });
        
    } catch (error) {
        console.error('Error uploading file:', error);
        
        // Clean up uploaded file if database save failed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Get all documents
app.get('/api/documents', async (req, res) => {
    try {
        const documents = await Document.find()
            .sort({ createdAt: -1 })
            .select('-filePath'); // Don't expose file paths
        
        res.json(documents);
        
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// Get single document by ID
app.get('/api/document/:id', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        // Don't expose file path in response
        const documentData = document.toObject();
        delete documentData.filePath;
        
        res.json(documentData);
        
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});

// Download file
app.get('/api/download/:id', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        if (document.type !== 'file') {
            return res.status(400).json({ error: 'Document is not a file' });
        }
        
        const filePath = document.filePath;
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }
        
        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
        res.setHeader('Content-Type', document.mimeType);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Delete document
app.delete('/api/document/:id', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        // If it's a file, delete the physical file
        if (document.type === 'file' && document.filePath && fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }
        
        // Delete from database
        await Document.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Document deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// Update document
app.put('/api/document/:id', async (req, res) => {
    try {
        const { title, content, description } = req.body;
        const document = await Document.findById(req.params.id);
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        // Update fields based on document type
        if (document.type === 'text') {
            if (title) document.title = title;
            if (content) document.content = content;
        }
        
        if (description !== undefined) document.description = description;
        
        const updatedDocument = await document.save();
        
        res.json({
            message: 'Document updated successfully',
            document: updatedDocument
        });
        
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ error: 'Failed to update document' });
    }
});

// Search documents
app.get('/api/search', async (req, res) => {
    try {
        const { q, type } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const searchQuery = {
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
                { originalName: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ]
        };
        
        if (type) {
            searchQuery.type = type;
        }
        
        const documents = await Document.find(searchQuery)
            .sort({ createdAt: -1 })
            .select('-filePath');
        
        res.json(documents);
        
    } catch (error) {
        console.error('Error searching documents:', error);
        res.status(500).json({ error: 'Failed to search documents' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404 for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
    }
    
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log('Make sure MongoDB is running on localhost:27017');
});