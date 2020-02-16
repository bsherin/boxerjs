

from boxer_app import app, socketio
print("back in host_main")
import users
print("imported user")
import auth_views, main_views, library_views, admin_views


socketio.run(app)

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
