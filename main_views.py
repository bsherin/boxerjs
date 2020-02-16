import io
import datetime
import sys
import json
import copy
import requests

from flask import request, jsonify, render_template, send_file, url_for
from flask_login import current_user, login_required
from flask_socketio import join_room
from boxer_app import app, db, fs, socketio, csrf
from users import load_user
import boxer_app

import datetime
tstring = datetime.datetime.utcnow().strftime("%Y-%H-%M-%S")

from js_source_management import _develop


# The main window should join a room associated with the user
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

    print("user joined room " + room)


@socketio.on('join-main', namespace='/main')
def on_join_main(data):
    room = data["room"]
    join_room(room)
    print("user joined room " + room)
    socketio.emit("joined-mainid", room=room)
    tile_types = boxer_app.host_worker.get_tile_types({"user_id": data["user_id"]})
    return tile_types


@app.route("/get_data", methods=['get', 'post'])
def get_data():
    return jsonify({"success": True, "data": dstruct})

