import os

_develop = ("DEVELOP" in os.environ) and (os.environ.get("DEVELOP") == "True")

if _develop:
    js_source_dict = {"main_app": 'boxerjs_dev/main_app.bundle.js',
                      "library_home_react": 'boxerjs_dev/library_home_react.bundle.js',
                      "repository_home_react": 'boxerjs_dev/repository_home_react.bundle.js',
                      "admin_home_react": "boxerjs_dev/admin_home_react.bundle.js",
                      "register_react": './boxerjs_dev/register_react.bundle.js',
                      "duplicate_user_react": './boxerjs_dev/duplicate_user_react.bundle.js',
                      "account_react": './boxerjs_dev/account_react.bundle.js',
                      "auth_react": './boxerjs_dev/auth_react.bundle.js',
                      }

else:
    js_source_dict = {"main_app": 'boxerjs_dist/main_app.production.bundle.js',
                      "library_home_react": 'boxerjs_dist/library_home_react.production.bundle.js',
                      "repository_home_react": 'boxerjs_dist/repository_home_react.production.bundle.js',
                      "admin_home_react": "boxerjs_dist/admin_home_react.production.bundle.js",
                      "register_react": './boxerjs_dist/register_react.production.bundle.js',
                      "duplicate_user_react": './boxerjs_dist/duplicate_user_react.production.bundle.js',
                      "account_react": './boxerjs_dist/account_react.production.bundle.js',
                      "auth_react": './boxerjs_dist/auth_react.production.bundle.js',
                      }


def css_source(entry_name):
    if _develop:
        return "boxerjs_dev/{}.css".format(entry_name)
    else:
        return "boxerjs_dist/{}.css".format(entry_name)