from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import sqlite3
from werkzeug.utils import secure_filename
import logging

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

logging.basicConfig(filename='app.log', level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

dbPath = '/app/db/database.db'

def init_db():
    try:
        conn = sqlite3.connect(dbPath)
        c = conn.cursor()
        # Updated table schema to include 'part'
        c.execute('''CREATE TABLE IF NOT EXISTS bookmarks 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                      filename TEXT, 
                      bookmark_name TEXT, 
                      timestamp REAL, 
                      part INTEGER)''')  # Added part column
        conn.commit()
    except sqlite3.Error as e:
        logger.error(f"Database initialization failed: {str(e)}")
    finally:
        conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        if 'files[]' not in request.files:
            logger.error("No files part in request")
            return jsonify({'error': 'No files part'}), 400
        files = request.files.getlist('files[]')
        for file in files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return jsonify({'message': 'Files uploaded successfully'}), 200
    except Exception as e:
        logger.error(f"Error uploading files: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500

@app.route('/view')
def view_files():
    try:
        files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith(('.mp3', '.wav'))]
        return render_template('view_files.html', files=files)
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        return jsonify({'error': 'Failed to load files'}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        logger.error(f"Error serving file {filename}: {str(e)}")
        return jsonify({'error': 'File not found'}), 404

@app.route('/bookmarks/<filename>', methods=['GET', 'POST', 'DELETE'])
def manage_bookmarks(filename):
    conn = sqlite3.connect(dbPath)
    c = conn.cursor()
    
    try:
        if request.method == 'POST':
            data = request.json
            if not data or 'name' not in data or 'time' not in data or 'part' not in data:
                logger.error(f"Invalid bookmark data for {filename}: {data}")
                return jsonify({'error': 'Invalid data'}), 400
            # Updated to include part in the insert
            c.execute("INSERT INTO bookmarks (filename, bookmark_name, timestamp, part) VALUES (?, ?, ?, ?)",
                     (filename, data['name'], data['time'], data['part']))
            conn.commit()
            return jsonify({'message': 'Bookmark added', 'id': c.lastrowid}), 200
        
        elif request.method == 'DELETE':
            data = request.json
            if data and 'id' in data:
                c.execute("DELETE FROM bookmarks WHERE id = ? AND filename = ?", (data['id'], filename))
                if c.rowcount == 0:
                    return jsonify({'error': 'Bookmark not found'}), 404
            else:
                c.execute("DELETE FROM bookmarks WHERE filename = ?", (filename,))
            conn.commit()
            return jsonify({'message': 'Bookmark(s) deleted'}), 200
        
        # Updated to select part as well
        c.execute("SELECT id, bookmark_name, timestamp, part FROM bookmarks WHERE filename = ?", (filename,))
        bookmarks = c.fetchall()
        return jsonify([{'id': b[0], 'name': b[1], 'time': b[2], 'part': b[3]} for b in bookmarks])
    
    except sqlite3.Error as e:
        logger.error(f"Database error for {filename}: {str(e)}")
        return jsonify({'error': 'Database error'}), 500
    except Exception as e:
        logger.error(f"Unexpected error managing bookmarks for {filename}: {str(e)}")
        return jsonify({'error': 'Server error'}), 500
    finally:
        conn.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
