// ==UserScript==
// @name        YouTube Video Notes (Buttons at Top - ytp-chrome-top)
// @description Add screenshot and PDF generation buttons to YouTube videos for note-taking.
// @namespace   ViolentMonkeyScripts
// @match        *://*.youtube.com/*
// @match        *://m.youtube.com/*
// @match        *://youtu.be/*
// @grant       GM_addStyle
// @grant       GM_download
// @require     https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @run-at      document-idle
// ==/UserScript==

(function() {
    'use strict';

    let capturedImages = [];

    // Function to add buttons
    function addNoteButtons() {
        // Check if buttons already exist to prevent duplicates
        if (document.getElementById('screenshotButton') || document.getElementById('pdfButton')) {
            console.log('YouTube note buttons already present.');
            return;
        }

        // Target the ytp-chrome-top div
        const chromeTop = document.querySelector('.ytp-chrome-top');

        if (!chromeTop) {
            console.warn('ytp-chrome-top not found.  Falling back to html5-video-container, but this might not work well.');
            const videoContainer = document.querySelector('.html5-video-container');
            if (!videoContainer) {
                console.warn('html5-video-container also not found.  Buttons will not be added.');
                return;
            }
        }

        // Create a div for the buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'videoNoteButtons';
        GM_addStyle(`
            #videoNoteButtons {
                /* Adjust positioning to be within the ytp-chrome-top */
                display: inline-block;
                gap: 10px;
                /* Align buttons to the right */
                justify-content: flex-end;
                padding-right: 10px;
                padding-top: 5px; /* Add some top padding */
                padding-bottom: 5px; /* Add some bottom padding */
/*                 box-sizing: border-box; */
            }
            #videoNoteButtons button {
                background-color: rgb(192, 0, 0, 0.4);
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                margin: 3px;
                transition: background-color 0.2s ease-in-out;
            }
            #videoNoteButtons button:hover {
                background-color: #e00;
            }
        `);

        // Screenshot Button
        const screenshotButton = document.createElement('button');
        screenshotButton.id = 'screenshotButton';
        screenshotButton.textContent = 'Screenshot';
        screenshotButton.addEventListener('click', takeScreenshot);
        buttonContainer.appendChild(screenshotButton);

        // PDF Button
        const pdfButton = document.createElement('button');
        pdfButton.id = 'pdfButton';
        pdfButton.textContent = 'Generate PDF';
        pdfButton.addEventListener('click', generatePdf);
        buttonContainer.appendChild(pdfButton);

        // Insert the button container into ytp-chrome-top
        (chromeTop || videoContainer).appendChild(buttonContainer);
        console.log('YouTube note buttons added successfully to ytp-chrome-top.');
    }

    // Function to take a screenshot of the video frame
    function takeScreenshot() {
        const video = document.querySelector('video.html5-main-video');
        if (!video) {
            console.error('Video element not found for screenshot.');
            alert('Could not capture screenshot: Video element not found.');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataURL = canvas.toDataURL('image/png');
            capturedImages.push(dataURL);
            console.log(`Screenshot taken. Total images: ${capturedImages.length}`);
            alert(`Screenshot taken! Total: ${capturedImages.length}`);
        } catch (e) {
            console.error('Error taking screenshot:', e);
            alert('Error taking screenshot. Check console for details.');
        }
    }

    // Function to generate PDF from captured images
    async function generatePdf() {
        if (capturedImages.length === 0) {
            alert('No screenshots taken yet!');
            return;
        }

        // Ensure jsPDF is loaded
        if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
            console.error('jsPDF library not loaded or accessible. Check @require URL and network.');
            alert('Error: PDF library not loaded. Please ensure internet connection and refresh the page. Check browser console for network errors.');
            return;
        }

        const { jsPDF } = window.jspdf;

        // Get video dimensions for PDF page size
        const video = document.querySelector('video.html5-main-video');
        let pdfWidth, pdfHeight, doc;

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            console.error('Video element not found or has zero dimensions for PDF. Using default A4.');
            alert('Could not get video dimensions for PDF. Using default page size.');
            // Fallback to a common 16:9 resolution if video dimensions aren't available
            const defaultWidth = 1280; // 720p width
            const defaultHeight = 720; // 720p height
            pdfWidth = defaultWidth;
            pdfHeight = defaultHeight;
            doc = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [pdfWidth, pdfHeight]
            });

        } else {
            pdfWidth = video.videoWidth;
            pdfHeight = video.videoHeight;
            // Create a new jsPDF instance with video dimensions
            console.log(`Generating PDF with page size: ${pdfWidth}px x ${pdfHeight}px`);
            doc = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                unit: 'px', // Use pixels as unit
                format: [pdfWidth, pdfHeight] // Set page format to video dimensions
            });
        }


        for (let i = 0; i < capturedImages.length; i++) {
            const imgData = capturedImages[i];
            if (i > 0) {
                doc.addPage();
            }
            // Add image to the page, covering the whole page
            // Use doc.internal.pageSize to get current page dimensions, robust against format changes
            doc.addImage(imgData, 'PNG', 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());
        }

        const videoTitleElement = document.querySelector('h1.ytd-watch-metadata');
        let videoTitle = 'YouTube_Notes';
        if (videoTitleElement) {
            // Sanitize title for filename: replace non-alphanumeric with underscore, remove multiple underscores, trim leading/trailing underscores
            videoTitle = videoTitleElement.textContent.trim().replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
            if (videoTitle === '') videoTitle = 'YouTube_Notes'; // Fallback if sanitization results in empty string
        }

        try {
            doc.save(`${videoTitle}_notes.pdf`);
            // Clear captured images after generating PDF
            capturedImages = [];
            alert(`PDF "${videoTitle}_notes.pdf" generated successfully! All screenshots cleared.`);
        } catch (e) {
            console.error('Error saving PDF:', e);
            alert('Error generating or saving PDF. Check browser console for details.');
        }
    }

    // Observe changes in the DOM to add buttons when the video loads or changes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length || mutation.type === 'childList') {
                const chromeTop = document.querySelector('.ytp-chrome-top');
                if (chromeTop && !document.getElementById('screenshotButton')) {
                    // Give YouTube a moment to fully render after the target element appears
                    setTimeout(addNoteButtons, 500);
                }
            }
        });
    });

    // Start observing a parent element that is always present, like the main content area
    const pageManager = document.querySelector('ytd-app, body'); // Target a common top-level element
    if (pageManager) {
        observer.observe(pageManager, { childList: true, subtree: true });
        console.log('MutationObserver started for YouTube page.');
    } else {
        console.warn('Could not find ytd-app or body to observe.');
    }

    // Initial check in case the video is already loaded when the script runs
    setTimeout(() => {
        const chromeTop = document.querySelector('.ytp-chrome-top');
        if (chromeTop) {
            addNoteButtons();
        }
    }, 1000); // Wait 1 second before initial check

})();
