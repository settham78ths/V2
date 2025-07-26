// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const cvUploadForm = document.getElementById('cv-upload-form');
    const cvFileInput = document.getElementById('cv-file');
    const jobTitleInput = document.getElementById('job-title');
    const jobDescriptionInput = document.getElementById('job-description');
    const jobUrlInput = document.getElementById('job-url');
    const processButton = document.getElementById('process-button');
    const uploadSuccessAlert = document.getElementById('upload-success');
    const uploadErrorAlert = document.getElementById('upload-error');
    const errorMessageSpan = document.getElementById('error-message');
    const processingIndicator = document.getElementById('processing-indicator');
    const resultsSection = document.getElementById('results-section');

    // CV preview and editor elements
    const cvPreview = document.getElementById('cv-preview');
    const cvEditor = document.getElementById('cv-editor');
    const cvTextEditor = document.getElementById('cv-text-editor');
    const editCvBtn = document.getElementById('edit-cv-btn');
    const saveCvBtn = document.getElementById('save-cv-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Result elements
    const resultContainer = document.getElementById('result-container');
    const copyResultBtn = document.getElementById('copy-result-btn');
    const compareVersionsBtn = document.getElementById('compare-versions-btn');

    // Options elements
    const optionInputs = document.querySelectorAll('input[name="optimization-option"]');

    // Store CV text
    let cvText = '';

    // Handle CV upload form submission
    if (cvUploadForm) {
        cvUploadForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Check if a file is selected
            if (!cvFileInput || !cvFileInput.files[0]) {
                showError('Please select a PDF file to upload.');
                return;
            }

            // Create FormData object
            const formData = new FormData();
            formData.append('cv_file', cvFileInput.files[0]);

            // Show loading state
            if (processButton) processButton.disabled = true;
            if (cvFileInput) cvFileInput.disabled = true;

            // Hide previous alerts
            if (uploadSuccessAlert) uploadSuccessAlert.style.display = 'none';
            if (uploadErrorAlert) uploadErrorAlert.style.display = 'none';

            // Send AJAX request to upload endpoint
            fetch('/upload-cv', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store the CV text
                    cvText = data.cv_text;

                    // Display the CV text in the preview
                    if (cvPreview) cvPreview.innerHTML = formatTextAsHtml(cvText);

                    // Enable editing and processing
                    if (editCvBtn) editCvBtn.disabled = false;
                    if (processButton) processButton.disabled = false;

                    // Show success message
                    if (uploadSuccessAlert) uploadSuccessAlert.style.display = 'block';

                    // Show results section and scroll to it
                    if (resultsSection) {
                        resultsSection.style.display = 'block';
                        setTimeout(() => {
                            resultsSection.scrollIntoView({ behavior: 'smooth' });
                        }, 500);
                    }
                } else {
                    showError(data.message || 'Error uploading CV');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Failed to upload CV. Please try again.');
            })
            .finally(() => {
                // Re-enable the file input
                if (cvFileInput) cvFileInput.disabled = false;
            });
        });
    }

    // Process CV button click
    if (processButton) {
        processButton.addEventListener('click', async function() {
            // Get selected option
            const selectedOptionElement = document.querySelector('input[name="optimization-option"]:checked');
            if (!selectedOptionElement) {
                showError('Please select an optimization option.');
                return;
            }
            const selectedOption = selectedOptionElement.value;

            // Get form values
            const jobTitle = jobTitleInput ? jobTitleInput.value.trim() : '';
            const jobDescription = jobDescriptionInput ? jobDescriptionInput.value.trim() : '';
            const jobUrl = jobUrlInput ? jobUrlInput.value.trim() : '';

            // Check if job description is required for certain options
            if ((selectedOption === 'optimize' || selectedOption === 'cover_letter' || selectedOption === 'feedback' || 
                 selectedOption === 'ats_check' || selectedOption === 'interview_questions' || selectedOption === 'keyword_analysis') 
                && !jobDescription && !jobUrl) {
                showError('Please provide a job description or URL for this option.');
                return;
            }

            // Check if job title is required for position optimization
            if (selectedOption === 'position_optimization' && !jobTitle) {
                showError('Please provide a job title for position-specific optimization.');
                return;
            }

            // Initialize empty roles array
            let roles = [];

            // Get selected language
            const selectedLanguageElement = document.querySelector('input[name="language"]:checked');
            const selectedLanguage = selectedLanguageElement ? selectedLanguageElement.value : 'pl';

            // Fix undefined variables - add these elements if they exist
            const analyzeUrlBtn = document.getElementById('analyze-url-btn');
            const analyzeJobBtn = document.getElementById('analyze-job-btn');
            
            // Add event listeners if elements exist
            if (analyzeUrlBtn) {
                analyzeUrlBtn.addEventListener('click', function() {
                    const jobUrlValue = jobUrlInput ? jobUrlInput.value.trim() : '';
                    if (jobUrlValue) {
                        analyzeJobPosting(jobUrlValue);
                    } else {
                        showError('Please enter a job URL first.');
                    }
                });
            }
            
            if (analyzeJobBtn) {
                analyzeJobBtn.addEventListener('click', function() {
                    const jobDescValue = jobDescriptionInput ? jobDescriptionInput.value.trim() : '';
                    if (jobDescValue) {
                        analyzeJobPosting('', jobDescValue);
                    } else {
                        showError('Please enter a job description first.');
                    }
                });
            }

            // Enhanced job description analysis for better CV optimization
            if (jobDescription && jobDescription.length > 100 && 
                (selectedOption === 'optimize' || selectedOption === 'position_optimization' || selectedOption === 'advanced_position_optimization')) {

                showStatus('Analizuję opis stanowiska...', 'info');

                try {
                    const jobAnalysisResponse = await fetch('/analyze-job-posting', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            job_description: jobDescription,
                            job_url: jobUrl,
                            language: selectedLanguage
                        })
                    });

                    const jobAnalysisData = await jobAnalysisResponse.json();

                    if (jobAnalysisData.success && jobAnalysisData.analysis) {
                        // Display job analysis insights
                        const analysis = jobAnalysisData.analysis;

                        let analysisHTML = '<div class="job-analysis-preview">';
                        analysisHTML += '<h4>🎯 Analiza Stanowiska:</h4>';

                        if (analysis.job_title) {
                            analysisHTML += `<p><strong>Stanowisko:</strong> ${analysis.job_title}</p>`;
                        }

                        if (analysis.industry) {
                            analysisHTML += `<p><strong>Branża:</strong> ${analysis.industry}</p>`;
                        }

                        if (analysis.key_requirements && analysis.key_requirements.length > 0) {
                            analysisHTML += '<p><strong>Kluczowe wymagania:</strong></p>';
                            analysisHTML += '<ul>';
                            analysis.key_requirements.slice(0, 3).forEach(req => {
                                analysisHTML += `<li>${req}</li>`;
                            });
                            analysisHTML += '</ul>';
                        }

                        if (analysis.industry_keywords && analysis.industry_keywords.length > 0) {
                            analysisHTML += `<p><strong>Słowa kluczowe:</strong> ${analysis.industry_keywords.slice(0, 5).join(', ')}</p>`;
                        }

                        analysisHTML += '</div>';

                        showStatus(analysisHTML, 'success');

                        // Store analysis for CV optimization
                        window.jobAnalysis = analysis;
                    }
                } catch (error) {
                    console.log('Job analysis failed, proceeding with standard optimization:', error);
                }
            }

            // Prepare request data
            const requestData = {
                cv_text: cvText,
                job_title: jobTitle,
                job_description: jobDescription,
                job_url: jobUrl,
                selected_option: selectedOption,
                roles: roles,
                language: selectedLanguage
            };

            // Show processing indicator and disable buttons
            if (processingIndicator) processingIndicator.style.display = 'block';
            if (processButton) processButton.disabled = true;
            if (editCvBtn) editCvBtn.disabled = true;
            if (uploadSuccessAlert) uploadSuccessAlert.style.display = 'none';
            if (uploadErrorAlert) uploadErrorAlert.style.display = 'none';

            // Clear previous results
            if (resultContainer) resultContainer.innerHTML = '<p class="text-center">Processing your request...</p>';

            // Send AJAX request to process endpoint
            fetch('/process-cv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display the result
                    if (resultContainer) resultContainer.innerHTML = formatTextAsHtml(data.result);

                    // If job description was extracted from URL, update the input
                    if (data.job_description && jobDescriptionInput) {
                        jobDescriptionInput.value = data.job_description;
                    }

                    // Enable copy button
                    if (copyResultBtn) copyResultBtn.disabled = false;

                    // Enable compare button if this was an optimization
                    if ((selectedOption === 'optimize' || selectedOption === 'position_optimization') && compareVersionsBtn) {
                        compareVersionsBtn.disabled = false;
                    }
                } else {
                    showError(data.message || 'Error processing CV');
                    if (resultContainer) resultContainer.innerHTML = '<p class="text-center text-danger">Processing failed. Please try again.</p>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Failed to process CV. Please try again.');
                if (resultContainer) resultContainer.innerHTML = '<p class="text-center text-danger">Processing failed. Please try again.</p>';
            })
            .finally(() => {
                // Hide processing indicator and re-enable buttons
                if (processingIndicator) processingIndicator.style.display = 'none';
                if (processButton) processButton.disabled = false;
                if (editCvBtn) editCvBtn.disabled = false;
            });
        });
    }

    // Edit CV button click
    if (editCvBtn) {
        editCvBtn.addEventListener('click', function() {
            // Set editor text and show editor
            if (cvTextEditor) cvTextEditor.value = cvText;
            if (cvPreview) cvPreview.style.display = 'none';
            if (cvEditor) cvEditor.style.display = 'block';
            editCvBtn.disabled = true;
        });
    }

    // Save CV button click
    if (saveCvBtn) {
        saveCvBtn.addEventListener('click', function() {
            // Update CV text and preview
            if (cvTextEditor) cvText = cvTextEditor.value;
            if (cvPreview) cvPreview.innerHTML = formatTextAsHtml(cvText);

            // Hide editor and show preview
            if (cvEditor) cvEditor.style.display = 'none';
            if (cvPreview) cvPreview.style.display = 'block';
            if (editCvBtn) editCvBtn.disabled = false;
        });
    }

    // Cancel edit button click
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            // Hide editor without saving changes
            if (cvEditor) cvEditor.style.display = 'none';
            if (cvPreview) cvPreview.style.display = 'block';
            if (editCvBtn) editCvBtn.disabled = false;
        });
    }

    // Copy result button click
    if (copyResultBtn) {
        copyResultBtn.addEventListener('click', function() {
            // Get the text content from the result container
            if (!resultContainer) return;
            const resultText = resultContainer.innerText;

            // Copy to clipboard
            navigator.clipboard.writeText(resultText).then(
                function() {
                    // Success - show temporary feedback
                    const originalText = copyResultBtn.innerHTML;
                    copyResultBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';

                    setTimeout(function() {
                        copyResultBtn.innerHTML = originalText;
                    }, 2000);
                },
                function(err) {
                    console.error('Could not copy text: ', err);
                    showError('Failed to copy text. Please try manually selecting and copying.');
                }
            );
        });
    }

    // Compare CV versions button click
    if (compareVersionsBtn) {
        compareVersionsBtn.addEventListener('click', function() {
            fetch('/compare-cv-versions')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.has_both_versions) {
                    // Create comparison view
                    const comparisonHtml = `
                        <div class="row">
                            <div class="col-md-6">
                                <h5 class="text-primary"><i class="fas fa-file-alt me-2"></i>Original CV</h5>
                                <div class="border p-3 bg-light" style="max-height: 400px; overflow-y: auto;">
                                    ${formatTextAsHtml(data.original)}
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h5 class="text-success"><i class="fas fa-star me-2"></i>Optimized CV</h5>
                                <div class="border p-3 bg-light" style="max-height: 400px; overflow-y: auto;">
                                    ${formatTextAsHtml(data.optimized)}
                                </div>
                            </div>
                        </div>
                        <div class="text-center mt-3">
                            <button class="btn btn-secondary" onclick="location.reload()">
                                <i class="fas fa-arrow-left me-1"></i>Back to Results
                            </button>
                        </div>
                    `;
                    if (resultContainer) resultContainer.innerHTML = comparisonHtml;
                } else {
                    showError('No optimized CV available for comparison. Please optimize your CV first.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Failed to load CV versions for comparison.');
            });
        });
    }

    // Listen for option changes (just in case we need to add functionality in future)
    if (optionInputs && optionInputs.length > 0) {
        optionInputs.forEach(input => {
            input.addEventListener('change', function() {
                // Future option-specific logic can be added here
            });
        });
    }

    // Helper function to show error messages
    function showError(message) {
        if (errorMessageSpan) errorMessageSpan.textContent = message;
        if (uploadErrorAlert) uploadErrorAlert.style.display = 'block';
    }

    // Helper function to show status messages
    function showStatus(message, type = 'info') {
        // Create or update status container
        let statusContainer = document.getElementById('status-container');
        if (!statusContainer) {
            statusContainer = document.createElement('div');
            statusContainer.id = 'status-container';
            statusContainer.className = 'alert alert-info mb-3';
            statusContainer.style.display = 'none';

            // Insert before results section or at top of main content
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                resultsSection.parentNode.insertBefore(statusContainer, resultsSection);
            } else {
                const mainContainer = document.querySelector('.container');
                if (mainContainer) {
                    mainContainer.insertBefore(statusContainer, mainContainer.firstChild);
                }
            }
        }

        // Update status message and type
        statusContainer.className = `alert alert-${type} mb-3`;
        statusContainer.innerHTML = message;
        statusContainer.style.display = 'block';

        // Auto-hide info messages after 5 seconds
        if (type === 'info') {
            setTimeout(() => {
                statusContainer.style.display = 'none';
            }, 5000);
        }
    }

    // Helper function to format plain text as HTML with proper CV formatting
    function formatTextAsHtml(text) {
        if (!text) return '<p class="text-muted">No text available</p>';

        // Split text into lines for processing
        let lines = text.split('\n');
        let formattedHtml = '';

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Skip empty lines
            if (line === '') {
                formattedHtml += '<br>';
                continue;
            }

            // Check if line is a section header (ALL CAPS or starts with common CV sections)
            const cvSections = [
                'DANE OSOBOWE', 'PERSONAL DATA', 'CONTACT', 'KONTAKT',
                'PODSUMOWANIE', 'SUMMARY', 'PROFIL', 'PROFILE',
                'DOŚWIADCZENIE ZAWODOWE', 'WORK EXPERIENCE', 'EXPERIENCE', 'DOŚWIADCZENIE',
                'WYKSZTAŁCENIE', 'EDUCATION', 'EDUKACJA',
                'UMIEJĘTNOŚCI', 'SKILLS', 'KOMPETENCJE',
                'JĘZYKI', 'LANGUAGES', 'CERTYFIKATY', 'CERTIFICATES',
                'PROJEKTY', 'PROJECTS', 'HOBBY', 'ZAINTERESOWANIA', 'INTERESTS'
            ];

            const isHeader = cvSections.some(section => 
                line.toUpperCase().includes(section) || 
                (line === line.toUpperCase() && line.length > 3 && line.length < 50)
            );

            if (isHeader) {
                // Format as section header
                formattedHtml += `<h5 class="text-primary mt-4 mb-2 fw-bold">${line}</h5>`;
            } else if (line.match(/^\d{4}\s*-\s*\d{4}/) || line.match(/^\d{2}\/\d{4}/)) {
                // Date ranges - format as experience entries
                formattedHtml += `<p class="mb-1 fw-semibold text-dark">${line}</p>`;
            } else if (line.includes('@') || line.match(/^\+?\d[\d\s\-\(\)]+/) || line.includes('tel:') || line.includes('email:')) {
                // Contact information
                formattedHtml += `<p class="mb-1 text-muted">${line}</p>`;
            } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                // Bullet points
                formattedHtml += `<li class="mb-1">${line.substring(1).trim()}</li>`;
            } else {
                // Regular text
                formattedHtml += `<p class="mb-2">${line}</p>`;
            }
        }

        return `<div class="cv-formatted">${formattedHtml}</div>`;
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/service-worker.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful');
                }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

    // CV URL analysis - sprawdź czy element istnieje
    const analyzeUrlBtn = document.getElementById('analyze-url-btn');
    if (analyzeUrlBtn) {
        analyzeUrlBtn.addEventListener('click', async function() {
            const jobUrl = document.getElementById('job-url').value;
            const jobDescription = document.getElementById('job-description').value;

            // Basic validation: check if jobUrl is not empty
            if (!jobUrl) {
                showError('Please enter a Job URL to analyze.');
                return;
            }

            // Disable the button and show a loading message
            analyzeUrlBtn.disabled = true;
            analyzeUrlBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';

            try {
                const response = await fetch('/analyze-url', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ job_url: jobUrl })
                });

                const data = await response.json();

                if (data.success) {
                    // Update the job description field with the scraped content
                    document.getElementById('job-description').value = data.job_description;
                    showStatus('Job description from URL successfully analyzed.', 'success');
                } else {
                    showError(data.message || 'Failed to analyze URL.');
                }
            } catch (error) {
                console.error('Error:', error);
                showError('An unexpected error occurred. Please try again.');
            } finally {
                // Re-enable the button and reset the text
                analyzeUrlBtn.disabled = false;
                analyzeUrlBtn.innerHTML = '<i class="fas fa-link me-1"></i> Analyze URL';
            }
        });
    }

    // Analyze job posting button
    const analyzeJobBtn = document.getElementById('analyze-job-btn');
    if (analyzeJobBtn) {
        analyzeJobBtn.addEventListener('click', async function() {
            const jobDescription = document.getElementById('job-description').value;

            if (!jobDescription.trim()) {
                alert('Wprowadź opis stanowiska do analizy');
                return;
            }

            try {
                const response = await fetch('/analyze-job-posting', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        job_description: jobDescription,
                        language: 'pl'
                    })
                });

                const result = await response.json();

                if (result.success) {
                    console.log('Job analysis result:', result.analysis);
                    // Display analysis results
                    displayJobAnalysis(result.analysis);
                } else {
                    alert('Błąd analizy: ' + result.message);
                }
            } catch (error) {
                console.error('Error analyzing job:', error);
                alert('Wystąpił błąd podczas analizy stanowiska');
            }
        });
    }

    // CV processing form
    const processForm = document.getElementById('process-form');
});