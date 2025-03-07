document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const results = document.getElementById('results');
    const description = document.getElementById('description');
    const colorPalette = document.getElementById('colorPalette');
    const sentiment = document.getElementById('sentiment');
    const patternsList = document.getElementById('patternsList');
    const categoryDisplay = document.getElementById('category');
    const resetBtn = document.getElementById('resetBtn');
    
    let selectedFile = null;
    
    // Check if required elements exist
    if (!dropArea || !fileInput || !analyzeBtn || !previewContainer || !imagePreview || 
        !resultsContainer || !loadingIndicator || !results || !description || 
        !colorPalette || !sentiment || !patternsList || !categoryDisplay) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }
    
    // Event Listeners for Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('active');
    }
    
    function unhighlight() {
        dropArea.classList.remove('active');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    // Handle file input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
    
    // Click on drop area to trigger file input
    dropArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Handle selected files
    function handleFiles(files) {
        if (files.length > 0) {
            selectedFile = files[0];
            
            // Check if file is an image
            if (!selectedFile.type.match('image.*')) {
                alert('Please select an image file (JPEG, PNG, GIF, etc.)');
                return;
            }
            
            // Display image preview
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                previewContainer.style.display = 'block';
                analyzeBtn.disabled = false;
                
                // Reset results if previously shown
                results.style.display = 'none';
                
                // Scroll to preview
                previewContainer.scrollIntoView({ behavior: 'smooth' });
            }
            reader.readAsDataURL(selectedFile);
        }
    }
    
    // Analyze button click handler
    analyzeBtn.addEventListener('click', analyzeImage);
    
    // Function to analyze the image
    async function analyzeImage() {
        if (!selectedFile) {
            alert('Please select an image first.');
            return;
        }
        
        // Show loading indicator
        resultsContainer.style.display = 'block';
        loadingIndicator.style.display = 'flex';
        results.style.display = 'none';
        
        // Scroll to results container
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
        
        // Create form data
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        try {
            // Send request to backend
            const response = await fetch('http://localhost:3000/analyze-image', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if there's an error in the response
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display results
            displayResults(data);
            
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to analyze image: ' + error.message);
            
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
        }
    }
    
    // Function to display results
    function displayResults(data) {
        // Hide loading indicator and show results
        loadingIndicator.style.display = 'none';
        results.style.display = 'block';
        
        // Display description
        description.textContent = data.description || 'No description available.';
        
        // Display category if available
        if (categoryDisplay && data.category) {
            categoryDisplay.textContent = data.category;
            categoryDisplay.parentElement.style.display = 'block';
        } else if (categoryDisplay) {
            categoryDisplay.parentElement.style.display = 'none';
        }
        
        // Display color palette
        colorPalette.innerHTML = '';
        if (data.colors && Array.isArray(data.colors) && data.colors.length > 0) {
            data.colors.forEach(colorInfo => {
                let color, name;
                
                // Handle different formats of color information
                if (typeof colorInfo === 'string') {
                    color = colorInfo;
                    name = colorInfo;
                } else if (typeof colorInfo === 'object') {
                    color = colorInfo.hex || colorInfo.color || '#cccccc';
                    name = colorInfo.name || color;
                }
                
                const colorItem = document.createElement('div');
                colorItem.className = 'color-item';
                
                const colorSwatch = document.createElement('div');
                colorSwatch.className = 'color-swatch';
                colorSwatch.style.backgroundColor = color;
                
                const colorHex = document.createElement('span');
                colorHex.className = 'color-hex';
                colorHex.textContent = name;
                
                colorItem.appendChild(colorSwatch);
                colorItem.appendChild(colorHex);
                colorPalette.appendChild(colorItem);
            });
        } else {
            colorPalette.innerHTML = '<p>No color information available.</p>';
        }
        
        // Display sentiment
        sentiment.innerHTML = '';
        if (data.sentiment) {
            let sentimentClass = 'neutral';
            let sentimentIcon = 'meh';
            
            const sentimentText = data.sentiment.toLowerCase();
            if (sentimentText.includes('positive') || 
                sentimentText.includes('happy') || 
                sentimentText.includes('joy')) {
                sentimentClass = 'positive';
                sentimentIcon = 'smile-beam';
            } else if (sentimentText.includes('negative') || 
                       sentimentText.includes('sad') || 
                       sentimentText.includes('fear')) {
                sentimentClass = 'negative';
                sentimentIcon = 'frown';
            }
            
            sentiment.innerHTML = `
                <i class="fas fa-${sentimentIcon} sentiment-icon ${sentimentClass}"></i>
                <span>${data.sentiment}</span>
            `;
        } else {
            sentiment.textContent = 'No sentiment information available.';
        }
        
        // Display patterns
        patternsList.innerHTML = '';
        if (data.patterns && Array.isArray(data.patterns) && data.patterns.length > 0) {
            data.patterns.forEach(pattern => {
                const li = document.createElement('li');
                li.textContent = pattern;
                patternsList.appendChild(li);
            });
        } else {
            patternsList.innerHTML = '<p>No pattern information available.</p>';
        }
    }
    
    // Add reset functionality
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            // Reset file selection
            fileInput.value = '';
            selectedFile = null;
            
            // Hide preview and results
            previewContainer.style.display = 'none';
            resultsContainer.style.display = 'none';
            
            // Reset button state
            analyzeBtn.disabled = true;
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});