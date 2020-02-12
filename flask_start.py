
import datetime
from flask import Flask, jsonify, render_template
from flask_socketio import SocketIO, join_room
from flask_wtf import CSRFProtect

tstring = datetime.datetime.utcnow().strftime("%Y-%H-%M-%S")


app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)
csrf = CSRFProtect()
csrf.init_app(app)


@app.route('/')
def basic():
    return render_template("main_react.html",
                           version_string=tstring,
                           css_source="boxerjs_dev/main_app.css",
                           module_source="boxerjs_dev/main_app.bundle.js")


dstruct = {"name": "world", "content": [{"name": "mybox", "content": ["some simple text", "__ENDLINE___", "with newline", {"name": "innerbox", "content": ["some inner text\nwith a newline"]}, "more text"]},
                                         {"name": "mybox2", "content": ["more simple text\nwith another newling"]}]}


@app.route("/get_data", methods=['get', 'post'])
def get_data():
    return jsonify({"success": True, "data": dstruct})


@socketio.on('connect', namespace='/boxer')
def connected_msg():
    print("client connected")


@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    print('Client disconnected')


@socketio.on('join', namespace='/boxer')
def on_join(data):
    room = data["room"]
    join_room(room)


socketio.run(app)
