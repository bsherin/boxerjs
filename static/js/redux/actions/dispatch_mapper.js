import {bindActionCreators} from "redux";
import {createTextDataBox} from "./node_creator_actions.js";
import {insertNode, setGlobal, storeFocus,} from "./action_creators.js";
import {clearSelected, deleteToLineEnd, addTextToClipboard,
    insertClipboard, copySelected, cutSelected, selectSpan,
    deleteBoxerSelection, deletePrecedingBox} from "./copy_select_actions.js";
import {
    changeNode,
    addGraphicsComponent,
    cloneNodeToStore,
    healStructure, positionAfterBox, setFocus, focusName, arrowDown,
    arrowUp, focusLeft, focusRight, doBracket, downFromTag,
    setFocusInBox,
    changeSpriteValueBox, focusLineStart,
    toggleBoxTransparency, unzoomBox, zoomBox, toggleCloset, setGraphicsSize,
    retargetPort, setNodeSize,
    splitLineAtTextPosition, insertBoxInText, insertBoxLastFocus, updateTextNode,
    saveProject, saveProjectAs
} from "./composite_actions.js";

export {mapDispatchToProps}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ createTextDataBox,
      changeNode, insertNode, setGlobal, storeFocus, setFocusInBox,
      healStructure, cloneNodeToStore, splitLineAtTextPosition,
      insertBoxInText, insertBoxLastFocus, deleteToLineEnd,
      setFocus, positionAfterBox, zoomBox, unzoomBox, focusName, focusLeft, focusLineStart,
      focusRight, arrowDown, arrowUp, doBracket, downFromTag,
      addGraphicsComponent, toggleBoxTransparency, changeSpriteValueBox,
      toggleCloset, setGraphicsSize, retargetPort, setNodeSize,
      clearSelected, deleteToLineEnd, addTextToClipboard, insertClipboard, copySelected, cutSelected,
      selectSpan, deletePrecedingBox, deleteBoxerSelection, updateTextNode,
      saveProject, saveProjectAs
     }, dispatch)
}