
import sys
import re
import os
import io
from collections import OrderedDict
from flask import jsonify, request, url_for, render_template, send_file
from flask_login import login_required, current_user
import boxer_app
from boxer_app import app, db, fs
from resource_manager import ResourceManager, LibraryResourceManager
from users import User
from communication_utils import make_jsonizable_and_compress, read_project_dict
repository_user = User.get_user_by_username("repository")

from js_source_management import js_source_dict, _develop, css_source

import datetime
tstring = datetime.datetime.utcnow().strftime("%Y-%H-%M-%S")


class ProjectManager(LibraryResourceManager):
    collection_list = "project_names"
    collection_list_with_metadata = "project_names_with_metadata"
    collection_name = "project_collection_name"
    name_field = "project_name"

    def add_rules(self):
        app.add_url_rule('/delete_project', "delete_project", login_required(self.delete_project),
                         methods=['post'])
        app.add_url_rule('/duplicate_project', "duplicate_project",
                         login_required(self.duplicate_project), methods=['get', 'post'])
        app.add_url_rule('/search_project_metadata', "search_project_metadata",
                         login_required(self.search_project_metadata), methods=['get', 'post'])

    def search_project_metadata(self):
        user_obj = current_user
        search_text = request.json['search_text']
        reg = re.compile(".*" + search_text + ".*", re.IGNORECASE)
        res = db[user_obj.project_collection_name].find({"$or": [{"project_name": reg}, {"metadata.notes": reg},
                                                        {"metadata.tags": reg}, {"metadata.loaded_tiles": reg},
                                                        {"metadata.collection_name": reg}]})
        res_list = []
        for t in res:
            res_list.append(t["project_name"])
        return jsonify({"success": True, "match_list": res_list})

    def duplicate_project(self):
        user_obj = current_user
        project_to_copy = request.json['res_to_copy']
        new_project_name = request.json['new_res_name']
        save_dict = db[user_obj.project_collection_name].find_one({"project_name": project_to_copy})
        mdata = save_dict["metadata"]
        new_save_dict = {"metadata": mdata,
                         "project_name": new_project_name}

        # uncompressing and compressing below is necessary because we need to change the project_name inside
        # the project dict. so, essentially, the project_name is stored in two places which is non-optimal
        # tactic_todo fix project_name being stored in two places in project saves
        project_dict = read_project_dict(fs, mdata, save_dict["file_id"])
        project_dict["project_name"] = new_project_name
        pdict = make_jsonizable_and_compress(project_dict)
        new_save_dict["file_id"] = fs.put(pdict)
        db[user_obj.project_collection_name].insert_one(new_save_dict)

        new_row = self.build_res_dict(new_project_name, mdata, user_obj)
        return jsonify({"success": True, "new_row": new_row})

    def rename_me(self, old_name):
        try:
            new_name = request.json["new_name"]
            db[current_user.project_collection_name].update_one({"project_name": old_name},
                                                                {'$set': {"project_name": new_name}})
            # self.update_selector_list()
            return jsonify({"success": True, "message": "project name changed", "alert_type": "alert-success"})
        except Exception as ex:
            return self.get_exception_for_ajax(ex, "Error renaming project")

    def delete_project(self):
        try:
            project_names = request.json["resource_names"]
            for project_name in project_names:
                current_user.remove_project(project_name)
            return jsonify({"success": True})

        except Exception as ex:
            return self.get_exception_for_ajax(ex, "Error deleting collections")

    def grab_metadata(self, res_name):
        if self.is_repository:
            user_obj = repository_user
        else:
            user_obj = current_user
        doc = db[user_obj.project_collection_name].find_one({self.name_field: res_name})
        if "metadata" in doc:
            mdata = doc["metadata"]
        else:
            mdata = None
        return mdata

    def save_metadata(self, res_name, tags, notes):
        doc = db[current_user.project_collection_name].find_one({"project_name": res_name})
        if "metadata" in doc:
            mdata = doc["metadata"]
        else:
            mdata = {}
        mdata["tags"] = tags
        mdata["notes"] = notes
        db[current_user.project_collection_name].update_one({"project_name": res_name}, {'$set': {"metadata": mdata}})

    def delete_tag(self, tag):
        doclist = db[current_user.project_collection_name].find()
        for doc in doclist:
            if "metadata" not in doc:
                continue
            mdata = doc["metadata"]
            tagstring = mdata["tags"]
            taglist = tagstring.split()
            if tag in taglist:
                taglist.remove(tag)
                mdata["tags"] = " ".join(taglist)
                res_name = doc["project_name"]
                db[current_user.project_collection_name].update_one({"project_name": res_name}, {'$set': {"metadata": mdata}})
        return

    def rename_tag(self, tag_changes):
        doclist = db[current_user.project_collection_name].find()
        for doc in doclist:
            if "metadata" not in doc:
                continue
            mdata = doc["metadata"]
            tagstring = mdata["tags"]
            taglist = tagstring.split()
            for old_tag, new_tag in tag_changes:
                if old_tag in taglist:
                    taglist.remove(old_tag)
                    if new_tag not in taglist:
                        taglist.append(new_tag)
                    mdata["tags"] = " ".join(taglist)
                    res_name = doc["project_name"]
                    db[current_user.project_collection_name].update_one({"project_name": res_name}, {'$set': {"metadata": mdata}})
        return


class RepositoryProjectManager(ProjectManager):
    rep_string = "repository-"
    is_repository = True

    def add_rules(self):
        pass
