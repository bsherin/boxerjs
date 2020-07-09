
import _ from "lodash";

import {data_kinds} from "../shared_consts.js";
import {_getln} from "../redux/selectors.js";

export {doBinding, doSignOut, isString, guid, isKind, _extractValue,
    getCaretPosition, propsAreEqual, rgbToHex, svgRgbToHex, arraysMatch, remove_duplicates, extractText, isNormalInteger,
    degreesToRadians, radiansToDegrees, selectedAcrossBoxes, _convertColorArg, _svgConvertColorArg, isVirtualStub,
    portChainLast, portChainDropRight, portChainToArray, arrayToPortChain, addToPortChain, roundToPlaces, convertAndRound,
    makeStub, dataBoxToNumber, dataBoxToString
}

var vndict = ()=>{return window.vstore.getState().node_dict};

function isKind(item, kind) {
    return typeof(item) == "object" && item.hasOwnProperty("kind") && item.kind == kind
}

function doBinding(obj, seq = "_") {
    const proto = Object.getPrototypeOf(obj);
    for (const key of Object.getOwnPropertyNames(proto)) {
        if (key.startsWith(seq)) {
            obj[key] = obj[key].bind(obj);
        }
    }
}

function portChainToArray(port_chain) {
    return port_chain.split("_")
}

function portChainLast(port_chain) {
    return _.last(portChainToArray(port_chain))
}

function arrayToPortChain(the_array) {
    let port_chain = the_array[0];
    for (let p of the_array.slice(1,)) {
        port_chain += "_" +  p
    }
    return port_chain
}

function addToPortChain(port_chain, port) {
    return port_chain + "_" + port
}

function portChainDropRight(port_chain) {
    return arrayToPortChain(_.dropRight(portChainToArray(port_chain)))
}

function degreesToRadians(deg) {
    return deg * Math.PI / 180
}

function radiansToDegrees(radians) {
    return radians * 180 / Math.PI
}

function makeStub(nid) {
    return {vid: nid}
}

function unTrimSpaces(astring) {
    if (typeof(astring) == "string") {
        return astring.replace(/\s/g, '\u00A0')
    }
    else {
        return astring
    }
}


function convertAndRound(astring, places) {
    let tstring = unTrimSpaces(astring);
    if (!tstring || isNaN(tstring)) {
        return tstring
    }
    let tnum = eval(tstring);
    return roundToPlaces(tnum, places)
}


function roundToPlaces(num, places) {
    let mplier = 10 ** places;
    return Math.round(num * mplier ) / mplier;
}

function isEqualOmit(p1, p2) {
    return _.isEqualWith(_.omit(p1, ["_owner"]), _.omit(p2, ["_ownere"]))

}

function propsAreEqual(p1, p2, skipProps = []) {
    if (skipProps.length == 0) {
        return _.isEqual(p1, p2)
    }

    if (_.isEqual(p1, p2)) {
        return true;
    }

    for (let option in p1) {
        if (option == "_owner") {
            continue
        }
        if (skipProps.includes(option)) continue;
        if (typeof p1[option] == "function") {
            if (!(typeof p2[option] == "function")) {
                return false;
            }
            continue;
        }
        if (!_.isEqual(p1[option], p2[option])) {
            return false;
        }
    }
    return true;
}

function isString (value) {
    return typeof value === 'string' || value instanceof String;
}

function isNormalInteger(str) {
    return /^\+?(0|[1-9]\d*)$/.test(str);
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return r * 65536 + g * 256 + b;
  // return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function svgRgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function arraysMatch (arr1, arr2) {
	// Check if the arrays are the same length
	if (arr1.length !== arr2.length) return false;

	// Check if all items exist and are in the same order
	for (var i = 0; i < arr1.length; i++) {
		if (arr1[i] !== arr2[i]) return false;
	}

	// Otherwise, return true
	return true;

}

function extractText(abox, ndict = null) {
    if (typeof(abox) != "object" || !data_kinds.includes(abox.kind)) {
        return null
    }
    if (!ndict) {
        ndict = window.store.getState().node_dict
    }
    return ndict[_getln(abox.unique_id, 0, 0, ndict)].the_text
}

