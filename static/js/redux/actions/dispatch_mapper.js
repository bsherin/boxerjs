import {bindActionCreators} from "redux";
import {createNode, newClosetLine, newDataBoxNode, newLineNode, newTextNode, createTextDataBox, nodeModels} from "./node_creator_actions.js";
import {
    changeNode,
    changeNodeMulti,
    createEntry,
    insertLine,
    insertNode,
    insertNodes, removeLine, removeNode, replaceLine, replaceNode, setGlobal,
    setNodeDict, storeFocus,
    changeSpriteParam
} from "./core_actions.js";
import {clearSelected, deleteToLineEnd, addTextToClipboard,
    insertClipboard, copySelected, cutSelected, selectSpan, deleteBoxerSelection, deletePrecedingBox} from "./copy_select_actions.js";
import {
    addGraphicsComponent,
    cloneLineToStore,
    cloneNodeToStore, createCloset,
    healLine,
    healStructure, positionAfterBox, setFocus, focusName, arrowDown, arrowUp, focusLeft, focusRight, doBracket, downFromTag,
    setLineList, setFocusInBox,
    setPortTarget, setSpriteParams, changeSpriteValueBox,
    splitLine, toggleBoxTransparency, unzoomBox, zoomBox, toggleCloset, setGraphicsSize, retargetPort, retargetPortLastFocus, setNodeSize,
    mergeTextNodes, splitTextNode, splitLineAtTextPosition, insertBoxInText, insertBoxLastFocus,
} from "./composite_actions.js";

export {mapDispatchToProps}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ newTextNode, newLineNode, newDataBoxNode, newClosetLine, createNode, nodeModels, createTextDataBox,
      createEntry, changeNodeMulti, changeNode, setNodeDict, insertNode, insertNodes, insertLine,
    replaceNode, replaceLine, removeNode, removeLine, setGlobal, storeFocus, setFocusInBox,
      mergeTextNodes, healStructure, healLine, setLineList, cloneNodeToStore, cloneLineToStore, splitTextNode, splitLineAtTextPosition,
      splitLine, insertBoxInText, insertBoxLastFocus, deleteToLineEnd, setPortTarget,
      setFocus, positionAfterBox, zoomBox, unzoomBox, focusName, focusLeft, focusRight, arrowDown, arrowUp, doBracket, downFromTag,
      addGraphicsComponent, toggleBoxTransparency, setSpriteParams, changeSpriteParam, changeSpriteValueBox,
      createCloset, toggleCloset, setGraphicsSize, retargetPort, retargetPortLastFocus, setNodeSize,
      clearSelected, deleteToLineEnd, addTextToClipboard, insertClipboard, copySelected, cutSelected,
      selectSpan, deletePrecedingBox, deleteBoxerSelection
     }, dispatch)
}