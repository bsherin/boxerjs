
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


dstruct = {"name": "world",
           "kind": "databox",
           "line_list": [{"kind": "line",
                          "node_list": [{"name": "mybox",
                                         "kind": "databox",
                                         "line_list": [{"kind": "line",
                                                        "node_list": [{"name": "mb2",
                                                                       "kind": "text",
                                                                       "the_text": "some simple text"}]},
                                                       {"kind": "line",
                                                        "node_list": [{"name": "mb3",
                                                                       "kind": "text",
                                                                       "the_text": "with newline"},
                                                                      {"name": "innerbox",
                                                                       "kind": "databox",
                                                                       "line_list": [{"kind": "line",
                                                                                      "node_list": [{"kind": "text",
                                                                                                     "the_text": "some inner text with a newline"}]}
                                                                                     ]},
                                                                      {"kind": "text",
                                                                       "the_text": "more text"}]}]},
                                        {"name": "mybox2",
                                         "kind": "databox",
                                         "line_list": [{"kind": "line",
                                                        "node_list": [{"kind": "text",
                                                                       "the_text": "more simple text"}]}]}
                                        ]
                          }
                         ]
           }


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