function _extractValue(nd_id, ndict) {
    let the_text = ndict(_getln(nd_id, 0, 0, ndict)).the_text
    if (isNaN(the_text)){
        if (the_text.toLowerCase() == "false") {
            return false
        }
        else if (the_text.toLowerCase() == "true") {
            return true
        }
        return the_text
    }
    else {
        return eval(the_text)
    }
}


function dataBoxToNumber(dbox) {
    let nd = vndict();
    if (dbox.line_list.length != 1) {
        throw "Invalid argument: didn't get a number"
    }
    let the_line = nd[dbox.line_list[0]];
    if (the_line.node_list.length != 1) {
        throw "Invalid argument: didn't get a number"
    }
    let the_text = nd[the_line.node_list[0]].the_text.trim();
    if (isNaN(the_text)) {
        throw `Invalid argument: didn't get a number, got "${the_text}"`
    }
    return eval(the_text)
}


function dataBoxToString(dbox) {
    let nd = vndict();
    if (dbox.line_list.length != 1) {
        throw "Invalid argument: didn't get a string"
    }
    let the_line = nd[dbox.line_list[0]];
    if (the_line.node_list.length != 1) {
        throw "Invalid argument: didn't get a string"
    }
    let the_text = nd[the_line.node_list[0]].the_text.trim();
    return the_text
}

function isVirtualStub(aboxorstring) {
    let klist = Object.keys(aboxorstring);
    return klist.length == 1 && klist.includes("vid")
}


function _svgConvertColorArg(the_color_string) {
    let bgcolor;
    if (typeof(the_color_string) == "number") {
        bgcolor = "#" + the_color_string.toString(16).toUpperCase();
    }
    else if (the_color_string.split(" ").length == 1) {
        if (isNormalInteger(the_color_string)) {
            bgcolor = "#000000"
        }
        else {
            bgcolor = the_color_string;
        }
    }
    else {
        let cnums = [];
        for (let c of the_color_string.split(" ")) {
            cnums.push(parseInt(c))
        }
        bgcolor = svgRgbToHex(cnums[0], cnums[1], cnums[2]);
    }
    return bgcolor
}



function remove_duplicates (arrArg) {
  return arrArg.filter((elem, pos, arr) => {
    return arr.indexOf(elem) == pos;
  });
}

function doSignOut(page_id) {
    window.open($SCRIPT_ROOT + "/logout/" + window.page_id, "_self");
    return false;
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function getCaretPosition(editableDiv) {
  var caretPos = 0,
      sel, range;
  if (window.getSelection) {
      sel = window.getSelection();
      if (sel.rangeCount) {
          range = sel.getRangeAt(0);
          if (range.commonAncestorContainer.parentNode == editableDiv) {
            caretPos = range.endOffset;
          }
      }
  }
  else if (document.selection && document.selection.createRange) {
      range = document.selection.createRange();

      if (range.parentElement() == editableDiv) {
          var tempEl = document.createElement("span");
          editableDiv.insertBefore(tempEl, editableDiv.firstChild);
          var tempRange = range.duplicate();
          tempRange.moveToElementText(tempEl);
          tempRange.setEndPoint("EndToEnd", range);
          caretPos = tempRange.text.length;
      }
  }
  return caretPos;
}

function selectedAcrossBoxes(editableDiv) {
    let range;
    let sel;
  let snode;
  if (window.getSelection) {
      sel = window.getSelection();
      if (sel.rangeCount) {
          range = sel.getRangeAt(0);

          if (range.commonAncestorContainer.className && range.commonAncestorContainer.className.includes("editable")) {
              snode =range.commonAncestorContainer  // will be the case if it has no text
          }
          else {
              snode = range.commonAncestorContainer.parentNode
          }
          if (snode == editableDiv) {
            return null
          }
      }
  }
  return [snode.id, editableDiv.id]
}


function _convertColorArg(the_color_string) {
    let bgcolor;
    if (typeof(the_color_string) == "number") {
        bgcolor = the_color_string
    }
    else if (the_color_string.split(" ").length == 1) {
        if (isNormalInteger(the_color_string)) {
            bgcolor = parseInt(the_color_string);
        }
        else {
            bgcolor = the_color_string;
        }
    }
    else {
        let cnums = [];
        for (let c of the_color_string.split(" ")) {
            cnums.push(parseInt(c))
        }
        bgcolor = rgbToHex(cnums[0], cnums[1], cnums[2]);
    }
    return bgcolor
}

