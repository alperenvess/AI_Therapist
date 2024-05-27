/* chat_script.js */

// Function to add a new message to the chat container
function appendMessage(message, isUser) {
    var chatContainer = document.getElementById('messages');
    var messageDiv = document.createElement('div');
    var messageContainer = document.createElement('div');
    var messageText = document.createElement('div');
    var profileImage = document.createElement('img');

    profileImage.className = 'profile-image';

    if (isUser) {
        profileImage.src = "/static/user_image.png"; // Change 'user_image.png' to your user image filename
        profileImage.alt = "User";
        messageContainer.className = 'user-message';
    } else {
        profileImage.src = "/static/ai_bot_image.png"; // Change 'ai_bot_image.png' to your bot image filename
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
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Function to handle form submission
function handleFormSubmission(event) {
    event.preventDefault(); // Prevent default form submission

    var messageInput = document.getElementById('message-input');
    var message = messageInput.value.trim(); // Trim whitespace from the message

    if (message !== '') {
        // Add user's message to the chat container
        appendMessage(message, true);

        // Clear the message input field
        messageInput.value = '';

        // Send AJAX request to Flask backend to get bot response
        $.ajax({
            type: 'POST',
            url: '/get_bot_response',
            data: { message: message },
            success: function(response) {
                appendMessage(response, false); // Append bot's response to chat
            },
            error: function(xhr, status, error) {
                console.error(xhr.responseText);
            }
        });
    }
}

// Event listener for form submission
document.getElementById('chat-form').addEventListener('submit', handleFormSubmission);
