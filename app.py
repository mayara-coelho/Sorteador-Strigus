from flask import Flask, render_template, request, jsonify
import pandas as pd
import os
import random
import redis

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configuração do Redis
redis_client = redis.StrictRedis(host='172.17.0.2', port=6379, db=0, decode_responses=True)

# Verifica se o diretório de upload existe, caso contrário, cria-o
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)

        if file.filename.endswith('.csv'):
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)

        columns = df.columns.tolist()
        return jsonify({'columns': columns, 'filename': file.filename})
    return jsonify({'error': 'File not supported'}), 400

@app.route('/draw', methods=['POST'])
def draw():
    data = request.json
    filename = data.get('filename')
    column = data.get('column')
    quantity = data.get('quantity', 1)
    emotion = data.get('emotion', False)
    live = data.get('live', False)

    if not filename or not column:
        return jsonify({'error': 'Invalid data'}), 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if filename.endswith('.csv'):
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    participants = df[column].dropna().tolist()

    # Obter participantes garantidos do Redis
    guaranteed = redis_client.smembers('guaranteed')
    participants = list(set(participants) - guaranteed)

    selected = random.sample(participants, min(quantity, len(participants)))

    if live:
        # Simula os participantes que ainda não responderam
        participants_set = set(participants)
        selected_set = set(selected)
        unresponsive = list(participants_set - selected_set)
        return jsonify({'selected': selected, 'unresponsive': unresponsive, 'live': True})

    return jsonify({'selected': selected})

@app.route('/redraw', methods=['POST'])
def redraw():
    data = request.json
    filename = data.get('filename')
    column = data.get('column')
    quantity = data.get('quantity', 1)
    responses = data.get('responses', [])

    if not filename or not column:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        quantity = int(quantity)
    except ValueError:
        return jsonify({'error': 'Quantity must be an integer'}), 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if filename.endswith('.csv'):
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    participants = df[column].dropna().tolist()
    guaranteed = redis_client.smembers('guaranteed')
    unresponsive = set(participants) - set(responses) - guaranteed

    if len(unresponsive) < quantity:
        return jsonify({'error': 'Not enough unresponsive participants'}), 400

    selected = random.sample(unresponsive, quantity)
    return jsonify({'selected': selected})

@app.route('/update_responses', methods=['POST'])
def update_responses():
    data = request.json
    responses = data.get('responses', [])
    filename = data.get('filename')
    column = data.get('column')

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if filename.endswith('.csv'):
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)

    if column not in df.columns:
        return jsonify({'error': 'Column not found'}), 400

    participants = df[column].dropna().tolist()
    unresponsive = set(participants)

    for response in responses:
        if response in unresponsive:
            unresponsive.remove(response)

    return jsonify({'unresponsive': list(unresponsive)})

@app.route('/guarantee', methods=['POST'])
def guarantee():
    data = request.json
    responses = data.get('responses', [])

    for response in responses:
        redis_client.sadd('guaranteed', response)

    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
