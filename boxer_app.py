
import datetime
from flask import Flask, jsonify, render_template
from flask_socketio import SocketIO, join_room
from flask_wtf import CSRFProtect
import pymongo
import sys
import subprocess
import re
import os


from pymongo import MongoClient
from pymongo.database import Database
import gridfs
from flask_login import LoginManager

tstring = datetime.datetime.utcnow().strftime("%Y-%H-%M-%S")
db_name = "boxerjs"
mongo_uri = "mongodb://localhost:27017/{}".format(db_name)


# The purpose of this function is that db.collection_names doesn't work in on Azure
def list_collections(self):
    dictlist = self.command("listCollections")["cursor"]["firstBatch"]
    return [d["name"] for d in dictlist]


Database.collection_names = list_collections

try:
    print("getting client")

    # Now the local server branch is what executes on the remote server
    print("getting mongo client")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=30000)
    print("got the client")
    client.server_info()
    print("did server info")
    # noinspection PyUnresolvedReferences
    db = client[db_name]
    fs = gridfs.GridFS(db)

    if ("ANYONE_CAN_REGISTER" in os.environ) and (os.environ.get("ANYONE_CAN_REGISTER") == "True"):
        ANYONE_CAN_REGISTER = True
    else:
        ANYONE_CAN_REGISTER = False

    login_manager = LoginManager()
    login_manager.session_protection = 'basic'
    login_manager.login_view = 'login'

    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'secret!'
    socketio = SocketIO(app)
    csrf = CSRFProtect()
    csrf.init_app(app)
    login_manager.init_app(app)

except pymongo.errors.PyMongoError as err:
    print("There's a problem with the PyMongo database. ", err)
    sys.exit()


