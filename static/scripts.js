document.getElementById("userInput").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        getResponse();
    }
});

function getResponse() {
    var userMessage = document.getElementById("userInput").value;
    if (userMessage.trim() === "") return;

    var chatbox = document.getElementById("chatbox");
    chatbox.innerHTML += `
        <div class="message user">
            <div class="text">${userMessage}</div>
            <img src="/static/user_image.png" alt="User">
        </div>
    `;
    chatbox.scrollTop = chatbox.scrollHeight;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/get_bot_response", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = xhr.responseText;
            chatbox.innerHTML += `
                <div class="message bot">
                    <img src="/static/ai_bot_image.png" alt="Bot">
                    <div class="text">${response}</div>
                </div>
            `;
            chatbox.scrollTop = chatbox.scrollHeight;
        }
    };
    xhr.send("message=" + encodeURIComponent(userMessage));
    document.getElementById("userInput").value = "";
}
