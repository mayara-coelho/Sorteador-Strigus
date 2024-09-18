document.addEventListener('DOMContentLoaded', function() {
    let countdownInterval = null;
    let liveTimers = {};
    let responseStatus = {};
    let redrawButton = null;

    function matchHeights() {
        const optionsContainer = document.getElementById('options-container');
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.style.height = `${optionsContainer.offsetHeight}px`;
    }
    
    window.onload = matchHeights;
    window.onresize = matchHeights;

    function handleFileUpload(event) {
        event.preventDefault();

        const fileInput = document.getElementById('fileInput');
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        sendUploadRequest(formData);
    }

    function sendUploadRequest(formData) {
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => handleUploadResponse(data))
        .catch(error => console.error('Error:', error));
    }

    function handleUploadResponse(data) {
        if(data.error) {
            alert(data.error);
        } else {
            createColumnsOptions(data.columns);
        }
    }

    function createColumnsOptions(columns) {
        const columnSelect = document.getElementById('columnSelect');
        columnSelect.innerHTML = '';

        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            columnSelect.appendChild(option);
        });
    }
        
    function handleVisibility() {
        const liveOptions = document.getElementById('liveOptions');
        const guaranteedSection = document.getElementById('guaranteedSection');
        const isLiveModeChecked = document.getElementById('liveMode').checked;
        if (isLiveModeChecked) {
            liveOptions.classList.remove('hidden');
        } else {
            liveOptions.classList.add('hidden');
            guaranteedSection.classList.add('hidden');
        }
    }

    function handleDraw() {
        resetPreviousDraw();
        const data = getDrawRequestData();
        sendDrawRequest(data);
    }

    function resetPreviousDraw() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        Object.values(liveTimers).forEach(timer => clearInterval(timer.interval));
        liveTimers = {};
        document.getElementById('resultsList').innerHTML = '';
        document.getElementById('guaranteedList').innerHTML = '';
        
        if (redrawButton) {
            redrawButton.remove();
            redrawButton = null;
        }
    }
        
    function getDrawRequestData() {
        const column = document.getElementById('columnSelect').value;
        const quantity = document.getElementById('quantityInput').value;
        const emotion = document.getElementById('withEmotion').checked;
        const live = document.getElementById('liveMode').checked;
        const liveTime = document.getElementById('responseTime').value;

        return {
            filename: document.getElementById('fileInput').files[0].name,
            column: column,
            quantity: parseInt(quantity),
            emotion: emotion,
            live: live,
            liveTime: liveTime
        };
    }
        
    function sendDrawRequest(data) {
        fetch('/draw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(responseData => {
            processDrawResponse(responseData, data.emotion, data.liveTime);
        })
        .catch(error => console.error('Error:', error));
    }

    function processDrawResponse(data, emotion, liveTime) {
        if (data.error) {
            alert(data.error);
        } else {
            handleResultsDisplay(data.selected, emotion, data.live, liveTime);
        }
    }

    function handleResultsDisplay(selected, emotion, live, liveTime) {
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.classList.remove('hidden');
        const timeoutMessage = document.getElementById('time-out-message')
        timeoutMessage.classList.add('hidden');
        const countdownElement = document.getElementById('countdown');
        
        
        if (emotion) {
            startCountdown(2, countdownElement, selected, live, liveTime);
        } else {
            displayResults(selected, live, liveTime);
        }
    }

    function startCountdown(time, countdownElement, selected, live, liveTime) {
        const drawButton = document.getElementById('drawButton');
        drawButton.disabled = true; 
        drawButton.classList.add('disabled-button');

        countdownElement.classList.remove('hidden');
    
        if (document.getElementById('withEmotion').checked) {
            document.getElementById('wrap').classList.remove('hidden');
        }

        if (document.getElementById('withEmotion').checked && document.getElementById('liveMode').checked) {
            guaranteedSection.classList.add('hidden');
        }

        let i = 9;
    
        function countdown() {
            if (i < 0) {
                countdownElement.classList.add('hidden');
                document.getElementById('wrap').classList.add('hidden');
                setTimeout(function() {
                    displayResults(selected, live, liveTime);
                    if (document.getElementById('liveMode').checked) {
                        guaranteedSection.classList.remove('hidden');
                    }

                    drawButton.disabled = false;
                    drawButton.classList.remove('disabled-button');
                }, 1000);
                return;
            }
    
            $('#wrap').removeAttr('class');
            setTimeout(function() {
                $('#wrap').addClass('wrap-' + i);
                setTimeout(function() {
                    i--;
                    countdown();
                }, 1000);
            }, 600);
        }
    
        countdown();
    }
    
    

    function displayResults(selectedNames, live, liveTime) {
        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = '';

        selectedNames.forEach(name => {
            const listItem = document.createElement('li');
            listItem.textContent = name;
            if (live) {
                addLiveModeFeatures(resultsList, listItem, name, liveTime);
            }
            resultsList.appendChild(listItem);
        });

        updateSectionVisibility(live);
    }

    function updateSectionVisibility() {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.classList.remove('hidden');
    }

    function addLiveModeFeatures(resultsList, listItem, name, liveTime) {
        const responseButton = createResponseButton(name);
        const timerSpan = document.createElement('span');
        const firstItem = resultsList.firstElementChild;
        timerSpan.classList.add('hidden');
        if(firstItem) {
            timerSpan.classList.remove('hidden');
        }

        timerSpan.className = 'response-timer';
        
        listItem.appendChild(timerSpan);
        listItem.appendChild(responseButton);
        
        
        startLiveTimer(timerSpan, responseButton, liveTime, name);
    }

    function createResponseButton(name) {
        const responseButton = document.createElement('button');
        responseButton.id = `responseButton-${name}`;
        responseButton.textContent = 'SORTEADO RESPONDEU';
        responseStatus[name] = false;
        const guaranteedSection = document.getElementById('guaranteedSection');

        responseButton.addEventListener('click', function() {
            handleResponse(name, responseButton);
            guaranteedSection.classList.remove('hidden');
        });

        return responseButton;
    }

    function startLiveTimer(timerSpan, responseButton, liveTime, name) {
        const container = document.createElement('div');
        container.id = `progress-container-${name}`;
        timerSpan.appendChild(container);
        
        let timeLeft = Number(liveTime) * 60;
        const totalTime = timeLeft;
    
        const bar = new ProgressBar.Circle(container, {
            color: '#aaa',
            strokeWidth: 4,
            trailWidth: 1,
            easing: 'easeInOut',
            duration: 1000,
            text: {
                autoStyleContainer: false
            },
            from: { color: '#aaa', width: 1 },
            to: { color: '#333', width: 4 },
            step: function (state, circle) {
                circle.path.setAttribute('stroke', state.color);
                circle.path.setAttribute('stroke-width', state.width);
    
                let minutes = Math.floor(timeLeft / 60);
                let seconds = timeLeft % 60;
                let timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
                circle.setText(timeFormatted);
            }
        });
    
        bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
        bar.text.style.fontSize = '1.5rem';
        
        const timer = setInterval(() => {
            timeLeft--;
            bar.animate(timeLeft / totalTime);

            if (timeLeft <= 0) {
                clearInterval(timer);
                handleTimeout(name, responseButton, timerSpan);
            }
        }, 1000);

        liveTimers[name] = { interval: timer, button: responseButton, container };
    }

    function handleResponse(name) {
        clearInterval(liveTimers[name].interval);
        liveTimers[name].button.disabled = true;
        const container = document.getElementById(`progress-container-${name}`);
        const responseButton = document.getElementById(`responseButton-${name}`);
        if (container) {
            container.remove();
            responseButton.remove()
        }
        moveToGuaranteed(name);
    }

    function handleTimeout(name, responseButton) {
        responseButton.disabled = true;
        const container = document.getElementById(`progress-container-${name}`);
        if (container) {
            container.remove();
        }
        responseButton.remove();
        const timeoutMessage = document.getElementById('time-out-message');
        timeoutMessage.classList.remove('hidden');
        maybeAddRedrawButton(timeoutMessage);
    }

    function maybeAddRedrawButton(timeoutMessage) {
        if (!redrawButton) {
            const resultsSection = document.getElementById('resultsSection');
            redrawButton = document.createElement('button');
            redrawButton.textContent = 'SORTEAR NOVAMENTE';
            redrawButton.classList.add('options-button');
            redrawButton.addEventListener('click', function () {
                reDrawUnanswered();
                redrawButton.remove();
                redrawButton = null;
                timeoutMessage.classList.add('hidden');
            });
            resultsSection.appendChild(redrawButton);
        }
    }

    function moveToGuaranteed(name) {
        const resultsList = document.getElementById('resultsList');
        const guaranteedList = document.getElementById('guaranteedList');
        const item = Array.from(resultsList.children).find(li => li.textContent.includes(name));
        if (item) {
            resultsList.removeChild(item);
            guaranteedList.appendChild(item);
        }
    }

    function reDrawUnanswered() {
        const column = getColumnSelection();
        const quantity = getQuantityInput();
        const liveTime = getResponseTime();
    
        const responses = getUnansweredResponses();
        const guaranteedNames = getGuaranteedNames();
        const quantityToRedraw = calculateQuantityToRedraw(quantity, guaranteedNames.length);
    
        const requestData = prepareRedrawRequestData(responses, quantityToRedraw, column);
    
        sendRedrawRequest(requestData, liveTime);
    }
    
    function getColumnSelection() {
        return document.getElementById('columnSelect').value;
    }
    
    function getQuantityInput() {
        return document.getElementById('quantityInput').value;
    }
    
    function getResponseTime() {
        return document.getElementById('responseTime').value;
    }
    
    function getUnansweredResponses() {
        const responseStatus = {};
        return Object.keys(responseStatus).filter(name => !responseStatus[name]);
    }
    
    function getGuaranteedNames() {
        const guaranteedList = document.getElementById('guaranteedList');
        return Array.from(guaranteedList.children).map(li => li.textContent);
    }
    
    function calculateQuantityToRedraw(totalQuantity, guaranteedCount) {
        return Math.max(0, parseInt(totalQuantity) - guaranteedCount);
    }
    
    function prepareRedrawRequestData(responsesFiltered, quantityToRedraw, column) {
        const filename = document.getElementById('fileInput').files[0].name;
        return {
            filename: filename,
            column: column,
            quantity: quantityToRedraw,
            responses: responsesFiltered
        };
    }
    
    function sendRedrawRequest(requestData, liveTime) {
        fetch('/redraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Server responded with error: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                displayResults(data.selected, true, liveTime);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    document.getElementById('uploadForm').addEventListener('submit', handleFileUpload);
    document.getElementById('liveMode').addEventListener('change', handleVisibility);
    document.getElementById('drawButton').addEventListener('click', handleDraw);
});
