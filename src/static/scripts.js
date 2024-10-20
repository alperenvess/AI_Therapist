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
    
    
    setTimeout(function() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 100); 
}

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
                    
                    if (data.prompts && data.prompts.length > 0) {
                        $('#messages').append('<div class="bot-options"><strong>Suggestions:</strong></div>');
                        data.prompts.forEach(function(option) {
                            var button = $('<button class="option-button">' + option + '</button>');
                            button.on('click', function() {
                                messageInput.value = option;
                            });
                            $('#messages').append(button);
                        });

                        setTimeout(function() {
                            var chatContainer = document.getElementById('messages');
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }, 100);
                    }
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
document.getElementById('chat-form').addEventListener('submit', handleFormSubmission);
