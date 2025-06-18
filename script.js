// Welcome message
console.log("Welcome to PNV Sastry's Site!");

// MongoDB connection configuration
const MONGODB_URI = 'mongodb://localhost:27017/pnv_sastry_db';
const API_BASE_URL = 'http://localhost:3000/api'; // Your backend API URL

// DOM elements
const textForm = document.getElementById('textForm');
const fileForm = document.getElementById('fileForm');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const documentsList = document.getElementById('documentsList');
const statusMessage = document.getElementById('statusMessage');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadDocuments();
});

// Setup event listeners
function setupEventListeners() {
    // Text form submission
    textForm.addEventListener('submit', handleTextSubmit);
    
    // File form submission
    fileForm.addEventListener('submit', handleFileSubmit);
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        fileName.textContent = file.name;
    } else {
        fileName.textContent = 'No file selected';
    }
}

// Handle text form submission
async function handleTextSubmit(event) {
    event.preventDefault();
    
    const title = document.getElementById('textTitle').value;
    const content = document.getElementById('textContent').value;
    
    try {
        showStatus('Saving text...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                content: content,
                type: 'text',
                createdAt: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showStatus('Text saved successfully!', 'success');
            textForm.reset();
            loadDocuments();
        } else {
            throw new Error('Failed to save text');
        }
    } catch (error) {
        console.error('Error saving text:', error);
        showStatus('Error saving text. Please try again.', 'error');
    }
}

// Handle file form submission
async function handleFileSubmit(event) {
    event.preventDefault();
    
    const file = fileInput.files[0];
    const description = document.getElementById('fileDescription').value;
    
    if (!file) {
        showStatus('Please select a file to upload.', 'error');
        return;
    }
    
    try {
        showStatus('Uploading file...', 'info');
        
        const formData = new FormData();
        formData.append('document', file);
        formData.append('description', description);
        formData.append('originalName', file.name);
        formData.append('type', 'file');
        formData.append('createdAt', new Date().toISOString());
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            showStatus('File uploaded successfully!', 'success');
            fileForm.reset();
            fileName.textContent = 'No file selected';
            loadDocuments();
        } else {
            throw new Error('Failed to upload file');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showStatus('Error uploading file. Please try again.', 'error');
    }
}

// Load documents from database
async function loadDocuments() {
    try {
        const response = await fetch(`${API_BASE_URL}/documents`);
        
        if (response.ok) {
            const documents = await response.json();
            displayDocuments(documents);
        } else {
            throw new Error('Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        documentsList.innerHTML = '<p>Error loading documents. Please refresh the page.</p>';
    }
}

// Display documents in the list
function displayDocuments(documents) {
    if (documents.length === 0) {
        documentsList.innerHTML = '<p>No documents found.</p>';
        return;
    }
    
    const documentsHTML = documents.map(doc => `
        <div class="document-item" data-id="${doc._id}">
            <div class="document-title">${doc.title || doc.originalName || 'Untitled'}</div>
            <div class="document-info">
                Type: ${doc.type === 'text' ? 'Text Content' : 'File'}
                ${doc.originalName ? `| File: ${doc.originalName}` : ''}
                | Created: ${new Date(doc.createdAt).toLocaleDateString()}
            </div>
            ${doc.description ? `<div class="document-info">Description: ${doc.description}</div>` : ''}
            ${doc.type === 'text' && doc.content ? `<div class="document-info">Preview: ${doc.content.substring(0, 100)}${doc.content.length > 100 ? '...' : ''}</div>` : ''}
            <div class="document-actions">
                ${doc.type === 'file' ? `<button class="download-btn" onclick="downloadDocument('${doc._id}', '${doc.originalName}')">Download</button>` : ''}
                <button class="download-btn" onclick="viewDocument('${doc._id}')">View</button>
                <button class="delete-btn" onclick="deleteDocument('${doc._id}')">Delete</button>
            </div>
        </div>
    `).join('');
    
    documentsList.innerHTML = documentsHTML;
}

// Download document
async function downloadDocument(documentId, fileName) {
    try {
        const response = await fetch(`${API_BASE_URL}/download/${documentId}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Failed to download file');
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        showStatus('Error downloading file. Please try again.', 'error');
    }
}

// View document
async function viewDocument(documentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/document/${documentId}`);
        
        if (response.ok) {
            const document = await response.json();
            
            // Create modal or new window to display document
            const modal = createModal(document);
            document.body.appendChild(modal);
        } else {
            throw new Error('Failed to load document');
        }
    } catch (error) {
        console.error('Error viewing document:', error);
        showStatus('Error loading document. Please try again.', 'error');
    }
}

// Create modal for document viewing
function createModal(document) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${document.title || document.originalName || 'Document'}</h2>
                <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <div class="modal-body">
                ${document.type === 'text' ? 
                    `<div class="text-content">${document.content}</div>` : 
                    `<div class="file-info">
                        <p><strong>File Name:</strong> ${document.originalName}</p>
                        <p><strong>Type:</strong> ${document.type}</p>
                        <p><strong>Created:</strong> ${new Date(document.createdAt).toLocaleString()}</p>
                        ${document.description ? `<p><strong>Description:</strong> ${document.description}</p>` : ''}
                        <button onclick="downloadDocument('${document._id}', '${document.originalName}')">Download File</button>
                    </div>`
                }
            </div>
        </div>
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            display: block;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        .modal-content {
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: none;
            border-radius: 10px;
            width: 80%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }
        .close {
            color: #aaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .close:hover {
            color: black;
        }
        .text-content {
            white-space: pre-wrap;
            line-height: 1.6;
        }
        .file-info p {
            margin-bottom: 10px;
        }
    `;
    document.head.appendChild(style);
    
    return modal;
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Delete document
async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/document/${documentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showStatus('Document deleted successfully!', 'success');
            loadDocuments();
        } else {
            throw new Error('Failed to delete document');
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        showStatus('Error deleting document. Please try again.', 'error');
    }
}

// Show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// Make functions available globally
window.downloadDocument = downloadDocument;
window.viewDocument = viewDocument;
window.deleteDocument = deleteDocument;
window.closeModal = closeModal;