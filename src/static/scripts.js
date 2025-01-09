// Function to show notifications
function showNotification(message, isError = false) {
    const notificationContainer = document.getElementById('notification-container');
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'notification' + (isError ? ' error' : '');
    notificationDiv.innerText = message;

    notificationContainer.appendChild(notificationDiv);
    notificationContainer.style.display = 'block'; // Show the notification container

    // Fade out and remove the notification after 3 seconds
    setTimeout(() => {
        notificationDiv.style.opacity = '0'; // Start fade out
        setTimeout(() => {
            notificationContainer.removeChild(notificationDiv);
            if (notificationContainer.children.length === 0) {
                notificationContainer.style.display = 'none'; // Hide if no notifications left
            }
        }, 500); // Match the duration with the CSS transition
    }, 3000); // Show for 3 seconds
}

// Function to add a new message to the chat container
function appendMessage(message, isUser) {
    var chatContainer = document.getElementById('messages'); 
    var messageDiv = document.createElement('div');
    var messageContainer = document.createElement('div');
    var messageText = document.createElement('div');
    var profileImage = document.createElement('img');

    profileImage.className = 'profile-image';

    if (isUser) {
        profileImage.src = "/static/user_image.png"; 
        profileImage.alt = "User";
        messageContainer.className = 'user-message';
    } else {
        profileImage.src = "/static/ai_bot_image.png"; 
        profileImage.alt = "Bot";
        messageContainer.className = 'bot-message';
    }

    messageText.className = 'message-text';
    messageText.innerText = message;

    messageContainer.appendChild(profileImage);
    messageContainer.appendChild(messageText);
    messageDiv.appendChild(messageContainer);
    messageDiv.className = 'message';

    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom only if the new message is not visible
    if (chatContainer.scrollHeight - chatContainer.clientHeight > chatContainer.scrollTop) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Function to handle form submission
function handleFormSubmission(event) {
    event.preventDefault(); 

    var messageInput = document.getElementById('message-input');
    var message = messageInput.value.trim(); 

    if (message !== '') {
        appendMessage(message, true);
        messageInput.value = '';
        
        $.ajax({
            type: 'POST',
            url: '/get_bot_response',
            data: { message: message },
            success: function(data) {
                console.log("Received response from bot:", data);
                
                if (data.response) {
                    appendMessage(data.response, false);
                } else {
                    console.error("No response from bot or invalid data");
                }
            },
            error: function(xhr, status, error) {
                console.error("Error during AJAX request:", xhr.responseText);
            }
        });
    }
}

// Function to fetch autocomplete suggestions
function fetchSuggestions(partialMessage) {
    $.ajax({
        type: 'POST',
        url: '/get_all_suggestions',
        contentType: 'application/json',
        data: JSON.stringify({ message: partialMessage }),
        success: function(data) {
            showSuggestions(data.suggestions);
        },
        error: function(xhr, status, error) {
            console.error("Error during AJAX request:", xhr.responseText);
        }
    });
}

// Function to show suggestions
function showSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('suggestions-container');
    suggestionsContainer.innerHTML = ''; // Clear previous suggestions

    if (suggestions.length === 0) {
        suggestionsContainer.style.display = 'none'; // Hide if no suggestions
        return;
    }

    suggestions.forEach((suggestion, index) => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion';
        suggestionDiv.innerText = suggestion;

        // Clicking on a suggestion sets the input to that suggestion
        suggestionDiv.onclick = function() {
            document.getElementById('message-input').value = suggestion; // Set input to suggestion
            suggestionsContainer.style.display = 'none'; // Hide suggestions after selection
            currentSuggestionIndex = -1; // Reset index
        };

        suggestionsContainer.appendChild(suggestionDiv);
    });

    suggestionsContainer.style.display = 'block'; // Show suggestions
}

// Event listener for message input to handle suggestions
const messageInput = document.getElementById('message-input');
messageInput.addEventListener('input', function() {
    const partialMessage = messageInput.value.trim();
    if (partialMessage.length > 0) {
        fetchSuggestions(partialMessage);
    } else {
        document.getElementById('suggestions-container').style.display = 'none'; // Hide suggestions if input is empty
    }
});

// Handle keydown events for autocomplete and suggestion navigation
let currentSuggestionIndex = -1;

messageInput.addEventListener('keydown', function(event) {
    const suggestions = document.querySelectorAll('.suggestion');

    if (event.key === 'ArrowDown') {
        currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestions.length - 1);
        updateSuggestionHighlight(suggestions);
        event.preventDefault(); // Prevent default scroll
    } else if (event.key === 'ArrowUp') {
        currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
        updateSuggestionHighlight(suggestions);
        event.preventDefault(); // Prevent default scroll
    } else if (event.key === 'Tab') {
        if (currentSuggestionIndex >= 0) {
            messageInput.value = suggestions[currentSuggestionIndex].innerText; // Set input to suggestion
            suggestionsContainer.style.display = 'none'; // Hide suggestions after selection
            currentSuggestionIndex = -1; // Reset index
            event.preventDefault(); // Prevent default tab behavior
        }
    } else if (event.key === 'Enter') {
        document.getElementById('chat-form').dispatchEvent(new Event('submit'));
        suggestionsContainer.style.display = 'none'; // Hide suggestions on enter
    } else {
        currentSuggestionIndex = -1; // Reset index on other key presses
    }
});

// Function to highlight current suggestion
function updateSuggestionHighlight(suggestions) {
    suggestions.forEach((suggestion, index) => {
        suggestion.classList.toggle('highlight', index === currentSuggestionIndex);
    });

    // Scroll into view if the highlighted suggestion is not fully visible
    if (currentSuggestionIndex >= 0 && currentSuggestionIndex < suggestions.length) {
        const suggestionContainer = document.getElementById('suggestions-container');
        const highlightedSuggestion = suggestions[currentSuggestionIndex];

        const offsetTop = highlightedSuggestion.offsetTop;
        const containerHeight = suggestionContainer.clientHeight;

        // Scroll into view if the highlighted suggestion is too far out of view
        if (offsetTop < suggestionContainer.scrollTop) {
            suggestionContainer.scrollTop = offsetTop; // Scroll up
        } else if (offsetTop + highlightedSuggestion.clientHeight > suggestionContainer.scrollTop + containerHeight) {
            suggestionContainer.scrollTop = offsetTop + highlightedSuggestion.clientHeight - containerHeight; // Scroll down
        }
    }
}

// Attach the event listener for the chat form
document.getElementById('chat-form').addEventListener('submit', handleFormSubmission);
