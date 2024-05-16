import json
import pickle
import numpy as np

from keras.models import Sequential
from keras.layers import Dense, Activation, Dropout
from keras.optimizers import SGD
from keras.preprocessing.sequence import pad_sequences

texts=[]
classes = []
documents = []
ignore_texts = ['?', '!']
data_file = open('intents.json').read()
intents = json.loads(data_file)

for intent in intents['intents']:
    for pattern in intent['patterns']:
        # tokenize each word
        w = pattern.split()
        texts.extend(w)
        # add documents in the corpus
        documents.append((w, intent['tag']))
        # add to classes list
        if intent['tag'] not in classes:
            classes.append(intent['tag'])

# lemmatize and lower each word and remove duplicates
texts = [word.lower() for word in texts if word not in ignore_texts]
texts = sorted(list(set(texts)))
# sort classes
classes = sorted(list(set(classes)))
# documents = combination between patterns and intents
print(len(documents), "documents")
# classes = intents
print(len(classes), "classes", classes)
# texts = all words, vocabulary
print(len(texts), "unique lemmatized words", texts)

pickle.dump(texts, open('texts.pkl', 'wb'))
pickle.dump(classes, open('classes.pkl', 'wb'))

# create our training data
training = []
# create an empty array for our output
output_empty = [0] * len(classes)
# training set, bag of words for each sentence
for doc in documents:
    # initialize our bag of words
    bag = []
    # list of tokenized words for the pattern
    pattern_texts = doc[0]
    # lemmatize each word - create base word, in attempt to represent related words
    pattern_texts = [word.lower() for word in pattern_texts]
    # create our bag of words array with 1, if word match found in current pattern
    for w in texts:
        bag.append(1) if w in pattern_texts else bag.append(0)

    # output is a '0' for each tag and '1' for current tag (for each pattern)
    output_row = list(output_empty)
    output_row[classes.index(doc[1])] = 1

    training.append([bag, output_row])
# shuffle our features and turn into np.array
np.random.shuffle(training)

# Split the data into input (X) and output (Y) variables
X = np.array([i[0] for i in training])
Y = np.array([i[1] for i in training])

# pad sequences to ensure uniform input size
X = pad_sequences(X)

print("Training data created")

# Create model - 3 layers. First layer 128 neurons, second layer 64 neurons and 3rd output layer contains number of neurons
# equal to number of intents to predict output intent with softmax
model = Sequential()
model.add(Dense(128, input_shape=(X.shape[1],), activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(64, activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(len(classes), activation='softmax'))

# Compile model. Stochastic gradient descent with Nesterov accelerated gradient gives good results for this model
sgd = SGD(learning_rate=0.01, decay=1e-6, momentum=0.9, nesterov=True)
model.compile(loss='categorical_crossentropy', optimizer=sgd, metrics=['accuracy'])

# fitting and saving the model
hist = model.fit(X, Y, epochs=200, batch_size=5, verbose=1)
model.save('model.h5', hist)

print("Model created and saved")
