from flask import Flask, render_template, request
import pickle
import numpy as np
from keras.models import load_model
import json

app = Flask(__name__)

def clean_up_sentence(sentence):
    # tokenize the pattern
    sentence_words = sentence.split()
    return sentence_words

# return bag of words array: 0 or 1 for each word in the bag that exists in the sentence
def bow(sentence, texts, show_details=True):
    # tokenize the pattern
    sentence_words = clean_up_sentence(sentence)
    # bag of words - matrix of N words, vocabulary matrix
    bag = [0]*len(texts)  
    for s in sentence_words:
        for i,w in enumerate(texts):
            if w == s: 
                bag[i] = 1
                if show_details:
                    print ("found in bag: %s" % w)

    return(np.array(bag))

def predict_class(sentence, model, texts, classes):
    # filter out predictions below a threshold
    p = bow(sentence, texts, show_details=False)
    res = model.predict(np.array([p]))[0]
    ERROR_THRESHOLD = 0.25
    results = [[i,r] for i,r in enumerate(res) if r>ERROR_THRESHOLD]
    # sort by strength of probability
    results.sort(key=lambda x: x[1], reverse=True)
    return_list = []
    for r in results:
        return_list.append({"intent": classes[r[0]], "probability": str(r[1])})
    return return_list

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_bot_response', methods=['POST'])
def get_bot_response():
    message = request.form['message']
    model = load_model('model.h5')
    texts = pickle.load(open('texts.pkl','rb'))
    classes = pickle.load(open('classes.pkl','rb'))
    intents_json = json.load(open('intents.json'))
    response = get_bot_response_from_model(message, model, texts, classes, intents_json)
    return response

def get_bot_response_from_model(message, model, texts, classes, intents_json):
    ints = predict_class(message, model, texts, classes)
    for intent in intents_json['intents']:
        if intent['tag'] == ints[0]['intent']:
            result = np.random.choice(intent['responses'])
            break
    return result

if __name__ == "__main__":
    app.run()
