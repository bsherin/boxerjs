
import _ from "lodash";

export {doBinding, isString, guid, getCaretPosition, propsAreEqual, arraysMatch, remove_duplicates}

function doBinding(obj, seq = "_") {
    const proto = Object.getPrototypeOf(obj);
    for (const key of Object.getOwnPropertyNames(proto)) {
        if (key.startsWith(seq)) {
            obj[key] = obj[key].bind(obj);
        }
    }
}

function propsAreEqual(p1, p2, skipProps = []) {

    if (!_.isEqual(Object.keys(p1), Object.keys(p2))) {
        return false;
    }

    for (let option in p1) {
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

function remove_duplicates (arrArg) {
  return arrArg.filter((elem, pos, arr) => {
    return arr.indexOf(elem) == pos;
  });
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
  } else if (document.selection && document.selection.createRange) {
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