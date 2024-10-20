from flask import Flask, render_template, request, redirect, url_for, flash, session,jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from keras.models import load_model
import pickle
import numpy as np
import json
from config import MySQL_conn

app = Flask(__name__) 
app.secret_key = "docker"

login_manager = LoginManager()
login_manager.init_app(app)

class User:
    def __init__(self, user_id, username, is_active=True):
        self.id = user_id
        self.username = username
        self.is_active = is_active

    def is_authenticated(self):
        return True 

    def is_active(self):
        return self.is_active

    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self.id)


def get_mysql_connection():
    try:
        conn = mysql.connector.connect(**MySQL_conn)
        return conn
    except mysql.connector.Error as err:
        print("Error connecting to MySQL:", err)
        return None

def clean_up_sentence(sentence):
    sentence_words = sentence.split()
    return sentence_words

def bow(sentence, texts, show_details=True):
    sentence_words = clean_up_sentence(sentence)
    bag = [0] * len(texts)  
    for s in sentence_words:
        for i, w in enumerate(texts):
            if w == s: 
                bag[i] = 1
                if show_details:
                    print("found in bag: %s" % w)
    return np.array(bag)

def predict_class(sentence, model, texts, classes):
    p = bow(sentence, texts, show_details=False)
    res = model.predict(np.array([p]))[0]
    ERROR_THRESHOLD = 0.25
    results = [[i, r] for i, r in enumerate(res) if r > ERROR_THRESHOLD]
    results.sort(key=lambda x: x[1], reverse=True)
    return_list = []
    for r in results:
        return_list.append({"intent": classes[r[0]], "probability": str(r[1])})
    return return_list

def preprocess_message(message, words):
    # Tokenization or other preprocessing can be done here
    message = message.lower()
    # Create an array of zeros with the length of the words list
    input_data = np.zeros(len(words), dtype=int)

    # If the message contains a word from the words list, mark it in the input data
    for word in message.split():
        if word in words:
            input_data[words.index(word)] = 1
    return input_data

#def get_bot_response_from_model(message, model, texts, classes, intents_json):
#    ints = predict_class(message, model, texts, classes)
#    for intent in intents_json['intents']:
#        if intent['tag'] == ints[0]['intent']:
#            result = np.random.choice(intent['responses'])
#            break
#    return result

def get_response_and_prompts(user_message, model, words, classes, intents_json):
    # Preprocess the user's message
    input_data = preprocess_message(user_message, words)
    
    # Get predictions from the trained model
    predictions = model.predict(np.array([input_data]))[0]
    ERROR_THRESHOLD = 0.6
    results = [[i, prob] for i, prob in enumerate(predictions) if prob > ERROR_THRESHOLD]
    
    # Sort by probability in descending order
    results.sort(key=lambda x: x[1], reverse=True)
    
    if results:
        # Select the most probable intent
        predicted_class = classes[results[0][0]]
        
        # Retrieve the corresponding intent from intents.json
        for intent in intents_json['intents']:
            if intent['tag'] == predicted_class:
                # Get a random response from the list of responses
                bot_response = np.random.choice(intent['responses'])
                
                # Use all responses as potential suggestions/prompts
                prompt_options = intent['patterns'] if len(intent['patterns']) > 1 else []
                return bot_response, prompt_options
    
    # Default response if no intent is matched
    return "I'm sorry, I didn't quite understand that. Could you please rephrase?", []


@login_manager.user_loader
def load_user(user_id):
    conn = get_mysql_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))
    user = cursor.fetchone()

    if user:
        return User(user['id'], user['username'])

    return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
        user = cursor.fetchone()

        if user and check_password_hash(user['password'], password):
            user_obj = User(user['id'], user['username'])
            login_user(user_obj)
            flash('You have been logged in successfully!', 'success')
            session['login_successful'] = True
            return redirect(url_for('chat'))
        else:
            flash('Invalid username or password. Please try again.', 'warning')

    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = get_mysql_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
        existing_user = cursor.fetchone()

        if existing_user:
            flash('Username already exists. Please choose a different username.', 'warning')
        else:
            hashed_password = generate_password_hash(password)
            cursor.execute('INSERT INTO users (username, password) VALUES (%s, %s)', (username, hashed_password))
            conn.commit()
            flash('You have been registered successfully! Please log in.', 'success')
            return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/chat')
@login_required
def chat():
    return render_template('chat.html', username=current_user.username)

#@app.route('/get_bot_response', methods=['POST'])
#@login_required
#def get_bot_response():
#    message = request.form['message']
#    model = load_model('model.h5')
#    texts = pickle.load(open('texts.pkl', 'rb'))
#    classes = pickle.load(open('classes.pkl', 'rb'))
#    intents_json = json.load(open('intents.json'))
#    response = get_bot_response_from_model(message, model, texts, classes, intents_json)
#    return response

@app.route('/get_bot_response', methods=['POST'])
@login_required
def get_bot_response():
    user_message = request.form['message']
    print(f"Received message: {user_message}")
    
    # Load necessary data
    model = load_model('model.h5')
    words = pickle.load(open('texts.pkl', 'rb'))
    classes = pickle.load(open('classes.pkl', 'rb'))
    with open('intents.json') as json_file:
        intents = json.load(json_file)
    
    # Get the bot's response and suggestions (using responses as prompts)
    bot_response, prompt_options = get_response_and_prompts(user_message, model, words, classes, intents)
    
    print(f"Bot response: {bot_response}, Suggestions: {prompt_options}")
    
    return jsonify(response=bot_response, prompts=prompt_options)



@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user() 
    return redirect(url_for('index'))

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8080) 
