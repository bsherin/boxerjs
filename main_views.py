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
from communication_utils import read_project_dict, make_jsonizable_and_compress

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
    world_name = json.loads(request.data)["world_name"]
    save_dict = db[current_user.project_collection_name].find_one({"project_name": world_name})
    project_dict = read_project_dict(fs, save_dict["file_id"])
    return jsonify({"success": True, "project_dict": project_dict})


@app.route('/get_project_names', methods=["POST", "GET"])
def get_project_names():
    return jsonify({"project_names": current_user.project_names})


def create_initial_metadata():
    mdata = {"datetime": datetime.datetime.utcnow(),
             "updated": datetime.datetime.utcnow(),
             "tags": "",
             "notes": ""}
    return mdata


@app.route('/save_new_project', methods=["POST", "GET"])
def save_new_project():
    try:
        project_dict = json.loads(request.data)
        project_name = project_dict["project_name"]
        mdata = create_initial_metadata()
        save_dict = {"metadata": mdata,
                     "project_name": project_name}
        pdict = make_jsonizable_and_compress(project_dict)
        save_dict["file_id"] = fs.put(pdict)
        db[current_user.project_collection_name].insert_one(save_dict)
        return_data = {"project_name": project_dict["project_name"],
                       "success": True,
                       "message": "Project Successfully Saved"}
    except Exception as ex:
        print("got an error in save_new_project")
        return_data = {"success": False}

    return jsonify(return_data)


@app.route('/update_project', methods=["POST", "GET"])
def update_project():
    try:
        project_dict = json.loads(request.data)
        world_name = project_dict["project_name"]
        save_dict = db[current_user.project_collection_name].find_one({"project_name": world_name})
        mdata = save_dict["metadata"]
        mdata["updated"] = datetime.datetime.utcnow()
        pdict = make_jsonizable_and_compress(project_dict)
        new_file_id = fs.put(pdict)
        fs.delete(save_dict["file_id"])
        save_dict["metadata"] = mdata
        save_dict["file_id"] = new_file_id
        db[current_user.project_collection_name].update_one({"project_name": world_name},
                                                            {'$set': save_dict})
        return_data = {"project_name": world_name,
                       "success": True,
                       "message": "Project Successfully Saved"}
    except Exception as ex:
        print("got an error in save_new_project")
        return_data = {"success": False, "message": "Failed save"}

    return jsonify(return_data)
