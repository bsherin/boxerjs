import requests
import sys
import time
import os
import json
import types
from bson import Binary
import base64
import pickle
import cloudpickle
import zlib
from exception_mixin import generic_exception_handler


from flask_socketio import SocketIO


def is_jsonizable(dat):
    try:
        _ = json.dumps(dat)
        return True
    except:
        return False


def make_jsonizable_and_compress(dat):
    return zlib.compress(make_python_object_jsonizable(dat, output_string=False))


def make_python_object_jsonizable(dat, output_string=True):
    if isinstance(dat, types.FunctionType):  # handle functions specially
        dat.__module__ = "__main__"  # without this, cloudpickle only generates a reference to the function
        jdat = base64.b64encode(cloudpickle.dumps(dat))
    else:
        try:
            jdat = base64.b64encode(pickle.dumps(dat, protocol=2))
        except:
            jdat = base64.b64encode(cloudpickle.dumps(dat))
    if output_string and not isinstance(jdat, str):
        jdat = jdat.decode("utf-8")
    return jdat


def debinarize_python_object(bdat):
    if isinstance(bdat, Binary):
        dat = bdat.decode()
    else:
        dat = base64.b64decode(bdat)
    return pickle.loads(dat)


def read_project_dict(fs, file_id):
    binarized_python_object = zlib.decompress(fs.get(file_id).read())
    project_dict = debinarize_python_object(binarized_python_object)
    return project_dict
